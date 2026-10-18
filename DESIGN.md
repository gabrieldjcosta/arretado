---
name: Arretado
description: Plataforma de estudo para concursos jurídicos, clara e calma, que leva a pessoa de volta ao ponto onde parou e mostra uma coisa por vez.
colors:
  areia: '#f1e6d3'
  areia-funda: '#e7d8be'
  cal: '#ffffff'
  tinta: '#17243a'
  tinta-2: '#4f5b70'
  vidro: '#0f7f72'
  vidro-texto: '#0a6157'
  luz: '#6fe3d6'
  traco: '#c8742f'
  borda-campo: '#727c8f'
  perigo: '#a4262c'
  aviso-fundo: '#fff4d6'
  aviso-texto: '#4d3800'
  noite: '#0b1b33'
  noite-funda: '#07152a'
  noite-folha: '#142a4a'
  noite-quente: '#1c375d'
  noite-tinta: '#eef3f8'
  noite-tinta-2: '#a9b7cc'
  noite-vidro: '#7df3e1'
  noite-traco: '#ffb46b'
typography:
  titulo-pagina:
    fontFamily: 'Gabarito, Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  marca:
    fontFamily: 'Gabarito, Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '1.1875rem'
    fontWeight: 700
    letterSpacing: '-0.01em'
  titulo-folha:
    fontFamily: 'Gabarito, Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 750
    lineHeight: 1.12
  secao:
    fontFamily: 'Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.25
  corpo:
    fontFamily: 'Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  botao:
    fontFamily: 'Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 600
    letterSpacing: '-0.01em'
  leitura-da-lei:
    fontFamily: 'Literata, Georgia, serif'
    fontSize: '18px'
    fontWeight: 400
  dica:
    fontFamily: 'Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 400
rounded:
  botao: '12px'
  campo: '12px'
  cartao: '16px'
  folha: '16px'
  pilula: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  xxl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.vidro}'
    textColor: '{colors.cal}'
    rounded: '{rounded.botao}'
    padding: '0 20px'
    height: '44px'
  button-secondary:
    backgroundColor: '{colors.cal}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.botao}'
    padding: '0 20px'
    height: '44px'
  card:
    backgroundColor: '{colors.cal}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.cartao}'
    padding: '20px'
  folha-agora:
    backgroundColor: '{colors.cal}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.folha}'
    padding: '20px'
  field:
    backgroundColor: '{colors.cal}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.campo}'
    padding: '10px 14px'
    height: '48px'
  nav-item-current:
    backgroundColor: '{colors.cal}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.pilula}'
    height: '44px'
---

# Design System: Arretado

## Overview

**Creative North Star: "Ponto de luz"**

A luz do sertão como tinta: areia clara, uma folha de cal com sombra fresca, e a caneta-cacto de vidro descansando exatamente onde a pessoa parou, com um ponto de luz na ponta. O sertão aqui é lugar de luz, energia e prova (eólica e solar no interior, o eclipse de Sobral), não a lista "seca, cangaço, cordel"; e o futuro dele acontece de dia claro, longe do marinho quase preto com neon que é o uniforme da categoria. Em vez de uma interface que cobra, há um chão calmo onde só uma coisa sobe: a folha do que fazer agora, com um botão de vidro. A sensação-alvo é ânimo e clareza, sem barulho: nada pisca, nada acusa, nada se acumula como dívida.

O sistema é claro e firme. O chão é areia lisa, sem textura; a profundidade vem só da sombra fresca da folha. Os títulos usam a Gabarito (geométrica, feita por fundição brasileira para uma plataforma de ensino, com o nome da folha de respostas); a interface usa a Atkinson Hyperlegible, desenhada para leitura difícil; a lei fica na Literata. A cor tem papel: vidro é a ação, cal é "onde estou", tinta é o texto e o marcado, a luz só reporta estado. Vermelho só para excluir e para falha técnica, nunca no estudo.

