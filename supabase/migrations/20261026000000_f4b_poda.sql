-- Arretado — F4-B (sincronização), pacote B5: poda do log. Plano: docs/planos/f4b-sincronizacao.md §3.
-- Só aditiva. Reversão: supabase/rollback/20261026000000_f4b_poda.down.sql.
--
--   poda_sync            — até onde o log de cada conta já foi podado (o aparelho atrás disso recarrega)
--   ponto_da_poda        — o cliente lê o seu ponto antes e depois de puxar o log
--   podar_sincronizacao  — a poda em si; roda toda semana pelo pg_cron, nunca pelo cliente
--
-- Regras (prazos padrão, confirmados pelo Gabriel no cartão do B5):
--   - sai de `alteracoes` a entrada com mais de 30 dias que TODOS os aparelhos vistos nos últimos
--     90 dias já receberam (`aparelhos_sync.ultimo_seq_recebido`); aparelho parado há mais de 90 dias
--     deixa de segurar a poda e, ao voltar, recarrega de `registros` (o checkpoint é o estado);
--   - `acervo-adesao` nunca sai: a recarga refaz as árvores do acervo pelo log;
--   - lápide (`excluido_em`) com mais de 90 dias fica só com id e dono em `dados`: o fato "foi
--     apagado" continua lá para o aparelho que volta, sem guardar a última versão para sempre.

create table arretado.poda_sync (
  usuario_id uuid        primary key references auth.users (id) on delete cascade,
  podado_ate bigint      not null default 0,
  podado_em  timestamptz not null default now()
);
alter table arretado.poda_sync enable row level security;
alter table arretado.poda_sync force row level security;
revoke all on arretado.poda_sync from anon, authenticated;

-- Maior `seq` que a poda já pode ter tirado do log desta conta. Aparelho com cursor abaixo dele
-- perdeu o fio do log e recarrega.
create function arretado.ponto_da_poda() returns bigint
language plpgsql stable security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  return coalesce((select p.podado_ate from arretado.poda_sync p where p.usuario_id = eu), 0);
end;
$$;
revoke execute on function arretado.ponto_da_poda() from public, anon;
grant execute on function arretado.ponto_da_poda() to authenticated;

-- O maior `seq` da conta conta também o que a poda já tirou: sem isso, com o log todo podado, o
-- aparelho que recarrega ficaria com o cursor abaixo do ponto da poda e recarregaria toda rodada.
create function arretado.maior_seq(eu uuid) returns bigint
language sql stable set search_path = ''
as $$
  select greatest(
    coalesce((select max(a.seq) from arretado.alteracoes a where a.usuario_id = eu), 0),
    coalesce((select p.podado_ate from arretado.poda_sync p where p.usuario_id = eu), 0));
$$;
revoke execute on function arretado.maior_seq(uuid) from public, anon, authenticated;

create or replace function arretado.instantaneo_inicio() returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  perform pg_advisory_xact_lock(hashtextextended(eu::text, 0));
  return arretado.maior_seq(eu);
end;
$$;

create or replace function arretado.registrar_sincronia(p_aparelho uuid, p_seq bigint, p_versao smallint)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  -- O seq informado nunca passa do maior que existe: um valor absurdo não pode adiantar a poda.
  insert into arretado.aparelhos_sync (usuario_id, aparelho_id, ultimo_seq_recebido, versao_esquema)
  values (eu, p_aparelho, least(greatest(p_seq, 0), arretado.maior_seq(eu)), p_versao)
  on conflict (usuario_id, aparelho_id) do update
    set ultimo_seq_recebido = greatest(arretado.aparelhos_sync.ultimo_seq_recebido, excluded.ultimo_seq_recebido),
        versao_esquema = excluded.versao_esquema,
        visto_em = now();
end;
$$;

-- Sem `security definer` e sem permissão para o cliente: só o dono do banco (pg_cron) roda.
-- Devolve quantas entradas saíram do log.
create function arretado.podar_sincronizacao(
  p_guarda   interval default interval '30 days',
  p_ausencia interval default interval '90 days'
) returns bigint
language plpgsql set search_path = ''
as $$
declare
  conta record;
  maior bigint;
  saiu bigint;
  total bigint := 0;
begin
  for conta in
    select a.usuario_id, min(a.ultimo_seq_recebido) as recebido_por_todos
      from arretado.aparelhos_sync a
     where a.visto_em > now() - p_ausencia
     group by a.usuario_id
  loop
    with apagadas as (
      delete from arretado.alteracoes x
       where x.usuario_id = conta.usuario_id
         and x.seq <= conta.recebido_por_todos
         and x.recebido_em < now() - p_guarda
         and x.operacao <> 'acervo-adesao'
      returning x.seq
    )
    select max(seq), count(*) into maior, saiu from apagadas;
    if saiu > 0 then
      insert into arretado.poda_sync (usuario_id, podado_ate, podado_em)
      values (conta.usuario_id, maior, now())
      on conflict (usuario_id) do update
        set podado_ate = greatest(arretado.poda_sync.podado_ate, excluded.podado_ate),
            podado_em = now();
      total := total + saiu;
    end if;
  end loop;

  update arretado.registros r
     set dados = jsonb_build_object('id', r.id::text, 'usuarioId', r.usuario_id::text)
   where r.excluido_em < now() - p_ausencia
     and r.dados <> jsonb_build_object('id', r.id::text, 'usuarioId', r.usuario_id::text);

  return total;
end;
$$;
revoke execute on function arretado.podar_sincronizacao(interval, interval) from public, anon, authenticated;

-- Agenda semanal (domingo, 06:17 UTC). No Supabase o pg_cron está sempre disponível, então esta
-- migração liga a extensão sozinha; se não estiver (PGlite dos testes), segue sem agenda.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute $agenda$select cron.schedule('arretado-podar-sincronizacao', '17 6 * * 0',
                                         'select arretado.podar_sincronizacao()')$agenda$;
  end if;
end;
$$;
