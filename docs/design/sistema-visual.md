# Sistema visual do Arretado — v4 (Ponto de luz)

> **D-D7 (18/10/2026) — Ponto de luz.** Direção escolhida pelo Gabriel nas rodadas de 18/10/2026 e autorizada para construção no app no mesmo dia ([`decisoes-design.md`](decisoes-design.md), D-D7; contrato em [`referencias/2026-10-18-ponto-de-luz/contrato.md`](referencias/2026-10-18-ponto-de-luz/contrato.md)). Mapa da troca: Creme → **Areia** `#f1e6d3` (chão liso, sem pontinhos) · Marinho (texto, título) → **Tinta** `#17243a` · Marinho (bloco-herói, item atual) → **Cal** `#ffffff` com a sombra fresca · Sol (ação) → **Vidro** `#0f7f72` com texto branco · Verde-foco ("salvo", progresso) → **Vidro** e **Vidro texto** `#0a6157` · Azul-céu e Argila → saem (tipo e matéria em texto, em neutro) · Playfair Display → **Gabarito**. Novos: **Luz** `#6fe3d6` (pontos do Dia, Estrela, ponta da caneta) e **Traço** `#c8742f` (só o cachorro). Regras que não mudam: piso de 13 px, alvo de 44 px, lei sem itálico, destaque sublinhado, uma ação por tela, sem vermelho no estudo.

Base: as decisões D-D1 a D-D6 em [`decisoes-design.md`](decisoes-design.md), que ficam como histórico onde a D-D7 diverge. Execução em fases: [`../planos/ponto-de-luz.md`](../planos/ponto-de-luz.md) (P1 fundação, P2 casca, P3 Hoje, P4 Leitor, P5 Fixar, P6 demais telas, P7 plataformas). Resumo no formato do Stitch: [`../../DESIGN.md`](../../DESIGN.md). Só apresentação (D-D1).

**Fonte de verdade dos valores:** `src/apresentacao/estilos.css` (e os CSS dos pacotes). Este texto é o alvo e o mapa; enquanto uma fase não chegou, o código ainda diverge dele. Contraste de cada par: `scripts/contraste.mjs` (e `npm run check`).

## Princípios

1. **Uma ação dominante por tela**, em vidro (botão com texto branco; à noite, vidro claro com o texto da noite).
2. **Cor tem função** (tabela abaixo). Nada de cor "de enfeite"; a luz só reporta estado.
3. **Uma folha sobe do chão:** a folha de cal do Agora, com a sombra fresca, é o único lugar de foco da tela de orientação. Leitor e Revisão em curso ficam calmos.
4. **O texto da lei é o protagonista**; tudo em volta cede.
5. **Segurança visível:** onde a pessoa parou (a Norma e o Dispositivo exatos) e que está tudo salvo (os pontos do Dia acesos) sempre à vista.
6. **Mesmo jeito em celular, tablet e desktop;** o que muda é a disposição, não o vocabulário visual.
7. **Nada depende de movimento, de transparência nem de cor sozinha.**

## Papéis de cor

| Papel | Pergunta | Dia | Noite |
|---|---|---|---|
| Ação | "O que faço agora?" | Vidro `--acao` (texto branco) | Vidro claro `--acao` (texto da noite) |
| Ação dentro da folha | idem | Vidro `--bloco-acao` | Vidro claro `--bloco-acao` |
| Onde estou | "Onde estou?" | Cal `--atual-*`, `--bloco-fundo` sobre a areia | Folha da noite `#142a4a` sobre a noite |
| Marcado | "O que liguei?" | Tinta `--selecionado-*` (marca em cal) | Tinta clara (marca na noite) |
| Estado | "Está feito? Está salvo?" | Luz `--ponto-luz` com contorno `--ponto-contorno` | Vidro claro com contorno claro |
| Caminho | "Para onde posso ir?" | Vidro texto `--link` | Vidro claro `--link` |
| Realce de termo | "Que tipo de termo é este?" | `--destaque-*` (sublinhado, ver Leitor) | os mesmos, mais claros |
| Perigo | "Isto apaga" ou falha técnica | `--perigo` | `--perigo` |

Regras: vidro só em botão primário, cacto da marca e andamento (o "+" é cal com tinta); a luz nunca é texto, nunca pulsa, nunca segue o dedo e sempre tem o contorno na tinta; vermelho nunca no estudo; amarelo, verde e rosa são dos grifos do leitor e de mais nada; caramelo é só do traço do cachorro. O **tipo da tarefa** (Leitura, Cartões, Frases) vai em texto, com o ponto de luz dizendo o estado; a matéria vai sempre em texto, em neutro.

## Tokens

Todos os pares de texto passam em 4,5:1 e os gráficos (contorno, ícone, foco, sublinhado) em 3:1, medidos com `scripts/contraste.mjs`. Colunas: dia · noite.

### A paleta (valores fixos e canônicos da D-D7)

`--areia #f1e6d3` · `--areia-funda #e7d8be` · `--cal #ffffff` · `--tinta #17243a` · `--tinta-2 #4f5b70` · `--vidro #0f7f72` · `--vidro-texto #0a6157` · `--luz #6fe3d6` · `--traco #c8742f` · `--noite #0b1b33` · `--noite-funda #07152a` · `--noite-folha #142a4a` · `--noite-quente #1c375d` · `--noite-tinta #eef3f8` · `--noite-tinta-2 #a9b7cc` · `--noite-vidro #7df3e1` · `--noite-traco #ffb46b`.
Saíram com a D-D7 (o teste de contraste falha se algum CSS voltar a usá-los): `--creme`, `--marinho`, `--sol`, `--argila`, `--verde-foco`, `--azul-ceu`, `--ponto-fundo` e os aliases `--palha`, `--terracota`, `--caatinga`, `--acqua`, `--solace`, `--sobre-solace`, `--noite-cartao`.

