-- Arretado — coleção `tarefasDeEstudo` (F3, P0 Fundação, esquema local v7).
-- Entidade pessoal do módulo plano; entra no pacote e, na F4, no espelho remoto. Os campos novos de
-- `sessoes` e `preferencias` são opcionais dentro do JSON do registro: não pedem coluna.
-- O check da coluna é recriado com a lista inteira (o teste de deriva em supabase/rls.test.ts
-- lê a definição mais recente de `registros_colecao_check`).
alter table arretado.registros drop constraint registros_colecao_check;
alter table arretado.registros add constraint registros_colecao_check check (colecao in (
    'usuarios', 'aparelhos', 'preferencias', 'fontes', 'anexos', 'tags', 'vinculos',
    'concursos', 'fasesPrazos', 'editais', 'disciplinas', 'pontos', 'tarefasDeEstudo',
    'dias', 'sessoes',
    'erros', 'frases', 'cartoes', 'revisoes', 'revisoesFrase',
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'marcacoes', 'estrelas',
    'leituras', 'vinculosDisciplina', 'pendenciasReleitura',
    'pacotesIncidencia', 'adesoes',
    'precedentes', 'notas', 'achados', 'eventosCalendario', 'relatos'
  ));
