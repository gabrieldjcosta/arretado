-- Arretado — coleção `leituras` (F2, atividade 9.1): "lido até" e posição de cada norma.
-- Entidade pessoal do módulo legislacao; entra no pacote e, na F4, no espelho remoto.
-- O check da coluna é recriado com a lista inteira (o teste de deriva em supabase/rls.test.ts
-- lê a definição mais recente de `registros_colecao_check`).
alter table arretado.registros drop constraint registros_colecao_check;
alter table arretado.registros add constraint registros_colecao_check check (colecao in (
    'usuarios', 'aparelhos', 'preferencias', 'fontes', 'anexos', 'tags', 'vinculos',
    'concursos', 'fasesPrazos', 'editais', 'disciplinas', 'pontos',
    'dias', 'sessoes',
    'erros', 'cartoes', 'revisoes',
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'marcacoes', 'estrelas',
    'leituras',
    'pacotesIncidencia', 'adesoes',
    'precedentes', 'notas', 'achados', 'eventosCalendario', 'relatos'
  ));
