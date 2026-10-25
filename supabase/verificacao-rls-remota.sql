-- Arretado — conferência da RLS no projeto Supabase real (F0, atividade 4.3).
-- Não é migração. Rodar inteiro (execute_sql do conector ou SQL Editor): tudo acontece
-- numa transação desfeita no fim, e o último SELECT devolve a tabela de resultados.
-- Rodado em 23/09/2026 no projeto dgwoemewvpabbppascuw, com o resultado esperado:
--   01, 02, 13, 14 → 1        03, 04, 05, 06 → 0
--   07, 12 → recusado 42501 (row-level security)   08–11, 15 → recusado 42501 (permission denied)
-- Rodado de novo em 25/09/2026, depois da migração colecao_leituras (9.1), com o 16 → aceitou.
--
-- Depois da migração 20261025000000 (F4-B, B1) o cliente não escreve direto em registros, alteracoes
-- nem posse_aparelho: a escrita é arretado.enviar_lote, que exige aceitar a sincronização. Esperado:
--   01, 02, 13, 14 → 1     03, 04 → 0     16 → aceitou
--   05, 06, 08–12, 15, B1-1, B1-2 → recusado 42501 (permission denied / sincronização não aceita)
--   07 → recusado 23514 (o JSON do registro não é do dono)

begin;
insert into auth.users (id) values
  ('0199a6c4-0000-7000-8000-00000000000a'), ('0199a6c4-0000-7000-8000-00000000000b'), ('0199a6c4-0000-7000-8000-00000000000c');
update arretado.perfis set sincronizacao_liberada = true
  where usuario_id in ('0199a6c4-0000-7000-8000-00000000000a', '0199a6c4-0000-7000-8000-00000000000b');
create temp table resultado (teste text primary key, obtido text) on commit drop;
grant select, insert on resultado to authenticated, anon;

-- A aceita a sincronização e grava um registro (e a entrada no log) por enviar_lote
set local role authenticated;
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000a';
select arretado.aceitar_sincronizacao('v4:sincronizar');
select arretado.enviar_lote('0199a6c4-0000-7000-8000-0000000000e1', 9::smallint, '[{
  "ts": "1790000000000-000000-0000000a", "colecao": "erros", "registro_id": "0199a6c4-0000-7000-8000-0000000000a1",
  "operacao": "gravar",
  "dados": {"id": "0199a6c4-0000-7000-8000-0000000000a1", "usuarioId": "0199a6c4-0000-7000-8000-00000000000a", "oQueFoi": "x"}
}]'::jsonb);
insert into resultado select '01 A lê os próprios registros', count(*)::text from arretado.registros;
insert into resultado select '02 A lê o próprio log', count(*)::text from arretado.alteracoes;

-- B tenta ler, alterar, apagar e gravar em nome de A
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000b';
select arretado.aceitar_sincronizacao('v4:sincronizar');
insert into resultado select '03 B lê registros de A', count(*)::text from arretado.registros;
insert into resultado select '04 B lê o log de A', count(*)::text from arretado.alteracoes;
do $$ begin
  update arretado.registros set excluido_em = now(), dados = dados || '{"oQueFoi":"B"}'
  where id = '0199a6c4-0000-7000-8000-0000000000a1';
  insert into resultado values ('05 B altera registro de A', 'aceitou');