### Superfície e texto

| Token | Dia · noite | Uso | Contraste medido |
|---|---|---|---|
| `--fundo` | Areia `#f1e6d3` · Noite `#0b1b33` | tela, cabeçalho, barra das áreas | — |
| `--superficie` | Cal `#ffffff` · `#142a4a` | campos, cartões, folha, linhas | — |
| `--superficie-2` | Areia funda `#e7d8be` · `#07152a` | trilho de abas, selo, trilho do andamento, esqueleto | `--texto-atenuado` 4,9:1 · 9,0:1 |
| `--quente` | Areia funda `#e7d8be` · `#1c375d` | ícone de linha de lista, faixa quente | `--texto` 11,1:1 · 10,7:1 |
| `--borda` | tinta a 12% · tinta clara a 14% | filetes decorativos | — |
| `--borda-campo` | `#727c8f` · `#7387a8` | contorno de campo | 3,4:1 na areia, 4,2:1 na cal · 4,7:1 e 3,9:1 |
| `--borda-forte` | Tinta · `#a9b7cc` | contorno de caixa e rádio | 15,6:1 · 7,1:1 |
| `--texto` | Tinta `#17243a` · `#eef3f8` | texto | 12,6:1 na areia · 15,4:1 na noite |
| `--texto-atenuado` | `#4f5b70` · `#a9b7cc` | apoio, rótulo | 5,5:1 na areia, 6,9:1 na cal · 8,5:1 e 7,1:1 |
| `--titulo` | Tinta · `#eef3f8` | título de página (H1) | 12,6:1 · 15,4:1 |
| `--penumbra` / `--luz-do-cartao` | `#e4d6bd` / Cal · `#050e1c` / `#142a4a` | palco do modo foco | `--texto-atenuado` na penumbra 4,8:1 |

### Ação, lugar, estado e folha

| Token | Dia · noite | Uso | Contraste medido |
|---|---|---|---|
| `--acao` / `--acao-texto` | Vidro `#0f7f72` / branco · `#7df3e1` / `#0b1b33` | botão primário | 4,9:1 · 13:1; o vidro tem 3,9:1 na areia (sem borda) |
| `--link` | `#0a6157` · `#7df3e1` | link de texto | 5,9:1 na areia, 5,1:1 na penumbra · 13:1 |
| `--foco` | Tinta · `#7df3e1` | anel de foco global (2 px) | 12,6:1 · 13:1 |
| `--lugar` | Tinta · `#eef3f8` | filete, marca do "Lido até aqui", opção marcada | ≥ 3:1 nos dois |
| `--cacto` / `--andamento` | Vidro · `#7df3e1` | o cacto da marca, achado da busca, preenchimento do andamento | 3,9:1 na areia, 3,5:1 na areia funda · ≥ 10:1 |
| `--sucesso` | `#0a6157` · `#7df3e1` | texto de "salvo" | 5,9:1 · 13:1 |
| `--ponto-luz` / `--ponto-contorno` / `--ponto-nucleo` | Luz `#6fe3d6` / Tinta / branco · `#7df3e1` / `#eef3f8` / branco | pontos do Dia, ponta da caneta | contorno 12,6:1 na areia · 15,4:1 na noite |
| `--estrela` / `--estrela-luz` / `--estrela-contorno` | Vidro / Luz / Tinta · `#7df3e1` / `#7df3e1` / `#eef3f8` | faixa da calha / miolo / contorno da Estrela | faixa 3,9:1 na areia; contorno 12,6:1 |
| `--traco-cachorro` | `#c8742f` · `#ffb46b` | só o traço do cachorro (decorativo) | — |
| `--bloco-fundo` | Cal · `#142a4a` | folha do Agora | — |
| `--bloco-texto` / `--bloco-atenuado` | Tinta / `#4f5b70` · `#eef3f8` / `#a9b7cc` | texto na folha | 15,6:1 e 6,9:1 · 12,9:1 e 7,1:1 |
| `--bloco-acao` / `--bloco-acao-texto` | Vidro / branco · `#7df3e1` / `#0b1b33` | botão primário **na folha** | 4,9:1 · 13:1 |
| `--bloco-foco` | Tinta · `#7df3e1` | anel de foco dentro da folha | 15,6:1 · 10,8:1 |
| `--atual-fundo` / `--atual-texto` / `--atual-sombra` | Cal / Tinta / sombra fresca · `#142a4a` / `#eef3f8` / preto a 45% | área e aba atuais | 15,6:1 · 12,9:1 |
| `--selecionado-fundo` / `-texto` / `-atenuado` | Tinta / Cal / `#c9d1dc` · `#eef3f8` / `#0b1b33` / `#3b4a63` | caixa e rádio marcados, botão ligado, item escolhido | 15,6:1 · 15,4:1 |
| `--tinta-lugar` | tinta a 6% sobre a superfície · tinta clara a 8% | linha marcada, "Frase correta" | `--texto-atenuado` 6,1:1 |
| `--regua-fundo` / `--regua-barra` | tinta a 6% / Tinta 2 · tinta clara a 8% / `#a9b7cc` | régua de leitura (segue o dedo; por isso nunca luz) | atenuado 5,0:1 na areia |

