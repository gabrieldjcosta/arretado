-- Arretado — conferência da RLS no projeto Supabase real (F0, atividade 4.3).
-- Não é migração. Rodar inteiro (execute_sql do conector ou SQL Editor): tudo acontece
-- numa transação desfeita no fim, e o último SELECT devolve a tabela de resultados.
-- Rodado em 23/09/2026 no projeto dgwoemewvpabbppascuw, com o resultado esperado:
--   01, 02, 13, 14 → 1        03, 04, 05, 06 → 0
--   07, 12 → recusado 42501 (row-level security)   08–11, 15 → recusado 42501 (permission denied)
-- Rodado de novo em 25/09/2026, depois da migração colecao_leituras (9.1), com o 16 → aceitou.

begin;
insert into auth.users (id) values
  ('0199a6c4-0000-7000-8000-00000000000a'), ('0199a6c4-0000-7000-8000-00000000000b');
create temp table resultado (teste text primary key, obtido text) on commit drop;
grant select, insert on resultado to authenticated, anon;

-- A grava um registro e uma entrada no log
set local role authenticated;
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000a';
insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
values ('erros', '0199a6c4-0000-7000-8000-0000000000a1', '0199a6c4-0000-7000-8000-00000000000a',
  '1790000000000-000000-0000000a', now(),
  '{"id":"0199a6c4-0000-7000-8000-0000000000a1","usuarioId":"0199a6c4-0000-7000-8000-00000000000a","oQueFoi":"x"}');
insert into arretado.alteracoes (usuario_id, aparelho_id, ts, colecao, registro_id, operacao)
values ('0199a6c4-0000-7000-8000-00000000000a', '0199a6c4-0000-7000-8000-00000000000a',
  '1790000000000-000000-0000000a', 'erros', '0199a6c4-0000-7000-8000-0000000000a1', 'gravar');
insert into resultado select '01 A lê os próprios registros', count(*)::text from arretado.registros;
insert into resultado select '02 A lê o próprio log', count(*)::text from arretado.alteracoes;

-- B tenta ler, alterar, apagar e gravar em nome de A
set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000b';
insert into resultado select '03 B lê registros de A', count(*)::text from arretado.registros;
insert into resultado select '04 B lê o log de A', count(*)::text from arretado.alteracoes;
with u as (
  update arretado.registros set excluido_em = now(), dados = dados || '{"oQueFoi":"B"}'
  where id = '0199a6c4-0000-7000-8000-0000000000a1' returning 1)
insert into resultado select '05 B altera registro de A (linhas afetadas)', count(*)::text from u;
with d as (
  delete from arretado.registros where id = '0199a6c4-0000-7000-8000-0000000000a1' returning 1)
insert into resultado select '06 B apaga registro de A (linhas afetadas)', count(*)::text from d;
do $$ begin
  insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
  values ('erros', '0199a6c4-0000-7000-8000-0000000000a2', '0199a6c4-0000-7000-8000-00000000000a',
    '1790000000000-000000-0000000a', now(),
    '{"id":"0199a6c4-0000-7000-8000-0000000000a2","usuarioId":"0199a6c4-0000-7000-8000-00000000000a"}');
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
  insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
  values ('leituras', '0199a6c4-0000-7000-8000-0000000000a3', '0199a6c4-0000-7000-8000-00000000000a',
    '1790000000000-000000-0000000a', now(),
    '{"id":"0199a6c4-0000-7000-8000-0000000000a3","usuarioId":"0199a6c4-0000-7000-8000-00000000000a"}');
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

-- ── F4-B (B1): depois da migração 20261025000000 o cliente não escreve direto em registros /
-- alteracoes / posse_aparelho. As verificações acima que gravam direto em registros passam a
-- dar "recusado 42501" (esperado); a escrita legítima é enviar_lote, que exige o aceite.
set local role authenticated;
do $$ begin
  insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
  values ('erros', '0199a6c4-0000-7000-8000-0000000000f1', '0199a6c4-0000-7000-8000-00000000000a',
    '1790000000000-000000-0000000a', now(),
    '{"id":"0199a6c4-0000-7000-8000-0000000000f1","usuarioId":"0199a6c4-0000-7000-8000-00000000000a"}');
  insert into resultado values ('B1-1 A grava direto em registros (esperado: recusado 42501)', 'aceitou');
exception when others then
  insert into resultado values ('B1-1 A grava direto em registros (esperado: recusado 42501)', 'recusado ' || sqlstate);
end $$;
do $$ begin
  perform arretado.enviar_lote('0199a6c4-0000-7000-8000-0000000000e1', 9::smallint, '[]'::jsonb);
  insert into resultado values ('B1-2 enviar_lote sem aceitar a sincronização (esperado: recusado 42501)', 'aceitou');
exception when others then
  insert into resultado values ('B1-2 enviar_lote sem aceitar a sincronização (esperado: recusado 42501)', 'recusado ' || sqlstate);
end $$;
reset role;
select teste, obtido from resultado order by teste;
rollback;