Estado desta descrição: a base (tokens, letras, botões, campos, cartões, folha do Agora, área e aba atuais, Estrela de luz) está no código desde a fase P1 de [`docs/planos/ponto-de-luz.md`](docs/planos/ponto-de-luz.md). A casca (abas sobre a areia com a atual em cal, "+" na linha do título), os pontos do Dia, a caneta nas três poses e o traço do cachorro são o destino das fases P2 a P7 e estão descritos aqui como regra, mesmo onde o código ainda não chegou. Decisão: D-D7 em [`docs/design/decisoes-design.md`](docs/design/decisoes-design.md); contrato: [`docs/design/referencias/2026-10-18-ponto-de-luz/contrato.md`](docs/design/referencias/2026-10-18-ponto-de-luz/contrato.md).

**Key Characteristics:**

- Uma ação dominante por tela: um botão de vidro, e só um.
- A folha de cal como lugar de foco; o resto da tela é areia, calma e lisa.
- Calor sem pressão: sem streak, sem vermelho no estudo, sem contagem de dívida.
- Legibilidade acima de efeito: texto mínimo de 13 px, alvos de 44 px, contraste AA medido em script.
- Local-first e offline: fontes hospedadas no próprio app, nada de CDN.

## Colors

Uma paleta de dia claro (areia, cal, vidro) com uma tinta azul-sombra que ancora o texto, e um ponto de luz que só aparece para dizer o estado. À noite, o mesmo mundo no azul fundo.

### Primary

