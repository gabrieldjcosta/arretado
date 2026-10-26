-- Reversão da F4-B (B5, poda). Não devolve o que a poda já apagou do log: o estado continua em
-- `registros` e os aparelhos recarregam se precisarem.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $tira$select cron.unschedule('arretado-podar-sincronizacao')
                   where exists (select 1 from cron.job where jobname = 'arretado-podar-sincronizacao')$tira$;
  end if;
end;
$$;
drop function if exists arretado.podar_sincronizacao(interval, interval);
drop function if exists arretado.ponto_da_poda();

-- Volta as duas funções do B1 ao corpo original (sem contar o ponto da poda).
create or replace function arretado.instantaneo_inicio() returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := arretado.exigir_sincronizacao();
begin
  perform pg_advisory_xact_lock(hashtextextended(eu::text, 0));
  return coalesce((select max(a.seq) from arretado.alteracoes a where a.usuario_id = eu), 0);
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
drop function if exists arretado.maior_seq(uuid);
drop table if exists arretado.poda_sync;
