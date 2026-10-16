# Redesenho v2 das telas e das plataformas — plano (14/10/2026)

Dono: thread "Redesenho de telas e plataformas" (UI, esforço máximo; **não conta** no limite de 2 tarefas de código). Origem: pedido do Gabriel em 14/10/2026 (adaptar as decisões de design; a tentativa anterior manteve o verde do plano original e reduziu a qualidade das interfaces e dos blocos de cor do Stitch). Diagnóstico: [`../design/auditoria-ui-2026-10-14.md`](../design/auditoria-ui-2026-10-14.md) (V-01 a V-21). Decisões: D-D3 e, por cima dela, **D-D4** (paleta, botões, cartões por estado, Leitor e Sessão do Gabriel, 14/10/2026) em [`../design/decisoes-design.md`](../design/decisoes-design.md); material dele em [`../design/referencias/2026-10-14-gemini/`](../design/referencias/2026-10-14-gemini/leia-me.md). Alvo visual: [`../design/sistema-visual.md`](../design/sistema-visual.md). Este plano substitui [`redesign.md`](redesign.md) (já arquivado) para a camada de apresentação; o `plano-mestre.md` continua valendo para tudo o mais.

> **D-D5 (16/10/2026):** o Gabriel trouxe o padrão do Stitch (projeto `9953616237194891956`: Creme, Marinho, Sol; menu Hoje · Trilha · Fixar · Biblioteca; pílula flutuante) e pediu que todas as telas o sigam. Ver [`decisoes-design.md`](../design/decisoes-design.md) (D-D5). Entram a **F1b** (tokens e fontes) antes da F2 e a **F12** (harmonização) no fim; onde a F2 e a F3 abaixo citam Caatinga, Terracota, Solace, Areia, barra reta ou "Depois", vale a D-D5.

## Como cada fatia é entregue

- Um PR por fatia, de rascunho para o branch `integracao`; sai de rascunho com CI verde e a "Fila de merges" é avisada nesse momento.
- Só apresentação (D-D1): nada de esquema, dado, sincronização nem regra de domínio. Lógica pura nova (por exemplo, a lista do "Depois") vai em arquivo próprio com teste.
- Pronto de uma fatia:
  1. `npm run check` verde e o E2E das telas tocadas verde nos três projetos (desktop, celular, tablet), com axe nos dois temas.
  2. `node scripts/capturas-ui.mjs --rotas todas --medir`: nas telas da fatia, sem rolagem horizontal, sem alvo abaixo de 44 px (fora link em frase corrida) e sem texto sob o "+"; comparar com `antes-medidas.json`.
  3. Folhas "antes e depois" da tela (claro e escuro; celular, tablet e desktop) em `docs/redesign/v2/<fatia>/`, JPEG, até 500 kB por PR.
  4. Revisão pelo formato de `arretado-visual-review`, sem P0 nem P1 aberto na tela.
  5. Docs: `sistema-visual.md` se um valor mudou, `glossario.md` se nasceu termo, `solucao-de-problemas.md` se houve tropeço, uma linha em `proxima-sessao.md`.
- Antes de tocar arquivo que outra thread mexe, aviso a ela; texto e rótulo são da thread "Aprimoramentos das revisões" (ver "Quem mexe em quê").
- Sem estimativa de tempo: a ordem abaixo é a de valor e de dependência.

## Fatias

