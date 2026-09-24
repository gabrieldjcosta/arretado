# Próxima sessão — ponto de partida

Atualizado em 24/09/2026. Ler antes de qualquer trabalho (junto com o `CLAUDE.md`). Problemas conhecidos, armadilhas e suas soluções: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário → identificadores: [`glossario.md`](glossario.md).

## Estado

- **F0 (Fundamentos) e F1 (Recall + pontos do edital) implementadas**, revisadas e testadas. **Portões:** [`portoes/F0.md`](portoes/F0.md), **fechado em 23/09/2026**, e [`portoes/F1.md`](portoes/F1.md), aguardando o uso real.
- **No `main` desde 23/09/2026:** merge dos PRs [#1](https://github.com/gabrieldjcosta/arretado/pull/1) (F0/F1), [#2](https://github.com/gabrieldjcosta/arretado/pull/2) (plano da F2, 7.1, Supabase 4.3, glossário, solução de problemas), [#3](https://github.com/gabrieldjcosta/arretado/pull/3) (Worker, T18), [#4](https://github.com/gabrieldjcosta/arretado/pull/4) (7.2), [#5](https://github.com/gabrieldjcosta/arretado/pull/5) (nenhum código anterior; Cloudflare no ar), [#7](https://github.com/gabrieldjcosta/arretado/pull/7) (7.3, 1ª sessão), [#8](https://github.com/gabrieldjcosta/arretado/pull/8) (7.3, 2ª sessão, e `/code-review` da etapa 7) e [#9](https://github.com/gabrieldjcosta/arretado/pull/9) (8.1), este último em 24/09/2026.
- **Verificação:**
  - 506 testes unitários e de integração, incluindo a integridade do corpus da F2, dos colados e dos gabaritos das 5 normas e a normalização (8.1) sobre os 7 colados;
  - 82 E2E (Playwright + axe, desktop e celular);
  - carga de 10 mil registros;
  - CI verde.
- **Decisão de escopo (23/09/2026):** nada do Acervo antigo nem do Acumen v2 é importado; o conteúdo recomeça do zero (nota no topo das Partes 1 e 2).
- **F2 (Legislação) em execução**, em paralelo ao uso real da F1. Plano em [`planos/F2.md`](planos/F2.md).
  - Feito: 7.1, o corpus de 5 normas em 7 páginas; 7.2, o colar de cada página capturado no Chromium (`*.colado.html` e `*.colado.txt`); 7.3, os gabaritos das 5 normas (`*.gabarito.json`), tudo em `corpus/normas/`, com as folhas de conferência em `docs/conferencias/`; o `/code-review` da etapa 7 (10 achados, corrigidos); e a 8.1, os tipos do rascunho e a normalização (regra 1), em `src/dominios/legislacao/`, medida no corpus inteiro (ver "Fatos da normalização" no plano).
  - **Etapa 7 fechada, menos a conferência do Gabriel** (CF conferida em 24/09/2026, sem divergência; nas outras 4, só a conferência reduzida, 40 itens de risco no total). Ela não bloqueia a etapa 8, mas precisa estar feita antes da 8.9 (regressão contra o gabarito).
  - **Próxima atividade: 8.2** (blocos pré-normativos e hierarquia estrutural, regras 2 e 3).
  - **Leitura antecipada (Gabriel, 24/09/2026, 2ª rodada):** depois da 8.5, pular para a etapa 9 e ler a LEP e o ECA pela página compilada do Planalto; a 8.6–8.9 e a 9.8 vêm depois do marco. Detalhes e salvaguardas no plano, em "Leitura antecipada com LEP e ECA". A 7.4 (ECA e CDC no corpus, com gabarito) foi feita em 24/09/2026.
  - **Três atividades novas decididas pelo Gabriel em 24/09/2026** (ver "Decisões de 24/09/2026" no plano): 9.8, destaque automático de condicionantes e prazos; 11.8, leitura artigo por artigo no modo foco; 11.9, prévia de remissões. O marco da etapa 9 passava a vir depois da 9.8; com a leitura antecipada (2ª rodada), vem antes.

## Como abrir a próxima sessão (meta: até ~200 mil tokens por sessão)

Abrir uma sessão nova do Claude Code no repositório. Ela parte do `main` atualizado. Pedido sugerido:

> Leia `docs/proxima-sessao.md` e execute a próxima atividade da F2 seguindo a rotina de pronto do plano. Ao terminar, atualize este arquivo e `docs/solucao-de-problemas.md`, faça o commit num branch com PR para o `main` e me avise.

Uma sessão por atividade (a 8.2 é média, de 2 a 3 sessões: fechar cada sessão com o check verde e o `proxima-sessao.md` dizendo onde parou). Regras de economia de contexto no `CLAUDE.md`.

## Projeto Supabase (atividade 4.3, concluída em 23/09/2026)

| | |
|---|---|
| Nome · referência | `arretado` · `dgwoemewvpabbppascuw` |
| URL pública | https://dgwoemewvpabbppascuw.supabase.co |
| Região · banco | `sa-east-1` (São Paulo) · Postgres 17 |
| Organização · plano | GJC's Org (`phapzxwurkbwklanvxdy`) · free, US$ 0 (pausa após 7 dias sem uso; reativar no painel ou com `restore_project`) |

Migrações aplicadas pelo conector, idênticas ao repositório (MD5 conferido; conferência de 23/09/2026 também confirmou as duas no remoto e o projeto ativo). O `apply_migration` registra a versão com o horário UTC da aplicação, não com o prefixo do arquivo:

| Arquivo no repositório | Versão no remoto |
|---|---|
| `20260923000000_esquema_inicial.sql` | `20260923030320` |
| `20260923000100_ajustes_advisors.sql` | `20260923030802` |

- **Advisors:** segurança sem alertas. Desempenho: a migração `ajustes_advisors` corrigiu o aviso de duas políticas permissivas de leitura em `catalogo` e a chave estrangeira `catalogo.curador_id` sem índice. Fica só o aviso informativo "índice não usado", esperado até haver tráfego. `rls.test.ts` ganhou guardas para esses dois lints.
- **RLS no projeto real:** `supabase/verificacao-rls-remota.sql`, com 15 verificações numa transação desfeita. B não lê, não altera, não apaga e não grava em nome de A. Ninguém altera nem apaga o log, nem o próprio dono. O anônimo não lê dado pessoal. Repetir depois de toda migração nova.
- **Chaves:** nenhuma no repositório. A chave anônima só entra na F4.
- **Lembretes para a F4:** expor o esquema `arretado` na API (Settings › API › Exposed schemas). Se o projeto estiver pausado, reativá-lo antes. Se um dia adotar o Supabase CLI, alinhar as versões da tabela acima com `supabase migration repair`.

## Pendências, em ordem

### 1. Publicação no Cloudflare (Worker `arretado`, T18) — no ar desde 23/09/2026

O Gabriel conferiu em 23/09/2026: builds do `main` verdes no painel (o último, `5d70c13`) e o app abrindo no celular em https://arretado.gabrieldjcosta.workers.dev. O `wrangler.jsonc` na raiz diz ao Cloudflare que o site é a pasta `dist/`, com os cabeçalhos do `dist/_headers` (a partir de `config/seguranca.ts`); o `.node-version` = 22 vale também no build.

- **Daqui em diante não há passo manual:** cada merge no `main` dispara build e publicação sozinho (Workers Builds). Exceções:
  - a subida de esquema da F2 (9.1) pede backup manual (Conta › Dados › Exportar) **antes** do merge que a publica;
  - se o celular mostrar a versão antiga, fechar a aba e abrir de novo.
- **Falta (Gabriel, sem pressa):**
  - conferir os cabeçalhos no computador (a sessão na nuvem não alcança o `workers.dev`): no Git Bash, `curl -sI https://arretado.gabrieldjcosta.workers.dev | grep -i content-security`; no PowerShell, `curl.exe -sI … | findstr /i content-security`;
  - opcional: desligar os builds de branches que não são o `main`, que marcam todo PR com um check vermelho sem efeito (ver `solucao-de-problemas.md` › "Check `Workers Builds` vermelho em todo PR").
- A importação por URL da F2 (T17, atividades 12.1–12.2) entra neste mesmo Worker como rota `/api/buscar-norma` (`main` + `assets.run_worker_first` no `wrangler.jsonc`). Plano B, se uma lei imensa estourar o limite de processamento: Edge Function no projeto Supabase, aceitando a pausa (ver T17).

Os dados ficam no navegador de cada endereço. Usar sempre https://arretado.gabrieldjcosta.workers.dev; trocar de endereço ou de navegador pede exportar e importar em Conta › Dados.

### 2. Uso real da F1 (portão)

14 dias com revisão feita em pelo menos 10; metas em [`portoes/F1.md`](portoes/F1.md). Backup semanal em Conta › Dados › Exportar. Relatar problemas pelo "!".

### 3. Executar a F2 (Legislação) — plano em [`planos/F2.md`](planos/F2.md)

**Exceção à regra de fases (Gabriel, 23/09/2026):** a F2 roda já, em paralelo ao uso real da F1. O portão da F1 (item 2) continua sendo medido; a F3 só começa depois do portão da F2. O app publicado só recebe F2 ao fim de cada etapa revisada, e a subida de esquema (atividade 9.1) exige backup manual antes da publicação.

Seguir as etapas 7–13 do plano, na ordem do caminho crítico: 7 → 8 → 9 → 10/11 → 13, com a 12 correndo por fora.

- **Agora: 8.2** (blocos pré-normativos e hierarquia estrutural, com nome do nó e nível ausente; regras 2 e 3). Ler antes a Parte 2 §10.6 (regras 2 e 3), a etapa 8 do plano, os "Fatos do gabarito" e os "Fatos da normalização" (valem para o estruturador), e em `solucao-de-problemas.md` a seção Legislação (entradas "previsto — 8.2" e as da 8.1).
  - Ponto de partida pronto na 8.1: `normalizarBlocos` (primeiro passo, sempre) e `chaveDeCasamento` (onde as regex casam), em `src/dominios/legislacao/normalizacao.ts`; os tipos da saída (`Rascunho`, `NoRascunho`, `Descarte`, `Anomalia`) em `rascunho.ts`. A 8.2 cria o `estruturar` e a constante da versão do estruturador.
  - Entrega da 8.2 inclui o teste do sanitizador com o `cp.html` inteiro (a lei vem depois do `</html>`). A `normalizacao-corpus.test.ts` confere o HTML só da LEP, da LC 80 e da LC-SP 988 (cada página grande custa de 2 a 3 s de sanitizador): se a 8.2 sanitizar o CP e a CF uma vez para os seus testes, vale reaproveitar e conferir a normalização delas também.
- **Ordem (leitura antecipada, 24/09/2026):** 8.2–8.5 → 9.1–9.7 → marco antecipado (LEP e ECA) → 8.6–8.9 → 9.8 (o detector de destaques depende só da 8.1 e pode começar em paralelo) → `/code-review` das etapas 8 e 9 → etapas 10 e 11, com a 11.8 depois da 11.1 e a 11.9 depois da 11.6. O backlog dessas ideias (remissão para outra norma, "citado por", editar a lista de termos etc.) está no plano, em "Ordem e paralelismo".
- **CF conferida (Gabriel, 24/09/2026):** 50 de 50 itens sem divergência, já registrado em `cf.gabarito.json` › `conferencia`. Por isso as outras 4 folhas passaram a ter uma seção "Conferência reduzida" no topo: 10 itens de risco na LEP e no CP, 8 na LC 80 e 12 na LC-SP 988; com eles marcados, a sessão registra a norma como conferida (amostra reduzida, anotado em `observacoes`).
- **Conferência (Gabriel, 24/09/2026, commit d5e084b):** CP, LC 80 e LC-SP 988 conferidas (reduzida, sem divergência; registrado nos JSON). LEP: 8 de 10 sem divergência; a anotação do art. 18-A, § 3º ("7.627" é link para o Decreto 7.627/2011) corrigiu a regra das notas do gabarito, e a amostra mudou; **falta o art122**. ECA e CDC: só 8 e 7 dos 50 itens marcados — **perguntar ao Gabriel** se conclui ou se reduz como nas outras.
- **Quando a conferência chegar:** passar o resultado para `conferencia` no `*.gabarito.json` (`estado: "conferida"`, `por`, `em`, `observacoes`); se houver divergência, corrigir a regra em `scripts/corpus/gabarito.mjs` ou registrar a decisão em `DECISOES` e rodar `npm run corpus:gabarito`. O comando se recusa a regravar uma folha com marcas que ainda não foram para o JSON.
- **Regras que continuam valendo na etapa 8:**
  - o estruturador **não** importa nem copia `scripts/corpus/gabarito.mjs` (ver "Gabarito que só repete o estruturador" em `solucao-de-problemas.md`); se os dois divergirem, examinar o caso na página;
  - **sem código anterior (Gabriel, 23/09/2026):** o `extrair_lei.js` da skill `acumen-extrair-normas` não é usado nem copiado;
  - endereços do gabarito são propostos (`parUnico`, `alB`, `adct.art1`, `dt.art1`, `anexo`): a 8.4 decide e registra no glossário.
- **Rede no contêiner da nuvem:** Planalto e ALESP liberados pelo Gabriel em 24/09/2026. O `fetch` do Node precisa de `NODE_USE_ENV_PROXY=1` (`NODE_USE_ENV_PROXY=1 npm run corpus -- --so <ids>`); sempre com `--so`, porque o Planalto atualiza as páginas e o corpus já conferido não deve mudar (ver `solucao-de-problemas.md`). O `npm run corpus:colar` e o `npm test` funcionam sem rede.
- **Ler antes:** a Parte 2 §10.6. As armadilhas do Planalto (lições da skill `acumen-extrair-normas`) estão no plano e em `solucao-de-problemas.md`, seção Legislação.
- Sem importador do Acervo (decisão de escopo).
- O sanitizador (`src/core/seguranca/sanitizador.ts`) já entrega blocos com tachado, ênfase e link: é a entrada do estruturador.

### 4. Decisões pequenas que esperam o Gabriel (sem pressa; cada uma tem atividade)

- `Estrela.tipoOrigem` × `Cartao.origemTipo`: alinhar para `origemTipo` antes da 11.2, enquanto `estrelas` não tem dado (glossário §13).
- Rótulo "Ponto de restauração" para o Snapshot: "Ponto" é reservado ao item do edital (glossário §13).
- Termos marcados como "proposto" no glossário §12 (segmentos do endereço canônico, inclusive o prefixo do bloco `adct`/`dt`; `'vetado'` no `status`; ordem com sufixo e com bloco): decidir na atividade indicada.

## Como validar tudo

```
npm run check      # formato, lint, tipos, 506 testes (inclui corpus, colados, gabaritos e normalização), auditoria
npm run carga      # 10 mil registros dentro dos limiares
npm run test:e2e   # 82 cenários (Playwright + axe)
npm run build      # dist/ com _headers
npm run corpus:colar   # recaptura os colados (sem rede; só depois que uma página mudar)
npm run corpus:gabarito   # regera os gabaritos e as folhas de conferência (sem rede)
```

## Mapa do código

Nomes, entidades, eventos e operações em detalhe: [`glossario.md`](glossario.md).

```
config/seguranca.ts           CSP e cabeçalhos da hospedagem (fonte única)
eslint/regra-camadas.js       dependências entre camadas (Parte 1 §6)
src/core/modelo/              esquemas zod de todas as entidades + registro ENTIDADES
src/core/persistencia/        Dexie, coleções paginadas, log de alterações, Repositorio
src/core/eventos/             barramento em processo
src/core/pacote/              .arretado: exportar, ler, cifra, 7 modos, snapshot, espaços
src/core/seguranca/           sanitizador de HTML → estrutura
src/dominios/recall/          agendamento (6 caixas), causa sugerida, serviço do Recall
src/dominios/legislacao/      estruturador da F2: tipos do rascunho (rascunho.ts) e normalização,
                              regra 1 (normalizacao.ts); testes com o corpus (normalizacao-corpus.test.ts)
src/integracoes/pontos/       CSV da planilha do Ciclo → Disciplinas e Pontos
src/suporte/relatos.ts        "!" Relatar problema
src/apresentacao/             shell, Conta › Dados/Aparência/Privacidade, Orientações,
                              Recall (captura, completar, abas, drill), Plano
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
