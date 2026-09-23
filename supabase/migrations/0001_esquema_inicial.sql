-- Arretado — esquema remoto inicial (F0).
--
-- Criado agora e deixado **vazio**: a sincronização só entra na F4 (D3). O que importa nesta fase é
-- que o isolamento entre usuários já esteja no banco, por linha (RLS), e não no cliente — e que a
-- F4 seja "ligar", não "reconstruir".
--
-- Convenções:
--   * nomes de tabela e coluna em snake_case (padrão do Postgres); o cliente usa camelCase e o
--     adaptador converte na borda (T14 vale para o código, não para o SQL);
--   * `id uuid` gerado no cliente (UUIDv7, T4) — o servidor nunca inventa id;
--   * `usuario_id` em toda tabela pessoal, com RLS obrigatória;
--   * exclusão lógica por `excluido_em`; remoção física só na exclusão de conta.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Usuário e aparelho
-- ---------------------------------------------------------------------------

-- Espelha auth.users: o `id` é o do Supabase Auth. O `usuario_id` local é vinculado a ele no
-- primeiro login (D19), sem trocar os ids das entidades já criadas.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_de_exibicao text,
  carreira text,
  consentimentos jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

comment on table public.usuarios is 'Escopo de isolamento. Exclusão da conta apaga tudo em cascata (LGPD).';