O anel de foco global é tinta no dia (2 px, `outline-offset: 2px`) e vidro claro à noite. Dentro da folha, `--bloco-foco`.

### Destaques do leitor (sublinhado, nunca fundo)

| Token | Dia · noite | O quê | Estilo |
|---|---|---|---|
| `--destaque-prazo` | `#173f52` · `#7fb4cf` | prazos e tempo | duplo, deslocamento de 4 px |
| `--destaque-condicao` | `#ab6b21` · `#f2c062` | exceções e condições | tracejado, 4 px; 3,5:1 na areia e 3,1:1 sob a régua |
| `--destaque-absoluto` | `#a5582a` · `#f09a68` | termos absolutos | ondulado, 3 px |
| `--destaque-pena` | `#a5582a` · `#f09a68` | penas, quóruns e frações | pontilhado, 4 px |

Contra a areia: 9,1:1 (prazo); 3,5:1 (condição); 4,2:1 (absoluto e pena); sob a régua, a condição fica em 3,1:1. À noite, 7,7:1 · 10,2:1 · 7,8:1. O estilo da linha é o que distingue os quatro (a cor sozinha não distingue).

### Estado (sem mudança)

`--perigo`, `--aviso-fundo/-texto` e os grifos (`--grifo-1` a `-3`) ficam como estavam. **Saíram** na F1 do redesenho v2: `--primaria`, `--primaria-texto`, `--agora-fundo`, `--agora-borda`, `--depois`, `--progresso`, `--cartao-agora-*`.

## Forma, espaço, tipografia

| Item | Valor |
|---|---|
| Raios | `--raio-heroi` (folha) 16 · `--raio-cartao` 16 · `--raio-botao` 12 · `--raio-campo` 12 · `--raio` 12 (linhas, callouts, diálogo) · `--raio-pilula` 999 (aba, selo, área atual, interruptor). O que está dentro tem raio menor que o que o contém. |
| Espaço | `--espaco-1` 0,25 rem · `-2` 0,5 · `-3` 1 · `-4` 1,5 · `-5` 2 · `-6` 3 |
| Sombras | `--sombra-folha` (a sombra fresca: `0 14px 28px -10px` tinta a 16% e `0 1px 0` tinta a 16%) · `--sombra` (cartão, mais baixa) · `--atual-sombra` (área e aba atuais) · `--sombra-botao` (`0 2px 6px`, no primário) · `--sombra-flutuante` (`0 4px 16px`, dock, diálogo); à noite, preto |
| Fundo | Liso, sem textura (os pontinhos da D-D5 saíram). |
| Alvo | `--alvo` 44 px: botões, links isolados, linhas de lista; campos 48 |
| Gutter | 16 px (celular) · 24 (tablet em pé) · 32 (≥ 900) |
| Coluna | 40 rem (celular e tablet em pé) · 65 rem (≥ 900) · leitura 70 ch |
| Título de página (H1) | Gabarito 800 (`--fonte-titulo`), `-0,02em`, cor `--titulo`, 1,875 rem (celular) · 2,125 (tablet) · 2,375 (≥ 900), linha 1,1 |
| Marca | "Arretado" em Gabarito 700, 1,1875 rem, `-0,01em`, com o cacto em `--cacto` (13 × 18 px) |
| Título da folha | Gabarito 750, 1,5 rem, linha 1,12 (`.agora-titulo`) |
| Seção (H2) / cartão (H3) | Atkinson 700, 1,25 rem / 1,0625 rem |
| Corpo · pequeno · rótulo | Atkinson 1 rem · 0,875 · 0,8125 (piso de 13 px mantido em `.rodape`, `.rotulo-discreto`, `.marcador`) |
| Cartão de destaque e frase de revisão | Literata 700, 1,5 a 1,75 rem |
| Lei | Literata, `--tamanho-leitura` (18 px, preferência da pessoa); "Sem serifa" troca só esta letra |

Itálico nunca no trecho da lei. Em celular, campos com no mínimo 16 px (o iOS aproxima abaixo disso).

## Componentes

