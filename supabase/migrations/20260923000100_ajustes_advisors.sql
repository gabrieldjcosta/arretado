-- Arretado — ajustes apontados pelos advisors do Supabase no projeto real (F0, atividade 4.3).
-- Segurança: nenhum alerta. Desempenho: os dois achados abaixo; "índice não usado" fica,
-- porque o banco está vazio até a F4. Guardas equivalentes em supabase/rls.test.ts.

-- Chave estrangeira sem índice (lint 0001): apagar um curador varreria o catálogo inteiro.
create index catalogo_curador on arretado.catalogo (curador_id);

-- Duas políticas permissivas de leitura para authenticated (lint 0006): toda consulta
-- avaliava as duas. Uma política por papel, mesma regra: o anônimo lê o publicado; o
-- autenticado lê o publicado e o que ele mesmo curou.
drop policy catalogo_ler_publicado on arretado.catalogo;
drop policy catalogo_curador_ler on arretado.catalogo;
create policy catalogo_ler_publicado on arretado.catalogo
  for select to anon
  using (publicado);
create policy catalogo_ler on arretado.catalogo
  for select to authenticated
  using (publicado or curador_id = (select auth.uid()));
