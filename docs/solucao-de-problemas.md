# Solução de problemas

Criado em 23/09/2026. Registro vivo dos problemas do Arretado: falhas da plataforma, do código e das ferramentas já encontradas, e as previsíveis nas próximas atividades. No vocabulário do projeto, "Erro" é só erro de estudo; aqui se fala em **problema** ou **falha**.

## Para que serve e como usar

- Procure pelo **sintoma**: a mensagem exata (`PrematureCommitError`, `ECONNRESET`, "Os dados mudaram depois da prévia") ou o que se vê ("a tela volta ao valor anterior"). Ctrl+F no navegador ou `git grep -n "trecho" docs/solucao-de-problemas.md`.
- Cada entrada traz a causa, a solução imediata e o que impede a volta do problema (teste, regra de lint ou rotina).
- Sessões do Claude: ler a seção da área antes de mexer nela, junto com o [`proxima-sessao.md`](proxima-sessao.md) e o plano da fase ([`planos/F2.md`](planos/F2.md)).
- Gabriel: a seção [Uso do app](#uso-do-app) está em linguagem simples e é a que interessa no dia a dia.
- Entradas "previsto" são hipóteses tiradas do plano, do corpus e do código. Ainda não aconteceram; cada uma aponta a atividade que deve preveni-la.

## Como complementar

1. **Ao fim de cada atividade**, antes do commit: registrar todo problema achado no `npm run check`, no E2E, no `/code-review` ou no uso real, com o commit da correção. Um problema por entrada, na seção da área.
2. **Previsto que aconteceu:** trocar a origem para "ocorrido em DD/MM/AAAA (commit …)", manter "previsto na X.Y" no fim e preencher a prevenção que entrou (nome do teste ou da regra).
3. **Ao começar uma etapa:** acrescentar os problemas previsíveis dela, cada um com a atividade que o previne.
4. **Situação:** entrada que perdeu o sentido (dependência trocada, decisão revista) é reescrita ou apagada no mesmo commit que a tornou obsoleta.
5. Entradas curtas (3 a 7 linhas). Detalhe longo fica no plano, no teste ou na mensagem de commit, com um ponteiro daqui.

## Modelo de entrada

```
### Título pelo sintoma
- **Sintoma:** o que se vê (mensagem exata, tela, comando). **Causa:** por que acontece.
- **Solução:** o que fazer agora. **Prevenção:** teste, regra de lint ou rotina que impede a volta.
- **Origem:** ocorrido em DD/MM/AAAA (commit abc1234 ou documento) | previsto — atividade X.Y
```

## Ambiente Windows e ferramentas

### Escapes viram o caractere real ao gravar arquivo ou rodar comando
- **Sintoma:** sequências `\uXXXX` escritas no conteúdo de um comando ou arquivo chegam decodificadas (viram o caractere real, às vezes invisível); em 23/09/2026 aconteceu também com `\r\n` dentro de texto JSON/Markdown gerado por script, e o exemplo deste item virou quebra de linha real no `proxima-sessao.md`. **Causa:** o texto passado às ferramentas (Write/Edit e comandos) é decodificado antes de gravar.
- **Solução:** gerar o escape por script Node a partir do código do caractere (`String.fromCharCode(92)` para a barra) ou copiá-lo de outro arquivo por script; depois, conferir que a barra invertida literal está no arquivo. **Prevenção:** varredura de caracteres invisíveis em `src/`:
  `node -e 'const fs=require("fs"),p=require("path");const r=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u00a0\u200b\ufeff\uffff\u0300-\u036f]/;(function a(d){for(const n of fs.readdirSync(d)){const f=p.join(d,n);fs.statSync(f).isDirectory()?a(f):/\.(ts|tsx|css)$/.test(n)&&r.test(fs.readFileSync(f,"utf8"))&&console.log(f)}})("src")'`
  (este documento é Markdown e não passa pelo Prettier; o comando acima foi copiado por script, com os escapes literais; rodar no Git Bash — ver o item seguinte).
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11; o caso da quebra de linha entrou no merge 9b71b2f e o exemplo foi corrigido em 6db6ede; de novo na 7.2, com o escape de U+FFFD gravado pelo Write como o caractere real em `scripts/corpus/derivados.mjs`, trocado por script antes do commit; e na 7.3, com U+00AD, U+00A0 e U+0300–U+036F em `scripts/corpus/gabarito.mjs`, trocados por script; nos testes, usar `String.fromCharCode`; de novo na 8.1, com U+00AD, invisíveis, U+FFFD e marcas combinantes em `normalizacao.ts` e nos testes: o Write gravou os escapes como caracteres, e um script os reescreveu como escape, gerando a barra com `String.fromCharCode(92)` e trocando só o que é invisível, espaço especial, combinante ou confundível; os de controle, U+0000 a U+009F, chegaram intactos). Conferir com `grep -c` o byte `EF BF BD` depois de gravar arquivo com esse escape.

### Comando "passa" mas falhou, ou script quebra no Windows
- **Sintoma:** a saída mostra falha e o código de saída é 0; script em Python não roda; comando Bash colado no PowerShell é recusado por sintaxe; `node -e '…require("fs")…'` dá `ReferenceError` no PowerShell. **Causa:** em `comando | head`, o código de saída é o do `head` e a falha do comando some; Python não é confiável na máquina do Gabriel; PowerShell e Bash têm sintaxes próprias; o Windows PowerShell 5.1 descarta as aspas duplas internas ao chamar programa externo.
- **Solução:** encadear com `&&`, gravar a saída em arquivo e só depois filtrar (no Windows PowerShell 5.1 não há `&&`: usar `A; if ($?) { B }`); `node -e` com aspas internas só no Git Bash, ou o script num `.mjs`; automação em Node (`scripts/*.mjs`, T15). **Prevenção:** rotina de sessão; um shell por comando, sem misturar sintaxes.
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11; Python fora pela T15; aspas do `node -e` conferidas no PowerShell 5.1 em 23/09/2026).

## Verificação (check, lint, tipos, testes, E2E, CI)

### `npm run check` falha no Windows sem mudança no código
- **Sintoma:** `UNKNOWN: lstat 'C:\'` e falha ao abrir arquivos do `node_modules`; `Cannot find module '…node_modules…'` de um arquivo que existe (`uuid`, `@testing-library/user-event`, `dom-accessibility-api`), logo depois de um `npm ci` num worktree novo; teste de tela do `App.test.tsx` que não acha um texto ("Importação concluída", "Sem conexão") e passa sozinho; ou o boot do PGlite estoura o `beforeAll` do `supabase/rls.test.ts`. Em 23/09/2026, duas de quatro rodadas falharam assim; na 8.1, quatro rodadas seguidas, cada uma num teste diferente. **Causa:** sistema de arquivos e CPU do Windows sob carga (antivírus lendo o `node_modules` recém-instalado, agentes rodando em paralelo), sem relação com o código.
- **Solução:** rodar de novo, sem outra carga na máquina; para confirmar o código, `npx vitest run --project unidade --maxWorkers=4` (486 testes verdes na 8.1) e o CI do PR, que roda no Linux. **Prevenção:** o `beforeAll` do PGlite tem 60 s desde a 8.1 (o timeout se repetiu).
- **Origem:** ocorrido em 23/09/2026 (registrado em d87ddca; de novo na 8.1).
- **Atualização (24/09/2026):** o "Sem conexão" falhou também no CI (Linux), no PR #11. Causa no teste: ele conferia o texto logo depois do evento `offline`, e a assinatura do `useSyncExternalStore` é um efeito que, sob carga, pode chegar depois. O teste passou a esperar (`findByText` e `waitFor`). Ao ver de novo "não acha um texto" em teste de tela, procurar a mesma causa (conferência síncrona logo depois de um evento) antes de rodar de novo.

### `format:check` reprova `.claude/settings.local.json`
- **Sintoma:** `npm run check` para no Prettier apontando `.claude/settings.local.json`, sem mudança no código. **Causa:** o Claude Code grava as permissões da sessão nesse arquivo dentro do worktree; o git o ignora (ignore global do usuário), mas o Prettier o verificava.
- **Solução:** `.claude` no `.prettierignore`. **Prevenção:** arquivo gerado por ferramenta e fora do git entra no `.prettierignore` junto com o `.gitignore`.
- **Origem:** ocorrido em 23/09/2026 (consolidação pós-7.1).

### Teste que lê arquivo do repositório não acha o caminho
- **Sintoma:** caminho inválido ao ler arquivo no teste. **Causa:** o ambiente padrão do Vitest é jsdom, onde `import.meta.url` não é `file:`.
- **Solução:** `// @vitest-environment node` no topo e `import.meta.dirname` (como em `supabase/rls.test.ts`). **Prevenção:** esse cabeçalho em todo teste que lê o disco (corpus, migrações).
- **Origem:** ocorrido em 23/09/2026 (registrado em 13355bc).

### Teste em `src/` que lê o corpus não compila
- **Sintoma:** `Cannot find name 'node:fs'` ou `'process'` no `tsc -b`, e o lint acusa chamada insegura. **Causa:** o `tsconfig.app.json` (que cobre `src/`) não tem os tipos do Node; e o teste que usa o sanitizador precisa do jsdom, então o `@vitest-environment node` não serve.
- **Solução:** ler os arquivos pelo Vite, sem Node: `import.meta.glob<string>('../../../corpus/normas/*.colado.txt', { query: '?raw', import: 'default', eager: true })` (como em `src/dominios/legislacao/normalizacao-corpus.test.ts`). **Prevenção:** o próprio `tsc -b` do check.
- **Origem:** ocorrido em 23/09/2026 (8.1, antes do commit).

### Playwright ou TypeScript "desatualizados" de propósito
- **Sintoma:** E2E não abre o Chromium, ou o `@axe-core/playwright` puxa outra versão; lint quebra depois de atualizar o TypeScript. **Causa:** Playwright fixado em 1.56.1 (o Chromium do contêiner é o `chromium-1194`), com `playwright-core` fixado junto, também em `1.56.1` exato no `package.json` (desde 23/09/2026; antes era `^1.56.1`), para o axe não puxar outra versão; TypeScript fixado em `~6.0` porque o `typescript-eslint` ainda não aceita o 7.
- **Solução:** no Windows, rodar `npx playwright install chromium` uma vez; não subir essas versões. **Prevenção:** `@playwright/test` e `playwright-core` sempre juntos e na mesma versão (nada de `npm update` solto); TypeScript 7 só quando o typescript-eslint suportar (T1).
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11).

### Lint acusa import proibido entre camadas
- **Sintoma:** regra `arretado/camadas` no `npm run check` ("Camada … não pode importar de …" ou "O pacote … só pode ser importado em src/core/…"). **Causa:** a regra `eslint/regra-camadas.js`: Dexie só em `src/core/persistencia`, DOMPurify só em `src/core/seguranca`, domínio não importa outro domínio.
- **Solução:** mover o acesso para a camada certa; composição entre domínios fica na apresentação (ex.: ações do leitor na 11.5). **Prevenção:** a própria regra.
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11).

