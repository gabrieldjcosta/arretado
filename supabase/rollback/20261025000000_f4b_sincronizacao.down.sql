-- Reversão da F4-B (B1). Seguro enquanto registros/alteracoes estão vazios; com dados de estudo
-- na nuvem, exportar antes (a volta da lista fixa de coleções recusa coleção fora dela).
drop function if exists arretado.soltar_posse(uuid);
drop function if exists arretado.pedir_posse(uuid, boolean);
drop function if exists arretado.registrar_sincronia(uuid, bigint, smallint);
drop function if exists arretado.instantaneo_inicio();
drop function if exists arretado.enviar_lote(uuid, smallint, jsonb);
drop function if exists arretado.exigir_sincronizacao();
drop function if exists arretado.aceitar_sincronizacao();
drop table if exists arretado.aparelhos_sync;
alter table arretado.perfis drop column if exists sincronizacao_aceita_em;

drop policy if exists posse_ler on arretado.posse_aparelho;
create policy posse_dono on arretado.posse_aparelho
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
grant insert, update on arretado.posse_aparelho to authenticated;

drop index if exists arretado.alteracoes_idempotencia;
alter table arretado.alteracoes drop constraint if exists alteracoes_dados_tamanho;
delete from arretado.alteracoes where operacao = 'acervo-adesao';
alter table arretado.alteracoes drop constraint alteracoes_operacao_check;
alter table arretado.alteracoes add constraint alteracoes_operacao_check
  check (operacao in ('gravar', 'atualizar', 'remover'));
alter table arretado.alteracoes drop column if exists versao_esquema;
alter table arretado.alteracoes drop column if exists divergente;
alter table arretado.alteracoes drop column if exists base_ts;
create policy alteracoes_inserir on arretado.alteracoes
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));
grant insert on arretado.alteracoes to authenticated;

drop policy if exists registros_ler on arretado.registros;
create policy registros_dono on arretado.registros
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
grant insert, update, delete on arretado.registros to authenticated;
alter table arretado.registros drop constraint if exists registros_dados_tamanho;
alter table arretado.registros drop constraint registros_colecao_check;
alter table arretado.registros add constraint registros_colecao_check check (colecao in (
    'usuarios', 'aparelhos', 'preferencias', 'fontes', 'anexos', 'tags', 'vinculos',
    'concursos', 'fasesPrazos', 'editais', 'disciplinas', 'pontos', 'tarefasDeEstudo', 'ciclos',
    'dias', 'sessoes',
    'erros', 'frases', 'cartoes', 'revisoes', 'revisoesFrase',
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'marcacoes', 'estrelas',
    'leituras', 'vinculosDisciplina', 'pendenciasReleitura',
    'pacotesIncidencia', 'adesoes',
    'precedentes', 'vinculosPrecedenteDispositivo', 'vinculosEntrePrecedentes',
    'notas', 'achados', 'eventosCalendario', 'relatos'
  ));
