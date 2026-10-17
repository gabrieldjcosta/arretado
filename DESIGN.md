---
name: Arretado
description: Plataforma de estudo para concursos jurídicos, quente e calma, que leva a pessoa de volta ao ponto onde parou e mostra uma coisa por vez.
colors:
  creme: '#fff8ec'
  marinho: '#14213d'
  sol: '#ffb627'
  argila: '#c8763a'
  verde-foco: '#2fa36b'
  verde-foco-texto: '#268256'
  azul-ceu: '#3ba7f0'
  superficie: '#ffffff'
  superficie-quente: '#fff9ef'
  texto-atenuado: '#4f596e'
  borda-campo: '#7b8599'
  ponto-fundo: '#d6c9b3'
  link: '#963417'
  perigo: '#a4262c'
  aviso-fundo: '#fff4d6'
  aviso-texto: '#4d3800'
  estrela: '#9a6200'
  noite: '#0c1527'
  noite-cartao: '#1b2a47'
  noite-bloco: '#223559'
  noite-texto-atenuado: '#a8b5cc'
  bloco-atenuado: '#b0b8c6'
typography:
  titulo-pagina:
    fontFamily: 'Playfair Display, Georgia, serif'
    fontSize: '1.75rem'
    fontWeight: 700
    lineHeight: 1.15
  marca:
    fontFamily: 'Playfair Display, Georgia, serif'
    fontSize: '1.25rem'
    fontWeight: 700
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
  botao: '14px'
  campo: '14px'
  cartao: '16px'
  heroi: '28px'
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
    backgroundColor: '{colors.sol}'
    textColor: '{colors.marinho}'
    rounded: '{rounded.botao}'
    padding: '0 20px'
    height: '44px'
  button-secondary:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.marinho}'
    rounded: '{rounded.botao}'
    padding: '0 20px'
    height: '44px'
  card:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.marinho}'
    rounded: '{rounded.cartao}'
    padding: '20px'
  hero-card:
    backgroundColor: '{colors.marinho}'
    textColor: '{colors.creme}'
    rounded: '{rounded.heroi}'
    padding: '20px'
  field:
    backgroundColor: '{colors.superficie}'
    textColor: '{colors.marinho}'
    rounded: '{rounded.campo}'
    padding: '10px 14px'
    height: '48px'
  nav-item-current:
    backgroundColor: '{colors.marinho}'
    textColor: '{colors.creme}'
    rounded: '{rounded.pilula}'
    height: '44px'
---

# Design System: Arretado

## Overview

**Creative North Star: "O Sertão de Estudo"**

O Arretado é feito para quem precisa de calor para começar e de firmeza para continuar. O "arretado" nordestino vira linguagem visual: sol, argila e cacto sobre um creme de papel, com um Marinho fundo no lugar do céu da noite. Em vez de uma interface que cobra, há um lugar onde a pessoa chega, vê uma coisa só no centro (o bloco Marinho com o botão Sol) e sabe que o ponto onde parou está guardado. A sensação-alvo é ânimo e conforto, sem barulho: nada pisca, nada acusa, nada se acumula como dívida.

O sistema é macio e convidativo. Os cantos são generosos, o fundo tem pontinhos discretos de papel pontilhado, os títulos usam uma serifa de caráter (Playfair Display) e o mascote vetorial senta na borda do cartão principal como coadjuvante. A leitura da lei, que é a parte densa, continua em Literata sobre fundo liso, e a interface em Atkinson Hyperlegible, desenhada para leitura difícil. A cor tem papel: Sol é a ação, Marinho é onde estou, verde é o que está guardado, Argila identifica a matéria. Vermelho só aparece para excluir e para falha técnica, nunca no estudo.

Estado desta descrição: a base (tokens, tipografia, botões, campos, cartões, fundo) já está no código (`src/apresentacao/estilos.css`, fatia F1b da D-D5). A casca e as telas (navegação em pílula flutuante, "+" na linha do título, cartão Agora do Stitch, rótulos Trilha, Fixar e Em seguida) são o destino da D-D5 (fatias F2, F3 e F12) e estão descritas aqui como regra, mesmo onde o código ainda não chegou. Hoje o código tem barra de baixo reta, os rótulos Plano, Recall e Depois (raios, cores e tipografia já estão na D-D5 e na D-D6).

**Key Characteristics:**

