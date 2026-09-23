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
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11; o caso da quebra de linha entrou no merge 9b71b2f e o exemplo foi corrigido em 6db6ede).

### Comando "passa" mas falhou, ou script quebra no Windows
- **Sintoma:** a saída mostra falha e o código de saída é 0; script em Python não roda; comando Bash colado no PowerShell é recusado por sintaxe; `node -e '…require("fs")…'` dá `ReferenceError` no PowerShell. **Causa:** em `comando | head`, o código de saída é o do `head` e a falha do comando some; Python não é confiável na máquina do Gabriel; PowerShell e Bash têm sintaxes próprias; o Windows PowerShell 5.1 descarta as aspas duplas internas ao chamar programa externo.
- **Solução:** encadear com `&&`, gravar a saída em arquivo e só depois filtrar (no Windows PowerShell 5.1 não há `&&`: usar `A; if ($?) { B }`); `node -e` com aspas internas só no Git Bash, ou o script num `.mjs`; automação em Node (`scripts/*.mjs`, T15). **Prevenção:** rotina de sessão; um shell por comando, sem misturar sintaxes.
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11; Python fora pela T15; aspas do `node -e` conferidas no PowerShell 5.1 em 23/09/2026).

## Verificação (check, lint, tipos, testes, E2E, CI)

### `npm run check` falha no Windows sem mudança no código
- **Sintoma:** `UNKNOWN: lstat 'C:\'` e falha ao abrir arquivos do `node_modules`; ou o boot do PGlite estoura os 10 s do `beforeAll` do `supabase/rls.test.ts`. Em 23/09/2026, duas de quatro rodadas falharam assim. **Causa:** sistema de arquivos e CPU do Windows sob carga, sem relação com o código.
- **Solução:** rodar de novo. **Prevenção:** se o timeout do PGlite se repetir, dar um limite maior só a esse `beforeAll`.
- **Origem:** ocorrido em 23/09/2026 (registrado em d87ddca).

### `format:check` reprova `.claude/settings.local.json`
- **Sintoma:** `npm run check` para no Prettier apontando `.claude/settings.local.json`, sem mudança no código. **Causa:** o Claude Code grava as permissões da sessão nesse arquivo dentro do worktree; o git o ignora (ignore global do usuário), mas o Prettier o verificava.
- **Solução:** `.claude` no `.prettierignore`. **Prevenção:** arquivo gerado por ferramenta e fora do git entra no `.prettierignore` junto com o `.gitignore`.
- **Origem:** ocorrido em 23/09/2026 (consolidação pós-7.1).

### Teste que lê arquivo do repositório não acha o caminho
- **Sintoma:** caminho inválido ao ler arquivo no teste. **Causa:** o ambiente padrão do Vitest é jsdom, onde `import.meta.url` não é `file:`.
- **Solução:** `// @vitest-environment node` no topo e `import.meta.dirname` (como em `supabase/rls.test.ts`). **Prevenção:** esse cabeçalho em todo teste que lê o disco (corpus, migrações).
- **Origem:** ocorrido em 23/09/2026 (registrado em 13355bc).

### Playwright ou TypeScript "desatualizados" de propósito
- **Sintoma:** E2E não abre o Chromium, ou o `@axe-core/playwright` puxa outra versão; lint quebra depois de atualizar o TypeScript. **Causa:** Playwright fixado em 1.56.1 (o Chromium do contêiner é o `chromium-1194`), com `playwright-core` fixado junto, também em `1.56.1` exato no `package.json` (desde 23/09/2026; antes era `^1.56.1`), para o axe não puxar outra versão; TypeScript fixado em `~6.0` porque o `typescript-eslint` ainda não aceita o 7.
- **Solução:** no Windows, rodar `npx playwright install chromium` uma vez; não subir essas versões. **Prevenção:** `@playwright/test` e `playwright-core` sempre juntos e na mesma versão (nada de `npm update` solto); TypeScript 7 só quando o typescript-eslint suportar (T1).
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11).

### Lint acusa import proibido entre camadas
- **Sintoma:** regra `arretado/camadas` no `npm run check` ("Camada … não pode importar de …" ou "O pacote … só pode ser importado em src/core/…"). **Causa:** a regra `eslint/regra-camadas.js`: Dexie só em `src/core/persistencia`, DOMPurify só em `src/core/seguranca`, domínio não importa outro domínio.
- **Solução:** mover o acesso para a camada certa; composição entre domínios fica na apresentação (ex.: ações do leitor na 11.5). **Prevenção:** a própria regra.
- **Origem:** ocorrido em 23/09/2026 (registrado em 8ed7e11).

