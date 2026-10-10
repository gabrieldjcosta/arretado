# Acervo, súmulas, teses, estrela discreta e palco do foco — plano de implementação

> **Para quem executa:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, tarefa a tarefa. Os passos usam caixas `- [ ]`.

**Objetivo:** entregar, na ordem da spec, a estrela discreta e o palco do modo foco (detalhados aqui) e, depois, o acervo de normas com disciplinas, as súmulas, as teses e a atualização 6a (em etapas, a detalhar na sessão de cada peça).

**Arquitetura:** os dois ajustes do leitor mexem só na apresentação (`Leitor.tsx`, `Estrela.tsx`, CSS) e em duas preferências opcionais; nenhum esquema sobe. O acervo entra por uma porta `FonteDoAcervo` com implementação estática, e súmulas e teses reaproveitam o modelo de norma.

**Tecnologias:** React 19, TypeScript, CSS puro, Dexie, zod, Vitest + Testing Library, Playwright + axe. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-10-10-acervo-sumulas-teses-design.md` (§7 para as Peças 1 e 2).

## Restrições globais

- Vocabulário obrigatório na interface e no código: Aparelho, Problema, Erro, Dispositivo, Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta. Texto de interface em sentence case, verbo no início dos botões, sem "!" em texto do sistema.
- CSS puro nos tokens existentes; novos tokens só `--penumbra` e `--luz-do-cartao` (claro e escuro). Contraste AA nos dois temas (`scripts/contraste.mjs` precisa passar com os pares novos). Alvos de toque de pelo menos 24 px (WCAG 2.2); o `--alvo` de 44 px segue valendo para botões.
- Local-first: nada depende de rede. Sem animação contínua; o único movimento é a entrada do palco (200 ms) e `prefers-reduced-motion` o desliga.
- Preferências novas são **opcionais**: ausente = padrão, registro e pacote antigos continuam válidos, sem subida de esquema nem backup (precedente: `destacarCondicionantesEPrazos`, `cotaDiaria`, `reguaDeLeitura`).
- Definição de pronto de cada peça: `npm run check` verde (no Windows, `npm run test -- --maxWorkers=4`), E2E verde nos 3 aparelhos (desktop, celular, tablet) com axe nos dois temas, a abertura medida do leitor abaixo de 1 s, problemas em `docs/solucao-de-problemas.md`, termos novos em `docs/glossario.md`.
- Git: um branch e um PR por peça, a partir do `main`. **Commits e pushes só com o OK do Gabriel**; os passos "Commit" abaixo valem depois dele.

## Foco da revisão

Entradas e condições que a spec implica e que nenhum teste de tarefa cobriria sozinho (cada linha tem o teste na tarefa dona):

1. Nó estrelado cuja linha não está na janela virtualizada: o ícone e a barra saem do dado, não do que está no DOM (Tarefa 1).
2. Quem usa só o teclado precisa estrelar sem mouse: `S` na linha ativa e "Estrelar" em Ações (Tarefa 3).
3. Deep link antigo `?foco=texto` ou `?foco=artigo` continua válido; norma sem artigos entra no foco corrido, não num cartão vazio (Tarefa 6).
4. A bandeja não some enquanto o foco do teclado está dentro dela nem enquanto há diálogo aberto; o primeiro Esc fecha a bandeja, o segundo sai do foco (Tarefa 8).
5. Quem não descobre o deslize nem os atalhos chega ao artigo anterior e ao próximo pelos dois botões discretos do cartão (decisão do Gabriel, 10/10/2026), e artigo muito longo rola por dentro do cartão (Tarefa 8).

---

## Peça 1 — Estrela discreta

### Tarefa 1: marcador da estrela só onde há estrela

**Arquivos:**
- Criar: `src/apresentacao/biblioteca/estrela.ts`, `src/apresentacao/biblioteca/estrela.test.ts`
- Modificar: `src/apresentacao/biblioteca/Leitor.tsx` (`conteudoDaLinha`, `propriedadesDaLinha`), `src/apresentacao/biblioteca/Estrela.tsx`

**Interfaces:**
- Produz: `mostrarBotaoDaEstrela(estado: EstadoDaEstrela, linhaAtiva: boolean): boolean` — `true` se `estado.origem === 'direta'` ou `linhaAtiva`; `false` caso contrário.
- Consome: `EstadoDaEstrela` de `dominios/legislacao/estrelas.ts`.

- [ ] **Passo 1: teste falhando** em `estrela.test.ts`: `mostrarBotaoDaEstrela({estrelado:true, origem:'direta'}, false)` é `true`; herdada (`{estrelado:true, origem:'herdada', deId:'x'}`), exceção (`{estrelado:false, origem:'excecao', deId:'x'}`) e sem estrela (`{estrelado:false}`) são `false` com a linha inativa e `true` com a linha ativa.
- [ ] **Passo 2:** `npx vitest run src/apresentacao/biblioteca/estrela.test.ts` — falha por função inexistente.
- [ ] **Passo 3:** implementar `mostrarBotaoDaEstrela` em `estrela.ts`.
- [ ] **Passo 4:** em `conteudoDaLinha` passar `estrela` ao `Dispositivo` só quando `mostrarBotaoDaEstrela(estado, id === linhaAtivaId)`. Acrescentar a `propriedadesDaLinha` o atributo `data-estrela-origem` (`'direta' | 'herdada' | 'excecao'`, ausente sem estrela) para o CSS. A estrela de um nó sai do dado (`estrelas.estados`), não da posição no DOM (foco da revisão 1).
- [ ] **Passo 5: teste de componente** em `Leitor.test.tsx`, no `describe('estrela (11.2)')`: com um artigo estrelado e outro não, só o estrelado tem `button.estrela` no DOM antes de qualquer toque; passar o ponteiro sobre o outro faz o botão dele aparecer. Rodar: `npx vitest run src/apresentacao/biblioteca --maxWorkers=4` — passa; ajustar os testes existentes que esperavam um botão por linha.

### Tarefa 2: linha ativa para qualquer interação

**Arquivos:** modificar `Leitor.tsx` (o estado `reguaId` e `moverRegua` viram `linhaAtivaId` e `ativarLinha`), `estilos.css`.

**Interfaces:**
- Produz: estado `linhaAtivaId: string | null`, atualizado por `onPointerOver` e `onFocus` nos dois contêineres (lista e cartão), **sempre** (não só com a régua ligada). `data-regua` continua condicionado a `reguaDeLeitura`; o atributo `data-linha-id` passa a ser sempre posto.

- [ ] **Passo 1: teste falhando** em `Leitor.test.tsx`: sem a régua ligada, passar o ponteiro sobre uma linha mostra o botão da estrela nela e o tira da anterior (`linhaAtivaId` mudou); com a régua ligada o comportamento de `data-regua` não muda (testes da fatia 4 seguem verdes).
- [ ] **Passo 2:** rodar o arquivo; falha.
- [ ] **Passo 3:** renomear o estado e a função, trocar a condição `reguaLigada` de `data-linha-id` por presença de id, manter `data-regua` condicional.
- [ ] **Passo 4:** rodar `npx vitest run src/apresentacao/biblioteca --maxWorkers=4` — passa.

### Tarefa 3: estrelar por teclado e por Ações

**Arquivos:** modificar `Leitor.tsx` (ouvinte de teclado do leitor), `AcoesDoDispositivo.tsx`, `Leitor.test.tsx`.

**Interfaces:**
- Produz: `AcoesDoDispositivo` recebe `aoEstrelar: () => void` e `estrelado: boolean` e mostra o botão "Estrelar" ou "Tirar a estrela" (chama `alternarEstrelaDe` do alvo do diálogo).
- Consome: `alternarEstrelaDe(alvoId: string)` já existente em `Leitor.tsx`.

- [ ] **Passo 1: testes falhando:** (a) tecla `S` com a linha ativa estrelável alterna a estrela (`estrelas.alternar`) e anuncia a frase de `fraseDaEstrela`; sem linha ativa, com campo de texto em foco, com diálogo aberto ou com Ctrl/Alt/Meta, não faz nada; (b) o diálogo de Ações mostra "Estrelar" e depois "Tirar a estrela".
- [ ] **Passo 2:** rodar; falham.
- [ ] **Passo 3:** estender o ouvinte de teclado que já trata `F`/`Esc` (mesmas guardas de campo de texto e diálogo) com `S`; adicionar o botão e as duas props em `AcoesDoDispositivo`.
- [ ] **Passo 4:** rodar o arquivo; passa.

### Tarefa 4: CSS da estrela discreta e E2E

**Arquivos:** modificar `estilos.css` (calha, barra tracejada), `e2e/leitor.spec.ts` (cenário "estrela…"), `docs/solucao-de-problemas.md`.

- [ ] **Passo 1:** `--calha-estrela` de 2rem para 1.5rem no desktop e no celular (24 px, mínimo WCAG 2.2; a spec dizia cerca de 1,25rem). Barra de `[data-estrela-origem='herdada']` em listras (`repeating-linear-gradient`, mesma cor `--estrela`, contraste 3:1 mantido); `direta` contínua; exceção como hoje (sem barra no nó cortado).
- [ ] **Passo 2:** atualizar o cenário E2E da 11.2 ("estrela: estrelar a Seção I propaga…") para o novo modelo: sem botão em linhas inativas; estrelar pela linha ativa, por `S` e por Ações; a altura da linha e a posição não mudam; barra tracejada nos herdados; axe nos dois temas. Rodar o cenário nos 3 aparelhos; passa.
- [ ] **Passo 3:** `npm run check` (com `--maxWorkers=4` no teste) verde; registrar em `solucao-de-problemas.md` o que apareceu.
- [ ] **Passo 4:** commit "feat(leitor): estrela discreta" (com o OK do Gabriel) e PR.

---

## Peça 2 — Palco do modo foco

### Tarefa 5: preferências da lente e da espiada

**Arquivos:** modificar `src/core/modelo/sistema.ts`, `src/core/preferencias/preferencias.test.ts`, `src/core/pacote/pacote-v1.test.ts`, `src/apresentacao/conta/AparenciaConta.tsx`, `src/apresentacao/App.test.tsx`.

**Interfaces:**
- Produz em `Preferencias`: `lenteDoFoco?: 'cartao' | 'corrido'` (ausente = `cartao`) e `espiadaDosVizinhos?: boolean` (ausente = desligada).

- [ ] **Passo 1: testes falhando** (mesmo molde de `cotaDiaria` e `reguaDeLeitura`): ausente é o padrão; muda sem migração; valor fora do enum ou não booleano é rejeitado; pacote anterior restaura com os padrões.
- [ ] **Passo 2:** rodar `npx vitest run src/core --maxWorkers=4`; falham.
- [ ] **Passo 3:** campos opcionais em `Preferencias`; caixa "Mostrar a espiada dos vizinhos no foco" em Conta › Aparência (a lente não ganha controle em Conta: grava ao escolher no foco).
- [ ] **Passo 4:** rodar os testes de `core` e `App.test.tsx`; passam.

### Tarefa 6: `F` entra no cartão

**Arquivos:** modificar `Leitor.tsx` (`alternarFoco`, `alternarArtigo`, anúncios), `Leitor.test.tsx`.

**Interfaces:**
- Produz: `alternarFoco` entra com `foco=artigo` se a lente é `cartao` **e** a norma tem unidades (artigos); caso contrário `foco=texto`. A rota continua aceitando os dois valores. O botão "Por artigo" sai do grupo fixo (`AcoesDaLeitura`); o anúncio da entrada vira "Modo foco."

- [ ] **Passo 1: testes falhando:** F numa norma com artigos abre o cartão (`.cartao-artigo` presente); numa norma sem artigos abre o corrido sem cartão vazio; `#/…?foco=texto` abre o corrido e `?foco=artigo` o cartão (foco da revisão 3); o botão "Por artigo" não existe fora do foco.
- [ ] **Passo 2:** rodar; falham. **Passo 3:** implementar. **Passo 4:** ajustar os 14 testes do `Leitor.test.tsx` que citam "Por artigo" ou "Modo foco" e rodar o arquivo; passa.

