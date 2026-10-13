-- Arretado — coleções `frases` e `revisoesFrase` (Frases 1, esquema local v6; D25, T22).
-- Entidades pessoais do módulo recall; entram no pacote e, na F4, no espelho remoto.
-- O check da coluna é recriado com a lista inteira (o teste de deriva em supabase/rls.test.ts
-- lê a definição mais recente de `registros_colecao_check`).
alter table arretado.registros drop constraint registros_colecao_check;
alter table arretado.registros add constraint registros_colecao_check check (colecao in (
    'usuarios', 'aparelhos', 'preferencias', 'fontes', 'anexos', 'tags', 'vinculos',
    'concursos', 'fasesPrazos', 'editais', 'disciplinas', 'pontos',
    'dias', 'sessoes',
    'erros', 'frases', 'cartoes', 'revisoes', 'revisoesFrase',
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'marcacoes', 'estrelas',
    'leituras', 'vinculosDisciplina', 'pendenciasReleitura',
    'pacotesIncidencia', 'adesoes',
    'precedentes', 'notas', 'achados', 'eventosCalendario', 'relatos'
  ));