exception when others then
  insert into resultado values ('05 B altera registro de A', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
do $$ begin
  delete from arretado.registros where id = '0199a6c4-0000-7000-8000-0000000000a1';
  insert into resultado values ('06 B apaga registro de A', 'aceitou');
exception when others then
  insert into resultado values ('06 B apaga registro de A', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
do $$ begin
  perform arretado.enviar_lote('0199a6c4-0000-7000-8000-0000000000e1', 9::smallint, '[{
    "ts": "1790000000000-000000-0000000a", "colecao": "erros",
    "registro_id": "0199a6c4-0000-7000-8000-0000000000a2", "operacao": "gravar",
    "dados": {"id": "0199a6c4-0000-7000-8000-0000000000a2", "usuarioId": "0199a6c4-0000-7000-8000-00000000000a"}
  }]'::jsonb);
  insert into resultado values ('07 B grava registro em nome de A', 'aceitou');
exception when others then
  insert into resultado values ('07 B grava registro em nome de A', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
do $$ begin
  update arretado.alteracoes set operacao = 'remover';
  insert into resultado values ('08 B altera o log', 'aceitou');
exception when others then
  insert into resultado values ('08 B altera o log', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
do $$ begin
  delete from arretado.alteracoes;
  insert into resultado values ('09 B apaga o log', 'aceitou');
exception when others then
  insert into resultado values ('09 B apaga o log', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;

-- Nem o dono altera ou apaga o próprio log; nem passa registro próprio para B
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000a';
do $$ begin
  update arretado.alteracoes set operacao = 'remover';
  insert into resultado values ('10 A altera o próprio log', 'aceitou');
exception when others then
  insert into resultado values ('10 A altera o próprio log', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
do $$ begin
  delete from arretado.alteracoes;
  insert into resultado values ('11 A apaga o próprio log', 'aceitou');
exception when others then
  insert into resultado values ('11 A apaga o próprio log', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
do $$ begin
  update arretado.registros
  set usuario_id = '0199a6c4-0000-7000-8000-00000000000b',
      dados = jsonb_set(dados, '{usuarioId}', '"0199a6c4-0000-7000-8000-00000000000b"')
  where id = '0199a6c4-0000-7000-8000-0000000000a1';
  insert into resultado values ('12 A passa registro próprio para B', 'aceitou');
exception when others then
  insert into resultado values ('12 A passa registro próprio para B', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
insert into resultado select '13 A: registro intacto (não excluído, oQueFoi=x)', count(*)::text
  from arretado.registros where excluido_em is null and dados->>'oQueFoi' = 'x';
insert into resultado select '14 A: log intacto (1 linha, gravar)', count(*)::text
  from arretado.alteracoes where operacao = 'gravar';
do $$ begin
  perform arretado.enviar_lote('0199a6c4-0000-7000-8000-0000000000e1', 9::smallint, '[{
    "ts": "1790000000001-000000-0000000a", "colecao": "leituras",
    "registro_id": "0199a6c4-0000-7000-8000-0000000000a3", "operacao": "gravar",
    "dados": {"id": "0199a6c4-0000-7000-8000-0000000000a3", "usuarioId": "0199a6c4-0000-7000-8000-00000000000a"}
  }]'::jsonb);
  insert into resultado values ('16 A grava na coleção leituras (9.1)', 'aceitou');
exception when others then
  insert into resultado values ('16 A grava na coleção leituras (9.1)', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;

-- Anônimo, mesmo com o claim de A presente
set local role anon;
do $$ begin
  perform count(*) from arretado.registros;
  insert into resultado values ('15 anônimo lê registros', 'aceitou');
exception when others then
  insert into resultado values ('15 anônimo lê registros', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;

-- ── F4-B (B1): o cliente não escreve direto; quem não aceitou a sincronização não usa a função ──
set local role authenticated;
do $$ begin
  insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
  values ('erros', '0199a6c4-0000-7000-8000-0000000000f1', '0199a6c4-0000-7000-8000-00000000000a',
    '1790000000000-000000-0000000a', now(),
    '{"id":"0199a6c4-0000-7000-8000-0000000000f1","usuarioId":"0199a6c4-0000-7000-8000-00000000000a"}');
  insert into resultado values ('B1-1 A grava direto em registros', 'aceitou');
exception when others then
  insert into resultado values ('B1-1 A grava direto em registros', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000c';
do $$ begin
  perform arretado.enviar_lote('0199a6c4-0000-7000-8000-0000000000e1', 9::smallint, '[]'::jsonb);
  insert into resultado values ('B1-2 C (sem aceitar a sincronização) chama enviar_lote', 'aceitou');
exception when others then
  insert into resultado values ('B1-2 C (sem aceitar a sincronização) chama enviar_lote', 'recusado ' || sqlstate || ': ' || sqlerrm);
end $$;
reset role;
select teste, obtido from resultado order by teste;
rollback;
