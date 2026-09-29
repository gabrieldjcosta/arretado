# Próxima sessão — ponto de partida

Atualizado em 29/09/2026 (fim da 9.4). Ler antes de qualquer trabalho (junto com o `CLAUDE.md`). Problemas conhecidos, armadilhas e suas soluções: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário → identificadores: [`glossario.md`](glossario.md).

## Estado

- **F0 (Fundamentos) e F1 (Recall + pontos do edital) implementadas**, revisadas e testadas. **Portões:** [`portoes/F0.md`](portoes/F0.md), **fechado em 23/09/2026**, e [`portoes/F1.md`](portoes/F1.md), aguardando o uso real.
- **No `main` desde 23/09/2026:** merge dos PRs [#1](https://github.com/gabrieldjcosta/arretado/pull/1) (F0/F1), [#2](https://github.com/gabrieldjcosta/arretado/pull/2) (plano da F2, 7.1, Supabase 4.3, glossário, solução de problemas), [#3](https://github.com/gabrieldjcosta/arretado/pull/3) (Worker, T18), [#4](https://github.com/gabrieldjcosta/arretado/pull/4) (7.2), [#5](https://github.com/gabrieldjcosta/arretado/pull/5) (nenhum código anterior; Cloudflare no ar), [#7](https://github.com/gabrieldjcosta/arretado/pull/7) (7.3, 1ª sessão), [#8](https://github.com/gabrieldjcosta/arretado/pull/8) (7.3, 2ª sessão, e `/code-review` da etapa 7), [#9](https://github.com/gabrieldjcosta/arretado/pull/9) (8.1), [#10](https://github.com/gabrieldjcosta/arretado/pull/10) (leitura antecipada; ECA e CDC; CF conferida), [#11](https://github.com/gabrieldjcosta/arretado/pull/11) (conferência dos gabaritos), [#12](https://github.com/gabrieldjcosta/arretado/pull/12) (8.2), [#13](https://github.com/gabrieldjcosta/arretado/pull/13) (8.3), [#14](https://github.com/gabrieldjcosta/arretado/pull/14) (8.4), [#15](https://github.com/gabrieldjcosta/arretado/pull/15) (8.5) e [#16](https://github.com/gabrieldjcosta/arretado/pull/16) (9.1: leituras e Dexie v2; mergeado às 21h20 de 24/09/2026, com autorização do Gabriel e sem backup, porque o app ainda não tinha dado real), os últimos em 24/09/2026, [#17](https://github.com/gabrieldjcosta/arretado/pull/17) (9.2: o serviço do rascunho da norma; mergeado às 5h51 de 29/09/2026; não sobe o esquema, então sem backup) e [#18](https://github.com/gabrieldjcosta/arretado/pull/18) (9.3: publicar a versão da norma; mergeado às 7h29 de 29/09/2026; sem subida de esquema). A 9.4 está no PR [#19](https://github.com/gabrieldjcosta/arretado/pull/19), aguardando o merge.
- **Verificação:**
  - 821 testes unitários e de integração, incluindo a integridade do corpus da F2, dos colados e dos gabaritos, a normalização (8.1) sobre os colados e o estruturador contra a árvore estrutural (8.2), os artigos com a rubrica (8.3), os dispositivos com endereço, rubrica e texto da amostra (8.4) e as notas de vigência (8.5) dos 7 gabaritos, a subida de esquema v1 → v2 com o pacote v1 (9.1) o serviço do rascunho (9.2: as 11 páginas viram registros válidos do modelo; o CP inteiro grava em < 5 s) a publicação (9.3: conflitos, "a confirmar", duas abas e a norma publicada imutável; CP, LEP, ECA e LC 80 publicados) e a leitura por janela (9.4: só a versão vigente, nunca a arquivada nem o rascunho; CP, LEP, ECA e LC 80 lidos por janela iguais ao rascunho); no Windows, o check inteiro só passa com `--maxWorkers=4` (ver `solucao-de-problemas.md`);
  - 84 E2E (Playwright + axe, desktop e celular; a 9.1 acrescentou o aviso da aba antiga). A 9.3 e a 9.4 não mexem em tela (a apresentação nem importa o módulo `legislacao`) e não acrescentaram E2E. Na sessão da 9.3, o Windows do Gabriel não tinha o Chromium do Playwright, e o E2E rodou com o Chrome instalado (config temporário, ver `solucao-de-problemas.md` › "Playwright ou TypeScript desatualizados de propósito"): 82 de 84 passaram; os 2 restantes, "funciona sem rede depois de carregado", reprovam só por o Chrome de marca pedir o favicon offline. A referência é o CI do PR (Linux, Chromium fixado);
  - carga de 10 mil registros e, desde a 9.4, da leitura de uma norma de 5 mil dispositivos (abrir com a primeira janela em cerca de 120 ms, limiar 1 s; janela de 100 textos em cerca de 20 ms, limiar 200 ms);
  - CI verde.
- **Decisão de escopo (23/09/2026):** nada do Acervo antigo nem do Acumen v2 é importado; o conteúdo recomeça do zero (nota no topo das Partes 1 e 2).
- **F2 (Legislação) em execução**, em paralelo ao uso real da F1. Plano em [`planos/F2.md`](planos/F2.md).
  - Feito: 7.1, o corpus de 5 normas em 7 páginas; 7.2, o colar de cada página capturado no Chromium (`*.colado.html` e `*.colado.txt`); 7.3, os gabaritos das 5 normas (`*.gabarito.json`), tudo em `corpus/normas/`, com as folhas de conferência em `docs/conferencias/`; o `/code-review` da etapa 7 (10 achados, corrigidos); a 8.1, os tipos do rascunho e a normalização (regra 1), em `src/dominios/legislacao/`, medida no corpus inteiro (ver "Fatos da normalização" no plano); a 8.2, o `estruturar` com os blocos pré-normativos e a hierarquia estrutural (regras 2 e 3), com a árvore das 7 normas igual à do gabarito (ver "Fatos do estruturador (8.2)" no plano); a 8.3, o artigo tolerante e a rubrica (regras 4 e 5), com todos os artigos do corpus em ordem e sem sangria e a rubrica do CP igual à do gabarito (ver "Fatos do estruturador (8.3)" no plano); a 8.4, caput, parágrafo, inciso, alínea e item (regra 6) com o endereço canônico e o bloco com numeração própria, com os endereços das 7 normas iguais aos do gabarito (ver "Fatos do estruturador (8.4)" no plano); a 8.5, as notas de vigência (regra 7) fora do texto, com espécie, lei, ano e link, e `notaVigenciaMaisRecente`, com a contagem de notas de cada dispositivo igual à do gabarito nas 7 normas, e o gabarito acertado e regerado uma vez só (ver "Fatos do estruturador (8.5)" no plano); a 9.1, a entidade `leituras` com o Dexie v2, o pacote v1 aceito no app v2 e a migração do Supabase no repositório (ver "Fatos da subida de esquema (9.1)" no plano); e a 9.2, o serviço que grava o rascunho da norma (norma, versão, dispositivos, textos e a fonte como Anexo) numa transação, com retomar e descartar, e o CP inteiro gravado em cerca de 2 s (ver "Fatos do serviço (9.2)" no plano); e a 9.3, `publicarVersao` e `verificarPublicacao`: a versão vira vigente e a norma aponta para ela, com o evento `versao.publicada`, bloqueando endereço de dispositivo duplicado e norma sem artigo, avisando só do estrutural repetido (LC 80) e pedindo o aceite em lote para o "a confirmar" (ver "Fatos da publicação (9.3)" no plano); e a 9.4, `abrirNorma` (a versão vigente e a árvore inteira sem textos, com o nível de cada nó) e `lerJanela` (os textos de até 200 nós, da versão aberta), com a carga de uma norma de 5 mil dispositivos (ver "Fatos da leitura (9.4)" no plano).
  - **Etapa 7 fechada**, com a conferência do Gabriel (24/09/2026) e a 7.4 (ECA e CDC no corpus; CP atualizado com a Lei 15.517/2026). Na 8.5, o gabarito regerado mudou CP, ECA, CDC e CF, que voltaram a "pendente": falta reconferir só os itens da lista na seção 3 (sem pressa; não trava a etapa 9).
  - **Próxima atividade: 9.5** (Biblioteca › Normas e a tela Importar por colagem; E2E colando a LEP compilada e o ECA e publicando), pela ordem da leitura antecipada. Esforço M (2 ou 3 sessões).
  - **Leitura antecipada (Gabriel, 24/09/2026, 2ª rodada):** depois da 8.5, pular para a etapa 9 e ler a LEP e o ECA pela página compilada do Planalto; a 8.6–8.9 e a 9.8 vêm depois do marco. Detalhes e salvaguardas no plano, em "Leitura antecipada com LEP e ECA". A 7.4 (ECA e CDC no corpus, com gabarito) foi feita em 24/09/2026.
  - **Três atividades novas decididas pelo Gabriel em 24/09/2026** (ver "Decisões de 24/09/2026" no plano): 9.8, destaque automático de condicionantes e prazos; 11.8, leitura artigo por artigo no modo foco; 11.9, prévia de remissões. O marco da etapa 9 passava a vir depois da 9.8; com a leitura antecipada (2ª rodada), vem antes.

## Como abrir a próxima sessão (meta: até ~200 mil tokens por sessão)

Abrir uma sessão nova do Claude Code no repositório. Ela parte do `main` atualizado. Pedido sugerido:

> Leia `docs/proxima-sessao.md` e execute a próxima atividade da F2 seguindo a rotina de pronto do plano. Ao terminar, atualize este arquivo e `docs/solucao-de-problemas.md`, faça o commit num branch com PR para o `main` e me avise. Atualize também a lista de PRs no main (o da 9.4, se já mergeado, com o número). Uma atividade por sessão: abra uma sessão nova para cada atividade.

Uma sessão por atividade (a 8.2 a 9.4 couberam numa cada, a 9.2 com uma retomada depois de a sessão cair). A 9.5 é M: dividi-la em sessões (por exemplo, Biblioteca › Normas e o estado vazio numa; a tela Importar, o sumário e o E2E da LEP e do ECA noutra), fechando cada uma com o check verde e o `proxima-sessao.md` dizendo onde parou. Regras de economia de contexto no `CLAUDE.md`.

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

- **Advisors:** segurança sem alertas. Desempenho: a migração `ajustes_advisors` corrigiu o aviso de duas políticas permissivas de leitura em `catalogo` e a chave estrangeira `catalogo.curador_id` sem índice. Fica só o aviso informativo "índice não usado", esperado até haver tráfego. `rls.test.ts` ganhou guardas para esses dois lints.
- **RLS no projeto real:** `supabase/verificacao-rls-remota.sql`, com 15 verificações numa transação desfeita. B não lê, não altera, não apaga e não grava em nome de A. Ninguém altera nem apaga o log, nem o próprio dono. O anônimo não lê dado pessoal. Repetir depois de toda migração nova.
- **Chaves:** nenhuma no repositório. A chave anônima só entra na F4.
- **Lembretes para a F4:** expor o esquema `arretado` na API (Settings › API › Exposed schemas). Se o projeto estiver pausado, reativá-lo antes. Se um dia adotar o Supabase CLI, alinhar as versões da tabela acima com `supabase migration repair`.

## Pendências, em ordem

### 1. Publicação no Cloudflare (Worker `arretado`, T18) — no ar desde 23/09/2026

O Gabriel conferiu em 23/09/2026: builds do `main` verdes no painel (o último, `5d70c13`) e o app abrindo no celular em https://arretado.gabrieldjcosta.workers.dev. O `wrangler.jsonc` na raiz diz ao Cloudflare que o site é a pasta `dist/`, com os cabeçalhos do `dist/_headers` (a partir de `config/seguranca.ts`); o `.node-version` = 22 vale também no build.

- **Daqui em diante não há passo manual:** cada merge no `main` dispara build e publicação sozinho (Workers Builds). Exceções:
  - subida de esquema futura: backup manual (Conta › Dados › Exportar) **antes** do merge que a publica e, depois, recarregar as abas abertas do app (a 9.1, primeira subida, já foi publicada em 24/09/2026; a 9.2, a 9.3 e a 9.4 não sobem o esquema);
  - se o celular mostrar a versão antiga, fechar a aba e abrir de novo.
- **Falta (Gabriel, sem pressa):**
  - conferir os cabeçalhos no computador (a sessão na nuvem não alcança o `workers.dev`): no Git Bash, `curl -sI https://arretado.gabrieldjcosta.workers.dev | grep -i content-security`; no PowerShell, `curl.exe -sI … | findstr /i content-security`;
  - opcional: desligar os builds de branches que não são o `main`, que marcam todo PR com um check vermelho sem efeito (ver `solucao-de-problemas.md` › "Check `Workers Builds` vermelho em todo PR").
- A importação por URL da F2 (T17, atividades 12.1–12.2) entra neste mesmo Worker como rota `/api/buscar-norma` (`main` + `assets.run_worker_first` no `wrangler.jsonc`). Plano B, se uma lei imensa estourar o limite de processamento: Edge Function no projeto Supabase, aceitando a pausa (ver T17).

Os dados ficam no navegador de cada endereço. Usar sempre https://arretado.gabrieldjcosta.workers.dev; trocar de endereço ou de navegador pede exportar e importar em Conta › Dados.

### 2. Uso real da F1 (portão)

14 dias com revisão feita em pelo menos 10; metas em [`portoes/F1.md`](portoes/F1.md). Backup semanal em Conta › Dados › Exportar. Relatar problemas pelo "!".

### 3. Executar a F2 (Legislação) — plano em [`planos/F2.md`](planos/F2.md)

**Exceção à regra de fases (Gabriel, 23/09/2026):** a F2 roda já, em paralelo ao uso real da F1. O portão da F1 (item 2) continua sendo medido; a F3 só começa depois do portão da F2. O app publicado só recebe F2 ao fim de cada etapa revisada, e toda subida de esquema exige backup manual antes da publicação (a da 9.1 foi publicada em 24/09/2026, sem dado real a perder).

Seguir as etapas 7–13 do plano, na ordem do caminho crítico: 7 → 8 → 9 → 10/11 → 13, com a 12 correndo por fora.

- **Feita: 9.1** (PR [#16](https://github.com/gabrieldjcosta/arretado/pull/16), mergeado em 24/09/2026). Entidade `Leitura` (coleção `leituras`, módulo `legislacao`); `VERSAO_ESQUEMA = 2`, com `desdeVersao` em `ENTIDADES` e `esquemaDaVersao(v)` no `banco.ts`; esquema v1 congelado por hash (`migracao.test.ts`); aviso "recarregue" na aba cujo banco outra aba subiu ou apagou (`aoFecharPorOutraAba`, `ProvedorRepositorio`); pacote v1 aceito com `leituras` vazia (`ler.ts`, `pacote-v1.test.ts`); migração `20260924000000_colecao_leituras.sql` e teste de deriva lendo a definição mais recente. Migração já aplicada no projeto real (tabela do Supabase acima). Detalhes em "Fatos da subida de esquema (9.1)" no plano e em `formato-pacote.md` › "Compatibilidade entre versões do esquema".
- **Feita: 9.2** (PR [#17](https://github.com/gabrieldjcosta/arretado/pull/17), mergeado em 29/09/2026; não sobe o esquema, então não pediu backup). Serviço em `src/dominios/legislacao/servico.ts`: `criarRascunho` (norma, versão `rascunho`, um dispositivo e um texto por nó, fonte como Anexo, numa transação, com o hash antes), `rascunhosPendentes`, `retomarRascunho` (relatório refeito pela fonte; árvore refeita se o estruturador mudou) e `descartarRascunho` (apagamento físico, com log; decisão registrada no plano). Conversão pura em `registros.ts` (categoria, título curto sugerido, cortes nos limites do modelo, fonte em JSON canônico). No core: `Colecao.criarLote`, `persistencia/anexos.ts` e `util/sha256.ts`. O CP inteiro grava em cerca de 2 s; as 11 páginas do corpus viram registros válidos do modelo. Detalhes em "Fatos do serviço (9.2)" no plano.
- **Feita: 9.3** (PR [#18](https://github.com/gabrieldjcosta/arretado/pull/18), mergeado em 29/09/2026; não sobe o esquema). `publicarVersao(repo, versaoId, { aceitarAConfirmar? })` em `src/dominios/legislacao/servico.ts`: numa transação, relê o rascunho, confere a árvore gravada e põe a versão em `vigente` e `Norma.versaoVigenteId` nela; evento `versao.publicada` `{ normaId, versaoId }` depois da confirmação; `verificarPublicacao` devolve o mesmo relatório sem gravar (para o botão da 9.5); `PublicacaoBloqueada` (`conflitos` ou `a_confirmar`). Decisões (Gabriel, 29/09/2026, no plano, em "Fatos da publicação (9.3)"): endereço de dispositivo duplicado bloqueia; nó estrutural repetido (LC 80) só avisa até a 8.7. Nas 11 páginas do corpus: 0 conflitos, 0 "a confirmar", e só a LC 80 com os 2 avisos.
- **Feita: 9.4** (PR [#19](https://github.com/gabrieldjcosta/arretado/pull/19), aguardando o merge; não sobe o esquema, então não pede backup antes). Em `src/dominios/legislacao/leitor.ts`: `abrirNorma(repo, normaId)` → `NormaAberta { norma, versao, nos, indiceDe }`, com a versão de `Norma.versaoVigenteId` (só `vigente` e da mesma norma; senão `NormaIndisponivel`, motivo `sem_versao_vigente` ou `inexistente`) e a árvore inteira sem textos, lida em páginas de 200 por `[normaId+ordem]`, com o `nivel` de cada nó; `lerJanela(repo, aberta, { inicio, quantidade })` → os nós com o texto na versão aberta (até 200), por `[versaoId+dispositivoId]`. No core, `Colecao.obterPorChaves` (uma consulta por chave: o `anyOf`, o `keys()` e o `offset` do Dexie são lentos no fake-indexeddb, ver `solucao-de-problemas.md`). `consultas.ts` (`todos`, `dispositivosDaNorma`) saiu do `servico.ts`. Carga: `blocosDeNormaSintetica` (`src/testes/norma-sintetica.ts`) e a leitura no `scripts/carga-sintetica.carga.ts`. Detalhes em "Fatos da leitura (9.4)" no plano.
- **Agora: 9.5** (Biblioteca › Normas: lista, estado vazio com "Importar norma", faixa de rascunho pendente; tela Importar por colagem: evento `paste` com `text/html` e `text/plain` de reserva, sumário, título curto como único obrigatório, "Não consegui identificar artigos" com as duas saídas; E2E colando o `*.colado.html` da LEP compilada e do ECA e publicando; colar a LEP com todas as redações mostra o aviso de tachado). Esforço M. Ler antes: a linha da 9.5 no plano; "Fatos da publicação (9.3)" › "Para a 9.5" (retomar o rascunho antes de verificar e publicar; `verificarPublicacao` para o botão; mensagens de `Anomalia` já prontas); "Fatos do serviço (9.2)" (título curto sugerido); e, em `solucao-de-problemas.md`, "Nenhuma redação anterior depois de colar", "O HTML colado muda conforme o navegador", "Colar real diferente do colado do corpus", "Importar o CP trava a tela", "A mesma norma colada duas vezes vira dois rascunhos" e "Publicação recusada". A leitura (9.6) usa `abrirNorma` e `lerJanela`; a 9.5 só precisa de `criarRascunho`, `rascunhosPendentes`, `retomarRascunho`, `descartarRascunho`, `verificarPublicacao` e `publicarVersao`. A tela fica em `src/apresentacao/biblioteca/` (a apresentação ainda não importa o módulo `legislacao`; conferir a regra de camadas).
  - Tolerâncias que continuam até a 8.6: artigo e dispositivo revogados todo tachados fora da árvore (`semRevogadosAusentes`, `REVOGADOS_FORA` e `DISPOSITIVOS_REVOGADOS_FORA` no `estruturador-corpus.test.ts`; o ECA passou a ter 2 artigos e 10 dispositivos, com o art. 233); o tachado parcial fica no texto, marcado, e o comparador o tira; a linha só de notas logo depois de uma tachada vai com ela para o descarte. Cada atividade tira a sua.
  - **Decisões da 8.4 (glossário §12):** `parUnico` (distinto de `par1`); inciso em romano, como na lei, com sufixo concatenado (`incIII`, `incVIA`); alínea em maiúscula (`alB`); item `it1`; inciso, alínea e item do caput direto no artigo, sem `caput` (`art5.incIII`), e o estruturador não gera nó de caput (o caput é o texto do artigo); prefixo do bloco no endereço do artigo (`adct.art1`, `dt.art21`; genérico `bloco2`; repetido `dt2`), com nó `tipo: 'bloco'` (novo no modelo) quando há título solto; `Dispositivo.ordem` = posição de leitura na árvore, de 1 em diante (`emOrdemDeLeitura`), sem conta com sufixo nem bloco.
  - LC 80 (duas "SEÇÃO IV", endereço estrutural repetido): decidido na 9.3, só avisa até a 8.7; a 8.7 reexamina (ver `solucao-de-problemas.md`).
- **Ordem (leitura antecipada, 24/09/2026):** 8.2–8.5 → 9.1–9.7 → marco antecipado (LEP e ECA) → 8.6–8.9 → 9.8 (o detector de destaques depende só da 8.1 e pode começar em paralelo) → `/code-review` das etapas 8 e 9 → etapas 10 e 11, com a 11.8 depois da 11.1 e a 11.9 depois da 11.6. O backlog dessas ideias (remissão para outra norma, "citado por", editar a lista de termos etc.) está no plano, em "Ordem e paralelismo".
- **CF conferida (Gabriel, 24/09/2026):** 50 de 50 itens sem divergência, já registrado em `cf.gabarito.json` › `conferencia`. Por isso as outras 4 folhas passaram a ter uma seção "Conferência reduzida" no topo: 10 itens de risco na LEP e no CP, 8 na LC 80 e 12 na LC-SP 988; com eles marcados, a sessão registra a norma como conferida (amostra reduzida, anotado em `observacoes`).
- **Conferência dos gabaritos concluída (Gabriel, 24/09/2026):** CF inteira; LEP, CP, LC 80 e LC-SP 988 pela conferência reduzida (itens de risco); ECA e CDC parcial (8 e 7 itens), com o resto dispensado pelo Gabriel, que aponta erros na leitura no Arretado. Achado único: número solto "7.627" na LEP, art. 18-A, § 3º (virou nota; `RE_NUMERO_SOLTO`).
- **Reconferência depois da 8.5 (Gabriel, sem pressa; não trava a etapa 9, só a 8.9):** o gabarito acertado mudou CP, ECA, CDC e CF, que voltaram a `pendente` (LEP, LC 80 e LC-SP 988 continuam `conferida`). Nas folhas novas (`docs/conferencias/gabarito-{cp,eca,cdc,cf}.md`), os itens iguais aos já conferidos voltaram com `[x]`; ficam desmarcados só os que mudaram ou entraram na amostra. O que mudou e o que reconferir está também na `conferencia.observacoes` de cada JSON. A conferir:
  - **CF** (46 de 50 marcados): art171.par1.incI, art198.par5, art219B.par2, art233.par2 (novos na amostra).
  - **CP** (os 10 da conferência reduzida marcados, sem mudança): art168, art218B.par2.incII, art234.par1 (novos na amostra). Mudaram fora da amostra: arts. 45, 158, § 2º, 159 (caput e §§ 1º e 2º), 333 e 334.
  - **ECA** (2 marcados): os 5 conferidos que mudaram (art21, art23, art24, art36.parUnico, art45.par1: a "(Expressão substituída…)" saiu do texto e virou nota). Mudaram ou entraram, dispensáveis como o resto da amostra parcial: art49, art233, art233.par3 e 14 novos.
  - **CDC** (4 marcados): art65, art67 e art112 (texto com a pena sem hífen ou a citação). A amostra "espaçada" deslizou com a contagem (473 → 471 dispositivos): 29 itens novos, dispensáveis.
  - Com os itens marcados, a sessão passa o resultado para `conferencia` (`estado: "conferida"`) e roda `npm run corpus:gabarito` (não muda nada se só a conferência mudou).
- **Quando a conferência chegar:** passar o resultado para `conferencia` no `*.gabarito.json` (`estado: "conferida"`, `por`, `em`, `observacoes`); se houver divergência, corrigir a regra em `scripts/corpus/gabarito.mjs` ou registrar a decisão em `DECISOES` e rodar `npm run corpus:gabarito`. O comando se recusa a regravar uma folha com marcas que ainda não foram para o JSON.
- **Regras que continuam valendo na etapa 8:**
  - o estruturador **não** importa nem copia `scripts/corpus/gabarito.mjs` (ver "Gabarito que só repete o estruturador" em `solucao-de-problemas.md`); se os dois divergirem, examinar o caso na página;
  - **sem código anterior (Gabriel, 23/09/2026):** o `extrair_lei.js` da skill `acumen-extrair-normas` não é usado nem copiado;
  - endereços decididos na 8.4 (glossário §12), iguais aos do gabarito; `anexo` (e `anexoII`) é da 8.7.
- **Rede no contêiner da nuvem:** Planalto e ALESP liberados pelo Gabriel em 24/09/2026. O `fetch` do Node precisa de `NODE_USE_ENV_PROXY=1` (`NODE_USE_ENV_PROXY=1 npm run corpus -- --so <ids>`); sempre com `--so`, porque o Planalto atualiza as páginas e o corpus já conferido não deve mudar (ver `solucao-de-problemas.md`). O `npm run corpus:colar` e o `npm test` funcionam sem rede.
- **Ler antes:** a Parte 2 §10.6. As armadilhas do Planalto (lições da skill `acumen-extrair-normas`) estão no plano e em `solucao-de-problemas.md`, seção Legislação.
- Sem importador do Acervo (decisão de escopo).
- O sanitizador (`src/core/seguranca/sanitizador.ts`) já entrega blocos com tachado, ênfase e link: é a entrada do estruturador.

### 4. Decisões pequenas que esperam o Gabriel (sem pressa; cada uma tem atividade)

- **Da 9.3 (confirmar; suposições minhas, reversíveis; motivo no plano, em "Fatos da publicação (9.3)"):** (1) norma sem nenhum artigo bloqueia a publicação (`sem_artigos`, o conflito que o estruturador já acusa), além do endereço duplicado que o plano previa; (2) o aceite em lote do "a confirmar" é só ciência: os dispositivos continuam "a confirmar" na versão publicada, e quem os confirma é a 10.1; (3) o conflito é calculado sobre a árvore gravada, não sobre a fonte, para o rótulo corrigido na revisão liberar a publicação; (4) `publicarVersao` só publica a primeira versão de uma norma (a versão nova é da 11.7 e da F6) e não grava `dataVigencia`. Se preferir outro caminho, a troca é pequena.

- **Da 9.2 (confirmar):** (1) o rascunho de norma nunca publicado é apagado de verdade ao descartá-lo ou ao refazer a árvore pela fonte, em vez da exclusão lógica (exceção ao "Dispositivo nunca excluído" da Parte 1 §5.3; motivo e volta atrás no plano, em "Rascunho descartado ou refeito"); (2) campo opcional novo `VersaoDeNorma.notasDaNorma`, para as notas entre a epígrafe e a ementa, que não tinham onde ficar. Se o Gabriel preferir outro caminho, a troca é pequena enquanto não há norma publicada.
- `Estrela.tipoOrigem` × `Cartao.origemTipo`: alinhar para `origemTipo` antes da 11.2, enquanto `estrelas` não tem dado (glossário §13).
- Rótulo "Ponto de restauração" para o Snapshot: "Ponto" é reservado ao item do edital (glossário §13).
- Termos marcados como "proposto" no glossário §12 (`'vetado'` no `status`, 8.6; os do leitor e do editor): decidir na atividade indicada. Os do endereço canônico, do bloco e da ordem foram decididos na 8.4.

## Como validar tudo

```
npm run check      # formato, lint, tipos, 821 testes (inclui corpus, colados, gabaritos, normalização, estruturador, serviço do rascunho, publicação e leitura por janela), auditoria
npx vitest run --project unidade --maxWorkers=4   # no Windows, se o check falhar só por tempo (ver solucao-de-problemas.md)
npm run carga      # 10 mil registros e a leitura de uma norma de 5 mil dispositivos dentro dos limiares
npm run test:e2e   # 84 cenários (Playwright + axe)
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
src/core/persistencia/        Dexie, coleções paginadas (e criarLote, obterPorChaves), log de alterações, Repositorio, anexos
src/core/eventos/             barramento em processo
src/core/pacote/              .arretado: exportar, ler, cifra, 7 modos, snapshot, espaços
src/core/seguranca/           sanitizador de HTML → estrutura
src/dominios/recall/          agendamento (6 caixas), causa sugerida, serviço do Recall
src/dominios/legislacao/      estruturador da F2: estruturar (estruturador.ts), tipos do rascunho (rascunho.ts),
                              normalização, regra 1 (normalizacao.ts), linhas (linhas.ts), pré-normativo,
                              regra 2 (prenormativo.ts), estrutura, regra 3 (estrutura.ts), rubrica e artigo,
                              regras 4 e 5 (artigo.ts), parágrafo a item, regra 6 (dispositivo.ts), ordem de
                              leitura (ordem.ts), notas de vigência, regra 7 (notas.ts: espécie, lei,
                              ano, a mais recente);
                              serviço do rascunho (servico.ts: criar, pendentes, retomar, descartar, verificar e publicar) e
                              conversão em registros do modelo e fonte guardada (registros.ts); leitura da norma publicada
                              (leitor.ts: abrirNorma, lerJanela); consultas paginadas do módulo (consultas.ts);
                              testes com o corpus (*-corpus.test.ts; scripts/corpus-estruturador.test.ts)
src/testes/gabarito.ts        comparação do rascunho com o gabarito: árvore, artigos, dispositivos, rubricas, texto e notas (só testes)
src/testes/norma-sintetica.ts norma sintética de N dispositivos para a carga da leitura (9.4)
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