| # | Fatia | Fecha | Toca | Depende de |
|---|---|---|---|---|
| F1 | **Fundação** (feita; paleta D-D4): tokens, botões, links, campos, abas, chips, callouts, linhas, títulos | V-02 (base), V-04, V-05, V-09, V-10, V-20 (botões), V-21 (quebra de palavra) | `estilos.css`, CSS dos pacotes, `scripts/contraste.*`, E2E de alvos e de largura | — |
| F2 | **Casca por plataforma**: cabeçalho, barra de navegação reta, "+" simples, rodapé, safe-area | V-01, V-06, V-16, V-17 | `Shell.tsx`, casca em `estilos.css`, E2E da navegação | F1 |
| F3 | **Hoje**: cartões por estado, Depois, segurança, captura inline, duas colunas, Retorno, Fechar o dia, elementos vetoriais | V-07 (Hoje), V-08, V-10 (Hoje) | `hoje/*`, `componentes/AcaoAgora`, `LinhaDepois`, `dominios/hoje/depois.ts` (novo) | F2 |
| F4 | **Revisão**: cartão central, resposta, botões sem vermelho, fim de rodada | V-14 | `recall/Drill.tsx`, `RevisarFrases.tsx` | F1 |
| F5 | **Recall**: início, abas, listas, registrar, detalhe | V-02 (Recall), V-07 (Recall), V-12 | `recall/*` | F1, F2 |
| F6 | **Leitor** (especificação do Gabriel): controles, legenda de destaques, régua, dock, modo foco, ações do dispositivo | V-03 | `biblioteca/Leitor*`, barra | F2 |
| F7 | **Biblioteca**: abas, filtros, normas, Acervo, súmulas, teses, resumos, precedentes, importar | V-13, V-20 (Normas) | `biblioteca/*` | F1, F2 |
| F8 | **Plano**: matérias recolhidas com andamento, Pontos, Tarefas, Onboarding | V-11, V-21 (grade), V-02 (Pontos e Tarefas) | `plano/*` | F1, F2 |
| F9 | **Conta e Sessão** (Sessão pela especificação do Gabriel): Conta, Aparência, Perfis, Dados, Privacidade, Orientações, Sessão | V-15 | `conta/*`, `sessao/*`, `orientacoes/*` | F1, F2 |
| F10 | **Transições entre rotas** (View Transitions) e atraso do `Esqueleto` | V-19 | `App.tsx`/rotas, CSS de movimento | F2 |
| F11 | **Plataformas**: favicon, manifest, ícones, `theme-color`, `viewport-fit`, tablet deitado | V-18 | `index.html`, `public/`, `vite.config.ts` | F1 |
| F1b | **Tokens D-D5**: paleta Creme, Marinho, Sol, Argila, Verde-foco e Azul-céu nos dois temas; fundo com pontinhos; Playfair Display hospedada (títulos e marca); correções de contraste da D-D5 | V-02 (base), tema | `estilos.css`, `public/fontes/`, `scripts/contraste.mjs`, E2E de axe | F1 |
| F12 | **Harmonização**: passada tela a tela contra o padrão do Stitch (cabeçalho, título com "+", bloco-herói, linha do tempo, rótulos Trilha, Fixar e Em seguida, um primário por tela), capturas lado a lado, axe | — | todas as telas | F1b, F2 a F9 |

Ordem de trabalho (D-D5): F1 → **F1b** → F2 → F3 → F11 (barata e visível) → F4 → F6 → F5 → F8 → F7 → F9 → F10. A F10 entra por último porque a transição só vale com a casca e as rotas já no desenho final; as demais podem se sobrepor duas a duas, porque depois da F1 cada tela tem o próprio CSS de pacote.

### F1 — Fundação (só CSS e testes; feita, com a paleta da D-D4)

- Os três blocos de tokens (`:root`, `prefers-color-scheme: dark` e `[data-tema='escuro']`) com a paleta do Gabriel (Areia, Palha, Creme, Terracota, Caatinga, Acqua, Solace, Noite, Tinta) e os papéis de `sistema-visual.md`; `scripts/contraste.mjs` e `.test.ts` ganham os pares novos (o teste exige claro-escuro-sistema igual ao escuro manual e que nenhum CSS use token da identidade anterior).
- `.principal` compacto (44 de altura, raio 12), Terracota no claro e Solace no escuro e dentro do bloco; secundário de contorno; `.botao-texto` (fantasma), `.botao-icone` e `.linha-acao` novos; `.perigoso` só cheio no diálogo. **Sem vidro.**
- Campos: todo `input` (com ou sem `type`), `select` e `textarea` com altura 48, contorno `--borda-campo` e seta própria; caixa e rádio com marca de 22 px e contorno de 2 px num rótulo de 44.
- Abas, chips, callouts, linhas de lista, cartões, estado vazio, `Esqueleto` e diálogo nos tokens novos; H1 em Literata na cor de lugar.
- `overflow-wrap: anywhere` no conteúdo (V-21) e `min-width: 0` nos filhos de grade.
- Sai o verde-oliva: `--primaria`, `--agora-*`, `--progresso`, `--depois` e `--cartao-agora-*` somem do CSS (o teste de contraste falha se voltarem).
- Foco: `--bloco-foco` dentro de bloco-herói e do item selecionado.
- Testes: o de alvos varre as rotas principais (antes só `/conta/dados`); novo teste de largura (390 px, sem rolagem horizontal) nas rotas semeadas.
- **Não muda estrutura de TSX.** Se um estilo exigir classe nova, a classe entra na fatia da tela.