| Componente | Especificação |
|---|---|
| **Botão primário** (`.principal`) | Compacto: altura 44, padding `0 20px`, raio 12, peso 600, `.9375rem`, espaçamento `-0,01em`, `--sombra-botao`; fundo `--acao`, texto `--acao-texto`, sem borda. Na folha do Agora: largura total, 52 de altura, `1.0625rem`. **Um por tela.** Hover escurece 14% em direção à tinta; pressionado desce 1 px; desabilitado a 50% sem sombra; transição de 140 ms só em `transform` e `box-shadow` e só sem `prefers-reduced-motion` (nunca em cor: ao virar o tema o texto troca na hora e o fundo ficaria atrasado, o que o axe lê como contraste baixo). |
| **Botão secundário** (`button`, `.botao`) | Mesma forma, fundo `--superficie` (cal), contorno de 1 px `--borda-botao`, texto `--texto`. |
| **Botão fantasma** (`.botao-texto`, `.discreto`) | Sem caixa, sublinhado de 4 px, cor herdada sem opacidade (a 82%, a cor atenuada de uma dica cai para 3,8:1 na areia), peso 500, `.875rem`, alvo 44. Vai **ao lado** do primário ("Escolher outra coisa", "Pausar") ou **sozinho** no começo da linha ("Voltar", "Mais", "Importar outra planilha"); sozinho leva `.na-margem` (margem de −12 px: tira o recuo do alvo e alinha a letra ao texto da página). `.discreto` é o mesmo botão (antes era texto sem sublinhado e com 20 px de recuo, que não parecia ação); só o cabeçalho (Ajuda e o menu dela) fica em texto simples. Um `<summary>` sozinho num `<details>` é este botão (`botao botao-texto na-margem`). |
| **Botão de ícone** (`.botao-icone`) | Quadrado de 44 com o contorno do secundário; `aria-label` sempre. |
| **Ícone** (`componentes/Icone.tsx`) | SVG de traço único em 24 × 24 (`stroke` 2, pontas redondas, `currentColor`, `aria-hidden`); nomes: `voltar`, `seta`, `abre`, `marca`, `fechar`, `nota`, `info`. Na altura do texto (`.icone-svg`, 18 px; 1 em dentro do botão pequeno e da linha de texto). Nenhum glifo de texto (`← › ▾ ✎ ✕ ✓ ⓘ`) serve de ícone, e o botão só com ícone leva `aria-label`. |
| **Voltar** (`componentes/Voltar.tsx`) | Link fantasma com a seta, **acima do título** da tela (Trilha › Pontos e Tarefas, Biblioteca › Acervo e o Leitor). O nome acessível é o texto visível, ou `nome` quando o texto é curto (no Leitor, "Biblioteca" → "Voltar à Biblioteca"). |
| **Linha de ação** (`.linha-acao`) | Linha inteira de toque: altura 52, raio 12, filete `--borda`, fundo da superfície; texto à esquerda e seta ou duração à direita. |
| **Destrutivo** (`.perigoso`) | Secundário com texto e borda `--perigo`; só vira cheio dentro do diálogo de confirmação. |
| **Link em texto** | `--link`, sublinhado fino com `text-underline-offset: 0.2em`, 2 px no hover e no foco. |
| **Campo** | Altura 48, raio 12, fundo `--superficie`, contorno 1,5 px `--borda-campo`, 16 px, rótulo sempre visível acima. Erro: contorno e texto `--perigo` mais ícone e frase; nunca só cor. |
| **Caixa e rádio** | Marca própria de 22 px com contorno de 2 px em `--borda-forte`, raio 6 (caixa) ou círculo (rádio), dentro de um rótulo de 44; marcada = `--selecionado-fundo` (tinta) com a marca em `--selecionado-texto` (cal). A linha inteira é o alvo. |
| **Área e aba atuais** | `--atual-fundo` (cal) com `--atual-sombra` e o rótulo em negrito, sobre a areia (barra das áreas, cabeçalho) ou sobre o trilho `--superficie-2` (abas). O estado não depende só da cor: negrito, sombra e `aria-current`. |
| **Aba** (`.abas`) | Trilho `--superficie-2` (areia funda) em pílula; aba atual em cal; no celular rola na horizontal sem quebrar linha; anel de foco por dentro. |
| **Botão ligado** (`aria-pressed`) | `--selecionado-*`: tinta cheia com o texto em cal (ex.: "Destaques" no Leitor, item escolhido no Acervo). |
| **Selo** | Pílula `--superficie-2` com texto `--texto`. |
| **Linha de lista** (`LinhaLista`, `.linha-lista`) | Em linha sobre a areia, sem cartão e sem ladrilho de glifo: altura mínima 64, alvo inteiro, título em 600 e uma linha de apoio atenuada, o selo e a seta (`Icone`) à direita; o filete é o do `li` (`.lista-simples`); o hover sublinha o título. Normas, súmulas, teses, resumos e precedentes da Biblioteca, e o menu da Conta. |
| **Item do Acervo** (`.item-acervo-botao`) | Uma linha sobre a areia, sem cartão por item: a marca de 22 px à esquerda (a da caixa de seleção: marcada = tinta cheia com a marca em cal; "Já adicionada" = marca só desenhada, atenuada), o título e a dica. "Norma parecida" e os avisos do item são uma linha compacta com o ícone `info`. |
| **Cartão** | `--superficie` (cal), raio 16, borda `--borda`, `--sombra`; título de cartão em sans bold, sem a margem de cima do título (`.cartao-bloco > h2:first-child`). **Só onde agrupa:** um formulário com os botões dele (Conta › Dados), a Sessão em andamento, o resumo do que houve. Lista de itens e texto corrido ficam sobre a areia. |
| **Folha do Agora** (`.acao-agora`) | `--bloco-fundo` (cal), raio 16, `--sombra-folha`, texto `--bloco-texto`, padding 20 (26 em cima quando a caneta encosta nela); carrega título (Gabarito 750), motivo e tempo em `--bloco-atenuado`, um botão de vidro e, logo abaixo (`.agora-acoes`, 6 px), o fantasma "Escolher outra coisa" (44, peso 600, 15 px). A caneta fica fora da folha, à direita da linha de parada, com a ponta 16 px dentro dela; quem parou de ler tem o onde só na linha de parada; nenhum mascote. |
| **Linha de parada** (P3, `.parada`) | "Você parou em LEP, art. 112, § 2º": 15 px em `--texto-atenuado`, a norma e o Dispositivo em negrito `--texto`; a hora em 13 px numa linha própria ("hoje, 22h10", "ontem, 22h10", "dia 12/10, 22h10"). Com a caneta (`.com-caneta`): linha flex, texto à esquerda com 24 px de respiro embaixo, caneta de pé de 76 × 104 à direita (margem direita de −10), e a linha sobe 16 px sobre a folha (`z-index` 2). Sem a caneta (Dia fechado), só o texto. |
| **Pontos do Dia** (P3, `PontosDoDia`, `PontoDeLuz`) | Leitura, Cartões e Frases; cada um com um ponto de 22 px: apagado (anel em `--ponto-apagado`, a tinta a 55%: 3,4:1 na areia e 5,4:1 na noite; a 45% do protótipo eram 2,6:1, abaixo dos 3:1 que um contorno pede), aceso pela metade (atual: metade direita em `--ponto-luz`, anel e núcleo), aceso (feito: círculo `--ponto-luz`, anel `--ponto-contorno` e núcleo `--ponto-nucleo`). Rótulo em 13 px peso 600, atenuado; o atual em `--texto`; o estado também em texto, só para o leitor de tela (`.visualmente-oculto`: "Leitura, feito hoje"). Acende uma vez em 160 ms (escala de 0,6 a 1 e opacidade), na visita ao Hoje em que o ponto ficou aceso (feito) e na anterior, no mesmo dia, ainda não estava (`arretado.pontos-vistos` em `localStorage`); a vez (pela metade) aparece sem animação, e a primeira visita do dia abre quieta. |
| **Em seguida** (P3, `Depois`) | Rótulo em 13 px, 700, caixa-alta com 0,06 em de espaço entre letras, `--texto-atenuado`; até 2 itens de 44 de altura, nome em peso 600 e tempo ("cerca de 6 min") em 13 px, 400, atenuado; sobre a areia, sem botão. |
| **Resumo do Dia** (P3, `FecharDia`) | `.cartao-bloco`: título, linhas do que houve, próximo passo e um botão secundário ("Fechar o Dia" ou "Reabrir o Dia"). Fechado: o cachorro (112 × 94) e, absoluta a 54 px da esquerda e 36 de cima, a caneta deitada (120 × 67) com a ponta no lenço; "Bom descanso. Amanhã você começa de onde parou." |
| **Estrela** | A estrela de luz de quatro pontas (P4, `Estrela.tsx`): miolo `--estrela-luz`, contorno `--estrela-contorno` e aro na cor do chão (`--aro-da-estrela`, que corta a faixa); faixa da calha em `--estrela` (cheia na direta, tracejada na herdada). A exceção é a estrela vazia cortada. O botão mede 44 × 44 (P6): a caixa avança para a margem da página, à esquerda da calha (nunca sobre o texto), e sobe e desce o que falta à altura da linha; a estrela fica onde estava e a altura da linha não muda. No celular 4 px da caixa ficam fora da tela (o recuo da página é 16 px). |
| **Callout** | Fundo `--tinta-lugar`, filete de 4 px à esquerda, ícone e texto; "Frase correta" em lugar, aviso em `--aviso-*`, perigo em `--perigo`. |
| **Progresso** | Barra de 6 px `--superficie-2` com preenchimento `--andamento`; sempre com texto ("3 de 12"). |
| **Estado vazio** | Ícone pequeno, frase curta, um botão primário. Sem texto longo e sem mascote. |
| **Navegação** | Abas Hoje · Trilha · Fixar · Biblioteca sobre a areia (`nav.areas`), a atual em cal com `--atual-sombra` e o rótulo em negrito. Até 899 px, presas embaixo, com filete em cima: ícone de 22 sobre o rótulo de 13 px, aba de 56, `safe-area` embaixo; com o teclado aberto saem da frente (`.shell[data-teclado]`, `useTecladoAberto`). A partir de 900, no centro do cabeçalho, só o rótulo, pílula de 44. Nomes de `ROTULO_DA_AREA` (`textos.ts`); rotas `/plano` e `/recall`. |
| **Cabeçalho** | Preso no alto (`sticky`), na areia, com filete embaixo: "Arretado" (Gabarito 700) com o cacto em vidro; Ajuda (texto) e Conta (ícone de pessoa num alvo de 44) à direita; a partir de 900 px, as áreas no meio e "Registrar erro" neutro com a tecla E. O Leitor mede a altura dele (`.topo`) para prender as próprias barras logo abaixo. |
| **"+" no título** | `TituloComMais`: o título e o "+" na mesma linha; o "+" é redondo, 44 px, cal com tinta e `--atual-sombra`, e abre o registro de erro. No Hoje e no Fixar (as telas em que se registra); nas outras, a tecla E e, a partir de 900 px, o "Registrar erro" do cabeçalho. Não há "+" flutuante. |
| **Rodapé** | Linha legal curta e "Backup e dados" como botão de texto de 44 px, centralizados no fim do conteúdo, acima da reserva das abas; nunca sob a navegação fixa. |
| **Diálogo** | `dialog` nativo, raio 16, `--superficie`, fundo `rgb(0 0 0 / 45%)`, `--sombra-flutuante`; no celular, folha presa à borda de baixo. |