### A revisão da etapa acha o que os testes não pegaram
- **Sintoma:** o `/code-review` achou problemas reais em todas as etapas (commits 0719706, 83b0d18, bb696e0, a3ce9f4, 3c07cbf, ed0a209; na 7.1, 15 achados de uma revisão adversarial, corrigidos no próprio 13355bc; no fim da etapa 7, 10 achados, 6 deles confirmados no corpus, corrigidos no commit `fix(legislacao)` depois do da 7.3; na 8.1, revisão adversarial com três lentes e um verificador por achado: 10 confirmados e 8 refutados, corrigidos antes do commit, com um teste cada em "correções da revisão da 8.1"). **Causa:** testes cobrem o caminho previsto; a revisão procura bordas (corrida entre abas, clique duplo, prévia defasada, entrada adulterada).
- **Solução:** correções num commit `fix(...)` próprio. **Prevenção:** manter o hábito ao fim de cada bloco (rotina do plano, passo 6) e registrar aqui cada classe de defeito.
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11).

### E2E testa uma versão velha do app
- **Sintoma:** o E2E não enxerga a mudança recém-feita. **Causa:** fora do CI, `playwright.config.ts` reaproveita servidor já aberto (`reuseExistingServer`); um `vite preview` antigo na porta 4173 é usado sem novo build.
- **Solução:** encerrar o servidor antigo e rodar `npm run test:e2e` de novo. **Prevenção:** não deixar `preview` aberto entre rodadas; o CI sempre sobe o seu.
- **Origem:** previsto — toda atividade com tela.

## Persistência local (IndexedDB/Dexie)

### `PrematureCommitError` numa transação
- **Sintoma:** a transação fecha antes de terminar. **Causa:** algo além de IndexedDB foi aguardado dentro de `repo.transacao` (WebCrypto, `fetch`, timers).
- **Solução:** calcular hashes e buscar dados antes de abrir a transação (como `criarSnapshot`). **Prevenção:** revisão; vale em dobro para a 9.2 (hashes da versão calculados antes, sobre o conteúdo sanitizado).
- **Origem:** ocorrido em 23/09/2026 (regra aplicada em a0271eb; registrada em 8ed7e11).

### O log de alterações não reproduz o registro gravado
- **Sintoma:** reconstruir pelo log dá valor diferente do gravado (ex.: texto sem aparar). **Causa:** `atualizar` registrava no log o valor bruto, não o validado pelo zod.
- **Solução:** o log guarda os campos do registro já validado. **Prevenção:** "o log guarda o valor validado da atualização" (`persistencia.test.ts`); toda escrita passa pela camada de coleções.
- **Origem:** ocorrido em 23/09/2026 (commit 0719706).

### Duas abas criam identidades diferentes
- **Sintoma:** usuário ou Aparelho duplicado ao abrir o banco vazio em duas abas. **Causa:** a identidade era lida fora da transação que a criava.
- **Solução:** reler a identidade dentro da transação de criação. **Prevenção:** "duas aberturas simultâneas de banco vazio ficam com a mesma identidade"; todo "cria se não existe" relê dentro da transação.
- **Origem:** ocorrido em 23/09/2026 (commit 0719706).

### Lista mostra só os primeiros 200 itens
- **Sintoma:** pontos, vínculos ou cartões faltando na tela. **Causa:** a consulta paginada tem `LIMITE_MAXIMO_PAGINA = 200` (`colecao.ts`) e a tela lia só a primeira página.
- **Solução:** percorrer as páginas (`todas` em `src/apresentacao/recall/carregadores.ts`, para o Plano e os vínculos) ou oferecer "Carregar mais" (listas de cartões e de erros). **Prevenção:** teste com mais de 200 registros em toda lista nova (normas, dispositivos, "a confirmar").
- **Origem:** ocorrido em 23/09/2026 (commits ed0a209 e 3c07cbf).

### Subida de esquema com aba antiga aberta
- **Sintoma:** depois de publicar o Dexie v2, o app não abre ou a aba antiga perde o banco no meio do uso. **Causa:** a subida de versão do IndexedDB (9.1, entidade `leituras`) disputa o banco com a conexão aberta pela versão anterior.
- **Solução:** fechar as outras abas e recarregar. **Prevenção:** na 9.1, tratar a troca de versão com aviso "feche as outras abas e recarregue" (como em Apagar tudo), teste de migração v1 → v2 sem perda e backup manual antes da publicação.
- **Origem:** previsto — atividade 9.1.

### Espaço de armazenamento esgotado
- **Sintoma:** falha de cota ao importar ou gravar. **Causa:** cada importação guarda um snapshot integral com anexos (retenção mínima de 5), e a F2 soma a fonte sanitizada de cada norma como Anexo; só a página da CF tem 1,8 MB.
- **Solução:** exportar o backup antes de tudo. Não há poda manual dos pontos de restauração hoje: os que passam da retenção (mínimo 5) são podados a cada importação. **Prevenção:** medir o pacote com o CP inteiro (13.3); avaliar `navigator.storage.estimate()` e `navigator.storage.persist()` em Conta › Dados.
- **Origem:** previsto — atividades 9.2 e 13.3.

## Backup e pacote `.arretado`

### Restaurar apagava o registro deste Aparelho
- **Sintoma:** depois de "Substituir módulos" ou "Restaurar integral", o Aparelho atual some ou fica com outro dono. **Causa:** os modos 5 e 6 removiam tudo que não estava no pacote, inclusive o Aparelho.
- **Solução:** o registro deste Aparelho é preservado (e transferido para a nova identidade no modo 6 de outra identidade). **Prevenção:** testes em `importacao.test.ts`; `formato-pacote.md` atualizado (fd9a437).
- **Origem:** ocorrido em 23/09/2026 (commit bb696e0).

### "Os dados mudaram depois da prévia. Gere a prévia de novo."
- **Sintoma:** a importação é recusada ao confirmar. **Causa:** houve escrita nas coleções afetadas depois da prévia (outra aba, gravação automática); antes, a prévia defasada era aplicada assim mesmo.
- **Solução:** gerar a prévia de novo. **Prevenção:** `aplicar` confere o log posterior a `seqBase`; "prévia defasada é recusada ao aplicar".
- **Origem:** ocorrido em 23/09/2026 (commit bb696e0).

### Pacote adulterado ou gigante aceito
- **Sintoma:** anexo sem registro ou com hash errado entrava no banco; ZIP com conteúdo descompactado enorme era aberto por inteiro. **Causa:** anexos não eram validados na leitura; o limite era conferido depois de descompactar.
- **Solução:** anexo só com `incluiAnexos`, registro e hash iguais; teto de 512 MB (`LIMITE_DESCOMPACTADO`) conferido pelo tamanho declarado antes e pelo real depois. **Prevenção:** `pacote.test.ts` e `importacao.test.ts` (anexos, zip bomb).
- **Origem:** ocorrido em 23/09/2026 (commit bb696e0).

### Espaço separado deixa sobra, ou "Desfazer" sem volta
- **Sintoma:** "Importar para espaço separado" falhava com pacote de módulos e, depois de uma falha, sobrava um banco sem espaço registrado; um desfazer não podia ser desfeito. **Causa:** o modo 7 exigia pacote integral e não apagava o banco criado; o rollback não guardava snapshot próprio.
- **Solução:** o modo 7 aceita parcial (`exigirIntegral: false`) e apaga o banco em qualquer falha; o rollback guarda snapshot com motivo "rollback" e poda os excedentes. **Prevenção:** testes em `importacao.test.ts`.
- **Origem:** ocorrido em 23/09/2026 (commit bb696e0).

### Pacote de uma versão do app aberto em outra
- **Sintoma:** "Este pacote foi gerado por uma versão mais nova do Arretado" ao importar num app antigo um backup feito depois da 9.1; ou pacote v1 recusado no app v2. **Causa:** `ler.ts` recusa `versaoEsquema` maior que a atual, e os registros são `strictObject` (campo desconhecido é recusado).
- **Solução:** usar o app mais novo; campo novo sempre opcional ou com padrão na leitura. **Prevenção:** na 9.1, teste de restauração de pacote v1 no app v2 e `formato-pacote.md` atualizado.
- **Origem:** previsto — atividade 9.1.

## Segurança (CSP, sanitizador)

### Violação de CSP causada por biblioteca
- **Sintoma:** a vigilância do E2E acusa violação de `script-src` (ou `style-src`). **Causa:** o zod sonda `Function('')` para compilar validadores, e a CSP proíbe; estilo em linha na marcação (atributo `style` em HTML ou `<style>` injetado) é bloqueado por `style-src 'self'`.
- **Solução:** zod em modo `jitless` (`src/core/modelo/comum.ts`); no leitor virtualizado (T16, 9.6), posicionar pela propriedade `style` do React (CSSOM) ou por classe, conferindo no E2E. Nunca afrouxar a CSP. **Prevenção:** vigilância automática de CSP em todo E2E; a cada dependência nova, procurar `eval`, `Function`, `innerHTML` e `<style>` injetado.
- **Origem:** ocorrido em 23/09/2026 (commit 495de6d; registrado em 8ed7e11).

### Funciona no `npm run dev` e falha no publicado
- **Sintoma:** tela quebra só no build, no `preview` ou no Cloudflare. **Causa:** a CSP só entra na versão construída (o servidor de desenvolvimento do Vite injeta estilos em linha; ver `vite.config.ts`).
- **Solução:** reproduzir com `npm run build` e depois `npm run preview` (encerrar o `preview` ao terminar, senão o E2E o reaproveita). **Prevenção:** o E2E roda sobre a versão construída; tela nova só fica pronta com E2E verde.
- **Origem:** previsto — toda atividade com tela.

### Vigilância de CSP que não reprovava o teste
- **Sintoma:** violação de CSP ou falha registrada no console (`console.error`) passava despercebida. **Causa:** a fixture do E2E coletava as ocorrências depois do teste, sem reprovar.
- **Solução:** `e2e/apoio.ts` reprova o teste com violação ou falha no console não permitidas (`permitirViolacoes` e `permitirFalhasConsole` só em teste que provoca de propósito). **Prevenção:** testes novos importam `test` de `e2e/apoio.ts`, nunca de `@playwright/test`.
- **Origem:** ocorrido em 23/09/2026 (commit 83b0d18).

### Sanitizador fundia dispositivos ou perdia tachado
- **Sintoma:** dois dispositivos no mesmo bloco; redação anterior aparecendo como texto vigente. **Causa:** `section`, `article`, `pre`, `dl`, `hr` e afins não separavam blocos; o tachado por estilo em elemento removido sumia com o estilo.
- **Solução:** esses elementos separam blocos; o tachado por estilo em elemento fora da lista vira `<s>`. **Prevenção:** `sanitizador.test.ts` (34 payloads + fragmentos do Planalto); o `cp.html` e o `cf.html` inteiros em `scripts/corpus-estruturador.test.ts` (8.2).
- **Origem:** ocorrido em 23/09/2026 (commit 83b0d18).

