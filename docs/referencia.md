# Referência técnica (muda pouco)

Movido de `proxima-sessao.md` em 13/10/2026 para deixar aquele arquivo só com estado, próxima atividade e pendências.


## Publicação no Cloudflare (Worker `arretado`, T18) — no ar desde 23/09/2026

O Gabriel conferiu em 23/09/2026: builds do `main` verdes no painel (o último, `5d70c13`) e o app abrindo no celular em https://arretado.gabrieldjcosta.workers.dev. O `wrangler.jsonc` na raiz diz ao Cloudflare que o site é a pasta `dist/`, com os cabeçalhos do `dist/_headers` (a partir de `config/seguranca.ts`); o `.node-version` = 22 vale também no build.

- **Daqui em diante não há passo manual:** cada merge no `main` dispara build e publicação sozinho (Workers Builds). Exceções:
  - subida de esquema futura: backup manual (Conta › Dados › Exportar) **antes** do merge que a publica e, depois, recarregar as abas abertas do app (a 9.1, primeira subida, já foi publicada em 24/09/2026; a 9.2, a 9.3, a 9.4 e a 1ª parte da 9.5 não sobem o esquema);
  - se o celular mostrar a versão antiga, fechar a aba e abrir de novo.
- **Falta (Gabriel, sem pressa):**
  - conferir os cabeçalhos no computador (a sessão na nuvem não alcança o `workers.dev`): no Git Bash, `curl -sI https://arretado.gabrieldjcosta.workers.dev | grep -i content-security`; no PowerShell, `curl.exe -sI … | findstr /i content-security`;
  - opcional: desligar os builds de branches que não são o `main`, que marcam todo PR com um check vermelho sem efeito (ver `solucao-de-problemas.md` › "Check `Workers Builds` vermelho em todo PR").
- A importação por URL da F2 (T17, atividades 12.1–12.2) entra neste mesmo Worker como rota `/api/buscar-norma` (`main` + `assets.run_worker_first` no `wrangler.jsonc`). Plano B, se uma lei imensa estourar o limite de processamento: Edge Function no projeto Supabase, aceitando a pausa (ver T17).

Os dados ficam no navegador de cada endereço. Endereço oficial: https://arretado.cc (decisão de 20/10/2026; o `workers.dev` segue no ar durante a transição). Os dados de um endereço não aparecem no outro: antes de passar a usar o `arretado.cc`, exportar em Conta › Dados no endereço antigo e importar no novo. Trocar de endereço ou de navegador pede exportar e importar em Conta › Dados.

## Projeto Supabase (atividade 4.3, concluída em 23/09/2026)

| | |
|---|---|
| Nome · referência | `arretado` · `dgwoemewvpabbppascuw` |
| URL pública | https://dgwoemewvpabbppascuw.supabase.co |
| Região · banco | `sa-east-1` (São Paulo) · Postgres 17 |
| Organização · plano | GJC's Org (`phapzxwurkbwklanvxdy`) · free, US$ 0 (pausa após 7 dias sem uso; reativar no painel ou com `restore_project`) |

Migrações aplicadas pelo conector, idênticas ao repositório (MD5 conferido; conferência de 23/09/2026 também confirmou as duas primeiras no remoto e o projeto ativo; a da 9.1 foi aplicada em 24/09/2026, às 21h18 de Brasília (00h18 UTC de 25/09, daí a versão no remoto), com o check conferido por `pg_get_constraintdef`, advisors iguais e `verificacao-rls-remota.sql` com os 16 resultados esperados). O `apply_migration` registra a versão com o horário UTC da aplicação, não com o prefixo do arquivo:

| Arquivo no repositório | Versão no remoto |
|---|---|
| `20260923000000_esquema_inicial.sql` | `20260923030320` |
| `20260923000100_ajustes_advisors.sql` | `20260923030802` |
| `20260924000000_colecao_leituras.sql` (9.1) | `20260925001816` |
| `20261010000000` … `20261014010000` (quatro migrações de coleções: vínculos de disciplina, pendências de releitura, frases, tarefas de estudo, vínculos de precedente — aplicadas em 14/10/2026) | versões de 14/10/2026 (UTC); nomes iguais aos dos arquivos sem o prefixo de data |
| `20261014020000_f4a_contas.sql` (F4-A, A2) | aplicada em 14/10/2026 (UTC) como `f4a_contas`; `verificacao-f4a-remota.sql` deu 01→1, 02→0, 03–07 recusado; advisors de segurança só com INFO (RLS sem política em `convites` e `exclusoes`, por desenho) |

- **Advisors:** segurança sem alertas. Desempenho: a migração `ajustes_advisors` corrigiu o aviso de duas políticas permissivas de leitura em `catalogo` e a chave estrangeira `catalogo.curador_id` sem índice. Fica só o aviso informativo "índice não usado", esperado até haver tráfego. `rls.test.ts` ganhou guardas para esses dois lints.
- **RLS no projeto real:** `supabase/verificacao-rls-remota.sql`, com 15 verificações numa transação desfeita. B não lê, não altera, não apaga e não grava em nome de A. Ninguém altera nem apaga o log, nem o próprio dono. O anônimo não lê dado pessoal. Repetir depois de toda migração nova.
- **Chaves:** nenhuma no repositório. A chave anônima só entra na F4.
- **Lembretes para a F4:** expor o esquema `arretado` na API (Settings › API › Exposed schemas). Se o projeto estiver pausado, reativá-lo antes. Se um dia adotar o Supabase CLI, alinhar as versões da tabela acima com `supabase migration repair`.