### A caneta e o cachorro (P3 em diante)

| Peça | Especificação |
|---|---|
| **Caneta** | Coluna de vidro com dois braços, do ciano ao verde (`#dffcff`, `#9af0dc`, `#5fcf8f`, `#2b8f5e`, `#17422f`), brilho de borda, três pontos de luz nas pontas dos membros e a ponta cônica escura com o ponto de luz; versões de dia e de noite (halo maior só na ponta, à noite). SVG inline (`Caneta`): uma caneta de pé com a ponta em (32, 200), girada em torno dela, gradiente em `userSpaceOnUse` (id por `useId`), cores nos tokens `--caneta-0` a `--caneta-4`, `--caneta-miolo`, `--caneta-borda`, `--caneta-brilho` e os dois halos da ponta (`--caneta-halo-dia`, `--caneta-halo-noite`, opacidades que o tema troca); nenhuma cor literal no componente. Poses: encostada a 35° (viewBox 150 × 205; Hoje, Cartão atual), deitada a 65° (viewBox 190 × 106; Lido até aqui e, largada ao fim do traço do cachorro, Resumo do Dia e fim de rodada). Decorativa (`aria-hidden`); uma por tela. |
| **Cachorro** | Um traço (`TRACO_CACHORRO`) em `--traco-cachorro`, 3,6 px, pontas redondas; olho e focinho como pontos; lenço em V. Desenha-se uma vez em 300 ms (`stroke-dashoffset`, linear), olho e nariz no fim, só no instante em que o Dia é fechado (aberto já fechado, aparece pronto); com `prefers-reduced-motion`, pronto. Só no Resumo do Dia e no fim de rodada. |