### F1b — Tokens D-D5

Troca os valores dos tokens; os nomes de papel ficam e `--terracota`, `--caatinga` etc. viram aliases até a F12 limpar. Fundo `#fff8ec` com `radial-gradient(#d6c9b3 .75px, transparent .75px)` a 16 px só no `body`; texto e título Marinho; primário Sol com texto Marinho (borda Marinho de 1,5 px sobre fundo claro); Argila só em etiqueta de matéria; Verde-foco (gráfico) e seu passo escuro (texto); Azul-céu para Cartões, ícone Marinho. Tema escuro sobre o Marinho. Playfair Display 600/700 em woff2 em `public/fontes/` (sem CDN, `font-display: swap`) só para títulos e marca; interface em Atkinson, lei em Literata. Piso de 13 px em todo texto. `scripts/contraste.mjs` ganha os pares novos e o `npm run check` os cobre. Só valores, sem mudar estrutura de tela. Nível B, revisor Gemini (muda o sistema de design). O pacote G dos contratos de 16/10 (fundo com pontinhos) é absorvido por esta fatia; a orientação do Recall/Fixar do G sai como pacote próprio.

### F2 — Casca por plataforma

**Pela D-D5:** navegação em **pílula flutuante** Marinho (celular e tablet em pé) com Hoje · Trilha · Fixar · Biblioteca, ícone e rótulo ≥ 13 px, item atual destacado; no desktop, as mesmas quatro áreas no cabeçalho. "+" redondo verde **na linha do título** das telas que criam algo (no lugar do "+" acima da barra), com o nome acessível de hoje; cabeçalho "Arretado" + cacto verde e "Conta" em pílula (o "?" vai para Conta › Orientações). Só rótulos de tela: rotas e identificadores ficam. Os itens abaixo valem no que não conflitam.

- Cabeçalho: "Arretado." (ponto final em Terracota) com o cacto; "Conta" e "?" em botões de contorno; no desktop, navegação ao centro e "Registrar erro (E)" à direita.
- Navegação: **barra reta** embaixo no celular e no tablet em pé (ícone e rótulo nas quatro áreas, `safe-area`), item atual em `--selecionado-*` ou peso 700; no desktop, no cabeçalho. **Cai** a pílula flutuante com "+" satélite da D-D3.
- "+" simples (56 px, Terracota; Solace no escuro) acima da barra, nas telas sem captura inline; some no Hoje (a captura é o campo) e com o teclado aberto (`visualViewport`).
- Rodapé legal no fim do conteúdo (botão fantasma de 44), reserva de rolagem igual à altura da barra mais o "+" e 16 px, `safe-area`: o "+" nunca cobre texto (fecha as 52 ocorrências de "+ sobre texto" da medida).
- Muda o ponto de aparição do "+" e o do "Registrar erro" do cabeçalho (≥ 900); ajustar os E2E que dependem desses nomes acessíveis. O atalho E e o nome "Novo registro de erro" ficam.

### F3 — Hoje

**Pela D-D5:** cartão Agora Marinho (raio 28) com etiqueta da matéria em Argila, "no seu ritmo", título serifado, trecho da lei sem itálico e com sublinhado, e botão Sol "Avançar um tiquinho →" (um por tela). Estados: Estudando = Marinho com Sol; Distraído = creme com filete Argila e linhas de ação; Sorrindo = cartão claro com ponto verde (andamento, sem sequência); Determinado = Marinho com Sol e as revisões prontas. "Em seguida" (até 2 itens) em linha do tempo: ponto verde = Frases, azul = Cartões, duração em chip. O "Anote a frase correta" sai: a Frase correta entra só pelo "+" (D25). O campo "Para lembrar" (coisas a fazer fora do app, com rótulo visível) só entra depois do pacote de dado "lembretes" (esquema, nível A; ver D-D5, resposta 6); até lá o Hoje fica sem ele. Os itens abaixo valem no que não conflitam.