- Uma ação dominante por tela: um botão Sol, e só um.
- Bloco Marinho como lugar de foco; o resto da tela é Creme, calmo e liso.
- Calor sem pressão: sem streak, sem vermelho no estudo, sem contagem de dívida.
- Legibilidade acima de efeito: texto mínimo de 13 px, alvos de 44 px, contraste AA medido em script.
- Local-first e offline: fontes hospedadas no próprio app, nada de CDN.

## Colors

Uma paleta quente de dia (Creme, Sol, Argila) com um Marinho profundo que ancora o foco, e um verde que só diz "está salvo" ou "este é o lugar".

### Primary

- **Sol** (#ffb627): a ação. Fundo do botão primário, com texto Marinho; no tema escuro e dentro do bloco Marinho é a cor de foco e de link. Um por tela.

### Secondary

- **Marinho** (#14213d): texto, títulos, bloco-herói (cartão Agora), item e aba selecionados, anel de foco no claro. É "onde estou".
- **Verde-foco** (#2fa36b): ponto de Frases, "+", "salvo", progresso. Como texto, usar o passo escuro Verde-foco texto (#268256, 4,5:1 sobre Creme); o verde claro vale só como gráfico e ícone.

### Tertiary

- **Argila** (#c8763a): etiqueta de matéria, com texto Marinho (4,7:1). Nunca texto branco sobre Argila (3,4:1).
- **Azul-céu** (#3ba7f0): ponto de Cartões, com ícone Marinho (branco daria 2,6:1).

### Neutral

- **Creme** (#fff8ec): fundo da página, com pontinhos Ponto de fundo (#d6c9b3, 0,75 px a cada 16 px) só no `body`.
- **Superfície** (#ffffff) e **Superfície quente** (#fff9ef): cartões, campos e trilho das abas.
- **Texto atenuado** (#4f596e): texto secundário sobre Creme e sobre superfície.
- **Borda de campo** (#7b8599): contorno de campos (3:1 ou mais); a borda de cartão é Marinho a 12%.
- **Link** (#963417): link de texto no claro, uma terra queimada com sublinhado fino. Nunca verde.
- **Perigo** (#a4262c): só excluir e falha técnica.
- **Aviso** (fundo #fff4d6, texto #4d3800) e **Estrela** (#9a6200): aviso discreto e a marca de importância.
- **Noite** (#0c1527), **Noite cartão** (#1b2a47) e **Noite bloco** (#223559): tema escuro sobre o Marinho; fundo, superfície e bloco-herói (mais claro que o fundo). Texto Creme, atenuado #a8b5cc, pontinhos brancos a 8%. Dentro do bloco Marinho o texto secundário é #b0b8c6.

### Named Rules

**The Um Sol Rule.** Sol é a única cor de ação e aparece num botão por tela. Se dois botões disputam o Sol, um deles é secundário.

**The Verde Guardado Rule.** Verde é "está salvo" e "este é o lugar", nunca ação nem aviso. Verde como texto usa sempre o passo escuro.

**The Matéria Em Argila Rule.** A matéria se identifica por uma etiqueta Argila com texto Marinho, nunca por um tom de cor por disciplina nem por faixa colorida na borda.

**The Sem Vermelho No Estudo Rule.** Vermelho é de excluir e de falha técnica. Erro de estudo, atraso e revisão pendente nunca ficam vermelhos.

## Typography

**Display Font:** Playfair Display (com Georgia, serif), pesos 600 e 700, hospedada no app
**Body Font:** Atkinson Hyperlegible Next (com system-ui, sans-serif), pesos 400, 500 e 700
**Reading Font:** Literata (com Georgia, serif), variável, só para a letra da lei e o texto do Leitor

**Character:** Uma serifa de caráter calorosa nos títulos e na marca encontra uma sans desenhada para legibilidade na interface; a lei fica numa serifa de leitura longa. O Playfair não aparece em texto corrido nem em rótulos pequenos.

### Hierarchy

- **Display** (Playfair 700, 1.75rem, 1.15): título de página (H1) e a marca "Arretado" (1.25rem). Cor de título: Marinho no claro, Creme no escuro.
- **Headline** (Playfair 600/700, ~1.3rem, 1.25): título do cartão Agora e dos blocos-herói.
- **Title** (Atkinson 700, 1.25rem, 1.25): seções (H2); H3 em 1.0625rem.
- **Body** (Atkinson 400, 1rem, 1.5): texto da interface. O texto da lei usa Literata de 18 px (ajustável), medida de até 70ch e sem itálico.
- **Label** (Atkinson 600, 0.9375rem, -0.01em): botões. Dicas e etiquetas ficam em 0.8125rem (13 px) ou mais.

### Named Rules

**The Piso De 13 Rule.** Nenhum texto abaixo de 0.8125rem (13 px). Caixa-alta com espaçamento de letras só em etiqueta.

**The Lei Sem Itálico Rule.** A lei não vai em itálico e o destaque dela é sublinhado, nunca fundo. Prazos, condições, termos absolutos e penas têm sublinhados distintos (#173f52, #b06f22, Argila).

**The Serifa De Título Rule.** Playfair só em títulos e marca; a preferência de fonte "sem serifa" do Conta troca também os títulos.

## Layout

Um conteúdo de coluna única de até 900 px, centrado, com respiro generoso, e a lei em até 70ch. Escala de espaço de 4 em 4 (4, 8, 16, 24, 32, 48 px). Três larguras: celular até 699 px, tablet em pé de 700 a 899 px e desktop a partir de 900 px. No celular e no tablet em pé a navegação principal fica embaixo; no desktop, no cabeçalho.

Destino da D-D5: no celular, a navegação é uma pílula flutuante Marinho com Hoje, Trilha, Fixar e Biblioteca (ícone e rótulo de 13 px ou mais), e vira barra no alto a partir de 700 px. O título da página leva o "+" redondo verde na mesma linha, nas telas que criam algo. No Hoje, o desktop usa duas colunas (7 por 5). O rodapé legal fica no fim do conteúdo e a rolagem reserva espaço para a navegação (o "+" nunca cobre texto). Hoje, no código, a navegação é uma barra reta fixa de 3,25 rem com safe-area.

Alvos de toque de pelo menos 44 px (campos em 48). Nenhuma tela rola na horizontal a 390 px; palavras longas quebram (`overflow-wrap: anywhere`).

## Elevation & Depth

Híbrido e discreto: profundidade vem de camadas tonais (Creme, superfície branca, bloco Marinho) com sombras suaves e baixas, só em cartões e botões. A borda do cartão (Marinho a 12%) e a sombra não se somam como um halo: o cartão usa a sombra para sair do fundo e a borda fina para definir o contorno. Pontinhos do fundo nunca passam para cartões, campos, Leitor, revisão nem Sessão, que ficam lisos.

### Shadow Vocabulary

- **Cartão** (`0 6px 20px -10px rgb(20 33 61 / 18%), 0 1px 3px rgb(20 33 61 / 8%)`): cartões e bloco-herói.
- **Botão** (`0 2px 6px rgb(20 33 61 / 14%)`): botão primário.
- **Flutuante** (`0 4px 16px rgb(20 33 61 / 12%)`): navegação flutuante, folhas e itens sobre o texto.

### Named Rules

**The Sem Vidro Rule.** Nada de vidro nem desfoque decorativo. Só o dock do Leitor e os botões do modo foco têm transparência, e é função, não enfeite.

## Shapes

Macio e acolhedor, em degraus: botões e campos em 14 px, cartões em 16 px, o bloco-herói em 28 px, navegação e abas em pílula (999 px). Contornos de 1 px nos cartões e de 1,5 px nos campos e no botão Sol sobre fundo claro. O mascote e o cacto são vetores simples; os cactos decorativos ficam fora do caminho da leitura. Sem faixa colorida na borda de cartões, itens de lista ou avisos (a única faixa permitida é o filete cinza neutro de citação).

## Components

### Buttons

- **Shape:** cantos de 14 px, altura de 44 px, texto em Atkinson 600 de 15 px.
- **Primary:** fundo Sol, texto Marinho, borda Marinho de 1,5 px quando está sobre fundo claro (sem borda dentro do bloco Marinho). Um por tela; largura total só em cartão e formulário. Compacto.
- **Secondary:** fundo da superfície, contorno de 1 px, texto Marinho.
- **Hover / Focus:** o primário escurece 12% em direção ao Marinho no hover (só com ponteiro) e desce 1 px ao ser pressionado, com transição de 140 ms só de transformação e sombra; anel de foco de 2 px com 2 px de recuo, Marinho no claro e Sol no escuro e dentro de bloco Marinho.
- **Ghost (botão-texto):** sem caixa, sublinhado, ao lado do primário ("Trocar tarefa"). **Perigoso:** contorno vermelho; cheio só dentro do diálogo de confirmação.

### Chips and Tabs

- **Abas:** trilho em pílula na superfície quente, rolável na horizontal; a aba atual é um bloco Marinho com texto Creme e peso 700.
- **Etiqueta de matéria:** pílula Argila com texto Marinho. Pontos de tipo: verde para Frases, azul para Cartões.

### Cards / Containers

- **Cartão:** superfície branca (no destino, branca translúcida), raio de 16 px, borda de 1 px, sombra de cartão, 20 px de respiro, 16 px de margem abaixo.
- **Bloco-herói (cartão Agora):** Marinho (Noite bloco no escuro), texto Creme, raio de 28 px, mascote sentado na borda de cima; etiqueta de matéria, título serifado, trecho da lei em caixa translúcida e um botão Sol "Avançar um tiquinho →".
- **Por estado:** Estudando (Marinho com Sol), Distraído (creme com filete Argila e linhas de ação), Sorrindo (cartão claro com ponto verde, sem sequência), Determinado (Marinho com Sol e as revisões prontas).
- **Em seguida:** até 2 itens numa linha do tempo com ponto de tipo e duração em chip.

### Inputs / Fields

- **Style:** altura 48, contorno de 1,5 px em #7b8599, raio de 14 px, fonte de pelo menos 16 px, rótulo sempre visível.
- **Focus:** o anel de foco padrão. **Placeholder:** Marinho a 70% ou mais. **Caixa e rádio:** marca de 22 px num rótulo de 44.

### Navigation

- **Destino:** pílula flutuante Marinho no celular e no tablet em pé; barra no alto a partir de 700 px. Quatro áreas: Hoje, Trilha, Fixar, Biblioteca, com ícone e rótulo. Item atual em destaque (Marinho com Creme, ou Sol sobre a pílula Marinho).
- **Hoje no código:** barra fixa embaixo com as quatro áreas e item atual em Marinho; cabeçalho com a marca "Arretado" (Playfair, sem ponto final) e o cacto verde e botão Conta.

### Leitor da lei (signature)

Coluna de 70 ch em Literata, fundo liso, controles de tamanho (A-, 18 px, A+), legenda recolhível de sublinhados, régua de leitura em Sol a 20%, dock com Buscar, Filtrar, Foco e "Lido até aqui", e um modo foco com penumbra. A Estrela é um botão com herança por bloco (direta, herdada, exceção). Sem mascote.

## Do's and Don'ts

### Do:

- **Do** manter um só botão Sol por tela, e dar a ele o texto de uma ação ("Começar", "Avançar um tiquinho").
- **Do** usar Marinho para "onde estou", verde para "está guardado", Argila só na etiqueta de matéria.
- **Do** mostrar a linha de calma "Seu ponto está salvo neste aparelho" onde houver ponto de retomada.
- **Do** medir todo par de cor novo em `scripts/contraste.mjs` nos dois temas antes de usar.
- **Do** respeitar `prefers-reduced-motion` e `prefers-contrast: more` (que tira os pontinhos). Movimento só quando explica, de 150 a 220 ms.
- **Do** hospedar fontes e ícones no próprio app; o app funciona offline.

### Don't:

- **Don't** usar vermelho, perda de sequência, culpa ou urgência para motivar. "Vencido" é linguagem de dívida: prefira "para hoje".
- **Don't** pôr faixa colorida na borda de cartão, item ou aviso, nem um tom de cor por disciplina.
- **Don't** usar vidro, gradiente em texto, mascote em toda tela ou mascote durante a revisão e o Leitor.
- **Don't** usar glifos Unicode (✓, ⓘ) como ícone; os ícones são SVG desenhados num só traço.
- **Don't** usar texto abaixo de 13 px, alvo abaixo de 44 px, texto branco sobre Argila, Azul-céu ou Verde-foco, nem Sol sobre Creme sem borda Marinho.
- **Don't** carregar fonte ou ícone de CDN (quebra o offline e envia o IP da pessoa a terceiros).
- **Don't** renderizar HTML colado sem sanitizar, nem aplicar rótulo clínico ou de diagnóstico em qualquer tela.