### Vidro é objeto, nunca superfície

O vidro desfocado não existe no app (o contrato da D-D7 o proíbe atrás de texto): nem em botão, nem em navegação, nem no dock do Leitor, que é uma pílula sólida de `--superficie`. A única transparência é a dos botões fixos do modo foco (`--superficie-translucida`, 90%, sem `backdrop-filter`), onde a letra de trás aparece de leve. Com `prefers-reduced-transparency: reduce` e em `forced-colors` ela vira cor sólida. Texto sempre sólido: a transparência nunca baixa o contraste do texto abaixo de 4,5:1 sobre o pior fundo possível. O "vidro" da paleta é a cor da ação e o material da caneta.

## Plataformas

Pontos de quebra: **celular < 700 px**, **tablet em pé 700 a 899**, **desktop e tablet deitado ≥ 900**. Referências: 390×844, 768×1024 (e 712×1138 na suíte), 1440×900 (e 1024×768).

| Elemento | Celular | Tablet em pé | Desktop e tablet deitado |
|---|---|---|---|
| Cabeçalho | na areia, gutter 16: "Arretado" à esquerda; Ajuda e Conta à direita | igual, gutter 24 | marca · navegação ao centro · "Registrar erro (E)", Ajuda, Conta |
| Navegação | abas sobre a areia, ícone e rótulo nas quatro áreas, atual em cal, `env(safe-area-inset-bottom)` | as mesmas, centralizadas em até 560 px | no cabeçalho, pegajosa (`sticky`), atual em cal |
| "+" | redondo em cal, na linha do título do Hoje e do Fixar | idem | idem, e "Registrar erro (E)" no cabeçalho |
| Conteúdo | 1 coluna, gutter 16, reserva embaixo para as abas | 1 coluna, gutter 24 (destino: 40 rem centralizada) | coluna de 900 px, gutter 32 (destino: até 65 rem, 2 colunas, 7fr · 5fr, no Hoje, no Fixar e na Trilha) |
| H1 | 1,875 rem | 2,125 rem | 2,375 rem |
| Hoje | título com "+", pontos do Dia, linha de parada com a caneta, folha do Agora, Em seguida | idem, folha mais larga | à esquerda o Agora; à direita Em seguida e "Para lembrar" |
| Leitor | ver abaixo; sem estrutura (o filtro por bloco faz o papel) | estrutura à esquerda (11 rem), coluna de lei à direita | coluna de 70 ch centralizada com a estrutura (13 rem) ao lado e, a partir de 1200, na margem; ferramentas num trilho à direita (≥ 1200, P7) |
| Rodapé | fim do conteúdo, acima da reserva | idem | uma linha, centralizada |
| Formulários | largura total, rótulo acima | coluna de 32 rem | coluna de 32 rem alinhada à esquerda do conteúdo |

Regras de plataforma: as abas e o dock nunca cobrem texto (reserva de rolagem = `--abas-altura`, a altura das abas com o filete, os 6 px de cima, a aba de 56 e, embaixo, 14 px ou a área segura, o que for maior; o rodapé termina 16 px acima delas; o dock do Leitor fica 16 px acima das abas); com o teclado aberto as abas somem (o campo ganha a tela); `viewport-fit=cover` e `env(safe-area-inset-*)` em tudo que é fixo; toque sem depender de `:hover`; teclado e atalhos do desktop intactos (E registra erro; Esc fecha). No app de loja (futuro): corpo na fonte do sistema com Dynamic Type, Gabarito só nos títulos; a caneta sobre a areia é o ícone.

## Leitor e Sessão

Fonte da especificação de comportamento: [`referencias/2026-10-14-gemini/especificacao-leitor-sessao.md`](referencias/2026-10-14-gemini/especificacao-leitor-sessao.md) (D-D4). As cores de lá (Marinho, Creme, Sol) leem-se pela tabela de troca do topo deste arquivo.

**Leitor (P4).**