## Como validar tudo

```
npm run check      # formato, lint, tipos, testes (1.593 em 13/10/2026), auditoria
npx vitest run --project unidade --maxWorkers=4   # no Windows, se o check falhar só por tempo (ver solucao-de-problemas.md)
npm run carga      # 10 mil registros e a leitura de uma norma de 5 mil dispositivos dentro dos limiares
npm run test:e2e   # Playwright + axe, desktop, celular e tablet
npm run build      # dist/ com _headers
node scripts/capturas-ui.mjs --rotas todas --medir --folhas   # revisão visual: 27 rotas × 3 aparelhos × 2 temas, com medidas (rolagem horizontal, alvos de 44 px, "+" sobre texto); exige dist/ (ver docs/design/sistema-visual.md › Como conferir)
npm run corpus:colar   # recaptura os colados (sem rede; só depois que uma página mudar)
npm run corpus:gabarito   # regera os gabaritos e as folhas de conferência (sem rede)
```

## Mapa do código

Nomes, entidades, eventos e operações em detalhe: [`glossario.md`](glossario.md).

```
config/seguranca.ts           CSP e cabeçalhos da hospedagem (fonte única)
eslint/regra-camadas.js       dependências entre camadas (Parte 1 §6)
src/core/modelo/              esquemas zod de todas as entidades + registro ENTIDADES
src/core/persistencia/        Dexie, coleções paginadas (e criarLote, obterPorChaves), log de alterações, Repositorio, anexos
src/core/eventos/             barramento em processo
src/core/pacote/              .arretado: exportar, ler, cifra, 7 modos, snapshot, espaços
src/core/seguranca/           sanitizador de HTML → estrutura (sem `style` no parser: semEstiloEmLinha)
src/dominios/recall/          agendamento (6 caixas), causa sugerida, serviço do Recall
src/dominios/legislacao/      estruturador da F2: estruturar (estruturador.ts), tipos do rascunho (rascunho.ts),
                              normalização, regra 1 (normalizacao.ts), linhas (linhas.ts), pré-normativo,
                              regra 2 (prenormativo.ts), estrutura, regra 3 (estrutura.ts), rubrica e artigo,
                              regras 4 e 5 (artigo.ts), parágrafo a item, regra 6 (dispositivo.ts), ordem de
                              leitura (ordem.ts), notas de vigência, regra 7 (notas.ts: espécie, lei,
                              ano, a mais recente), linha tachada, regras 8 e 9 (redacoes.ts), renumeração,
                              regra 10 (renumeracao.ts);
                              serviço do rascunho (servico.ts: criar, pendentes, retomar, descartar, verificar, publicar e a mesma fonte) e
                              sumário da importação (sumario.ts: contagem por tipo, descartes, página compilada) e
                              conversão em registros do modelo e fonte guardada (registros.ts); leitura da norma publicada
                              (leitor.ts: abrirNorma, lerJanela; normasPublicadas, a lista da Biblioteca); consultas paginadas do módulo (consultas.ts);
                              testes com o corpus (*-corpus.test.ts; scripts/corpus-estruturador.test.ts)
src/testes/gabarito.ts        comparação do rascunho com o gabarito: árvore, artigos, dispositivos, rubricas, texto, notas, status e redações (só testes)
src/testes/norma-sintetica.ts norma sintética de N dispositivos para a carga da leitura (9.4)
src/integracoes/pontos/       CSV da planilha do Ciclo → Disciplinas e Pontos
src/suporte/relatos.ts        "!" Relatar problema
src/apresentacao/             shell, Conta › Dados/Aparência/Privacidade, Orientações,
                              Recall (captura, completar, abas, drill), Plano, Biblioteca › Normas
                              (biblioteca/: Normas.tsx; Importar.tsx, colar → sumário → publicar; rotulos.ts)
supabase/migrations/          esquema remoto com RLS; teste em supabase/rls.test.ts
supabase/verificacao-rls-remota.sql   conferência da RLS no projeto real (não é migração)
scripts/corpus-normas.mjs     npm run corpus: baixa o corpus de normas (F2, 7.1)
scripts/corpus-colar.mjs      npm run corpus:colar: captura o colar de cada página no Chromium (7.2)
scripts/corpus-gabarito.mjs   npm run corpus:gabarito: gabarito de cada norma e folha de conferência (7.3)
scripts/corpus/               catálogo e verificação das páginas (normas.mjs), dos derivados (derivados.mjs)
                              e regras do gabarito (gabarito.mjs; o estruturador não o importa)
corpus/normas/                páginas oficiais byte a byte + manifesto.json (hashes, charset);
                              colados (*.colado.html/.txt) + colados.json; gabaritos das 5 normas (*.gabarito.json)
docs/conferencias/            folhas de conferência dos gabaritos (amostra de 50 por norma, com link)
e2e/                          Playwright + axe; vigilância automática de CSP e console
```
