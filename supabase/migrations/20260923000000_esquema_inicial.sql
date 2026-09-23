-- Arretado — esquema remoto inicial (F0; D3, D12, D18, T12).
-- Criado vazio e com RLS desde já; o cliente só se conecta na F4.
--
-- Modelo: o remoto é espelho do banco local (D1). Cada registro é guardado inteiro em
-- `dados` (o mesmo JSON do pacote .arretado) com colunas de controle para RLS, sync e
-- consulta. Evolução de campos não exige migração; consultas SQL usam `dados->>'campo'`.
--
-- Identidade: no primeiro login (F4) os registros locais passam a ter
-- usuarioId = auth.uid() (mesma troca de identidade da restauração integral), então a
-- regra de RLS é sempre `usuario_id = auth.uid()`.

create schema if not exists arretado;
revoke all on schema arretado from public;
grant usage on schema arretado to anon, authenticated;

-- Coleções pessoais exportáveis (mesma lista de ENTIDADES com módulo; teste de deriva em supabase/).
create table arretado.registros (
  colecao       text        not null check (colecao in (
    'usuarios', 'aparelhos', 'preferencias', 'fontes', 'anexos', 'tags', 'vinculos',
    'concursos', 'fasesPrazos', 'editais', 'disciplinas', 'pontos',
    'dias', 'sessoes',
    'erros', 'cartoes', 'revisoes',
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'marcacoes', 'estrelas',
    'pacotesIncidencia', 'adesoes',
    'precedentes', 'notas', 'achados', 'eventosCalendario', 'relatos'
  )),
  id            uuid        not null,
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  ts_logico     text        not null check (ts_logico ~ '^\d{13}-\d{6}-[0-9a-f]{8}$'),
  atualizado_em timestamptz not null,
  excluido_em   timestamptz,
  dados         jsonb       not null,
  recebido_em   timestamptz not null default now(),
  primary key (colecao, id),
  -- O JSON guardado tem de ser do mesmo dono e do mesmo id das colunas.
  check (dados->>'id' = id::text and dados->>'usuarioId' = usuario_id::text)
);
create index registros_usuario_colecao on arretado.registros (usuario_id, colecao, ts_logico);

-- Log de alterações (base da sincronização, D17): só inserção e leitura.
create table arretado.alteracoes (
  seq         bigint generated always as identity primary key,
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  aparelho_id uuid        not null,
  ts          text        not null check (ts ~ '^\d{13}-\d{6}-[0-9a-f]{8}$'),
  colecao     text        not null,
  registro_id uuid        not null,
  operacao    text        not null check (operacao in ('gravar', 'atualizar', 'remover')),
  dados       jsonb,
  removidos   text[],
  recebido_em timestamptz not null default now()
);
create index alteracoes_usuario_seq on arretado.alteracoes (usuario_id, seq);

-- Posse de aparelho: um ativo por vez, com validade curta (D17).
create table arretado.posse_aparelho (
  usuario_id  uuid        primary key references auth.users (id) on delete cascade,
  aparelho_id uuid        not null,
  ate         timestamptz not null,
  atualizado_em timestamptz not null default now()
);

-- Catálogo compartilhado (D12; serviço em F7): leitura pública do publicado, escrita só de curador.
create table arretado.curadores (
  usuario_id uuid primary key references auth.users (id) on delete cascade
);

create table arretado.catalogo (
  colecao       text        not null check (colecao in (
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'pacotesIncidencia'
  )),
  id            uuid        not null,
  curador_id    uuid        not null references arretado.curadores (usuario_id),
  publicado     boolean     not null default false,
  ts_logico     text        not null,
  atualizado_em timestamptz not null,
  dados         jsonb       not null,
  primary key (colecao, id),
  check (dados->>'id' = id::text)
);

-- ── RLS em tudo, forçada também para o dono das tabelas ─────────────────────
alter table arretado.registros      enable row level security;
alter table arretado.alteracoes     enable row level security;
alter table arretado.posse_aparelho enable row level security;
alter table arretado.curadores      enable row level security;
alter table arretado.catalogo       enable row level security;
alter table arretado.registros      force row level security;
alter table arretado.alteracoes     force row level security;
alter table arretado.posse_aparelho force row level security;
alter table arretado.curadores      force row level security;
alter table arretado.catalogo       force row level security;

-- Privilégios explícitos: anon nunca toca em dado pessoal.
revoke all on all tables in schema arretado from anon, authenticated;
grant select, insert, update, delete on arretado.registros to authenticated;
grant select, insert on arretado.alteracoes to authenticated;
grant select, insert, update on arretado.posse_aparelho to authenticated;
grant select on arretado.curadores to authenticated;
grant select on arretado.catalogo to anon, authenticated;
grant insert, update, delete on arretado.catalogo to authenticated;

-- Registros pessoais: só o dono.
create policy registros_dono on arretado.registros
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- Log: o dono lê e acrescenta; ninguém altera nem apaga (append-only).
create policy alteracoes_ler on arretado.alteracoes
  for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy alteracoes_inserir on arretado.alteracoes
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy posse_dono on arretado.posse_aparelho
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy curadores_proprio on arretado.curadores
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Catálogo: todos leem o publicado; o curador lê e escreve o seu.
create policy catalogo_ler_publicado on arretado.catalogo
  for select to anon, authenticated
  using (publicado);
create policy catalogo_curador_ler on arretado.catalogo
  for select to authenticated
  using (curador_id = (select auth.uid()));
create policy catalogo_curador_escrever on arretado.catalogo
  for insert to authenticated
  with check (
    curador_id = (select auth.uid())
    and exists (select 1 from arretado.curadores c where c.usuario_id = (select auth.uid()))
  );
create policy catalogo_curador_alterar on arretado.catalogo
  for update to authenticated
  using (curador_id = (select auth.uid()))
  with check (
    curador_id = (select auth.uid())
    and exists (select 1 from arretado.curadores c where c.usuario_id = (select auth.uid()))
  );
create policy catalogo_curador_apagar on arretado.catalogo
  for delete to authenticated
  using (curador_id = (select auth.uid()));