### Nome de classe com "Erro" para falha de software
- **Sintoma:** código chama falha da plataforma de "Erro", termo reservado a erro de estudo. **Causa:** nome de exceção escolhido sem conferir o vocabulário (`ErroDeValidacao`, trocado por `RegistroInvalido`).
- **Solução:** renomear pelo motivo (`RegistroInvalido`, `EntradaGrandeDemais`); valor de `catch` é `excecao`; estado de tela é `falha`. **Prevenção:** revisão; `git grep -n -E "Erros?[A-Z]|catch \(erro\)" -- src e2e scripts` ao fim de cada etapa deve voltar vazio.
- **Origem:** ocorrido em 23/09/2026 (commit bb696e0); os restantes (`ErroEntradaGrande`, `permitirErrosConsole`, `catch (erro)`) corrigidos na consolidação de 23/09/2026.

### Busca por URL vira proxy aberto ou recusa o Planalto
- **Sintoma:** a função aceita host parecido (`planalto.gov.br.exemplo.com`, `xplanalto.gov.br`) ou recusa `www.planalto.gov.br`. **Causa:** as URLs reais usam `www.` (ver `scripts/corpus/normas.mjs`); comparação por sufixo solto aceita host parecido, e igualdade com uma lista sem as formas `www.` recusa o Planalto.
- **Solução:** comparar o `hostname` analisado por `URL` por igualdade exata com a lista da T17, que desde 23/09/2026 inclui as formas com `www.`; nunca por sufixo solto. **Prevenção:** casos de teste da 12.1 com os dois lados, também em cada redirecionamento.
- **Origem:** previsto — atividade 12.1.

## Interface (React)

### A tela "volta" antes de gravar
- **Sintoma:** o controle mostra o valor antigo por um instante, ou fica com o valor novo depois de uma gravação que falhou. **Causa:** entrada controlada com gravação assíncrona, sem estado local.
- **Solução:** estado local otimista e, na falha, volta ao valor salvo com aviso (ver `AparenciaConta.tsx`). **Prevenção:** "falha ao gravar a aparência volta ao valor salvo e avisa" (`App.test.tsx`).
- **Origem:** ocorrido em 23/09/2026 (commit a3ce9f4; registrado em 8ed7e11).

### Lint do React Compiler
- **Sintoma:** `eslint-plugin-react-hooks` 7 reprova o componente, ou a tela recarrega em laço. **Causa:** `setState` síncrono em efeito, leitura de `ref` durante a renderização ou carregador instável passado a `useDados`.
- **Solução:** carregadores estáveis (fora do componente ou com `useCallback`); estado derivado sem efeito. **Prevenção:** a própria regra de lint.
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11).

### Falha silenciosa ou tela travada
- **Sintoma:** "Apagar tudo" não mostrava a falha; o drill ficava parado quando a fila ou o verso não carregava. **Causa:** promessa disparada com `void …then(…)`, sem tratar a rejeição nem ter estado de falha na tela.
- **Solução:** mostrar a falha com uma saída ("Recarregar"; "feche as outras abas"). **Prevenção:** toda ação assíncrona nova tem estado de falha visível e teste que o provoca.
- **Origem:** ocorrido em 23/09/2026 (commits a3ce9f4 e 3c07cbf).

### Formulário perde ou trava o que foi digitado
- **Sintoma:** em "Completar", a última edição não era gravada ao navegar para outra tela; o ano da fonte não aceitava digitação aos poucos, e um valor inválido travava o resto. **Causa:** o salvamento automático não gravava o pendente quando a tela era desmontada; a validação do modelo era aplicada ao valor parcial.
- **Solução:** gravar o pendente ao sair da tela; aceitar digitação parcial e gravar só quando válido, com os limites do modelo nos campos. **Prevenção:** testes em `Recall.test.tsx`; vale para o editor de rascunho (10.2) e para o "lido até" (9.7).
- **Origem:** ocorrido em 23/09/2026 (commit 3c07cbf).

### Clique duplo cria registro duplicado
- **Sintoma:** dois cartões para o mesmo erro (duplo clique ou outra aba). **Causa:** criação sem guarda de idempotência.
- **Solução:** cartão de erro idempotente no serviço e botões com guarda contra clique duplo. **Prevenção:** "criar cartão duas vezes para o mesmo erro devolve o mesmo cartão"; vale para "Publicar" (9.3) e "Criar cartão deste trecho" (11.5).
- **Origem:** ocorrido em 23/09/2026 (commit 3c07cbf).

### Atalho de teclado rouba a tecla de outro controle
- **Sintoma:** espaço, Enter ou 1–3 acionavam o drill com o foco num link ou botão. **Causa:** ouvinte de teclado da tela sem olhar o alvo do evento.
- **Solução:** ignorar a tecla quando o foco está em outro controle interativo. **Prevenção:** teste em `Recall.test.tsx`; repetir no atalho do modo foco (11.1).
- **Origem:** ocorrido em 23/09/2026 (commit 3c07cbf).

### Estado de uma tela vaza para outra ou some ao navegar
- **Sintoma:** "Ver prévia" travada por módulos desmarcados em outro modo; confirmação do último espaço que não aparecia; confirmação da primeira importação de pontos que sumia. **Causa:** condição de habilitação que ignorava o modo escolhido; mensagem guardada num componente que deixa de ser renderizado quando os dados mudam.
- **Solução:** condição por modo; a confirmação é mostrada por quem continua na tela (o componente pai). **Prevenção:** teste do "Ver prévia" em `App.test.tsx`; as duas confirmações foram corrigidas sem teste próprio (acrescentar quando a tela for tocada de novo).
- **Origem:** ocorrido em 23/09/2026 (commits a3ce9f4 e ed0a209).

### Celular: seleção, toque longo e navegador não testado
- **Sintoma:** grifo impossível no celular; comportamento diferente no iPhone. **Causa:** ação que depende de hover ou de seleção de desktop; o E2E só roda Chromium (desktop e Pixel 7), sem Safari.
- **Solução:** toque longo ou botão, nunca só hover (11.4). **Prevenção:** E2E no projeto "celular" (e "tablet", 11.1); conferência manual no aparelho do Gabriel a cada marco.
- **Origem:** previsto — atividades 11.1 e 11.4.

## Datas e fuso

### "Hoje" vira às 21 h
- **Sintoma:** revisões de amanhã aparecem à noite. **Causa:** data civil calculada em UTC (meia-noite UTC = 21 h em Brasília).
- **Solução:** `dataCivil()` de `src/core/datas`, sempre no fuso `America/Sao_Paulo`. **Prevenção:** `datas.test.ts`; nunca `toISOString().slice(0, 10)` para tirar a data civil de um instante (em `somarDias` é só aritmética de calendário, sem fuso, e está certo).
- **Origem:** previsto — T14 (prevenido desde a F0).

### "Hoje" errado com o app aberto na virada ou relógio desacertado
- **Sintoma:** depois da meia-noite, a fila e o "Hoje" continuam os de ontem; ou revisões caem no dia errado. **Causa:** `hoje()` é calculado quando a tela carrega, e nada recarrega na virada; o "hoje" usa o relógio do aparelho (o relógio lógico, T7, só protege a ordem do log).
- **Solução:** navegar ou recarregar; acertar o relógio do aparelho. **Prevenção:** na F3 (Hoje/Dia), recalcular ao voltar o foco à aba e na virada; na F4, usar o horário do servidor como referência.
- **Origem:** previsto — F3 e F4.

### Teste passa no Windows e falha no CI
- **Sintoma:** teste de data verde localmente e vermelho no GitHub Actions. **Causa:** o Playwright fixa `America/Sao_Paulo`, mas o Vitest usa o fuso da máquina (Brasília no Windows, UTC no CI).
- **Solução:** instantes com `Z` e fuso explícito, como em `datas.test.ts`. **Prevenção:** se repetir, fixar o fuso no Vitest.
- **Origem:** previsto — toda atividade com datas.

## Importação de pontos (CSV)

### Acentos viram "�"
- **Sintoma:** disciplinas com caracteres trocados. **Causa:** o Excel em português salva CSV em Windows-1252.
- **Solução:** `decodificarCsv` tenta UTF-8 estrito e cai para Windows-1252; o BOM é removido. **Prevenção:** "lê CSV do Excel em Windows-1252" (`pontos.test.ts`).
- **Origem:** ocorrido em 23/09/2026 (commit ed0a209).

### Tudo numa coluna ou linhas grudadas
- **Sintoma:** colunas não reconhecidas ou uma linha só. **Causa:** separador (`;`, tab ou `,`) mal escolhido quando o título tem `;`; fim de linha só CR não era aceito.
- **Solução:** separador pela contagem no cabeçalho, fora de aspas; CRLF, CR e LF aceitos. **Prevenção:** teste em `pontos.test.ts`.
- **Origem:** ocorrido em 23/09/2026 (commit ed0a209).

### Aviso na linha errada ou ponto duplicado
- **Sintoma:** o número da linha do aviso não bate com a planilha; o mesmo ponto entra duas vezes. **Causa:** linhas em branco e células com quebra de linha não contavam; duplicidade e id usavam chaves diferentes (espaços internos).
- **Solução:** número da linha física onde o registro começa; a mesma `chave()` (sem acento, minúsculas, espaços colapsados) para duplicidade e id. **Prevenção:** testes em `pontos.test.ts`.
- **Origem:** ocorrido em 23/09/2026 (commit ed0a209).

## Supabase

### `execute_sql` devolve só um resultado
- **Sintoma:** várias verificações num lote, e só aparece a última. **Causa:** o `execute_sql` do conector devolve só o resultado do último comando que retorna linhas (o `rollback` final não conta).
- **Solução:** gravar numa tabela temporária e ler no fim; recusas esperadas dentro de `do $$ … exception when others … $$`. **Prevenção:** usar `supabase/verificacao-rls-remota.sql` como modelo.
- **Origem:** ocorrido em 23/09/2026 (registrado em d87ddca).

### Migração nova no Supabase
- **Sintoma:** remoto diferente do repositório, RLS quebrada sem ninguém ver, ou `list_migrations` com versão (`20260923030320`) diferente do prefixo do arquivo (`20260923000000_…`). **Causa:** migração aplicada fora de ordem ou editada no painel; o `apply_migration` registra a versão com o horário UTC da aplicação.
- **Solução:** primeiro no repositório com `npm run check` verde (o `rls.test.ts` aplica todas em PGlite); depois `apply_migration` com o conteúdo do arquivo sem editar; depois advisors e `verificacao-rls-remota.sql`. A correspondência das versões está em `proxima-sessao.md`. **Prevenção:** nunca direto no painel; se um dia adotar o Supabase CLI, alinhar com `supabase migration repair`.
- **Origem:** ocorrido em 23/09/2026 (registrado em d87ddca).