### Tarefa 7: penumbra e luz

**Arquivos:** modificar `estilos.css`, `scripts/contraste.mjs`, `scripts/contraste.test.ts`; `Leitor.tsx` (o atributo da raiz passa de `data-modo-foco='texto'` a refletir também `'artigo'`).

- [ ] **Passo 1: teste falhando** em `contraste.test.ts`: os pares texto sobre `--luz-do-cartao`, e o texto atenuado do vizinho sobre `--penumbra`, são AA (4,5:1) nos dois temas.
- [ ] **Passo 2:** rodar `npx vitest run scripts --maxWorkers=4`; falha por token inexistente.
- [ ] **Passo 3:** tokens: claro, `--penumbra` um passo mais escuro que `--fundo` (#f1f3ee) e `--luz-do-cartao` = `--superficie`; escuro, `--penumbra` mais escuro que #151a1f e `--luz-do-cartao` um passo acima. Com `:root[data-modo-foco='artigo']`: fundo da página `--penumbra`; `.cartao-artigo` com `--luz-do-cartao`, anel de 1 px `--borda`, sombra discreta e largura de cerca de 62ch. A linha de contexto em Atkinson pequena, sentence case; o progresso é o `BarraFina` existente no pé do cartão.
- [ ] **Passo 4:** `.vizinho` sem texto por padrão (só a borda esmaecida); com `espiadaDosVizinhos` a espiada de 2 linhas atual.
- [ ] **Passo 5:** rodar os testes de contraste; passam.

### Tarefa 8: a bandeja

**Arquivos:** criar `src/apresentacao/biblioteca/BandejaDoFoco.tsx` e `BandejaDoFoco.test.tsx`; modificar `Leitor.tsx` (no foco, `BandejaDoFoco` substitui `AcoesDaLeitura`) e `estilos.css`.

**Interfaces:**
- Produz: `BandejaDoFoco({ lente, trocarLente, anterior, proximo, buscar, filtrar, acoes, estrelar, lidoAteAqui, sair, ocupada })`, onde `ocupada: boolean` indica diálogo aberto ou seleção ativa. Dois botões discretos no cartão, só com seta (nomes acessíveis "Artigo anterior" e "Próximo artigo", alvo de pelo menos 44 px, sempre visíveis, esmaecidos nos extremos com `aria-disabled`), ficam fora da bandeja e chamam `anterior` e `proximo`. Um botão `⋯` (nome acessível "Mais ações do foco") abre a bandeja com: Buscar, Filtrar, Ações, Estrelar, Lido até aqui, Artigo anterior, Próximo artigo, Corrido ou Cartão, Sair do foco.
- Regras: fecha sozinha após 5 s sem interação, **exceto** com o foco do teclado dentro dela, com o ponteiro em cima ou com `ocupada`; Esc fecha a bandeja antes de sair do foco; setas, J/K, deslize, F, Esc e S funcionam sem abri-la.

- [ ] **Passo 1: testes falhando** (`BandejaDoFoco.test.tsx`, com temporizadores falsos): fechada por padrão; `⋯` abre; não fecha em 5 s com foco dentro nem com `ocupada`; fecha em 5 s sem nada disso; Esc fecha a bandeja e o segundo Esc chama `sair`; os botões chamam suas funções; trocar a lente chama `trocarLente` (foco da revisão 4 e 5).
- [ ] **Passo 2:** rodar; falham. **Passo 3:** implementar o componente (botão com `aria-expanded`, região rotulada); ligar no `Leitor.tsx`, com `trocarLente` gravando `lenteDoFoco` por `alterarPreferencias`.
- [ ] **Passo 4:** rodar os testes do componente e do leitor; passam.
- [ ] **Passo 5: teste de componente no leitor:** artigo longo no cartão rola por dentro e a página não se move (`max-height` do cartão já existente); os dois botões do cartão mudam o artigo, ficam desativados no primeiro e no último, e são alcançáveis por Tab.

### Tarefa 9: entrada do palco

**Arquivos:** modificar `estilos.css`.

- [ ] **Passo 1:** na entrada do foco, a penumbra e a luz do cartão entram em 200 ms (`transition` de `background-color` e `box-shadow` na raiz e no cartão); `@media (prefers-reduced-motion: reduce)` zera. Trocar de artigo não anima.
- [ ] **Passo 2:** teste E2E curto: com `prefers-reduced-motion: reduce` emulado, `getComputedStyle(cartão).transitionDuration` é `0s`; sem a emulação, `0.2s`.

### Tarefa 10: E2E do palco e fechamento

**Arquivos:** modificar `e2e/leitor.spec.ts` (cenários do foco 11.1 e do artigo por artigo 11.8), `docs/glossario.md`, `docs/solucao-de-problemas.md`, `docs/proxima-sessao.md`, `docs/planos/curso-de-acao.md`.

- [ ] **Passo 1:** reescrever os cenários da 11.1 e da 11.8 para o palco, nos 3 aparelhos: F abre o cartão com a penumbra; só o `⋯` e o fio de progresso na tela; a bandeja abre e fecha; Corrido/Cartão persiste ao recarregar; Esc em duas etapas; axe nos dois temas; abertura do leitor abaixo de 1 s.
- [ ] **Passo 2:** `npm run check` verde e o E2E dos dois arquivos de leitor nos 3 aparelhos verde.
- [ ] **Passo 3:** glossário (palco, penumbra, bandeja, linha ativa, lente), `proxima-sessao.md` e `curso-de-acao.md` com a nova ordem (spec §3); registrar T da porta `FonteDoAcervo` em `decisoes-tecnicas.md` só na Peça 3.
- [ ] **Passo 4:** commit "feat(leitor): palco do modo foco" (com o OK do Gabriel) e PR.

---

## Peças 3 a 6 (detalhar na sessão de cada uma, com `writing-plans`)

**Peça 3 — Acervo de normas com disciplinas** (sobe o esquema v3 para v4; backup do Gabriel antes do merge):
- 3a: porta `FonteDoAcervo` (`listar`, `obter`) com a implementação estática e uma falsa; esquemas zod do índice e dos itens; serviço de adesão (transação por item, idempotente, hash e esquema validados, versão aderida guardada); `Norma.especie` e entidade de vínculo de disciplina com migração do Dexie.
- 3b: pipeline (`acervo/curadoria.json`, `npm run acervo:gerar`, `npm run acervo:verificar`), adaptadores Planalto e Markdown, relatório de anomalias; regra e amostra para os documentos sem artigos (PNAS, SINASE, Orientações Técnicas, Tipificação) mostrada ao Gabriel antes do lote; lote das leis federais.
- 3c: abas Normas/Súmulas/Teses, tela `/biblioteca/acervo` (agrupamento por disciplina e por tipo, avisos, progresso, retomada), Biblioteca vazia com "Tudo do edital da DPE-SP", vínculos de disciplina e abertura no trecho.
- 3d: lotes restantes (ALESP, CNJ e conselhos, portal da Defensoria, Câmara com recorte dos anexos da OIT, esaj com Chrome).

**Peça 4 — Súmulas:** levantamento da fonte oficial de STF, STF vinculantes, STJ, TJSP e TNU; adaptadores; `TipoDispositivo` `sumula`; endereço `s593`/`sv11`; situação (vigente, cancelada, superada); busca por número; aba e adesão por tribunal.

**Peça 5 — Teses:** adaptador da página da Defensoria (34 páginas, `_cur=1..34`, 169 teses, PDF por tese); `TipoDispositivo` `tese`; nós de área; `TextoDeDispositivo.origem`.

**Peça 6 — Atualização 6a:** comparação por endereço, remapeamento de estrelas, erros vinculados, vínculos, "lido até" e posição; pendências de releitura; reancoragem de grifos e notas.

Depois: etapa 12 e 6b, etapas 10 e 11.7, `/code-review` das etapas 8, 9 e 11, etapa 13 e portão da F2, F3.

## Auto-revisão

- **Cobertura da spec:** §7.1 está nas Tarefas 1 a 4; §7.2 nas Tarefas 5 a 10; §4 a §6, §8 e §9 nas Peças 3 a 6 em etapas; §10 e §11 estão nas restrições globais e no foco da revisão.
- **Desvio registrado:** a calha da estrela fica em 1,5rem (24 px, mínimo WCAG 2.2), não em 1,25rem como a spec dizia; ajustar a spec quando a Peça 1 fechar.
- **Consistência de nomes:** `mostrarBotaoDaEstrela`, `linhaAtivaId`, `lenteDoFoco`, `espiadaDosVizinhos`, `BandejaDoFoco` aparecem com a mesma forma nas tarefas.