### A revisão da etapa acha o que os testes não pegaram
- **Sintoma:** o `/code-review` achou problemas reais em todas as etapas (commits 0719706, 83b0d18, bb696e0, a3ce9f4, 3c07cbf, ed0a209; na 7.1, 15 achados de uma revisão adversarial, corrigidos no próprio 13355bc). **Causa:** testes cobrem o caminho previsto; a revisão procura bordas (corrida entre abas, clique duplo, prévia defasada, entrada adulterada).
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
- **Solução:** esses elementos separam blocos; o tachado por estilo em elemento fora da lista vira `<s>`. **Prevenção:** `sanitizador.test.ts` (34 payloads + fragmentos do Planalto); a 8.2 acrescenta o `cp.html` inteiro.
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

## Cloudflare Pages e Functions

### Publicação sem cabeçalhos ou com build quebrado
- **Sintoma:** o site sobe sem CSP ou o build falha no Cloudflare. **Causa:** projeto configurado com framework, comando ou pasta errados.
- **Solução:** Framework preset None, build `npm run build`, saída `dist` (o `_headers` sai no build; `.node-version` = 22). Conferir com `curl -sI https://<projeto>.pages.dev | grep -i content-security` no Git Bash (no Windows PowerShell 5.1, `curl` é apelido do `Invoke-WebRequest` e não há `grep`: usar `curl.exe -sI … | findstr /i content-security`). **Prevenção:** passo a passo em `proxima-sessao.md`.
- **Origem:** previsto — pendência 1 (publicação).

### `/api/buscar-norma` não responde ou responde sem cabeçalhos
- **Sintoma:** 404 na rota em desenvolvimento ou no site publicado; resposta sem `nosniff` nem `Content-Type` fixo. **Causa:** o Cloudflare procura `functions/` na raiz do repositório (não em `dist/`), o Vite não roda funções, e o `_headers` não vale para respostas de funções.
- **Solução:** `functions/api/buscar-norma.ts` na raiz, definindo `nosniff`, `Content-Type` e `Cache-Control` na resposta; em desenvolvimento, proxy do Vite para `wrangler pages dev` ou para o site publicado; no E2E, rota interceptada pelo Playwright. **Prevenção:** regras puras fora de `functions/`, testadas no Vitest, inclusive os cabeçalhos.
- **Origem:** previsto — atividades 12.1 e 12.3.

### Função estoura o limite de processamento
- **Sintoma:** a busca de uma lei grande falha no Cloudflare. **Causa:** o plano gratuito dá 10 ms de CPU por chamada (esperar o Planalto não conta; processar conta).
- **Solução:** a função só repassa os bytes (sem decodificar nem montar JSON); se ainda estourar, plano B da T17 (Edge Function no Supabase, aceitando a pausa). **Prevenção:** chamada real com LEP, CF/88 (1,8 MB) e Código Civil, conferida no painel.
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
- **Sintoma:** "bytes no disco … (fim de linha convertido pelo git?)"; ou "arquivo fora do manifesto — rode npm run corpus"; ou o `npm run corpus` completo apaga arquivos da pasta. **Causa:** o git converteria o fim de linha misto das páginas; `verificarCorpus` e `baixarCorpus` tratam todo `.html` de `corpus/normas/` sem entrada no manifesto como sobra, e os `*.colado.html` da 7.2 cairão nessa regra.
- **Solução:** `corpus/normas/*.html -text` no `.gitattributes` (já feito); na 7.2, registrar os colados no manifesto ou ensinar as duas funções a reconhecê-los (amarrados ao `sha256Conteudo` da origem). **Prevenção:** conferência de integridade no `npm test`, sem rede, cobrindo os colados.
- **Origem:** previsto — atividades 7.1 (prevenido em 13355bc) e 7.2.

### Acentos trocados ou "�" no texto da lei
- **Sintoma:** aparece U+FFFD (windows-1252 lido como UTF-8) ou "Seção" vira "SeÃ§Ã£o" (UTF-8 lido como windows-1252). **Causa:** o Planalto grava em windows-1252 e não declara charset (nem cabeçalho nem `<meta>`); a ALESP declara UTF-8 na `<meta>`.
- **Solução:** charset da `<meta>` quando houver, senão windows-1252 (cliente da 12.3); na 7.2, servir com `Content-Type: text/html; charset=<do manifesto>`. **Prevenção:** conferência de U+FFFD como em `conferirConteudo`; testes da 12.1 com páginas do corpus.
- **Origem:** previsto — atividades 7.2 e 12.3.

### Nenhuma redação anterior depois de colar
- **Sintoma:** a lei entra sem nenhum texto tachado. **Causa:** a página "compilado" do Planalto traz só o texto vigente; a simples (`l7210.htm`, `del2848.htm`) traz todas as redações.
- **Solução:** colar da página simples. **Prevenção:** na 9.5, avisar quando o conteúdo indicar a compilada (na 12.3, também pela URL `…compilado.htm`); o corpus confere a variante pela contagem de tachados (limiar 20).
- **Origem:** previsto — atividade 9.5.