### Advisors acusam política duplicada ou chave estrangeira sem índice
- **Sintoma:** avisos de desempenho no projeto real. **Causa:** duas políticas permissivas de leitura em `catalogo` e `catalogo.curador_id` sem índice.
- **Solução:** migração `ajustes_advisors`. Resta só "índice não usado", esperado até haver tráfego. **Prevenção:** guardas equivalentes aos dois lints em `rls.test.ts`.
- **Origem:** ocorrido em 23/09/2026 (commit d87ddca).

### Coleção nova quebra o teste de deriva
- **Sintoma:** `rls.test.ts` › "a lista de coleções do remoto é exatamente a das coleções exportáveis" falha. **Causa:** `arretado.registros` tem `check (colecao in (…))`; a entidade `leituras` (9.1), se entrar no pacote, não está na lista.
- **Solução:** migração nova acrescentando a coleção, seguindo "Migração nova no Supabase". O teste lê a lista só do `create table arretado.registros`, então uma migração que altere o `check` também exige ensinar o teste a ler a definição mais recente (9.1 do plano). **Prevenção:** o próprio teste de deriva.
- **Origem:** previsto — atividade 9.1.

### Projeto pausado ou esquema `arretado` invisível
- **Sintoma:** o projeto não responde; na F4, o cliente não acessa as tabelas. **Causa:** o plano free pausa depois de cerca de 7 dias sem uso do banco (e nada usa o banco antes da F4); o esquema `arretado` ainda não está exposto na API.
- **Solução:** reativar no painel ou com `restore_project`; Settings › API › Exposed schemas. **Prevenção:** lembretes da F4 em `proxima-sessao.md`; a pausa é o motivo de a T17 ter ido para o Cloudflare.
- **Origem:** previsto — F4.

## Cloudflare Workers (hospedagem e rota /api)

### Worker criado, mas "No URLs enabled" e nada no ar
- **Sintoma:** o painel mostra o Worker `arretado` ligado ao GitHub, com "No URLs enabled" e a chave da URL `workers.dev` desligada. **Causa:** o painel de hoje cria Worker, não projeto Pages, e o repositório ainda não tinha `wrangler.jsonc`: o Workers Builds não sabia que o site é a pasta `dist/` nem que a URL deve ficar ligada.
- **Solução:** `wrangler.jsonc` na raiz (`assets.directory` = `./dist`, `workers_dev: true`) e, no painel, Settings › Build com build command `npm run build` e deploy command `npx wrangler deploy`. O próximo push no `main` publica e liga https://arretado.gabrieldjcosta.workers.dev. **Prevenção:** T18 e passo a passo em `proxima-sessao.md`.
- **Origem:** ocorrido em 23/09/2026 (primeira publicação).

### Build do Worker falha: a pasta `dist` não existe
- **Sintoma:** o deploy acusa que o diretório de assets não existe. **Causa:** build command vazio no painel; o `npx wrangler deploy` roda sem o `npm run build` antes.
- **Solução:** Settings › Build › Build command = `npm run build`; depois "Retry build" em Deployments. **Prevenção:** conferir a configuração de build ao criar ou recriar o Worker.
- **Origem:** previsto — ao recriar o Worker ou mudar a configuração de build (a primeira publicação, em 23/09/2026, passou).