- Cartão Agora **por estado** (ver `sistema-visual.md`): Estudando = Caatinga com ação Solace e fantasma "Trocar tarefa" lado a lado; Distraído ("Por onde começar?") = Areia com linhas de ação ("Adicionar uma lei para ler", "Escolher uma matéria", "Sessão curta de 15 min"); Determinado (revisões prontas) = cinza-areia com Terracota; Sorrindo (dia fechado) com o andamento do dia em pontos. Título em sans bold, mascote apoiado na borda.
- Linha "✓ Seu ponto está salvo neste aparelho." quando existe ponto de retomada.
- Depois: até 2 linhas em cartão (título, matéria · minutos, ponto de tipo e seta), sob "DEPOIS · NA SEQUÊNCIA". Lista pura `listarAcoes(entrada)` em `src/dominios/hoje/depois.ts`, que importa os tipos de `proxima-acao.ts` sem mudar a assinatura de `decidirProximaAcao`.
- Captura inline: campo "Anote a frase correta…" com "Guardar" (Caatinga) dentro, sobre o caso de uso que o "+" já usa; só a frase é obrigatória (D25).
- Elementos vetoriais do Gabriel como componentes (`ElementoCactos`, `ElementoLampada`, `ElementoDistracao`), decorativos.
- Desktop em duas colunas (7fr · 5fr); Retorno com o mascote Distraído; Fechar o dia com o Sorrindo; o aviso de backup deixa de usar o rótulo "Depois".
- Conflito conhecido: `Agora.tsx`, `proxima-acao.ts` e `RecallInicio.tsx` recebem texto e fila única da thread "Aprimoramentos"; a F3 entra depois do PR deles ou rebaseia sobre ele.

### F4 a F10 (resumo)

- **F4 Revisão:** cartão central em Literata de 1,5 a 1,75 rem; "Mostrar resposta" primário; resposta em callout de lugar "Frase correta"; De novo, Difícil e Fácil em botões secundários com ícone, sem vermelho; progresso fino e "Sair" no topo; "Mais opções" numa folha; fim de rodada com bloco-herói e o mascote Sorrindo. Sem mascote durante a revisão.
- **F5 Recall:** início com resumo, abas rolantes e a lista em linhas de 56 px com esfera de matéria; resultado "Errei" em cor neutra; "Revisar frases" dentro do resumo; registrar com campo único em destaque; desktop em duas colunas.
- **F6 Leitor:** pela especificação do Gabriel (ver `sistema-visual.md`): controles (A-, 18px, A+, Destaques), legenda recolhível dos quatro sublinhados, régua em Areia, dock com Buscar, Filtrar, Foco e "Lido até aqui" (os nomes acessíveis ficam), reserva de 156 px sob o artigo, modo foco em retrato e paisagem, "Ações" em folha ou diálogo; busca e filtro em folha; coluna de 70 ch. A lógica do modo foco, a penumbra e o cartão de artigo **não mudam**; sem mascote.
- **F7 Biblioteca:** abas rolantes, filtros recolhidos, normas em cartões com esfera de matéria, Acervo com linhas de 56 px e caixa de 44, súmulas e teses numa lista só (decisão de 14/10), grade de 2 e 3 colunas em tablet e desktop.
- **F8 Plano:** matérias recolhidas com andamento ("12 de 107"), pontos ao abrir, Tarefas e Onboarding nos componentes novos; coluna `minmax(0, 1fr)` (V-21).
- **F9 Conta e Sessão:** listas de cartões agrupados, Aparência com controles próprios, Perfis, Dados, Privacidade e Orientações com índice; Sessão pela especificação do Gabriel (Modo Só Estudo, chips de tempo que só informam, bloco de Caatinga com o mascote Estudando, estacionamento em Areia, fechamento com o mascote Sorrindo); a faixa "Sessão · Pausar · Encerrar" (componente da thread "Aprimoramentos") posicionada e estilizada aqui.
- **F10 Transições:** View Transitions de até 150 ms entre rotas, desligada com `prefers-reduced-motion` e no perfil Calmo; nunca anima texto da lei nem remonta o Leitor; atraso de 150 ms no `Esqueleto`; padrão "andamento" nas operações longas ([`transicoes-e-carregamento.md`](transicoes-e-carregamento.md)).

