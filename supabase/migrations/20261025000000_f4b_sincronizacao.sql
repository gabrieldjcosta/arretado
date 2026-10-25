-- Arretado — F4-B (sincronização), pacote B1. Plano: docs/planos/f4b-sincronizacao.md §1–§4 e §8.
-- Reversão: supabase/rollback/20261025000000_f4b_sincronizacao.down.sql (seguro enquanto as tabelas
-- de sync estão vazias; com dados, exportar antes).
--
--   registros   — estado atual de cada (colecao, id); só `enviar_lote` escreve (o cliente só lê)
--   alteracoes  — log append-only com `seq` do servidor; só `enviar_lote` escreve
--   enviar_lote — envio idempotente em lote; divergência de `base_ts` não avança o estado
--   posse       — `pedir_posse` / `soltar_posse` (D17); a linha só muda por essas funções
--   aparelhos_sync — último `seq` recebido e versão do esquema de cada aparelho (poda, B5)
-- Sem `check (colecao in (...))`: a lista de coleções válidas é a do cliente (ENTIDADES + zod).

-- ── Aceite da sincronização (v4) ────────────────────────────────────────────────────────────
-- Colunas próprias: `termos_versao` guarda o aceite do teste e não deve ser sobrescrito. Guarda
-- também QUAL texto foi aceito (prova do consentimento).
alter table arretado.perfis add column sincronizacao_versao text
  check (sincronizacao_versao is null or length(sincronizacao_versao) between 1 and 32);
alter table arretado.perfis add column sincronizacao_aceita_em timestamptz;