### Check `Workers Builds` vermelho em todo PR
- **Sintoma:** o check `Workers Builds: arretado` falha em 0 s, sem log no GitHub, em todo PR (#3, #4, #5), enquanto o `verificar` fica verde e os builds do `main` passam no painel. **Causa:** o Workers Builds também tenta construir os branches que não são o `main` (versões de prévia), e essa parte não está configurada; o site publicado não depende dela.
- **Solução:** ignorar no PR (o que vale é o `verificar`); ou, no painel, Settings › Build › Branch control, desligar os builds de branches que não são o de produção. O log fica no painel (Deployments › Go to build history). **Prevenção:** não usar prévia por branch enquanto o app for de um usuário só.
- **Origem:** ocorrido em 23/09/2026 (PRs #3–#5; builds do `main` verdes, conferidos pelo Gabriel).

### Publicação sem cabeçalhos de segurança
- **Sintoma:** o site sobe sem CSP. **Causa:** `dist/_headers` ausente (publicação sem o `npm run build`).
- **Solução:** o `_headers` sai do `npm run build` (plugin do `vite.config.ts`, a partir de `config/seguranca.ts`), e o Worker o aplica aos arquivos estáticos sem servi-lo. Conferir com `curl -sI https://arretado.gabrieldjcosta.workers.dev | grep -i content-security` no Git Bash (no Windows PowerShell 5.1, `curl` é apelido do `Invoke-WebRequest` e não há `grep`: usar `curl.exe -sI … | findstr /i content-security`). **Prevenção:** conferir a cada mudança em `config/seguranca.ts`.
- **Origem:** previsto — conferência dos cabeçalhos no site publicado pendente (Gabriel, no computador; a sessão na nuvem não alcança o `workers.dev`).

### `/api/buscar-norma` não responde ou responde sem cabeçalhos
- **Sintoma:** 404 na rota em desenvolvimento ou no site publicado; resposta sem `nosniff` nem `Content-Type` fixo. **Causa:** falta `main` e `assets.run_worker_first: ["/api/*"]` no `wrangler.jsonc` (sem isso tudo é servido como arquivo estático); o Vite não roda o Worker; o `_headers` não vale para respostas geradas pelo código do Worker.
- **Solução:** `worker/index.ts` como `main`, com `run_worker_first` só para `/api/*`, definindo `nosniff`, `Content-Type` e `Cache-Control` na resposta; em desenvolvimento, proxy do Vite para `wrangler dev` ou para o site publicado; no E2E, rota interceptada pelo Playwright. **Prevenção:** regras puras em `worker/regras.ts`, testadas no Vitest, inclusive os cabeçalhos.
- **Origem:** previsto — atividades 12.1 e 12.3.

### A rota estoura o limite de processamento
- **Sintoma:** a busca de uma lei grande falha no Cloudflare. **Causa:** o plano gratuito dá 10 ms de CPU por execução do Worker (esperar o Planalto não conta; processar conta).
- **Solução:** a rota só repassa os bytes (sem decodificar nem montar JSON); se ainda estourar, plano B da T17 (Edge Function no Supabase, aceitando a pausa). **Prevenção:** chamada real com LEP, CF/88 (1,8 MB) e Código Civil, conferida no painel.
- **Origem:** previsto — atividade 12.2.

## Legislação (F2): fontes, colar, estruturador, leitor

### Planalto derruba a conexão (`ECONNRESET`)
- **Sintoma:** download ou busca falha sem resposta. **Causa:** o Planalto recusa o User-Agent padrão do Node e aceita qualquer um iniciado por `Mozilla/5.0`.
- **Solução:** `Mozilla/5.0 (compatible; …)`, como no corpus. **Prevenção:** teste da 12.1 conferindo o User-Agent enviado pela função.
- **Origem:** ocorrido em 23/09/2026 (commit 13355bc).

### O hash da página muda a cada download
- **Sintoma:** norma "mudou" sem mudança no texto. **Causa:** Planalto (firewall F5, `<script id="f5_cspm">`) e ALESP (Dynatrace) injetam um `<script>` diferente a cada requisição.
- **Solução:** hash de norma sempre sobre o conteúdo sem scripts ou sanitizado, nunca sobre os bytes (`sha256Conteudo` no manifesto; `hash` da VersaoDeNorma na 9.2). **Prevenção:** detalhes em `planos/F2.md` › "Fatos das fontes"; a F6 compara notas de vigência, não páginas.
- **Origem:** ocorrido em 23/09/2026 (commit 13355bc).

### `npm test` acusa o corpus
- **Sintoma:** "bytes no disco … (fim de linha convertido pelo git?)"; "arquivo fora do manifesto — rode npm run corpus"; "sem colado" ou "colado capturado de outra versão da página — rode npm run corpus:colar"; "gabarito … feito sobre outra versão da página"; ou o `npm run corpus` completo apaga arquivos da pasta. **Causa:** o git converteria o fim de linha; a página mudou na fonte depois da captura ou do gabarito; ou um derivado ficou sem entrada no índice.
- **Solução:** `corpus/normas/*.html` e `*.colado.txt` com `-text` no `.gitattributes`; página nova → `npm run corpus:colar` e refazer a conferência do gabarito (o `npm run corpus` avisa). Os derivados (`*.colado.html`, `*.colado.txt`, `*.gabarito.json`, reconhecidos por `ehDerivado`) ficam fora do manifesto, com índice próprio (`colados.json`); `verificarCorpus` e `baixarCorpus` os ignoram. **Prevenção:** `verificarCorpus` + `verificarDerivados` no `npm test` (`scripts/corpus-derivados.test.ts`), sem rede.
- **Origem:** previsto na 7.1 (prevenido em 13355bc); derivados resolvidos na 7.2 (23/09/2026, branch `claude/proxima-atividade-f2-wegu83`).

### Acentos trocados ou "�" no texto da lei
- **Sintoma:** aparece U+FFFD (windows-1252 lido como UTF-8) ou "Seção" vira "SeÃ§Ã£o" (UTF-8 lido como windows-1252). **Causa:** o Planalto grava em windows-1252 e não declara charset (nem cabeçalho nem `<meta>`); a ALESP declara UTF-8 na `<meta>`.
- **Solução:** charset da `<meta>` quando houver, senão windows-1252 (cliente da 12.3). A captura da 7.2 serve a página com `Content-Type: text/html; charset=<do manifesto>`. **Prevenção:** conferência de U+FFFD em `conferirConteudo` (páginas) e `conferirCaptura` (colados); testes da 12.1 com páginas do corpus.
- **Origem:** previsto — 7.2 (prevenido em 23/09/2026) e 12.3.

### Nenhuma redação anterior depois de colar
- **Sintoma:** a lei entra sem nenhum texto tachado. **Causa:** a página "compilado" do Planalto traz só o texto vigente; a simples (`l7210.htm`, `del2848.htm`) traz todas as redações.
- **Solução:** colar da página simples. **Prevenção:** na 9.5, avisar quando o conteúdo indicar a compilada (na 12.3, também pela URL `…compilado.htm`); o corpus confere a variante pela contagem de tachados (limiar 20).
- **Origem:** previsto — atividade 9.5.

### O HTML colado muda conforme o navegador
- **Sintoma:** a mesma lei estrutura bem no Chromium e mal em outro navegador, no Windows ou no celular; ou `npm run corpus:colar` no Windows regrava todos os colados. **Causa:** cada navegador e cada sistema serializa a seleção de um jeito: estilo computado em linha; no Windows, envelope do CF_HTML (`<html><body><!--StartFragment-->`) e texto puro em CRLF (previsto). No celular a seleção de uma lei inteira é difícil e o colar pode trazer só texto puro.
- **Solução:** reserva em `text/plain` (tudo "a confirmar", 8.8) e busca por URL (12.3). Os colados do corpus são do Chromium 141 no Linux (`navegador` e `plataforma` no `colados.json`); não recapturar no Windows sem motivo. **Prevenção:** na 9.5, um teste com colar real do Windows (guardar como amostra, fora do `colados.json`); amostras de outros navegadores quando aparecerem.
- **Origem:** previsto — atividades 7.2 (Linux capturado em 23/09/2026) e 9.5.

### Captura do colar vazia ou de outra página
- **Sintoma:** `npm run corpus:colar` falha com "colado sem html" ou marcador ausente; a lista de bloqueados mostra a raiz do site. **Causa:** clicar na página para dar foco antes do Ctrl+A: o canto superior esquerdo da página da ALESP é um link, e o clique navegou para `https://www.al.sp.gov.br/`.
- **Solução:** não clicar; o foco já está na página depois do `goto`. **Prevenção:** `capturar` confere que a URL não mudou antes de colar, e `conferirCaptura` exige `text/html` com marcação e os marcadores da norma; um navegador novo por norma, para um colar que falhe não devolver a norma anterior.
- **Origem:** ocorrido em 23/09/2026 (protótipo da 7.2, antes do commit).

### Colar real diferente do colado do corpus
- **Sintoma:** o estruturador acerta o colado do corpus e erra o colar feito no navegador. **Causa:** a captura bloqueia o CSS e o JS da fonte (`del.css`, `alvorada.css`, `c927.js`, `stf.js` do Planalto; CSS da ALESP); no navegador do Gabriel eles rodam, mudam o estilo computado e, em tese, poderiam esconder ou reformatar trechos.
- **Solução:** comparar a contagem de tachados e de artigos do colar real com a do colado (`contarTachados`). **Prevenção:** na 9.5, colar real da LEP e do CP no Windows como amostra de teste.
- **Origem:** previsto — atividade 9.5.

### `npm run corpus` responde HTTP 403 em todas as normas
- **Sintoma:** "✗ lep: HTTP 403" em todas, só nas sessões do Claude Code na nuvem. **Causa:** a política de rede do contêiner bloqueia o Planalto e a ALESP (o proxy responde 403).
- **Solução:** rodar o `npm run corpus` no Windows do Gabriel, ou liberar os hosts na configuração de rede do ambiente. Nada é apagado: a limpeza só tira o que saiu do catálogo. `npm run corpus:colar` e `npm test` não usam rede e funcionam no contêiner. **Prevenção:** nenhuma; é do ambiente.
- **Origem:** ocorrido em 23/09/2026 (sessão da 7.2).
- **Atualização (24/09/2026):** o Gabriel liberou `www.planalto.gov.br`, `planalto.gov.br`, `www.al.sp.gov.br` e `al.sp.gov.br` na rede do ambiente. O `curl` passa a alcançar o Planalto, mas o `fetch` do Node não lê o `HTTPS_PROXY` e continua com 403: rodar `NODE_USE_ENV_PROXY=1 npm run corpus -- --so <ids>` (Node ≥ 22.21).

### `npm run corpus` sem `--so` baixa de novo páginas já conferidas
- **Sintoma:** "↻ cp" e "↻ cp-compilado" num `npm run corpus` feito só para acrescentar normas. **Causa:** o Planalto atualiza as páginas (o CP mudou entre 23 e 24/09/2026, cerca de 130 linhas a mais); baixar de novo troca os bytes, invalida o colado e o gabarito e pede nova conferência.
- **Solução:** `git checkout` das páginas e do `manifesto.json`, e rodar só `--so` com as normas novas. **Prevenção:** acrescentar norma sempre com `--so`; atualizar uma página do corpus é decisão à parte (refazer colado, gabarito e conferência).
- **Origem:** ocorrido em 24/09/2026 (ECA e CDC no corpus).
- **Atualização do CP (Gabriel, 24/09/2026):** a mudança era a Lei 15.517/2026 (furto e roubo de combustíveis: §§ 10 a 12 do art. 155 e acréscimos no art. 157). CP e CP compilado baixados de novo, colados e gabarito refeitos (1.402 → 1.422 dispositivos, sem pendência); a folha do CP foi regerada antes de qualquer marca, com a mesma conferência reduzida.

### Norma do Planalto recusada: marcador ausente ou poucos tachados
- **Sintoma:** "✗ cdc: marcador \"art. 1º\" ausente" e "só 14 tachados — não parece a página com todas as redações". **Causa:** o CDC escreve "Art. 1°" com sinal de grau (como a ALESP), e é pouco alterado: 14 tachados, abaixo do `LIMIAR_TACHADOS` (20).
- **Solução:** marcador com "°" e `limiarTachados: 10` na entrada do catálogo (`scripts/corpus/normas.mjs`); a compilada tem 0. **Prevenção:** ao acrescentar norma, conferir o ordinal do "Art. 1" e contar os tachados das duas variantes antes de fixar o limiar.
- **Origem:** ocorrido em 24/09/2026.

### Número solto no fim do texto do dispositivo
- **Sintoma:** texto que termina em "… às presas. 7.627" (LEP, art. 18-A, § 3º), apontado pelo Gabriel na conferência. **Causa:** a fonte põe, logo depois da frase, um link cujo texto é só o número de outro ato (`<a href="…/D7627.htm">7.627</a>`, o Decreto 7.627/2011); a compilada não o traz.
- **Solução:** no gabarito, número com ponto de milhar depois de ".", ";" ou ":" e no fim do texto vira nota (`RE_NUMERO_SOLTO` em `scripts/corpus/gabarito.mjs`). **Prevenção:** o estruturador (8.5) trata o mesmo caso ao separar as notas; o sinal mais forte é o link para outro ato.
- **Origem:** ocorrido em 24/09/2026 (conferência da LEP).

### A lei some depois do começo da página
- **Sintoma:** CP ou CF estruturados só com o cabeçalho. **Causa:** `</body></html>` logo no início do arquivo (o `</html>` no byte 4.613 do CP e 133.966 da CF), com a lei inteira depois.
- **Solução:** nunca cortar em `</body>`/`</html>` nem extrair o corpo por regex; o parser HTML5 (DOMPurify/DOMParser) devolve o conteúdo ao `body`. **Prevenção:** `scripts/corpus-estruturador.test.ts`: o `cp.html` e o `cf.html` inteiros (bytes em windows-1252) passam pelo sanitizador e pelo estruturador e dão a mesma árvore estrutural do colado.
- **Origem:** previsto na 8.2; prevenido em 24/09/2026 (atividade 8.2; nada se perdeu).

### Teste em `scripts/` que usa o sanitizador não compila
- **Sintoma:** `tsc -b` acusa `Cannot find name 'window'`, `Element`, `Node` em `src/core/seguranca/sanitizador.ts`. **Causa:** o `tsconfig.node` (que cobre `scripts/`) não tem os tipos do DOM, e o teste importa o sanitizador de `src/`.
- **Solução:** `/// <reference lib="dom" />` no topo do teste, com o motivo; não mudar o `tsconfig.node`. **Prevenção:** `scripts/corpus-estruturador.test.ts` como modelo.
- **Origem:** ocorrido em 24/09/2026 (atividade 8.2, antes do commit).

### Árvore estrutural diverge do gabarito só no "primeiro artigo", no bloco ou num nome
- **Sintoma:** o teste da árvore contra o gabarito acusa `primeiroArtigo` diferente num nó que começa por artigo revogado; `adct.art1`/`dt.art1` × `art1`; o nome do Capítulo III do Título VII da CF com "Regulamento" no gabarito. **Causa:** até a 8.6, o artigo revogado todo tachado é descarte, não nó; o prefixo do bloco é da 8.4; e o gabarito deixou no nome um link de nota que o estruturador separa (regra 7).
- **Solução:** tolerâncias explícitas em `estruturaEsperada` (`src/testes/gabarito.ts`), cada uma com a atividade que a remove, e `NOME_CORRIGIDO` para o erro do gabarito (examinado na página, sem igualar um ao outro). **Prevenção:** a 8.4, a 8.5 e a 8.6 apagam a sua tolerância; a 8.5 corrige a regra do gabarito ("Regulamento" solto no fim do nome) e roda `npm run corpus:gabarito`.
- **Origem:** ocorrido em 24/09/2026 (atividade 8.2).

### Mesclar nós repetidos ou juntar nome em caixa alta fica quadrático
- **Sintoma:** página hostil com o mesmo rótulo repetido ou milhares de linhas em caixa alta depois de um rótulo trava o estruturador. **Causa:** cada nó substituído copiava os filhos e as redações acumulados; o nome era remontado a cada linha de continuação.
- **Solução:** a mesclagem monta cadeias de nós de mesmo segmento e remonta cada sobrevivente uma vez; o nome tem no máximo 4 linhas (no corpus, 2). **Prevenção:** "estruturador (8.2): desempenho" em `desempenho.test.ts` (100 mil linhas, menos de 5 s).
- **Origem:** ocorrido em 24/09/2026 (releitura da 8.2, antes do commit).

### Rubrica tomada como nome do nó, ou fecho aberto no meio do texto
- **Sintoma:** nó sem nome que recebe a rubrica do 1º artigo como nome; linhas de um artigo descartadas como fecho. **Causa:** a regra 3 toma como nome a 1ª linha depois do rótulo (no corpus, todo nó com linha depois do rótulo tem nome); o fecho começa em qualquer linha "Local, dia de mês de ano" depois do 1º artigo, e uma citação assim no começo de uma linha do texto o abriria cedo (depois dele, só artigo ou rótulo reabre o corpo).
- **Solução (a fazer):** na 8.3, conferir a rubrica (linha curta antes de "Art.") contra o nome do nó sem nome; na 8.7, a validação acusa artigo depois do fecho e nó sem nome seguido de uma única linha antes do artigo. **Prevenção:** regressão da 8.9.
- **Origem:** previsto — atividades 8.3 e 8.7.

### Gabarito que só repete o estruturador
- **Sintoma:** a regressão da 8.9 passa, mas a lei sai errada no leitor. **Causa:** gabarito gerado pela mesma lógica (ou pelas mesmas suposições) que o estruturador vai usar: os dois erram juntos.
- **Solução:** o gabarito sai de `scripts/corpus/gabarito.mjs` (jsdom sobre o colado, linha a linha; sem o `extrair_lei.js`, decisão de 23/09/2026), cruzado com a página compilada, as âncoras `name="art…"`, o texto puro colado e o último artigo conhecido. Divergência sem regra vira pendência e só sai com decisão e motivo em `DECISOES`. A amostra de 50 por lei é conferida pelo Gabriel (`docs/conferencias/gabarito-<id>.md`). **O estruturador (etapa 8) não importa nem copia esse arquivo**: se os dois divergirem, examinar o caso, sem igualar um ao outro. **Prevenção:** `scripts/corpus-gabarito.test.ts` (gabarito reproduzível e sem pendência); `conferencia` no JSON; `origemSha256Conteudo` amarra o gabarito à página (`verificarDerivados`).
- **Origem:** previsto na 7.3; prevenido em 23/09/2026 (branch `claude/proxima-atividade-f2-2il48c`; as outras 3 normas no branch `claude/proxima-atividade-f2-ezll0b`).

### `npm test` acusa "gabarito desatualizado" ou `npm run corpus:gabarito` sai com pendência
- **Sintoma:** o teste de `scripts/corpus-gabarito.test.ts` falha em "gabarito desatualizado — rode npm run corpus:gabarito"; ou o comando lista "✗ cp: N pendência(s) — explicar em DECISOES". **Causa:** mudou a regra do gabarito, o colado ou a página; ou um sinal novo discorda do inventário.
- **Solução:** rodar `npm run corpus:gabarito` e revisar o diff do `*.gabarito.json`. Se houver pendência, olhar o caso na página, corrigir a regra ou registrar a decisão em `DECISOES` com o motivo (a de um endereço vale para os descendentes). Se o conteúdo mudar, a `conferencia` volta a "pendente" e a folha de conferência é regravada: o Gabriel confere de novo. **Prevenção:** o próprio teste; o comando não grava gabarito com pendência.
- **Origem:** ocorrido em 23/09/2026, durante a geração (15 pendências no CP, todas erros da fonte, hoje em `DECISOES`).

### Contagem do gabarito errada por detalhe da página
- **Sintoma:** artigo revogado sumido e a rubrica dele no artigo seguinte; "(revogado)" contado como nota; "§ 2º (Revogado) . (Redação dada…)." tratado como vigente; linha quase toda tachada, com o "§" fora do tachado, virando dispositivo vazio. **Causa:** na página, a revogação às vezes está só na linha "Pena" (CP, arts. 185 e 279); o "(Revogado)" sozinho é texto, não nota; sobra pontuação depois de tirar a nota; o tachado não cobre o rótulo inteiro.
- **Solução:** regras do inventário em `scripts/corpus/gabarito.mjs` (artigo só tachado vira revogado e leva a rubrica pendente; "(Revogado)" sem "pela" fica no texto; `vazio` aceita "§", parêntese e pontuação). **Prevenção:** testes de inventário em `scripts/corpus-gabarito.test.ts`; os mesmos casos entram nos testes da 8.3–8.6.
- **Origem:** ocorrido em 23/09/2026 (7.3, antes do commit).

### A página compilada diz uma coisa e a página com todas as redações, outra
- **Sintoma:** dispositivo presente numa e ausente na outra, ou rotulado diferente. Exemplos: LEP, art. 9º-A, § 1º só na página; CP, art. 234, "§ 1º." na página e "Parágrafo único" na compilada; CP, art. 92, parágrafo único antigo sem tachado. **Causa:** as duas páginas do Planalto são editadas à mão, em momentos diferentes.
- **Solução:** o app recebe a página com todas as redações, e o gabarito a segue. As divergências ficam registradas em `DECISOES` e entram na amostra conferida. A 8.7 acusa `paragrafo-unico-com-numerado` como conflito e `paragrafo-1-sem-2` como aviso (o CP, art. 168, tem § 1º sozinho de verdade). **Prevenção:** cruzamento com a compilada em todo gabarito.
- **Origem:** ocorrido em 23/09/2026 (7.3).

### Estrutura antiga sem tachado ou redação sem dispositivo de mesmo endereço
- **Sintoma:** dois "TÍTULO VI" no CP; centenas de tachados da Parte Geral de 1940 sem artigo correspondente (incisos e alíneas que não existem mais); parágrafo único que virou § 1º. **Causa:** o Planalto nem sempre tacha o título antigo, e a estrutura antiga não tem o mesmo endereço da nova.
- **Solução:** nó repetido sem artigo no meio é substituído pelo último (`estrutural-substituido`); redação sem dispositivo de mesmo endereço vai para o ancestral mais próximo, com `enderecoLido` (331 no CP). **Prevenção:** casos e `redacoesNoAncestral` no gabarito; testes da 8.2 e da 8.6 contra ele.
- **Origem:** ocorrido em 23/09/2026 (7.3); no estruturador, o nó substituído prevenido em 24/09/2026 (8.2: vale o último, o anterior vira redação anterior `heuristica`, aviso `estrutural_substituido`; teste "nó repetido sem artigo no meio"); a redação no ancestral fica para a 8.6.

### Mesmo endereço duas vezes na página
- **Sintoma:** endereço duplicado na validação. **Causa:** a página traz a revogação ("I - ~~texto~~ (Revogado pela…)") e, logo depois, a nova redação "I - (revogado); (Redação dada…)"; ou o "(VETADO)" seguido do texto incluído com a derrubada do veto (CP, art. 141, § 2º).
- **Solução:** vale a última linha e a anterior vira redação anterior (casos `revogacao-reescrita` e `duplicata` no gabarito). **Prevenção:** "0 duplicados" na 8.4 e na 8.9, com esses endereços na amostra.
- **Origem:** ocorrido em 23/09/2026 (7.3); previsto para o estruturador na atividade 8.6.

### Tachado decorativo tratado como redação anterior (ou o contrário)
- **Sintoma:** "Art. 1º" vira redação anterior; ou revogação da ALESP aparece como vigente. **Causa:** o `<s>` é decorativo no Planalto (só em `º`/`ª`; 56 na LC 80) e é a marca real de revogação na ALESP (172 na LC-SP 988); o `line-through` por estilo também é redação anterior.
- **Solução:** decidir pelo conteúdo: `<s>` só com ordinal é decorativo, `<s>` com texto é redação anterior. O decorativo já sai na normalização (8.1): a marca do ordinal herda a formatação do número, e no parágrafo tachado de verdade continua tachada. **Prevenção:** `normalizacao-corpus.test.ts` (o tachado se preserva caractere a caractere, menos os 56 decorativos da LC 80); gabarito da 7.3 e regressão da 8.9 (100% das redações anteriores).
- **Origem:** previsto na 8.6; a parte do ordinal prevenida em 23/09/2026 (8.1). O `<s>X</s> XI -` da ALESP (art. 134) é renumeração, não decorativo: continua com a 8.6.

### Fim de linha misto quebra a segmentação
- **Sintoma:** linhas grudadas ou vazias no meio do texto. **Causa:** LEP, LC 80 e CF em CRLF; o CP com maioria de LF (11.953 LF e 5.694 CRLF, inclusive dentro do texto); a ALESP em LF.
- **Solução:** o sanitizador e o `textoParaBlocos` tratam CRLF, CR e LF do mesmo jeito (o texto puro também quebra em U+2028 e U+2029, a quebra de linha do Word), e a normalização troca por espaço a quebra que sobrar dentro de um bloco. **Prevenção:** teste "CRLF, CR e LF dão os mesmos blocos, no texto puro e no HTML" (`normalizacao.test.ts`) e o do `textoParaBlocos` em `sanitizador.test.ts`.
- **Origem:** previsto na 8.1; prevenido em 23/09/2026 (atividade 8.1).

### Palavra partida, busca que falha ou ordinal não reconhecido
- **Sintoma:** palavra com hífen invisível e busca sem resultado, ou palavras coladas ("incumbindolhe", "farseá"), ou hífens no meio das sílabas ("De-fen-so-ria"); "Art. 1o", "Artigo 1°", "§ 3 o" ou "N° 988" sem virar artigo. **Causa:** no Planalto o hífen suave (U+00AD) está no lugar do hífen verdadeiro (79 na LC 80, em ênclise, mesóclise e compostos): removê-lo cola as palavras; no Word e no PDF ele marca sílaba. O Planalto alterna `º` e "o" (o `<sup>o</sup>` perde o sup), às vezes com espaço, e a ALESP usa o sinal de grau (`°`).
- **Solução:** `normalizarBlocos` (regra 1): U+00AD vira "-" quando a norma inteira tem cara de hífen e some quando tem cara de sílaba (`relatorio.hifenSuave`); ordinais viram º/ª com a formatação do número (ver os fatos da normalização no plano). Na 8.3, aceitar "Artigo" (regra 5). **Prevenção:** `normalizacao.test.ts` (casos do corpus) e `normalizacao-corpus.test.ts` (nenhum U+00AD nem ordinal solto sobra nos 7 colados); a 8.3 repete com rótulos. A varredura de caracteres invisíveis de `src/` não cobre U+00AD.
- **Origem:** previsto nas 8.1 e 8.3; a normalização prevenida em 23/09/2026 (8.1), onde a medição mostrou que remover o U+00AD, como dizia o plano, estragaria 79 palavras da LC 80.

### Regex de rótulo ou nota falha por espaço, travessão ou aspas
- **Sintoma:** "§ 1º" não casa por causa de um espaço duplo ou de um trecho só de espaço com ênfase entre o rótulo e o traço; "I – a primazia" (LC 80) ou "Pena – reclusão" (CP) não vira inciso ou pena; `"Caput" acrescentado` (ALESP) não vira nota. **Causa:** o sanitizador não recolapsa o espaço entre nós de texto vizinhos (milhares de blocos); a fonte usa "-" e "–"; o texto exibido mantém aspas e travessões como vieram.
- **Solução:** sempre `normalizarBlocos` antes de qualquer regra, e casar na `chaveDeCasamento` (travessões e aspas unificados, mesmo comprimento: o índice do casamento vale no texto). Nunca tirar o espaço em volta do traço (é o que separa "Art. 1º - A" de "Art. 9º-A"). **Prevenção:** invariantes de `normalizacao-corpus.test.ts` (sem espaço sobrando, trechos fundidos); testes da 8.3–8.6 com os casos do corpus.
- **Origem:** ocorrido na medição da 8.1 (23/09/2026); previsto para o estruturador nas atividades 8.3–8.6.

### A normalização muda a letra da lei (grau, contração, composto)
- **Sintoma:** "declividade superior a 45°" exibido como "45º"; "nesta Lei nos 2 (dois) anos" como "nºs 2"; numa norma com muitos compostos em minúscula ("auxílio-doença", "salário-família") os hífens suaves somem e as palavras colam. **Causa:** regra de ordinal larga demais (grau depois de qualquer número; "no" + número depois de "Lei" tomado sempre por "nº") e a decisão do hífen suave contando só ênclise e maiúscula como hífen.
- **Solução:** ° vira º só depois de um algarismo de 1 a 9 (no corpus, todo ° ordinal tem um algarismo); "no"/"nos" só vira "nº" quando o número não vem seguido de ordinal nem de extenso entre parênteses; composto conta como hífen quando a palavra da direita aparece solta na norma. **Prevenção:** "correções da revisão da 8.1" em `normalizacao.test.ts` (Código Florestal, ECA, Lei 10.261/68 da ALESP); regra nova de ordinal entra com casos que **não** devem mudar.
- **Origem:** ocorrido em 24/09/2026 (revisão adversarial da 8.1, antes do commit).

### Grifo, busca ou rótulo no lugar errado depois de normalizar
- **Sintoma:** o casamento acha o rótulo, mas o corte do texto sai deslocado; grifo ou resultado de busca uns caracteres adiante. **Causa:** usar como base de índice um texto de comparação que muda o comprimento (tirar o ponto de "N.º", colapsar espaço antes de pontuação, tirar acento).
- **Solução:** a `chaveDeCasamento` troca caractere por caractere, sem mudar o comprimento; comparação que muda o comprimento (a da 8.9 e a da F6) fica separada e nunca dá índice. **Prevenção:** teste "unifica travessões e aspas sem mudar o comprimento" (`normalizacao.test.ts`).
- **Origem:** previsto — atividades 8.3–8.6, 8.9, 11.4, 11.6 e F6.

### Colar enorme trava a normalização
- **Sintoma:** a tela congela ao colar um texto grande numa linha só. **Causa:** regra quadrática: lookbehind `\d,\d*` que volta a sequência inteira de algarismos em cada posição, ou checagem da ponta do bloco que fatiava o texto a cada hífen suave.
- **Solução:** lookbehind limitado (`\d{0,9}`) e pontas do bloco calculadas uma vez. **Prevenção:** `desempenho.test.ts` (2 milhões de caracteres hostis por regra, abaixo de 5 s); toda regra nova de normalização ou do estruturador entra nesse teste.
- **Origem:** ocorrido em 23/09/2026 (8.1, achado na releitura, antes do commit).

### "Art" quebrado, capitular ou sangria entre artigos
- **Sintoma:** artigo ausente, dois artigos fundidos, ou rubrica colada no artigo anterior. **Causa:** "Art" e número em linhas ou tags diferentes; capitular `<strong>A</strong>rt.`; rubrica em negrito antes do "Art." (é o `nome` do seguinte); citação "art." em minúscula no meio do texto.
- **Solução:** regras 4 e 5 tolerantes, com os casos listados no plano (lições da skill `acumen-extrair-normas`). **Prevenção:** "todos os artigos do corpus, em ordem, sem sangria" (8.3) e regressão da 8.9.
- **Origem:** previsto — atividade 8.3.

### Anexo ou ADCT viram artigos duplicados
- **Sintoma:** validação acusa `art1` duplicado; linhas de tabela estruturadas como incisos. No gabarito, antes do prefixo: 236 "duplicatas" na CF e 35 na LC-SP 988, e a sequência de artigos "voltava" do 250 ao 1. **Causa:** o ADCT recomeça a numeração no art. 1º dentro da mesma página da CF/88; a LC-SP 988 faz o mesmo nas disposições transitórias (Título VIII, "Artigo 1°" a "21"); bloco depois de "ANEXO" tratado como texto normativo.
- **Solução:** bloco com numeração própria que prefixa o endereço (`adct.art1`, `dt.art1`; o gabarito usa `Bloco` em `GABARITOS`); anexo como dispositivo `anexo` com texto bruto, sem estruturar (regra 11). **Prevenção:** `conferirSequencia` por bloco e testes em `scripts/corpus-gabarito.test.ts`; no estruturador, "endereços únicos" (8.4) e validação estrutural (8.7) com a CF e a LC-SP 988 do corpus; a `ordem` também precisa distinguir os blocos (8.3–8.4).
- **Origem:** ocorrido no gabarito em 23/09/2026 (7.3, 2ª sessão, branch `claude/proxima-atividade-f2-ezll0b`); previsto para o estruturador nas atividades 8.4 e 8.7.

### Nota da ALESP vira rubrica, ou "(NR)" fica no texto
- **Sintoma:** dezenas de dispositivos com um "nome" que é nota ("Inciso IX com redação dada pela…"); texto terminando em "(NR)"; "1 - Defensor…" sem virar item. **Causa:** a ALESP põe a nota em linha própria, depois do que anota, começando por "- " (171 linhas; tachada quando é de uma redação antiga), marca o texto alterado com "(NR)" (139) e escreve o item com hífen (45). Nada disso existe no Planalto.
- **Solução:** linha de nota vai para o último dispositivo ou nó (`NoEstrutural.notas`); tachada, continua a redação anterior; "(NR)" é nota; item aceita "1 -". **Prevenção:** teste "nota em linha própria da ALESP…" em `scripts/corpus-gabarito.test.ts`; os mesmos casos entram nos testes da 8.5 e 8.6 (regra 7).
- **Origem:** ocorrido em 23/09/2026 (7.3, 2ª sessão, gabarito da LC-SP 988: 93 falsos nomes antes da regra).

### Rótulo novo ao lado do antigo tachado, ou pedaço do rótulo fora do tachado
- **Sintoma:** "XI - outras previstas em lei." vira rubrica; "Parágrafo único" fica com o texto do § 1º; "III (Revogado pela…)" sai como inciso vigente e vazio. **Causa:** a ALESP renumera tachando só o rótulo antigo ("~~X~~ XI -", "~~Parágrafo único~~ § 1° -"); na CF, o tachado às vezes começa depois do numeral ("III ~~- classistas…~~", "c~~) os nascidos…~~", "A~~rt. 76.~~").
- **Solução:** vale o rótulo de fora do tachado (caso `rotulo-renumerado`); o que sobra fora do tachado e cabe no rótulo conta como rótulo. **Prevenção:** teste "pedaço do rótulo fora do tachado, rótulo renumerado e anexo"; na 8.6, a regra 10 (renumeração) com esses casos.
- **Origem:** ocorrido em 23/09/2026 (7.3, 2ª sessão).

### Inciso sem hífen vira rubrica, ou rubrica com capitular vira inciso
- **Sintoma:** na CF, "I receber as reclamações…" e "IV as ilhas fluviais…" viravam o nome do dispositivo seguinte (17 falsos nomes); ao aceitar o inciso sem hífen, "I ncidência em interdição de direito" (rubrica tachada do CP de 1940) virou inciso. **Causa:** a CF escreve 49 incisos sem o hífen da regra 6; a capitular separa a primeira letra da palavra.
- **Solução:** inciso sem hífen só antes de texto em minúscula e se a linha termina como inciso (";", ":" ou "."); com sufixo, o separador pode faltar ("I-A o Conselho"). **Prevenção:** casos em `rotulo` no `scripts/corpus-gabarito.test.ts`; os mesmos na 8.3 (regra 6).
- **Origem:** ocorrido em 23/09/2026 (7.3, 2ª sessão).

### "Vigência" no fim do texto, ou nome de capítulo como rubrica do artigo
- **Sintoma:** texto vigente ou rubrica terminando em "Vigência" (LEP, art. 9º-A, § 5º; CP, rubrica do art. 171-A); "CAPÍTULO II-B" com nome "B" e o nome verdadeiro na rubrica do art. 337-E; "Incluído pela Lei nº 13.445, de 2017 Vigência" no texto do art. 232-A do CP. **Causa:** o Planalto põe "Vigência" como link sem parênteses depois da nota (21 na CF, 7 na LEP, 18 no CP); numeral estrutural com sufixo ("I-A", "V-A"); nota sem parênteses no CP.
- **Solução:** "Vigência" logo depois de outra nota é nota; numeral estrutural aceita "-A"; nota sem parênteses só no fim, com a chave em maiúscula, "pela Lei…" e o ano. Os gabaritos da LEP e do CP foram corrigidos (32 dispositivos; amostras regeradas, ainda sem conferência). **Prevenção:** testes de `separarNotas` e `rotulo`; varredura de sobras (texto com "Vigência", "(NR)" ou nota) antes de gravar gabarito novo.
- **Origem:** ocorrido em 23/09/2026 (7.3, 2ª sessão; os três já estavam no gabarito da 1ª sessão).

### Texto cortado, nome do nó pela metade ou rubrica perdida no gabarito
- **Sintoma:** o fim de uma frase some (LC-SP 988, art. 159: "…bem como os concedidos" sem "aos advogados em geral."); nome do Título XII do CP salvo como "DOS CRIMES CONTRA O ESTADO"; rubrica antes de um parágrafo tachado não chega ao vigente seguinte; inciso revogado sob um parágrafo que só existe tachado vira dispositivo (CP, art. 187; CF, art. 115). **Causa:** a fonte quebra um parágrafo ou um nome em duas linhas; a linha tachada "capturava" a rubrica; o endereço do filho segue o pai tachado.
- **Solução:** linha em minúscula depois de texto sem ponto final continua o dispositivo (`linha-continuada`); caixa alta logo depois do nome em caixa alta continua o nome; só artigo tachado captura rubrica; revogado sem pai vai para o ancestral (`revogado-sem-pai`) e vigente sem pai é pendência (`sem-pai`). **Prevenção:** testes "correções da revisão da etapa 7" em `scripts/corpus-gabarito.test.ts`; o estruturador precisa dos mesmos casos (8.3–8.6).
- **Origem:** ocorrido em 23/09/2026 (`/code-review` do fim da etapa 7).

### Folha de conferência regravada por cima das marcas, ou gabarito "íntegro" sobre colado velho
- **Sintoma:** marcas `[x]` da folha somem depois de `npm run corpus:gabarito`; `npm run corpus -- --verificar` diz "corpus íntegro" com um gabarito feito sobre um colado anterior; o link da folha abre o começo da página. **Causa:** a folha era regravada sempre que o gabarito mudava; o gabarito só guardava o hash da página; o link usava a âncora em minúsculas (`#art216a`), e o fragmento diferencia maiúsculas (`name="art216A"`).
- **Solução:** o comando não regrava folha que difere da gerada pelo gabarito anterior (sai com ✗: passar as marcas para a `conferencia`, guardar a folha com outro nome e rodar de novo); conferência desfeita guarda as observações; `origemSha256Colados` amarra o gabarito aos bytes dos colados (`verificarDerivados`); o link usa o nome como está na página. **Prevenção:** testes de `verificarDerivados` e de `preservarConferencia`.
- **Origem:** ocorrido em 23/09/2026 (`/code-review` do fim da etapa 7).

### Regressão da 8.9 reprova por forma, não por conteúdo
- **Sintoma:** a comparação estruturador × gabarito acusa diferença em dispositivos certos. **Causa:** o endereço do gabarito é proposto (`parUnico`, `alB`, `adct.`, `dt.`), e a 8.4 pode decidir outro; o texto do gabarito guarda o que a página mostra fora do tachado (CF, art. 100, § 11: ", ,"; ordinais "1o" × "1º").
- **Solução:** `compararComGabarito` traduz o endereço, se a 8.4 escolher outro, e compara o texto com `paraComparar` (tolerante a ordinal, aspas, travessão e pontuação). **Prevenção:** teste da 8.9 com um dispositivo de cada forma (bloco, parágrafo único, alínea, sufixo).
- **Origem:** previsto — atividades 8.4 e 8.9.

### Gabarito cheio de pendências numa página sem âncoras, ou decisão que não explica mais nada
- **Sintoma:** `npm run corpus:gabarito` lista 249 `artigo-sem-ancora` na LC-SP 988; ou lista `decisao-sem-uso`. **Causa:** a ALESP não tem âncoras nem compilada; uma regra nova passou a cobrir o caso que a decisão explicava (CP, art. 129, § 2º, III: a compilada sem hífen virou inciso).
- **Solução:** página sem nenhuma âncora `art…` não entra no cruzamento, e `sinais` registra o que foi cruzado (a folha avisa); apagar a decisão velha de `DECISOES`. **Prevenção:** `montarGabarito` acusa `decisao-sem-uso`; teste "âncoras por bloco…".
- **Origem:** ocorrido em 23/09/2026 (7.3, 2ª sessão).

### Renumerado perde o vínculo, ou VETADO vira texto normal
- **Sintoma:** marcação ou erro de estudo ligados ao endereço antigo ficam soltos; "(VETADO)" aparece como texto vigente, ou a numeração salta sem explicação. **Causa:** notas "Renumerado…" ("do parágrafo único", "do inciso VI" ou só "pela Lei/Emenda…"; 19 na CF, 3 no CP, 3 na LEP, 1 na LC 80); dispositivos vetados só com a palavra (18 no CP, 22 na LEP, 28 na LC 80).
- **Solução:** status renumerado com referência ao endereço antigo (regra 10); tratamento próprio do VETADO, mantendo o endereço. **Prevenção:** contagens no gabarito da 7.3 e testes da 8.6.
- **Origem:** previsto — atividade 8.6.

### "A fonte pode ter mudado de formato"
- **Sintoma:** mais de 20% dos dispositivos "a confirmar". **Causa:** o Planalto mudou o HTML, ou o colar veio sem formatação.
- **Solução:** colar de novo pela página simples; se persistir, atualizar o estruturador e o corpus (`npm run corpus`). **Prevenção:** aviso da 8.7 e regressão da 8.9 no `npm test`.
- **Origem:** previsto — atividades 8.7 e 8.9.

### Importar o CP trava a tela
- **Sintoma:** a tela congela ao colar ou publicar uma lei grande. **Causa:** o sanitizador roda na thread principal (precisa do DOM) e o CP tem cerca de 930 mil caracteres; a gravação cria milhares de dispositivos e textos.
- **Solução:** indicador de progresso; gravação em lote numa única transação, com hashes calculados antes. **Prevenção:** teste de serviço "o CP inteiro é gravado em < 5 s" (9.2).
- **Origem:** previsto — atividades 9.2 e 9.5.

### Leitor lento em norma grande
- **Sintoma:** abrir a CF ou o CP leva segundos. **Causa:** árvore inteira renderizada ou todos os textos carregados de uma vez.
- **Solução:** leitura paginada por janela (9.4) e leitor virtualizado (T16), só o visível + margem. **Prevenção:** `npm run carga` com norma de 5 mil dispositivos (< 1 s) e medição de abertura no E2E (9.6).
- **Origem:** previsto — atividades 9.4 e 9.6.

### Posição de leitura perdida
- **Sintoma:** ao voltar, ao entrar ou sair do modo foco, ou ao trocar de filtro, o leitor abre noutro ponto. **Causa:** alturas variáveis na lista virtualizada; posição guardada em pixels muda com fonte, tamanho de tela e filtro.
- **Solução:** guardar o dispositivo (`posicaoId`) e rolar até ele depois de medir. **Prevenção:** E2E "sair e voltar na mesma posição" (9.7) e nos três tamanhos (11.1).
- **Origem:** previsto — atividades 9.7 e 11.1.

### Estrela ou grifo inconsistente
- **Sintoma:** estrelar a Seção I não propaga, ou desmarcar um artigo apaga a estrela do nó; grifo some ou cai no trecho errado depois de corrigir o texto. **Causa:** herança gravada em vez de calculada, ou exceção fora do caminho mais próximo; âncora por offsets que não batem com o texto novo.
- **Solução:** gravar só `direta` e `excecao` e calcular a herança na leitura; reancoragem exata → aproximada → pendente, com evento `marcacao.pendenteReancoragem`. **Prevenção:** tabela-verdade de cenários (11.2) e teste "um grifo sobrevive à correção de texto" (11.7).
- **Origem:** previsto — atividades 11.2 e 11.7.

### Destaque automático acende demais, ou é confundido com grifo
- **Sintoma:** linhas inteiras acesas; "desde a data" destacado como condição; o destaque se confunde com um grifo. **Causa:** termo genérico no dicionário (na LEP, "é" 183 vezes, "pode" 99, "não" 65, "deve" 61 em 973 linhas); palavra ambígua ("desde" temporal × "desde que"); estilo parecido com o dos grifos.
- **Solução:** dicionário por categoria com as expressões compostas primeiro; genéricos fora; estilo sem as cores dos grifos e que não depende só de cor. **Prevenção:** métrica de ruído por norma com limite no teste e casos que **não** devem acender (9.8).
- **Origem:** previsto — atividade 9.8.

### Preferência nova quebra o aparelho ou um backup antigo
- **Sintoma:** `RegistroInvalido` ao abrir o app ou ao restaurar um pacote depois da 9.8. **Causa:** campo obrigatório novo em `Preferencias` (esquema estrito), ausente no registro que já existe no aparelho e nos pacotes antigos.
- **Solução:** `destacarCondicionantesEPrazos` opcional (ausente = desligado), sem migração. **Prevenção:** teste com preferência sem o campo e restauração de pacote v1 (9.8).
- **Origem:** previsto — atividade 9.8.

### Artigo por artigo perde a posição, rouba tecla ou apaga demais
- **Sintoma:** ao sair do cartão, o leitor abre noutro artigo; a seta troca de artigo enquanto se digita uma anotação; deslizar troca de artigo ao selecionar texto para grifar; o texto esmaecido fica ilegível. **Causa:** posição guardada em pixels; atalho sem checar o foco; gesto horizontal disputando a seleção; esmaecido abaixo do contraste mínimo.
- **Solução:** a posição é o artigo do cartão (`posicaoId`); setas só fora de campo (ver "Atalho de teclado rouba a tecla de outro controle"); deslizar só se não brigar com a seleção, senão só os botões; esmaecido com contraste AA para texto grande. **Prevenção:** E2E nos 3 tamanhos e axe (11.8).
- **Origem:** previsto — atividade 11.8.

### Remissão abre o dispositivo errado, ou "voltar" não volta
- **Sintoma:** "art. 76 do ADCT" abre o art. 76 do corpo da CF; "art. 121 do Código Penal", lido na LEP, abre o art. 121 da própria LEP; "arts. 260 a 262" abre só o 260; prévia de artigo revogado sem aviso; "voltar" abre noutro ponto. **Causa:** remissão resolvida sem o prefixo do bloco, sem ver a norma citada depois do número ou sem tratar o intervalo; posição não empilhada ao "ir para".
- **Solução:** citação seguida de outra norma ("do Código…", "da Lei nº…") fica `externa` e sem resolução, e "desta Lei"/"desta Constituição" são internas; prefixo de bloco da 8.4; intervalo vira lista; o que não resolve fica como texto comum; aviso de revogado e endereço novo do renumerado; pilha de posições. **Prevenção:** testes com casos da CF e da LEP e métrica conferida contra as âncoras da própria CF (11.9).
- **Origem:** previsto — atividade 11.9.

## Uso do app

Para o Gabriel, em linguagem simples. Vale para o que já está pronto (F0 e F1). Endereço do app: https://arretado.gabrieldjcosta.workers.dev (no ar desde 23/09/2026).

### Abri em outro navegador ou no celular e está tudo vazio
- **Sintoma:** nenhum erro, cartão ou ponto aparece. **Causa:** os dados ficam guardados só no navegador daquele aparelho e daquele endereço. Outro navegador, outro aparelho, janela anônima ou o link de pré-visualização do Cloudflare são "outro lugar". Até a F4 não há sincronização.
- **Solução:** no aparelho antigo, Conta › Dados › Exportar; no novo, Conta › Dados › Importar ("Adicionar somente novos" ou "Restaurar integral", sempre com prévia). **Prevenção:** usar sempre o mesmo endereço e o mesmo navegador.
- **Origem:** previsto — uso real da F1.

### Backup e dados apagados
- **Sintoma:** app vazio depois de "limpar dados de navegação" ou "limpar dados do site". **Causa:** isso apaga o banco local, assim como desinstalar o navegador ou a falta de espaço no aparelho; "Apagar tudo" (Conta › Dados) faz o mesmo de propósito.
- **Solução:** Conta › Dados › Importar o último backup ("Restaurar integral"). **Prevenção:** toda semana, Conta › Dados › Exportar e guardar o arquivo `.arretado` fora do aparelho (e-mail, nuvem, pendrive); ao limpar o navegador, desmarcar "cookies e outros dados de sites".
- **Origem:** previsto — uso real da F1.

### Esqueci a senha do backup
- **Sintoma:** "a senha está errada ou o arquivo foi alterado". **Causa:** o backup com senha é cifrado e o app não guarda a senha.
- **Solução:** não há: sem a senha, aquele backup é irrecuperável. Usar outro backup. **Prevenção:** guardar a senha num gerenciador de senhas; se não houver onde guardar, exportar sem senha.
- **Origem:** previsto — uso real da F1.

### "Não foi possível apagar tudo"
- **Sintoma:** a mensagem aparece ao usar Apagar tudo. **Causa:** outra aba do Arretado está aberta e segura o banco.
- **Solução:** fechar as outras abas e tocar em "Recarregar". **Prevenção:** usar uma aba só.
- **Origem:** ocorrido em 23/09/2026 (commit a3ce9f4).

### Sem internet
- **Sintoma:** aparece "Sem conexão — tudo continua funcionando." **Causa:** com a página já aberta, tudo roda no aparelho. Mas ainda não há instalação como app (PWA, só na F4): abrir ou recarregar o endereço sem internet não carrega o Arretado.
- **Solução:** manter a aba aberta; relatos pelo "!" ficam "aguardando envio" no aparelho (um por dia). **Prevenção:** abrir o Arretado antes de ficar sem rede.
- **Origem:** previsto — até a F4.

### Importei algo errado
- **Sintoma:** dados misturados ou sumidos depois de uma importação. **Causa:** modo de importação diferente do pretendido.
- **Solução:** Conta › Dados › "Importações e pontos de restauração": "Desfazer" na importação, ou restaurar um ponto (pelo menos os 5 mais recentes ficam guardados). **Prevenção:** ler a prévia antes de confirmar; na dúvida, "Importar para espaço separado".
- **Origem:** previsto — uso real da F1.

### Publiquei uma versão nova e o celular mostra a antiga
- **Sintoma:** a novidade não aparece. **Causa:** a página antiga continua aberta ou guardada pelo navegador.
- **Solução:** fechar a aba e abrir de novo, ou recarregar. **Prevenção:** conferir o `Cache-Control` da página inicial depois da primeira publicação (o `_headers` define `no-cache` para `/index.html`).
- **Origem:** previsto — a cada publicação (no ar desde 23/09/2026).