### O HTML colado muda conforme o navegador
- **Sintoma:** a mesma lei estrutura bem no Chromium e mal em outro navegador ou no celular. **Causa:** cada navegador serializa a seleção de um jeito (tags, estilos em linha), e no celular a seleção de uma lei inteira é difícil e o colar pode trazer só texto puro.
- **Solução:** reserva em `text/plain` (tudo "a confirmar", 8.8) e busca por URL (12.3). **Prevenção:** a 7.2 captura só o Chromium; guardar amostras de outros navegadores no corpus quando aparecerem.
- **Origem:** previsto — atividades 7.2 e 9.5.

### A lei some depois do começo da página
- **Sintoma:** CP ou CF estruturados só com o cabeçalho. **Causa:** `</body></html>` logo no início do arquivo (o `</html>` no byte 4.613 do CP e 133.966 da CF), com a lei inteira depois.
- **Solução:** nunca cortar em `</body>`/`</html>` nem extrair o corpo por regex; o parser HTML5 (DOMPurify/DOMParser) devolve o conteúdo ao `body`. **Prevenção:** teste do sanitizador com o `cp.html` inteiro.
- **Origem:** previsto — atividade 8.2.

### Tachado decorativo tratado como redação anterior (ou o contrário)
- **Sintoma:** "Art. 1º" vira redação anterior; ou revogação da ALESP aparece como vigente. **Causa:** o `<s>` é decorativo no Planalto (só em `º`/`ª`; 56 na LC 80) e é a marca real de revogação na ALESP (172 na LC-SP 988); o `line-through` por estilo também é redação anterior.
- **Solução:** decidir pelo conteúdo: `<s>` só com ordinal é decorativo, `<s>` com texto é redação anterior. **Prevenção:** gabarito da 7.3 e regressão da 8.9 (100% das redações anteriores); o `extrair_lei.js` não serve para essa classificação.
- **Origem:** previsto — atividade 8.6.

### Fim de linha misto quebra a segmentação
- **Sintoma:** linhas grudadas ou vazias no meio do texto. **Causa:** LEP, LC 80 e CF em CRLF; o CP com maioria de LF (11.953 LF e 5.694 CRLF, inclusive dentro do texto); a ALESP em LF.
- **Solução:** a normalização trata CRLF, CR e LF do mesmo jeito. **Prevenção:** testes de normalização da 8.1.
- **Origem:** previsto — atividade 8.1.

### Palavra partida, busca que falha ou ordinal não reconhecido
- **Sintoma:** palavra com hífen invisível e busca sem resultado; "Art. 1o", "Artigo 1°" ou "N° 988" sem virar artigo. **Causa:** hífen suave (U+00AD) no lugar de hífen verdadeiro (79 na LC 80); o Planalto alterna `º` e "o", e a ALESP usa o sinal de grau (`°`).
- **Solução:** normalizar (regra 1: U+00AD, º/o/°/ª) e aceitar "Artigo" (regra 5). **Prevenção:** testes da 8.1 e da 8.3 com casos do corpus; a varredura de caracteres invisíveis de `src/` não cobre U+00AD.
- **Origem:** previsto — atividades 8.1 e 8.3.

### "Art" quebrado, capitular ou sangria entre artigos
- **Sintoma:** artigo ausente, dois artigos fundidos, ou rubrica colada no artigo anterior. **Causa:** "Art" e número em linhas ou tags diferentes; capitular `<strong>A</strong>rt.`; rubrica em negrito antes do "Art." (é o `nome` do seguinte); citação "art." em minúscula no meio do texto.
- **Solução:** regras 4 e 5 tolerantes, com os casos da skill `acumen-extrair-normas`. **Prevenção:** "todos os artigos do corpus, em ordem, sem sangria" (8.3) e regressão da 8.9.
- **Origem:** previsto — atividade 8.3.

### Anexo ou ADCT viram artigos duplicados
- **Sintoma:** validação acusa `art1` duplicado; linhas de tabela estruturadas como incisos. **Causa:** o ADCT recomeça a numeração no art. 1º dentro da mesma página da CF/88; bloco depois de "ANEXO" tratado como texto normativo.
- **Solução:** ADCT como nó próprio que prefixa o endereço; anexo como dispositivo `anexo` com texto bruto, sem estruturar (regra 11). **Prevenção:** "endereços únicos" (8.4) e validação estrutural (8.7) com a CF do corpus; teste de anexo na 8.7.
- **Origem:** previsto — atividades 8.4 e 8.7.

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

## Uso do app

Para o Gabriel, em linguagem simples. Vale para o que já está pronto (F0 e F1); o app ainda não foi publicado (pendência 1 do `proxima-sessao.md`).

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
- **Origem:** previsto — pendência 1 (publicação).