create function arretado.aceitar_sincronizacao(versao text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sem sessão' using errcode = '28000';
  end if;
  if versao is null or length(versao) not between 1 and 32 then
    raise exception 'versão inválida' using errcode = '22023';
  end if;
  update arretado.perfis set sincronizacao_versao = versao, sincronizacao_aceita_em = now()
   where usuario_id = auth.uid();
end;
$$;
revoke execute on function arretado.aceitar_sincronizacao(text) from public, anon;
grant execute on function arretado.aceitar_sincronizacao(text) to authenticated;

-- ── registros: sem lista fixa de coleções; chave por dono; escrita só pela função ───────────
alter table arretado.registros drop constraint registros_colecao_check;
alter table arretado.registros add constraint registros_colecao_check
  check (colecao ~ '^[A-Za-z]{2,40}$');
alter table arretado.registros add constraint registros_dados_tamanho
  check (pg_column_size(dados) < 1048576);
-- O check original deixava passar `dados` que não é objeto ou sem `id`/`usuarioId` (NULL não
-- reprova um check); `atualizar` com `removidos: ['id']` apagava a chave.
alter table arretado.registros drop constraint registros_check;
alter table arretado.registros add constraint registros_check check (
  jsonb_typeof(dados) = 'object'
  and dados->>'id' is not distinct from id::text
  and dados->>'usuarioId' is not distinct from usuario_id::text);
-- Chave por dono: o mesmo (colecao, id) em duas contas (ex.: o mesmo pacote importado) não colide,
-- e a consulta paginada de um aparelho novo varre só as linhas do dono.
alter table arretado.registros drop constraint registros_pkey;
alter table arretado.registros add primary key (usuario_id, colecao, id);

drop policy registros_dono on arretado.registros;
create policy registros_ler on arretado.registros
  for select to authenticated
  using (usuario_id = (select auth.uid()));
revoke insert, update, delete on arretado.registros from authenticated;

-- ── alteracoes: colunas novas, índice único, escrita só pela função ─────────────────────────
alter table arretado.alteracoes add column base_ts text
  check (base_ts is null or base_ts ~ '^\d{13}-\d{6}-[0-9a-f]{8}$');
alter table arretado.alteracoes add column divergente boolean not null default false;
alter table arretado.alteracoes add column versao_esquema smallint;
alter table arretado.alteracoes drop constraint alteracoes_operacao_check;
alter table arretado.alteracoes add constraint alteracoes_operacao_check
  check (operacao in ('gravar', 'atualizar', 'remover', 'acervo-adesao'));
alter table arretado.alteracoes add constraint alteracoes_dados_tamanho
  check (dados is null or pg_column_size(dados) < 1048576);
-- Sem isto, `acervo-adesao` e `remover` de registro inexistente guardam qualquer texto em `colecao`.
alter table arretado.alteracoes add constraint alteracoes_colecao_check
  check (colecao ~ '^[A-Za-z]{2,40}$');
create unique index alteracoes_idempotencia
  on arretado.alteracoes (usuario_id, aparelho_id, ts, registro_id);

drop policy alteracoes_inserir on arretado.alteracoes;
revoke insert on arretado.alteracoes from authenticated;

-- ── aparelhos_sync ──────────────────────────────────────────────────────────────────────────
create table arretado.aparelhos_sync (
  usuario_id          uuid        not null references auth.users (id) on delete cascade,
  aparelho_id         uuid        not null,
  ultimo_seq_recebido bigint      not null default 0,
  versao_esquema      smallint,
  visto_em            timestamptz not null default now(),
  primary key (usuario_id, aparelho_id)
);
alter table arretado.aparelhos_sync enable row level security;
alter table arretado.aparelhos_sync force row level security;
revoke all on arretado.aparelhos_sync from anon, authenticated;
grant select on arretado.aparelhos_sync to authenticated;
create policy aparelhos_sync_ler on arretado.aparelhos_sync
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- ── posse_aparelho: o cliente só lê; a linha muda por pedir_posse / soltar_posse ────────────
drop policy posse_dono on arretado.posse_aparelho;
create policy posse_ler on arretado.posse_aparelho
  for select to authenticated
  using (usuario_id = (select auth.uid()));
revoke insert, update on arretado.posse_aparelho from authenticated;

-- ── Funções ─────────────────────────────────────────────────────────────────────────────────
-- Dono sempre é auth.uid(); nenhum parâmetro escolhe o usuário. security definer porque o
-- cliente perdeu a escrita direta; cada função confere a sessão e o aceite.
create function arretado.exigir_sincronizacao() returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'sem sessão' using errcode = '28000';
  end if;
  if not exists (select 1 from arretado.perfis p
                  where p.usuario_id = eu and p.sincronizacao_aceita_em is not null) then
    raise exception 'sincronização não aceita' using errcode = '42501';
  end if;
  return eu;
end;
$$;
revoke execute on function arretado.exigir_sincronizacao() from public, anon, authenticated;

create function arretado.enviar_lote(p_aparelho uuid, p_versao smallint, p_entradas jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
  e jsonb;
  nova_seq bigint;
  atual arretado.registros%rowtype;
  existe boolean;
  novos jsonb;
  dados_e jsonb;
  remov text[];
  base text;
  divergiu boolean;
  op text;
  divergentes jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_entradas) <> 'array' or jsonb_array_length(p_entradas) > 500
     or octet_length(p_entradas::text) > 2097152 then
    raise exception 'lote inválido ou grande demais' using errcode = '22023';
  end if;

  -- Um lote por vez por conta. `seq` sai na ordem do commit (o leitor incremental `seq > último`
  -- não pula uma entrada que confirmou depois de outra) e dois aparelhos não se travam nas
  -- mesmas linhas. Vale até o fim da transação.
  perform pg_advisory_xact_lock(hashtextextended(eu::text, 0));

  for e in select value from jsonb_array_elements(p_entradas) loop
    op := e->>'operacao';
    base := nullif(e->>'base_ts', '');
    dados_e := case when jsonb_typeof(e->'dados') = 'null' then null else e->'dados' end;
    if (dados_e is not null and jsonb_typeof(dados_e) <> 'object')
       or (op = 'gravar' and dados_e is null)
       or jsonb_typeof(e->'removidos') not in ('array', 'null') then
      raise exception 'entrada com forma inválida (dados é objeto; removidos é lista)'
        using errcode = '22023';
    end if;
    remov := case when jsonb_typeof(e->'removidos') = 'array'
                  then array(select jsonb_array_elements_text(e->'removidos')) end;

    insert into arretado.alteracoes
      (usuario_id, aparelho_id, ts, colecao, registro_id, operacao, dados, removidos, base_ts,
       versao_esquema)
    values
      (eu, p_aparelho, e->>'ts', e->>'colecao', (e->>'registro_id')::uuid, op, dados_e, remov,
       base, p_versao)
    on conflict (usuario_id, aparelho_id, ts, registro_id) do nothing
    returning seq into nova_seq;

    if nova_seq is null then
      -- Envio refeito: a entrada já está no log e já foi aplicada. Se ela divergiu, avisa de novo:
      -- a primeira resposta pode ter se perdido e o aparelho não saberia do Conflito.
      if exists (select 1 from arretado.alteracoes a
                  where a.usuario_id = eu and a.aparelho_id = p_aparelho
                    and a.ts = e->>'ts' and a.registro_id = (e->>'registro_id')::uuid
                    and a.divergente) then
        divergentes := divergentes || jsonb_build_object(
          'colecao', e->>'colecao', 'registro_id', e->>'registro_id',
          'ts_servidor', (select r.ts_logico from arretado.registros r
                           where r.usuario_id = eu and r.colecao = e->>'colecao'
                             and r.id = (e->>'registro_id')::uuid));
      end if;
      continue;
    end if;
    -- Item do acervo vai por referência: não há linha de estado.
    continue when op = 'acervo-adesao';

    select * into atual from arretado.registros r
     where r.usuario_id = eu and r.colecao = e->>'colecao' and r.id = (e->>'registro_id')::uuid
     for update;
    existe := found;

    novos := null;
    if op = 'gravar' then
      novos := dados_e;
    elsif existe then
      if op = 'atualizar' then
        novos := (atual.dados || coalesce(dados_e, '{}'::jsonb)) - coalesce(remov, '{}');
      else
        novos := atual.dados;
      end if;
    end if;

    -- Avança só se a entrada partiu do estado que o servidor tem; senão fica no log como divergente.
    divergiu := case when existe then atual.ts_logico is distinct from base
                     else base is not null or novos is null end;

    if divergiu then
      update arretado.alteracoes set divergente = true where seq = nova_seq;
      divergentes := divergentes || jsonb_build_object(
        'colecao', e->>'colecao', 'registro_id', e->>'registro_id',
        'ts_servidor', case when existe then atual.ts_logico end);
    elsif existe then
      update arretado.registros
         set dados = novos, ts_logico = e->>'ts', atualizado_em = now(), recebido_em = now(),
             excluido_em = case when op = 'remover' then now() end
       where usuario_id = eu and colecao = atual.colecao and id = atual.id;
    else
      insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
      values (e->>'colecao', (e->>'registro_id')::uuid, eu, e->>'ts', now(), novos);
    end if;
  end loop;

  return jsonb_build_object(
    'seq_max', coalesce((select max(a.seq) from arretado.alteracoes a where a.usuario_id = eu), 0),
    'divergentes', divergentes);
end;
$$;
revoke execute on function arretado.enviar_lote(uuid, smallint, jsonb) from public, anon;
grant execute on function arretado.enviar_lote(uuid, smallint, jsonb) to authenticated;

-- Ponto de corte para um aparelho novo: ler antes de baixar `registros` (plano §1).
-- Volátil de propósito: espera o lote em andamento (mesma trava do enviar_lote) e só então lê o
-- máximo, num instantâneo novo; uma função `stable` leria o instantâneo anterior à espera.
create function arretado.instantaneo_inicio() returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  perform pg_advisory_xact_lock(hashtextextended(eu::text, 0));
  return coalesce((select max(a.seq) from arretado.alteracoes a where a.usuario_id = eu), 0);
end;
$$;
revoke execute on function arretado.instantaneo_inicio() from public, anon;
grant execute on function arretado.instantaneo_inicio() to authenticated;

create function arretado.registrar_sincronia(p_aparelho uuid, p_seq bigint, p_versao smallint)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  -- O seq informado nunca passa do maior que existe: um valor absurdo não pode adiantar a poda.
  insert into arretado.aparelhos_sync (usuario_id, aparelho_id, ultimo_seq_recebido, versao_esquema)
  values (eu, p_aparelho,
          least(greatest(p_seq, 0),
                coalesce((select max(a.seq) from arretado.alteracoes a where a.usuario_id = eu), 0)),
          p_versao)
  on conflict (usuario_id, aparelho_id) do update
    set ultimo_seq_recebido = greatest(arretado.aparelhos_sync.ultimo_seq_recebido, excluded.ultimo_seq_recebido),
        versao_esquema = excluded.versao_esquema,
        visto_em = now();
end;
$$;
revoke execute on function arretado.registrar_sincronia(uuid, bigint, smallint) from public, anon;
grant execute on function arretado.registrar_sincronia(uuid, bigint, smallint) to authenticated;

-- Posse (D17). Validade 2 min, renovada a cada 30 s. Concede sem perguntar quando: não há dono,
-- a validade venceu, o dono soltou, o dono é o próprio aparelho ou o dono não dá sinal há 60 s.
-- Se o dono está ativo, devolve `concedida = false` e o cliente pergunta; `p_forcar` assume.
create function arretado.pedir_posse(p_aparelho uuid, p_forcar boolean default false)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
  atual arretado.posse_aparelho%rowtype;
  livre boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(eu::text, 0));
  select * into atual from arretado.posse_aparelho where usuario_id = eu for update;
  livre := not found
    or atual.aparelho_id = p_aparelho
    or atual.ate <= now()
    or atual.atualizado_em < now() - interval '60 seconds';
  if livre or coalesce(p_forcar, false) then
    insert into arretado.posse_aparelho (usuario_id, aparelho_id, ate, atualizado_em)
    values (eu, p_aparelho, now() + interval '2 minutes', now())
    on conflict (usuario_id) do update
      set aparelho_id = excluded.aparelho_id, ate = excluded.ate, atualizado_em = now();
    return jsonb_build_object('concedida', true, 'aparelho_id', p_aparelho);
  end if;
  return jsonb_build_object('concedida', false, 'aparelho_id', atual.aparelho_id,
                            'ultimo_sinal', atual.atualizado_em);
end;
$$;
revoke execute on function arretado.pedir_posse(uuid, boolean) from public, anon;
grant execute on function arretado.pedir_posse(uuid, boolean) to authenticated;

create function arretado.soltar_posse(p_aparelho uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  update arretado.posse_aparelho set ate = now(), atualizado_em = now()
   where usuario_id = eu and aparelho_id = p_aparelho;
end;
$$;
revoke execute on function arretado.soltar_posse(uuid) from public, anon;
grant execute on function arretado.soltar_posse(uuid) to authenticated;