create table public.aparelhos (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  nome text not null,
  plataforma text not null,
  versao_esquema_local integer not null,
  ultima_sincronizacao_em timestamptz,
  -- Posse de aparelho: um ativo por vez, com validade curta renovada automaticamente (D17).
  posse_ativa_ate timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

-- ---------------------------------------------------------------------------
-- Log de alterações: base da sincronização por log (D17, §14.5)
-- ---------------------------------------------------------------------------

create table public.alteracoes (
  seq bigserial primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  aparelho_id uuid not null,
  ts_logico text not null,
  entidade text not null,
  entidade_id uuid not null,
  operacao text not null check (operacao in ('criar', 'atualizar', 'excluir', 'apagar')),
  campos jsonb not null,
  recebido_em timestamptz not null default now()
);

create index alteracoes_por_usuario on public.alteracoes (usuario_id, seq);
create index alteracoes_por_entidade on public.alteracoes (usuario_id, entidade, entidade_id);

comment on table public.alteracoes is 'Append-only. O cliente envia o que mudou desde seu cursor e recebe o resto.';

-- ---------------------------------------------------------------------------
-- Conteúdo compartilhável: as duas camadas da Legislação (D12)
-- ---------------------------------------------------------------------------

-- Normas do catálogo são legíveis por todos e escritas só pelo curador; normas pessoais têm dono.
create table public.normas (
  id uuid primary key,
  usuario_id uuid references public.usuarios (id) on delete cascade,
  escopo text not null check (escopo in ('pessoal', 'catalogo')),
  curador_id uuid references public.usuarios (id) on delete set null,
  titulo_curto text not null,
  titulo_oficial text,
  referencia text,
  tipo text,
  esfera text,
  epigrafe text,
  ementa text,
  preambulo text,
  url_oficial text,
  versao_vigente_id uuid,
  origem_no_catalogo_id uuid references public.normas (id) on delete set null,
  ultima_verificacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz,
  -- Norma pessoal tem dono; norma de catálogo tem curador. Nunca as duas coisas ao mesmo tempo.
  constraint norma_tem_dono_coerente check (
    (escopo = 'pessoal' and usuario_id is not null)
    or (escopo = 'catalogo' and curador_id is not null)
  )
);

create table public.versoes_de_norma (
  id uuid primary key,
  norma_id uuid not null references public.normas (id) on delete cascade,
  usuario_id uuid references public.usuarios (id) on delete cascade,
  texto_normalizado text not null,
  capturada_em timestamptz not null,
  origem_da_versao text not null,
  hash text not null,
  status text not null check (status in ('rascunho', 'vigente', 'arquivada')),
  data_de_vigencia date,
  nota_de_vigencia_mais_recente jsonb,
  versao_do_adaptador text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.dispositivos (
  id uuid primary key,
  norma_id uuid not null references public.normas (id) on delete cascade,
  usuario_id uuid references public.usuarios (id) on delete cascade,
  endereco text not null,
  categoria text not null check (categoria in ('estrutural', 'normativo')),
  tipo text not null,
  ordem integer not null,
  pai_id uuid references public.dispositivos (id) on delete cascade,
  rotulo text,
  status text not null,
  notas_de_vigencia jsonb not null default '[]'::jsonb,
  confianca text not null,
  renumerado_de text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz,
  -- Mesmo endereço = um só dispositivo, por norma (D11).
  unique (norma_id, endereco)
);

create table public.textos_de_dispositivo (
  versao_id uuid not null references public.versoes_de_norma (id) on delete cascade,
  dispositivo_id uuid not null references public.dispositivos (id) on delete cascade,
  norma_id uuid not null references public.normas (id) on delete cascade,
  texto text not null,
  redacoes_anteriores jsonb not null default '[]'::jsonb,
  primary key (versao_id, dispositivo_id)
);

create table public.pacotes_de_incidencia (
  id uuid primary key,
  curador_id uuid not null references public.usuarios (id) on delete cascade,
  titulo text not null,
  carreira text not null,
  versao integer not null,
  descricao text,
  norma_ids uuid[] not null default '{}',
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

-- ---------------------------------------------------------------------------
-- Entidades pessoais
-- ---------------------------------------------------------------------------

create table public.concursos (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  nome text not null,
  banca text not null,
  orgao text,
  cargo text,
  carreira text,
  status text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.fases_prazos (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  concurso_id uuid not null references public.concursos (id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('fase', 'prazo')),
  data date,
  data_fim date,
  descricao text,
  lembrete_dias_antes integer,
  concluido boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.eventos_de_calendario (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  concurso_id uuid references public.concursos (id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('simulado', 'marco', 'outro')),
  data date not null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.editais (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  concurso_id uuid references public.concursos (id) on delete cascade,
  titulo text not null,
  ano integer,
  url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.disciplinas (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  edital_id uuid references public.editais (id) on delete set null,
  nome text not null,
  ordem integer not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.pontos (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas (id) on delete cascade,
  edital_id uuid references public.editais (id) on delete set null,
  titulo text not null,
  faixa text not null check (faixa in ('altissima', 'alta', 'media', 'baixa')),
  ordem integer not null,
  adiado_ate date,
  origem_da_faixa text not null default 'manual',
  somente_leitura boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.dias (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  data date not null,
  fechado_em timestamptz,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz,
  unique (usuario_id, data)
);

create table public.sessoes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  dia_id uuid references public.dias (id) on delete set null,
  ponto_id uuid references public.pontos (id) on delete set null,
  iniciada_em timestamptz not null,
  encerrada_em timestamptz,
  tipo text not null,
  questoes integer,
  acertos integer,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.fontes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  titulo text not null,
  banca text,
  ano integer,
  numero text,
  url text,
  consultada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.erros (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  -- Os dois únicos campos obrigatórios da captura (D9).
  resultado text not null check (resultado in ('errou', 'acertoInseguro')),
  o_que_foi text not null,
  frase_correta text,
  disciplina_id uuid references public.disciplinas (id) on delete set null,
  ponto_id uuid references public.pontos (id) on delete set null,
  sessao_id uuid references public.sessoes (id) on delete set null,
  dispositivo_id uuid references public.dispositivos (id) on delete set null,
  fonte_id uuid references public.fontes (id) on delete set null,
  resposta_dada text,
  resposta_correta text,
  justificativa text,
  conviccao text,
  causa text check (causa in ('lacuna', 'leitura', 'confusao', 'literalidade')),
  causa_sugerida text,
  acao_recomendada text,
  status text not null check (status in ('aberto', 'comCartao', 'resolvido', 'descartado')),
  texto_base_alterado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.cartoes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  erro_id uuid references public.erros (id) on delete set null,
  ponto_id uuid references public.pontos (id) on delete set null,
  dispositivo_id uuid references public.dispositivos (id) on delete set null,
  frente text not null,
  verso text not null default '',
  origem_do_cartao text not null check (origem_do_cartao in ('erro', 'trecho', 'manual')),
  estado text not null check (estado in ('ativo', 'suspenso', 'arquivado')),
  caixa smallint not null check (caixa between 1 and 6),
  proxima_revisao date not null,
  texto_base_alterado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create index cartoes_da_fila on public.cartoes (usuario_id, estado, proxima_revisao);

create table public.revisoes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  cartao_id uuid not null references public.cartoes (id) on delete cascade,
  em timestamptz not null,
  resultado text not null check (resultado in ('errei', 'dificil', 'facil')),
  caixa_antes smallint not null,
  caixa_depois smallint not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

comment on table public.revisoes is 'Append-only: é o histórico que permitirá avaliar o algoritmo na F8.';

create table public.marcacoes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  dispositivo_id uuid not null references public.dispositivos (id) on delete cascade,
  versao_id uuid references public.versoes_de_norma (id) on delete set null,
  tipo text not null check (tipo in ('grifo', 'nota')),
  trecho text not null,
  inicio integer not null,
  fim integer not null,
  cor text,
  nota text,
  status text not null check (status in ('valida', 'reancorada', 'pendente')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.estrelas (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  norma_id uuid not null references public.normas (id) on delete cascade,
  alvo_id uuid not null references public.dispositivos (id) on delete cascade,
  propagacao text not null check (propagacao in ('direta', 'herdada', 'pacote', 'excecaoNegativa')),
  propagado_de uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.adesoes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  pacote_id uuid references public.pacotes_de_incidencia (id) on delete cascade,
  norma_id uuid references public.normas (id) on delete cascade,
  tipo text not null check (tipo in ('total', 'parcial')),
  normas_escolhidas uuid[] not null default '{}',
  versao_aderida integer not null,
  receber_atualizacoes boolean not null default true,
  cancelada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.precedentes (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  disciplina_id uuid references public.disciplinas (id) on delete set null,
  fonte_id uuid references public.fontes (id) on delete set null,
  titulo_tese text not null,
  escopo text not null check (escopo in ('nacional', 'internacional')),
  tribunal text,
  tipo text,
  numero text,
  data date,
  relator text,
  fatos text,
  questao_juridica text,
  fundamentos text,
  conclusao text,
  texto_original text,
  traducao text,
  resumo text,
  status_de_leitura text not null,
  relevante_para_revisao boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.notas (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  disciplina_id uuid references public.disciplinas (id) on delete set null,
  fonte_id uuid references public.fontes (id) on delete set null,
  titulo text not null,
  conteudo text not null default '',
  tipo text not null check (tipo in ('resumo', 'esquema', 'anotacao')),
  tema text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.achados (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  ponto_id uuid references public.pontos (id) on delete set null,
  norma_id uuid references public.normas (id) on delete set null,
  tipo text not null,
  descricao text not null,
  consequencia_sugerida text,
  status text not null,
  url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.tags (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz,
  unique (usuario_id, nome)
);

create table public.vinculos (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  de_tipo text not null,
  de_id uuid not null,
  para_tipo text not null,
  para_id uuid not null,
  propagacao text not null,
  propagado_de uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create index vinculos_por_origem on public.vinculos (usuario_id, de_tipo, de_id);
create index vinculos_por_destino on public.vinculos (usuario_id, para_tipo, para_id);

create table public.anexos (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  de_tipo text not null,
  de_id uuid not null,
  nome text not null,
  tipo_mime text not null,
  tamanho bigint not null,
  -- O conteúdo vai para o Storage, não para a tabela; aqui fica só o caminho (§14.4).
  caminho_no_storage text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.logs_de_importacao (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  modo text not null,
  hash_do_pacote text not null,
  snapshot_id uuid,
  espaco_id uuid,
  contagens jsonb not null default '[]'::jsonb,
  avisos jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

create table public.preferencias (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  chave text not null,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, chave)
);

-- Relato de Problema: falha da plataforma, nunca "erro" (D24). Sem dados de estudo (§5.3).
create table public.relatos_de_problema (
  id uuid primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  descricao text not null,
  tela text not null,
  versao_do_app text not null,
  aparelho_id uuid,
  status text not null,
  resposta text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  origem text not null default 'app',
  excluido_em timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS: isolamento por linha em toda tabela pessoal (D3, D18)
-- ---------------------------------------------------------------------------
--
-- Sem política não há acesso: `enable row level security` já nega tudo por padrão. As políticas
-- abaixo liberam apenas as linhas do próprio usuário autenticado.

do $$
declare
  nome text;
  pessoais text[] := array[
    'aparelhos', 'alteracoes', 'concursos', 'fases_prazos', 'eventos_de_calendario', 'editais',
    'disciplinas', 'pontos', 'dias', 'sessoes', 'fontes', 'erros', 'cartoes', 'revisoes',
    'marcacoes', 'estrelas', 'adesoes', 'precedentes', 'notas', 'achados', 'tags', 'vinculos',
    'anexos', 'logs_de_importacao', 'preferencias', 'relatos_de_problema'
  ];
begin
  foreach nome in array pessoais loop
    execute format('alter table public.%I enable row level security', nome);
    execute format('alter table public.%I force row level security', nome);
    execute format(
      'create policy %I on public.%I for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid())',
      nome || '_do_proprio_usuario', nome
    );
  end loop;
end $$;

alter table public.usuarios enable row level security;
alter table public.usuarios force row level security;
create policy usuarios_do_proprio_usuario on public.usuarios
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Catálogo: leitura para qualquer autenticado, escrita só do curador (§8.1 "Permissões").
alter table public.normas enable row level security;
alter table public.normas force row level security;
create policy normas_pessoais on public.normas
  for all to authenticated
  using (escopo = 'pessoal' and usuario_id = auth.uid())
  with check (escopo = 'pessoal' and usuario_id = auth.uid());
create policy normas_do_catalogo_sao_publicas on public.normas
  for select to authenticated using (escopo = 'catalogo');
create policy normas_do_catalogo_escrita_do_curador on public.normas
  for all to authenticated
  using (escopo = 'catalogo' and curador_id = auth.uid())
  with check (escopo = 'catalogo' and curador_id = auth.uid());

-- Conteúdo de norma acompanha a norma: pessoal para o dono, legível quando a norma é do catálogo.
do $$
declare
  nome text;
  conteudo text[] := array['versoes_de_norma', 'dispositivos'];
begin
  foreach nome in array conteudo loop
    execute format('alter table public.%I enable row level security', nome);
    execute format('alter table public.%I force row level security', nome);
    execute format(
      'create policy %I on public.%I for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid())',
      nome || '_do_proprio_usuario', nome
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.normas n where n.id = %I.norma_id and n.escopo = ''catalogo''))',
      nome || '_do_catalogo', nome, nome
    );
  end loop;
end $$;

alter table public.textos_de_dispositivo enable row level security;
alter table public.textos_de_dispositivo force row level security;
create policy textos_seguem_a_norma on public.textos_de_dispositivo
  for select to authenticated using (
    exists (
      select 1 from public.normas n
      where n.id = textos_de_dispositivo.norma_id
        and (n.escopo = 'catalogo' or n.usuario_id = auth.uid())
    )
  );
create policy textos_pessoais on public.textos_de_dispositivo
  for all to authenticated
  using (exists (select 1 from public.normas n where n.id = norma_id and n.usuario_id = auth.uid()))
  with check (exists (select 1 from public.normas n where n.id = norma_id and n.usuario_id = auth.uid()));

alter table public.pacotes_de_incidencia enable row level security;
alter table public.pacotes_de_incidencia force row level security;
create policy pacotes_publicados_sao_legiveis on public.pacotes_de_incidencia
  for select to authenticated using (publicado_em is not null or curador_id = auth.uid());
create policy pacotes_escrita_do_curador on public.pacotes_de_incidencia
  for all to authenticated
  using (curador_id = auth.uid()) with check (curador_id = auth.uid());
