-- Arretado — coleções `vinculosPrecedenteDispositivo` e `vinculosEntrePrecedentes` (F3-C, C2,
-- esquema local v8). Entidades pessoais do módulo precedentes; entram no pacote e, na F4, no
-- espelho remoto. `Precedente.trechosChave`/`favorito` e `Frase.trechoDePrecedente` são opcionais
-- dentro do JSON do registro: não pedem coluna. O check é recriado com a lista inteira (o teste de
-- deriva em supabase/rls.test.ts lê a definição mais recente de `registros_colecao_check`).
alter table arretado.registros drop constraint registros_colecao_check;
alter table arretado.registros add constraint registros_colecao_check check (colecao in (
    'usuarios', 'aparelhos', 'preferencias', 'fontes', 'anexos', 'tags', 'vinculos',
    'concursos', 'fasesPrazos', 'editais', 'disciplinas', 'pontos', 'tarefasDeEstudo',
    'dias', 'sessoes',
    'erros', 'frases', 'cartoes', 'revisoes', 'revisoesFrase',
    'normas', 'versoesNorma', 'dispositivos', 'textosDispositivo', 'marcacoes', 'estrelas',
    'leituras', 'vinculosDisciplina', 'pendenciasReleitura',
    'pacotesIncidencia', 'adesoes',
    'precedentes', 'vinculosPrecedenteDispositivo', 'vinculosEntrePrecedentes',
    'notas', 'achados', 'eventosCalendario', 'relatos'
  ));