| Parte | Especificação |
|---|---|
| Lido | da primeira linha ao "lido até" (`data-lido`), o texto vai sobre a faixa de cal (`--superficie`, raio 8) sobre a areia, com 12 px de folga de cada lado do texto (`--margem-do-lido`, só na lista; o cartão do artigo não tem faixa); no fim da linha a folga é a menor entre 12 px e metade do recuo lateral da casca (`--margem-do-lido-fim`, 8 px no celular), para a cal não encostar na borda da tela, e o texto não muda de lugar. A geometria é a mesma lido ou não (borda transparente de 3 px e `background-clip: padding-box`, vão de 6 px entre as faixas de linhas vizinhas), para a altura da linha não mudar quando o "lido até" anda e o virtualizador não derivar. O que falta ler fica na areia |
| "Lido até aqui" | `.marca-lido-ate`: rótulo de 13 px peso 700 em `--texto` (Atkinson) e, logo ao lado, a caneta deitada (`Caneta pose="deitada"`, 104 × 58) com a ponta no fim da frase; a linha tem no mínimo 58 px de altura (o corpo da caneta sobe da ponta). A caneta é decorativa (`aria-hidden`); o botão e o anúncio ("Lido até Art. 1º, I.") não mudam |
| Estrutura | `EstruturaDaNorma` (`estrutura.ts` faz as contas), a partir de 700 px e fora do modo foco: faixa de 11 rem (13 rem em 900 px ou mais) à esquerda da coluna de lei; de 1200 px em diante fica na margem esquerda e a coluna mantém os 70 ch. Lista o bloco de agora e os irmãos dele (as seções do capítulo), cada um com o `PontoDeLuz` do estado (lida = aceso, em leitura = pela metade, ainda não lida = apagado; também em texto para o leitor de tela), rótulo em 700 e nome em atenuado (até 3 linhas); o de agora em cal com `--atual-sombra` e `aria-current="location"`, e os blocos de dentro dele logo abaixo, um degrau à direita num filete (as seções, se ele é um capítulo); acima, o caminho (título, capítulo) em texto atenuado, e tocar no caminho sobe um nível (o bloco de lá vira o de agora, e a lista, a dos irmãos dele). Segue a rolagem por salto: o bloco de agora é o primeiro cabeçalho de bloco entre o alto da tela e a linha de leitura (um quarto da tela abaixo da barra fixa; o pé da tela no fim da página), ou o do alto se não há; ele muda quando a leitura passa de bloco, não a cada nó, e tocar numa seção (que a leva ao alto) a deixa como a de agora e fica preso abaixo do cabeçalho, rolando por dentro quando a lista é maior que a tela. Tocar leva o bloco ao alto; se o filtro o escondeu, desliga o filtro e avisa. Não aparece no celular (lá o filtro por bloco faz o papel) nem em normas sem título ou capítulo |
| Controles | seletor de fonte numa pílula só, com contorno de 1 px (`--borda-botao`): A−, o tamanho (18 px) e A+ como segmentos de 44 de alvo; "Destaques" em pílula (ligado = tinta cheia com texto em cal) |
| Legenda dos destaques | uma linha sob os controles, só com "Destaques" ligado: Prazos, Exceções, Absolutos, Penas (o nome inteiro na dica), cada um com o seu sublinhado; cabe até em 320 px. Recolher não foi preciso: ela some com o botão |
| Régua de leitura | `--regua-fundo` e filete de 3 px em `--regua-barra` (tinta: segue o dedo, então nunca é luz); a cor entra como camada de imagem, para somar à faixa de cal do lido |
| Estrela | a estrela de luz de quatro pontas na calha (`--estrela-luz` com contorno `--estrela-contorno`), com o aro na cor do chão (`--aro-da-estrela`) cortando a faixa de vidro, nos dois temas; a herdada é a mesma estrela, menor |
| Dock | `.dock-do-leitor`: Buscar, Filtrar, Ações e Modo foco numa só pílula sólida (raio 26, 4 px de respiro, `--superficie`, `--sombra-flutuante`, sem desfoque: a letra da lei não passa por trás); "Lido até aqui" fica fora, em botão de vidro de ação. Em `forced-colors` é `Canvas` com contorno `CanvasText`. Em 320 px o respiro dos botões cai para 8 px e os quatro cabem numa linha; com o texto ampliado quebra em duas, sem alargar a página |
| Cores forçadas | o fundo e a sombra caem: a borda do vão da faixa passa à cor do fundo (`Canvas`), o realce da régua, o filtro ligado do dock e a seção de agora na estrutura vão em contorno `Highlight` de 2 px, e a barra da estrela vira borda de 3 px em `CanvasText` (cheia na direta, tracejada na herdada). A faixa do lido some nesse modo: "Lido até aqui", em texto, diz onde a pessoa parou |
| Modo foco | penumbra `--penumbra`, cartão em `--luz-do-cartao` com raio 16 e `--sombra-folha`, bandeja com raio 16 e `--sombra-flutuante`, botões de `--superficie-translucida` (90%, opacos com `prefers-reduced-transparency`), menos "Próximo artigo" na bandeja aberta, que é de vidro de ação (`.principal`) e o mais visível, enquanto "Sair do foco" recua (sem caixa, peso 400); o "⋯" e as setas do cartão são SVG de um traço |

O texto da lei nunca é animado e o Leitor nunca é remontado; sem mascote no Leitor.

**Sessão (P6).** Interruptor "Modo Só Estudo" em vidro; chips de tempo que só informam (ativo em tinta cheia, inativo `--quente`); a tarefa ativa numa folha de cal com o botão de vidro; o estacionamento em `--quente`; o fechamento com o resumo em texto e um botão de vidro. Sem o mascote antigo (o cachorro em um traço só fica para o Resumo do Dia).

## Movimento