- **Vidro** (#0f7f72): a ação. Fundo do botão primário, com texto branco (4,9:1); o cacto da marca e o andamento. O "+" não é vidro: é cal com tinta. À noite, **Vidro claro** (#7df3e1) com o texto da noite (#0b1b33). Um por tela.
- **Vidro texto** (#0a6157): link e texto de "salvo" (5,9:1 na areia). À noite, o vidro claro.

### Secondary

- **Cal** (#ffffff): a folha. Folha do Agora, cartões, campos, a área e a aba atuais e o lido no Leitor. É "onde estou". À noite, **Folha da noite** (#142a4a).
- **Tinta** (#17243a): texto, títulos, foco, caixa marcada e o contorno de todo ponto de luz (12,6:1 na areia). À noite, #eef3f8.

### Tertiary

- **Luz** (#6fe3d6): pontos do Dia, Estrela e ponta da caneta. Nunca texto, sempre com contorno na tinta e núcleo branco. À noite, #7df3e1.
- **Traço** (#c8742f): só o traço do cachorro (à noite, #ffb46b). Caramelo nunca é cor de interface.

### Neutral

- **Areia** (#f1e6d3): o chão da página, do cabeçalho e da barra das áreas. Liso, sem textura. À noite, **Noite** (#0b1b33).
- **Areia funda** (#e7d8be): trilho das abas, selo, faixa quente e trilho do andamento. À noite, #07152a (trilho) e #1c375d (faixa quente).
- **Tinta 2** (#4f5b70): texto atenuado (5,5:1 na areia). À noite, #a9b7cc.
- **Borda de campo** (#727c8f): contorno de campo (3,4:1 na areia, 4,2:1 na cal); a borda de cartão é tinta a 12%.
- **Perigo** (#a4262c): só excluir e falha técnica.
- **Aviso** (fundo #fff4d6, texto #4d3800): aviso discreto.

### Named Rules

**The Um Vidro Rule.** Vidro é a única cor de ação e aparece num botão por tela. Se dois botões disputam o vidro, um deles é secundário (cal com contorno).

**The Cal Onde Estou Rule.** Cal sobre a areia é "onde estou": a folha do Agora, a área e a aba atuais (com a sombra fresca e o rótulo em negrito), o lido no Leitor. Marcado (caixa, rádio, botão ligado) é tinta cheia com a marca em cal.

**The Luz Só Reporta Rule.** A luz diz um estado real (feito, atual, falta; Estrela) ou marca a ponta da caneta. Nunca pulsa, nunca segue o dedo nem a rolagem, nunca é texto, nunca aparece sem o contorno na tinta.

**The Matéria Em Neutro Rule.** A matéria se identifica pelo nome, em neutro: sem cor por disciplina, sem faixa colorida na borda, sem couro nem caramelo.

**The Sem Vermelho No Estudo Rule.** Vermelho é de excluir e de falha técnica. Erro de estudo, atraso e revisão pendente nunca ficam vermelhos.

## Typography

**Display Font:** Gabarito (variável, 400 a 900, com Atkinson e system-ui), hospedada no app
**Body Font:** Atkinson Hyperlegible Next (com system-ui, sans-serif), pesos 400, 500 e 700
**Reading Font:** Literata (com Georgia, serif), variável, só para a letra da lei e o texto do Leitor

**Character:** Uma geométrica clara e firme nos títulos e na marca encontra uma sans desenhada para legibilidade na interface; a lei fica numa serifa de leitura longa. A Gabarito não aparece em texto corrido nem em rótulos pequenos.

### Hierarchy

- **Display** (Gabarito 800, 1.875rem, 1.1, -0.02em): título de página (H1); 2.125rem no tablet, 2.375rem no desktop. A marca "Arretado" em Gabarito 700, 1.1875rem. Cor de título: tinta.
- **Headline** (Gabarito 750, 1.5rem, 1.12): título da folha do Agora e do Resumo do Dia.
- **Title** (Atkinson 700, 1.25rem, 1.25): seções (H2); H3 em 1.0625rem.
- **Body** (Atkinson 400, 1rem, 1.5): texto da interface. A lei usa Literata de 18 px (ajustável), medida de até 70ch e sem itálico.
- **Label** (Atkinson 600, 0.9375rem, -0.01em): botões; 1.0625rem no botão grande da folha. Dicas e etiquetas ficam em 0.8125rem (13 px) ou mais.

### Named Rules

**The Piso De 13 Rule.** Nenhum texto abaixo de 0.8125rem (13 px). Caixa-alta com espaçamento de letras só em etiqueta ("Em seguida").

**The Lei Sem Itálico Rule.** A lei não vai em itálico e o destaque dela é sublinhado, nunca fundo. Prazos, condições, termos absolutos e penas têm sublinhados distintos (#173f52, #b06f22, #a5582a).

**The Título Com Razão Rule.** Gabarito só em títulos e marca, porque tem razão registrada (ensino, folha de respostas). "Sem serifa" troca só a letra da lei.

## Layout

Um conteúdo de coluna única de até 900 px, centrado, com respiro generoso, e a lei em até 70ch. Escala de espaço de 4 em 4 (4, 8, 16, 24, 32, 48 px). Três larguras: celular até 699 px, tablet em pé de 700 a 899 px e desktop a partir de 900 px. No celular e no tablet em pé as abas das áreas ficam embaixo; no desktop, no cabeçalho.

Destino (P2): cabeçalho na areia com a marca, Ajuda e Conta; abas Hoje · Trilha · Fixar · Biblioteca sobre a areia, com ícone e rótulo de 13 px ou mais e a atual em cal; o título da página leva o "+" redondo em cal na mesma linha, nas telas que criam algo. No Hoje (P3), a ordem é: título com "+", pontos do Dia, linha de parada com a caneta, folha do Agora, "Em seguida". O rodapé legal fica no fim do conteúdo e a rolagem reserva espaço para as abas.

Alvos de toque de pelo menos 44 px (campos em 48). Nenhuma tela rola na horizontal a 390 px; palavras longas quebram (`overflow-wrap: anywhere`).

## Elevation & Depth

Plano, com um só degrau de luz: o chão de areia, a cal por cima. A profundidade vem da **sombra fresca** da folha, uma sombra curta e azulada de sol a pino, e do halo na ponta da caneta (que cresce só à noite). Sem textura, sem vidro desfocado, sem iridescência, sem gradiente fora da caneta.

### Shadow Vocabulary

- **Folha** (`0 14px 28px -10px rgb(23 36 58 / 16%), 0 1px 0 rgb(23 36 58 / 16%)`): a folha do Agora e as folhas que sobem (Resumo do Dia).
- **Cartão** (`0 1px 2px rgb(23 36 58 / 6%), 0 6px 16px -10px rgb(23 36 58 / 16%)`): cartões comuns, mais baixa que a folha.
- **Atual** (`0 4px 12px -4px rgb(23 36 58 / 16%)`): área e aba atuais, em cal.
- **Botão** (`0 2px 6px rgb(23 36 58 / 14%)`): botão primário.
- **Flutuante** (`0 4px 16px rgb(23 36 58 / 14%)`): dock do Leitor, diálogos e o que flutua sobre o texto.

### Named Rules

**The Sem Vidro Desfocado Rule.** Vidro é objeto (a caneta) e cor de ação, nunca superfície desfocada atrás de texto. Só o dock do Leitor e os botões do modo foco têm transparência, e é função, não enfeite.

## Shapes

Firme e claro, em degraus: botões e campos em 12 px, cartões e a folha em 16 px, abas e navegação em pílula (999 px). Contornos de 1 px nos cartões e de 1,5 px nos campos. A caneta, os pontos de luz, a Estrela e o traço do cachorro são vetores; a caneta é o único objeto com volume e o único lugar com gradiente.

## Components

### Buttons

- **Shape:** cantos de 12 px, altura de 44 px, texto em Atkinson 600 de 15 px.
- **Primary:** fundo vidro, texto branco (à noite, vidro claro com o texto da noite), sem borda. Um por tela; largura total e 52 px de altura na folha do Agora. Compacto fora dela.
- **Secondary:** fundo cal, contorno de 1 px, texto tinta.
- **Hover / Focus:** o primário escurece 14% em direção à tinta no hover (só com ponteiro) e desce 1 px ao ser pressionado, com transição de 140 ms só de transformação e sombra (nunca de cor); anel de foco de 2 px com 2 px de recuo, tinta no dia e vidro claro à noite.
- **Ghost (botão-texto):** sem caixa, sublinhado, ao lado do primário ("Escolher outra coisa"). **Perigoso:** contorno vermelho; cheio só dentro do diálogo de confirmação.

### Chips and Tabs

- **Abas:** trilho em pílula na areia funda, rolável na horizontal; a aba atual é cal com a sombra fresca, texto tinta e peso 700.
- **Selo:** pílula na areia funda com texto tinta.
- **Matéria:** pelo nome, em neutro.

### Cards / Containers

- **Cartão:** cal, raio de 16 px, borda de 1 px (tinta a 12%), sombra de cartão, 20 px de respiro.
- **Folha do Agora:** cal com a sombra fresca, raio 16, texto tinta; título em Gabarito 750, motivo e tempo em tinta 2, um botão de vidro de 52 px "Continuar" e o botão-texto "Escolher outra coisa". A caneta encostada na borda de cima à direita (P3); nenhum mascote.
- **Pontos do Dia (P3):** Leitura, Cartões e Frases, cada um com um ponto de luz de 22 px: apagado (anel na tinta a 45%), aceso pela metade (atual), aceso (feito), com o rótulo em texto. O ponto acende uma vez em 160 ms.
- **Em seguida:** até 2 itens, título em negrito e tempo em 13 px, sobre a areia.

### Inputs / Fields

- **Style:** altura 48, contorno de 1,5 px em #727c8f, raio de 12 px, fonte de pelo menos 16 px, rótulo sempre visível.
- **Focus:** o anel de foco padrão. **Placeholder:** tinta a 70% ou mais. **Caixa e rádio:** marca de 22 px num rótulo de 44; marcada = tinta cheia com a marca em cal.

### Navigation

- **Destino (P2):** abas sobre a areia no celular e no tablet em pé; no alto a partir de 900 px. Quatro áreas: Hoje, Trilha, Fixar, Biblioteca, com ícone e rótulo. A atual em cal, com a sombra fresca e o rótulo em negrito.
- **Hoje no código:** barra fixa embaixo na areia com as quatro áreas (rótulos Plano e Recall) e a atual em cal; cabeçalho na areia com a marca "Arretado" (Gabarito) e o cacto em vidro, "Registrar erro", Ajuda e Conta; o "+" flutuante no celular, em cal com tinta.

### Leitor da lei (signature)

Coluna de 70 ch em Literata, fundo liso, controles de tamanho (A-, 18 px, A+), legenda recolhível de sublinhados, régua de leitura em tinta (segue o dedo; a luz nunca segue), dock com Buscar, Filtrar, Foco e "Lido até aqui", e um modo foco com penumbra. A Estrela é a estrela de luz com contorno na tinta, com herança por bloco (direta, herdada, exceção) e a faixa da calha em vidro. Destino (P4): o lido sobre a faixa de cal e a caneta deitada em "Lido até aqui". Sem mascote.

### A caneta (signature)

Coluna de vidro com dois braços, do ciano ao verde (#dffcff, #9af0dc, #5fcf8f, #2b8f5e, #17422f), brilho de borda, três pontos de luz nas pontas dos membros e a ponta cônica escura com o ponto de luz. Três poses fixas: encostada a 35° na folha do Agora (Hoje; no Fixar, no Cartão atual), deitada a 65° ao fim de "Lido até aqui" (Leitor), largada ao fim do traço do cachorro (Resumo do Dia e fim de rodada). Muda de lugar por salto, nunca gira nem desliza. Nunca botão, painel, fundo de texto, nem mais de uma por tela. Decorativa (`aria-hidden`).

### O cachorro

Um traço só, caramelo pela cor, orelha semiereta, focinho e olho como pontos, lenço em V; só no Resumo do Dia e no fim de rodada. Ao fechar o Dia, desenha-se uma vez em 300 ms (com `prefers-reduced-motion`, aparece pronto). Decorativo.

## Do's and Don'ts

### Do:

- **Do** manter um só botão de vidro por tela, e dar a ele o texto de uma ação ("Continuar", "Começar").
- **Do** usar cal para "onde estou", tinta para o texto e o marcado, a luz só para estado.
- **Do** mostrar onde a pessoa parou (a Norma e o Dispositivo exatos) e que está tudo salvo.
- **Do** medir todo par de cor novo em `scripts/contraste.mjs` nos dois temas antes de usar.
- **Do** respeitar `prefers-reduced-motion` (pontos acesos e cachorro pronto) e `prefers-contrast`. Movimento de 160 a 220 ms, `cubic-bezier(.2, .7, .2, 1)`, só quando explica.
- **Do** hospedar fontes e ícones no próprio app; o app funciona offline.

### Don't:

- **Don't** usar vermelho, perda de sequência, culpa ou urgência para motivar. "Vencido" é linguagem de dívida: prefira "para hoje".
- **Don't** pôr textura, foto, 3D, vidro desfocado, iridescência, gradiente em texto, brilho pulsando, lens flare, parallax, confete ou som.
- **Don't** usar a luz como texto, sem contorno, pulsando ou seguindo o dedo; nem mais de uma caneta por tela.
- **Don't** dar cor própria a uma disciplina, faixa colorida na borda de cartão, item ou aviso, nem usar couro ou caramelo como cor de interface.
- **Don't** usar glifos Unicode (✓, ⓘ) como ícone; os ícones são SVG desenhados num só traço.
- **Don't** usar texto abaixo de 13 px nem alvo abaixo de 44 px.
- **Don't** carregar fonte ou ícone de CDN (quebra o offline e envia o IP da pessoa a terceiros).
- **Don't** renderizar HTML colado sem sanitizar, nem aplicar rótulo clínico ou de diagnóstico em qualquer tela.