### F11 — Plataformas

Favicon (o cacto), `manifest.webmanifest` (nome, `display: standalone`, `theme_color` e `background_color` da marca), ícones de 192 e 512 (também `maskable`) e `apple-touch-icon`, `<meta name="theme-color">` por esquema de cor, `viewport-fit=cover`, e conferência do tablet deitado (1024×768) e do aparelho instalado. A CSP já admite `manifest-src 'self'`.

### F12 — Harmonização

Depois das F2 a F9: uma passada por tela (Trilha, Fixar e suas abas, Biblioteca e suas abas, Leitor, Sessão, Conta e subtelas, onboarding, Acervo) contra a lista do `leia-me` do Stitch: cabeçalho, título com "+", um bloco-herói por tela de orientação, um primário por tela, cartões brancos translúcidos de raio 16, linha do tempo onde houver sequência, rótulos novos, linha de calma ("salvo neste aparelho") onde couber. Entregar capturas lado a lado (Stitch × app) nos 2 temas e nos 3 aparelhos. Se faltar referência de uma tela, gerar no Stitch com o prompt-base de [`referencias/2026-10-16-stitch-hoje/leia-me.md`](../design/referencias/2026-10-16-stitch-hoje/leia-me.md); o Gabriel aprova antes de implementar.

## Quem mexe em quê

| Thread | Arquivos | Regra |
|---|---|---|
| Redesenho (esta) | `estilos.css`, CSS dos pacotes, `Shell.tsx`, `hoje/*`, `componentes/*`, estrutura e visual de `Drill.tsx`, do Leitor e das telas | avisa antes de tocar o que outra thread mexe |
| Aprimoramentos das revisões | texto e rótulos (`recall/rotulos.ts`, `textos.ts`), fila única (`RecallInicio.tsx`, `proxima-acao.ts`), voz regional, **componente** da faixa da Sessão (sem decisão visual) | PRs pequenos e com merge logo; a UI rebaseia |
| Contas, login e banco (F4-A) | telas de conta e login atrás de `VITE_CONTA=0` | usa os componentes da F1 quando ela chegar; até lá, estilo mínimo |
| Fila de merges | merge em `integracao` | recebe o aviso de cada PR verde |

## Perguntas ao Gabriel (vale o padrão se não houver resposta)

0. **D-D5:** as cinco perguntas foram respondidas em 16/10/2026 (ver o fim da D-D5 em `decisoes-design.md`). O item 4 abaixo (barra reta) fica revertido pela D-D5.

1. **Agora do Hoje em Caatinga ou em Areia?** O mockup do Hoje o desenha em Areia com botão Terracota; o texto da especificação e o cartão "Estudando!" do sistema, em Caatinga. Padrão: Caatinga (a troca é um token).
2. "Prazos" no Leitor: sublinhado `#173F52` (texto da especificação) ou Acqua (legenda da imagem). Padrão: `#173F52`.
3. Cacto ao lado do nome: mantido (D-D2), embora três dos quatro mockups não o tenham no cabeçalho.
4. Barra de baixo reta e "+" simples, no lugar da pílula flutuante com "+" satélite da D-D3.
5. **Calmo desliga as transições**, como no plano de 14/10, mas Calmo é o perfil padrão (quem não escolheu perfil é "calmo"). Padrão: seguir a regra, então a transição só aparece em Guiado e Leitura. Se preferir a transição no padrão, a regra passa a ser só `prefers-reduced-motion`.
6. O "Depois" mostra até 2 itens (D-D3, b) e o título de página fica em serifa (D-D3, c).
7. **Dado, não design:** alguns títulos de pontos da Defensoria vêm com os espaços perdidos (por exemplo `diretrizeseinstrumentosconstitucionaisdodireitoconsumerista.19.Defesa…`). O app passa a quebrar a palavra, mas o catálogo precisa ser corrigido na origem.