| O quê | Como |
|---|---|
| Pressionar, hover, foco | 120 a 160 ms, `ease-out`, só sombra e 1 px de deslocamento (nunca cor) |
| Ponto do Dia acendendo | 160 ms, `cubic-bezier(.2, .7, .2, 1)`, escala 0,6 a 1 e opacidade 0 a 1, uma vez |
| Folha subindo, aba trocando | 180 a 220 ms, `cubic-bezier(.2, .7, .2, 1)` |
| Caneta | muda de lugar por salto; nunca gira nem desliza |
| Traço do cachorro | 300 ms linear (`stroke-dashoffset`), uma vez, ao fechar o Dia |
| Entre rotas (F10) | View Transitions, fade de até 150 ms; **nunca** anima texto da lei nem remonta o Leitor; desligada com `prefers-reduced-motion` e no perfil Calmo |
| Carregando | `Esqueleto` com atraso de 150 ms; operações longas no padrão "andamento" (ver [`../planos/transicoes-e-carregamento.md`](../planos/transicoes-e-carregamento.md)) |

Proibido: brilho pulsando, lens flare, parallax, superfície iridescente, vidro desfocado atrás de texto, luz que acompanha o dedo, ciclo de dia e noite, confete, som. Com `prefers-reduced-motion`, os pontos aparecem acesos e o cachorro pronto; ordem, conteúdo e ação não mudam.

## Acessibilidade e robustez

- Contraste: texto 4,5:1, gráficos e contornos 3:1, nos dois temas e em cada fundo possível (inclusive na folha, na régua e sob o dock).
- Alvos de 44 px em botões, links isolados, linhas de lista, campos e abas (exceção: link dentro de frase corrida).
- Foco visível em tudo, com `--bloco-foco` dentro da folha; link "pular para o conteúdo"; atalhos mantidos.
- Texto quebra qualquer palavra longa (`overflow-wrap: anywhere` no conteúdo) e nenhuma tela rola na horizontal a 320 px nem a 200% de zoom.
- Transparência e movimento têm saída (`prefers-reduced-transparency`, `prefers-reduced-motion`, `forced-colors`).
- Cor nunca sozinha: tipo de tarefa, destaque, andamento, área atual, erro e "salvo" têm texto, ícone, peso ou estilo de linha.
- Caneta, pontos de luz decorativos e o cachorro: `aria-hidden`; o estado de cada ponto do Dia vem em texto acessível.

## Marca e mascote

- **Nome:** "Arretado" em Gabarito 700 (`--fonte-titulo`), com o pequeno cacto em vidro (`--cacto`) ao lado, na altura da caixa-alta. Sem martelo, balança nem outros clichês jurídicos.
- **A caneta-cacto de vidro** é o objeto da marca no app: ponteiro da retomada nas três poses; no app de loja, ícone sobre a areia (P7).
- **Mascote:** o cachorro em um traço só, caramelo pela cor, só no Resumo do Dia e no fim de rodada. O mascote antigo saiu do app na P2 (pedido do Gabriel, 18/10/2026); os desenhos ficam só como histórico em `docs/design/mascote/`.

## Mapa do código

| Parte | Onde |
|---|---|
| Tokens, base, botões, campos, abas, cartões, navegação, rodapé | `src/apresentacao/estilos.css` (cada fase seguinte move para o CSS do próprio pacote o que for da sua tela) |
| Fontes | `src/apresentacao/fontes/` (Gabarito, licença OFL); Atkinson e Literata de `node_modules/@fontsource*` |
| Casca (cabeçalho, navegação, "+", rodapé) | `src/apresentacao/Shell.tsx`, `componentes/TituloComMais.tsx` (o "+"), `componentes/teclado-aberto.ts` (teclado aberto), `componentes/MenuAjuda.tsx`; nomes das áreas em `textos.ts` (`ROTULO_DA_AREA`) |
| Hoje | `src/apresentacao/hoje/*`, `componentes/AcaoAgora.tsx`, `LinhaDepois.tsx`, `LinhaLista.tsx`; lógica pura em `src/dominios/hoje/` |
| Revisão e Fixar | `src/apresentacao/recall/*` (`Drill.tsx`, `RevisarFrases.tsx`, `RecallInicio.tsx`, listas) |
| Leitor e Biblioteca | `src/apresentacao/biblioteca/*` |
| Trilha | `src/apresentacao/plano/*` (`pontos/`, `tarefas/`, `onboarding/`) |
| Conta, Sessão e Orientações | `src/apresentacao/conta/*`, `src/apresentacao/sessao/*`, `src/apresentacao/orientacoes/*` (`estilos-orientacoes.css`: `.documento`, `.indice-de-secoes`); ícone, voltar e linha de lista em `componentes/Icone.tsx`, `Voltar.tsx` e `LinhaLista.tsx` |
| Contraste | `scripts/contraste.mjs`, `scripts/contraste.test.ts` |
| Capturas e medidas | `scripts/capturas-ui.mjs` |

## Como conferir

1. `npm run check` (lint, tipos, testes, auditoria) e o E2E da tela tocada, com axe nos dois temas.
2. `npm run build && node scripts/capturas-ui.mjs --rotas todas --medir --folhas`: fotografa as rotas × 3 aparelhos × 2 temas e mede rolagem horizontal, alvos de 44 px e texto sob as abas de baixo no fim da página. `--zoom 2` repete a 200%.
3. Comparar com as capturas do protótipo em [`referencias/2026-10-18-ponto-de-luz/`](referencias/2026-10-18-ponto-de-luz/) e com o contrato (tese, forma, acabamento, interação, padrões permitidos).
4. Em cada PR de fase: folhas "antes e depois" da tela, tema claro e escuro, celular, tablet e desktop, em `docs/redesign/ponto-de-luz/<fase>/`.
