---
name: Arretado
description: Plataforma de estudo para concursos jurídicos, clara e calma, que leva a pessoa de volta ao ponto onde parou e mostra uma coisa por vez, em dois mundos: o dia de tinta sobre papel e a noite de mandacaru.
colors:
  papel: '#f6f8fb'
  folha: '#ffffff'
  tinta: '#0f1c3a'
  tinta-2: '#4a5878'
  tinta-funda: '#0a1428'
  contorno: '#6e7a96'
  linha: '#838fa7'
  filete: '#dde2ea'
  marca: '#eefa4b'
  n-noite: '#0b1322'
  n-serra: '#131d31'
  n-serra-2: '#1c2942'
  n-texto: '#eef2fa'
  n-texto-2: '#a4b1cb'
  n-luz: '#f2f6ff'
  n-ambar: '#ffc53d'
  n-borda: '#34425e'
  n-linha: '#5c6b8c'
  n-vidro: '#9db7e8'
  perigo: '#a4262c'
  aviso-fundo: '#fff4d6'
  aviso-texto: '#4d3800'
typography:
  titulo-pagina:
    fontFamily: "'Schibsted Grotesk', 'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: '1.875rem'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  titulo-pagina-noite:
    fontFamily: "'Familjen Grotesk', 'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  titulo-folha:
    fontFamily: "'Schibsted Grotesk', 'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: '1.625rem'
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: '-0.02em'
  titulo-folha-noite:
    fontFamily: "'Familjen Grotesk', 'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: '1.625rem'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.005em'
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
  rotulo-em-seguida:
    fontFamily: "'Schibsted Grotesk', 'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  rotulo-em-seguida-noite:
    fontFamily: 'Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  leitura-da-lei:
    fontFamily: 'Literata, Georgia, serif'
    fontSize: '18px'
    fontWeight: 400
    lineHeight: 1.6
  dica:
    fontFamily: 'Atkinson Hyperlegible Next, system-ui, sans-serif'
    fontSize: '0.9rem'
    fontWeight: 400
rounded:
  botao: '6px'
  botao-noite: '12px'
  folha: '8px'
  folha-noite: '14px'
  chip: '6px'
  chip-noite: '10px'
  circulo: '50%'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  xxl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.tinta}'
    textColor: '{colors.folha}'
    rounded: '{rounded.botao}'
    padding: '0 20px'
    height: '44px'
  button-primary-noite:
    backgroundColor: '{colors.n-luz}'
    textColor: '{colors.n-noite}'
    rounded: '{rounded.botao-noite}'
    padding: '0 20px'
    height: '44px'
  button-secondary:
    backgroundColor: '{colors.folha}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.botao}'
    padding: '0 20px'
    height: '44px'
  button-secondary-noite:
    backgroundColor: '{colors.n-serra-2}'
    textColor: '{colors.n-texto}'
    rounded: '{rounded.botao-noite}'
    padding: '0 20px'
    height: '44px'
  card:
    backgroundColor: '{colors.folha}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.folha}'
    padding: '20px'
  card-noite:
    backgroundColor: '{colors.n-serra}'
    textColor: '{colors.n-texto}'
    rounded: '{rounded.folha-noite}'
    padding: '20px'
  folha-agora:
    backgroundColor: '{colors.folha}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.folha}'
    padding: '20px'
  field:
    backgroundColor: '{colors.folha}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.botao}'
    padding: '10px 14px'
    height: '48px'
  field-noite:
    backgroundColor: '{colors.n-serra}'
    textColor: '{colors.n-texto}'
    rounded: '{rounded.botao-noite}'
    padding: '10px 14px'
    height: '48px'
  nav-item-current:
    textColor: '{colors.tinta}'
    rounded: '{rounded.botao}'
    height: '44px'
  chip:
    backgroundColor: '{colors.folha}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.chip}'
    padding: '0 14px'
    height: '44px'
  button-mais:
    backgroundColor: '{colors.folha}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.circulo}'
    width: '48px'
    height: '48px'
---

# Design System: Arretado

> **Vigente: D-D9 (Tinta e noite).** Descrição conferida contra `src/apresentacao/estilos.css` e os CSS dos pacotes na Q8 (20/10/2026), com a Q1 a Q7 na `integracao`. Decisão: [`docs/design/decisoes-design.md`](docs/design/decisoes-design.md) (D-D9); valores copiados das pranchas: [`docs/design/referencias/2026-10-19-tinta-e-noite/contrato.md`](docs/design/referencias/2026-10-19-tinta-e-noite/contrato.md); construção: [`docs/planos/tinta-e-noite.md`](docs/planos/tinta-e-noite.md). Tokens, componentes e plataformas, com os contrastes medidos: [`docs/design/sistema-visual.md`](docs/design/sistema-visual.md). A D-D7 (Ponto de luz) ficou como histórico em `docs/planos/ponto-de-luz.md` e `docs/design/referencias/2026-10-18-ponto-de-luz/`.

## Overview

**Creative North Star: "Tinta e noite"**

Duas luzes para o mesmo estudo. De dia, tinta sobre papel: o texto, a ação e o ponto de "onde parei" são a mesma tinta azul-noite sobre um papel quase branco; a folha é branca, de cantos pouco arredondados e com uma linha fina em volta; o botão principal leva uma sombra baixa e dura, como um carimbo; a lima do marca-texto aparece só como halo atrás do ponto, nunca como fundo de texto. À noite, a "Noite de mandacaru": um azul fundo no chão, a serra um tom acima, o texto frio, as formas arredondadas, nenhuma sombra e o ponto em âmbar. O tema escolhe o mundo: o interruptor é o de sempre (Conta › Aparência: claro, escuro ou igual ao aparelho). A promessa é a mesma nos dois: voltar de onde parou e fazer uma coisa por vez.

O sistema é plano e firme. O chão é liso, sem textura. A folha e o chão quase não se separam pela cor (1,06:1 de dia, 1,10:1 à noite), então a separação é a linha de 1 px do mundo em volta da folha, e a única profundidade do app é a sombra dura do botão principal do dia. Os títulos usam a Schibsted Grotesk de dia e a Familjen Grotesk à noite; a interface usa a Atkinson Hyperlegible, desenhada para leitura difícil; a lei fica na Literata. A cor tem papel: a luz do mundo (tinta de dia, luz à noite) é a ação, o foco, o link e o "onde estou"; o ponto de luz só reporta estado; o vermelho é só de excluir e de falha técnica. A caneta de vidro é o único objeto com volume e o único lugar com gradiente.

A sensação-alvo é ânimo e clareza, sem barulho: nada pisca, nada acusa, nada se acumula como dívida. Em vez de uma interface que cobra, há um chão calmo onde só uma coisa sobe: a folha do que fazer agora, com um botão principal.

Estado desta descrição: tudo o que está abaixo está no código. A fundação (Q1), a casca (Q2), a caneta de vidro (Q4), os controles e a folha (Q3), a escrita do nome (Q6), o Hoje (Q5) e a varredura das telas sem prancha (Q7) estão na `integracao`; as pranchas dão os valores do Hoje, do Dia fechado e do estado vazio, e o resto (Leitor, Fixar, Trilha, Biblioteca, Conta, Sessão, Orientações, tablet e desktop) foi derivado dos dois mundos, com folhas antes e depois em `docs/redesign/tinta-e-noite/`.

**Key Characteristics:**

- Uma ação dominante por tela: um botão principal, e só um.
- A folha, com a linha de 1 px do mundo, como lugar de foco; o resto da tela é o chão, calmo e liso.
- Forma por mundo: angular de dia (raios de 6 e 8 px), arredondada à noite (12 e 14 px).
- Calor sem pressão: sem streak, sem vermelho no estudo, sem contagem de dívida.
- Legibilidade acima de efeito: texto mínimo de 13 px, alvos de 44 px, contraste AA medido em script nos dois temas.
- Local-first e offline: fontes hospedadas no próprio app, nada de CDN.

## Colors

Duas paletas fixas, uma por mundo; o tema escolhe o mundo e troca os papéis (`--fundo`, `--superficie`, `--texto`, `--luz`...). Os nomes abaixo são os das variáveis de `estilos.css`; a da noite leva o prefixo `n-` porque `--linha` e `--luz` já existem no dia.

### Primary

- **Tinta** (#0f1c3a): a luz do mundo de dia. Texto (15,8:1 no papel, 16,8:1 na folha), fundo do botão principal com texto branco (16,8:1), foco, link, caixa marcada, andamento, contorno do ponto de luz, Estrela e traço de seleção. É uma só cor para "o que faço", "onde estou" e "o que marquei".
- **Luz** (#f2f6ff, `--n-luz`): a mesma luz à noite. Botão principal cheio com o texto da noite (17,2:1), foco, link, aba atual, caixa marcada e traço de seleção (17,2:1 na noite).

### Secondary

- **Folha** (#ffffff) e **Serra** (#131d31): a folha do Agora, os cartões, os campos, o estado vazio, o diálogo e o lido no Leitor. Levam sempre a linha de 1 px do mundo, porque não se separam do chão pela cor.
- **Serra 2** (#1c2942): à noite, o fundo do controle (botão secundário, chip, "+", dock do Leitor). O contorno da noite sobre ela dá 2,7:1, então o campo não a usa e fica na serra.
- **Tinta funda** (#0a1428): só a sombra baixa do botão principal do dia e o aro da caneta.

### Tertiary

- **Lima** (#eefa4b, `--marca`): o marca-texto, só halo. Fica atrás do ponto de "onde parei" de dia, na ponta da caneta e no disco do lockup. Sobre o papel dá 1,07:1: nunca é fundo de texto nem cor de texto.
- **Âmbar** (#ffc53d, `--n-ambar`): à noite, o ponto do lockup da marca (o "onde parei" do nome; 11,8:1 na noite, 10,7:1 na serra), o halo da caneta e o furo de tinta dela.
- **Vidro da noite** (#9db7e8, `--n-vidro`): o vidro da caneta e do tubo do cacto à noite, e o toque de azul no hover da luz.

### Neutral

- **Papel** (#f6f8fb) e **Noite** (#0b1322): o chão da página, do cabeçalho e da barra das áreas. Lisos, sem textura.
- **Tinta 2** (#4a5878) e **Texto 2** (#a4b1cb): texto atenuado (6,7:1 no papel e 7,1:1 na folha; 8,6:1 na noite e 7,8:1 na serra).
- **Contorno** (#6e7a96) e **Linha da noite** (#5c6b8c): o contorno de campo, de botão secundário e do "+" (4,0:1 no papel e 4,3:1 na folha; 3,5:1 na noite e 3,2:1 na serra).
- **Linha** (#838fa7) e **Borda da noite** (#34425e): a linha de 1 px da folha, do cartão, do diálogo, do dock e do lido. De dia mede 3,1:1 sobre o papel; à noite é decorativa (1,85:1 sobre o chão).
- **Filete** (#dde2ea): a divisória decorativa de dia (cabeçalho, barra das áreas, linhas de lista; 1,22:1). À noite a divisória é a borda.
- **Perigo** (#a4262c; à noite #ff8a8a): só excluir e falha técnica.
- **Aviso** (fundo #fff4d6 e texto #4d3800; à noite #3a2f10 e #ffe6a3): aviso discreto.

### Named Rules

**The Um Botão Principal Rule.** A ação da tela é a luz do mundo cheia (tinta de dia, luz à noite) e aparece num botão por tela. Se dois botões disputam a ação, um deles é secundário (o contorno do mundo sobre o fundo do controle).

**The Luz Do Mundo Rule.** Ação, foco, link, "onde estou" e marcado são uma cor só, a luz do mundo, e o tema a troca num lugar só (`--luz`). Nada de uma cor de ação à parte.

**The Lima É Só Halo Rule.** A lima do marca-texto fica atrás do ponto, na ponta da caneta e na marca de hoje do quadro do cacto (só de dia). Nunca é fundo de texto, nunca é cor de texto, nunca marca um estado sozinha.

**The Luz Só Reporta Rule.** O ponto de luz diz um estado real (feito, atual, falta; Estrela; "onde parei") ou marca a ponta da caneta. Nunca pulsa, nunca segue o dedo nem a rolagem, nunca é texto, nunca aparece sem o contorno na luz do mundo.

**The Folha Com Linha Rule.** A folha se separa do chão pela linha de 1 px do mundo (`--borda-folha`), não pela cor nem pela sombra. Nenhuma peça pode depender de "folha sobre chão" como contraste.

**The Matéria Em Neutro Rule.** A matéria se identifica pelo nome, em neutro: sem cor por disciplina e sem faixa colorida na borda.

**The Sem Vermelho No Estudo Rule.** Vermelho é de excluir e de falha técnica. Erro de estudo, atraso e revisão pendente nunca ficam vermelhos.

## Typography

**Display Font:** Schibsted Grotesk de dia (variável, 400 a 900) e Familjen Grotesk à noite (variável, 400 a 700; pedir mais que 700 dá 700), com Atkinson e system-ui como reserva; hospedadas em `src/apresentacao/fontes/` com a licença OFL ao lado
**Body Font:** Atkinson Hyperlegible Next (com system-ui, sans-serif), pesos 400, 500 e 700; o 600 das pranchas casa com o 700
**Reading Font:** Literata (com Georgia, serif), variável, só para a letra da lei e o texto do Leitor

**Character:** Uma grotesca firme e clara nos títulos, que muda de voz com o mundo (a Schibsted pesada de dia, a Familjen mais calma à noite), encontra uma sans desenhada para legibilidade na interface; a lei fica numa serifa de leitura longa. O `index.html` pré-carrega a fonte de título do tema do aparelho, então cada pessoa baixa só uma. A grotesca não aparece em texto corrido nem em rótulo pequeno, com uma exceção: o rótulo "Em seguida" (15 px) de dia.

### Hierarchy

- **Display** (título 800 de dia e 700 à noite, 1.875rem, 1.1, -0.02em): título de página (H1); 2.125rem a partir de 700 px e 2.375rem a partir de 900 px (30, 34 e 38 px, a escala do app; a prancha tinha 40/1, o Gabriel escolheu a do app em 20/10/2026). Cor de título: a do texto do mundo.
- **Headline** (título 800 de dia e 600 à noite, 1.625rem, 1.15, -0.02em de dia e -0.005em à noite): título da folha do Agora e do Resumo do Dia.
- **Title** (Atkinson 700, 1.25rem, 1.25): seções (H2); H3 em 1.0625rem.
- **Body** (Atkinson 400, 1rem, 1.5): texto da interface. A lei usa Literata de 18 px (ajustável), medida de até 70ch e sem itálico.
- **Label** (Atkinson 600, 0.9375rem, -0.01em): botões; 700 a 1.0625rem no botão principal da folha. Rótulo "Em seguida": título 800 a 15 px de dia, Atkinson 700 a 14 px à noite. Dicas em 0.9rem; etiquetas e rodapé em 0.8125rem (13 px).

### Named Rules

**The Piso De 13 Rule.** Nenhum texto abaixo de 0.8125rem (13 px). Caixa-alta com espaçamento de letras só em etiqueta ("Para lembrar").

**The Lei Sem Itálico Rule.** A lei não vai em itálico e o destaque dela é sublinhado, nunca fundo. Prazos, condições, termos absolutos e penas têm sublinhados distintos (de dia #173f52, #ab6b21 e #a5582a; à noite #7fb4cf, #f2c062 e #f09a68).

**The Título Só Título Rule.** A grotesca do mundo é só de título, da folha e, de dia, do rótulo "Em seguida" (à noite ele é da interface). "Sem serifa" (Conta › Aparência) troca só a letra da lei.

## Layout

Um conteúdo de coluna única de até 900 px, centrado, com respiro generoso, e a lei em até 70ch. Escala de espaço de 4 em 4 (4, 8, 16, 24, 32, 48 px). Três larguras: celular até 699 px, tablet em pé de 700 a 899 px e desktop a partir de 900 px. No celular e no tablet em pé as abas das áreas ficam embaixo; no desktop, no cabeçalho. Com `viewport-fit=cover` a página vai até a borda do vidro, e tudo que é fixo ou encosta nas bordas (cabeçalho, abas, conteúdo, rodapé, prévia, modo foco) lê as áreas seguras do aparelho (`env(safe-area-inset-*)`): a ilha e o indicador de início nunca cobrem texto nem controle, em pé ou deitado.

A casca: cabeçalho preso no alto, de 60 px, no chão, com o nome "arretado" escrito e o cacto ao lado (o lockup), Ajuda e Conta; abas Hoje · Trilha · Fixar · Biblioteca numa barra de 80 px embaixo, de quatro colunas, com ícone de 24 px sobre o rótulo de 13 px e a atual em negrito com um traço de caneta embaixo; o título da página leva o "+" redondo de 48 px na mesma linha, nas telas em que se registra (Hoje e Fixar). Recuo lateral de 16 px no celular, 24 no tablet em pé e 32 a partir de 900; a partir de 900 o cabeçalho segue a coluna de 900 px, e o lockup alinha com o título. No tablet em pé as quatro colunas ficam numa faixa centrada de 35 rem. O rodapé legal fica no fim do conteúdo, e a rolagem reserva a altura das abas (com a área segura do aparelho): no fim da página, nada fica embaixo delas.

No Hoje a ordem é: título com "+", pontos do Dia, linha de parada ("Retomar em") com a caneta, folha do Agora, "Em seguida" (um menu expansível) e "Para lembrar"; quando houve algo hoje vem o Resumo do Dia, e o aviso de retorno e a Sessão aberta, quando há, vêm antes da linha de parada. A tela inteira sai de um só retrato dos dados (`useRetratoDoHoje`), para os pontos, a linha de parada, o Agora e o "Em seguida" nunca discordarem entre si. A partir de 900 px, a parte do meio vira duas colunas, 7fr · 5fr, dentro da coluna de 900 px: à esquerda a linha de parada e a folha do Agora; à direita o "Em seguida" e o "Para lembrar". O Resumo do Dia, as revisões, a captura e o aviso de backup seguem em largura inteira, embaixo.

Alvos de toque de pelo menos 44 px (campos em 48). Nenhuma tela rola na horizontal a 390 px, a 200% de zoom nem com a fonte a 200%; palavras longas quebram (`overflow-wrap: anywhere`). Limite conhecido: com a fonte a 300% no celular o dock do Leitor e o "Lido até aqui" não cabem entre o cabeçalho e as abas.

## Elevation & Depth

Plano. O chão é liso e a folha sobe dele pela linha de 1 px do mundo, não pela sombra. A única sombra do app é a sombra dura e baixa do botão principal do dia, como um carimbo; à noite não há sombra nenhuma e a folha sai do chão pelo tom. As camadas que flutuam (diálogo, bandeja do modo foco, menu Ajuda, dock do Leitor) levam a linha da folha e o fundo opaco, sem sombra, e o diálogo ainda tem o véu. O brilho é só o halo da ponta da caneta. O gradiente é só dentro da caneta. Sem textura, sem vidro desfocado, sem iridescência.

### Shadow Vocabulary

- **Botão principal, de dia** (`0 2px 0 #0a1428`, `--sombra-botao`): o carimbo do mundo; ao apertar, o botão desce 1 px e a sombra vai a `0 1px 0` (`--sombra-botao-aperto`).
- **Linha da folha** (`1px solid` em `--linha` de dia e em `--n-borda` à noite, `--borda-folha`): a folha do Agora, o cartão, o estado vazio, o diálogo, o menu Ajuda e o dock. Dentro do texto, a mesma linha por dentro (`inset 0 0 0 1px`, `--sombra-folha`) é a faixa do lido no Leitor.
- **À noite:** nenhuma. O botão principal não tem sombra e o aperto é a escala 0,975.

### Named Rules

**The Sombra Só No Botão Do Dia Rule.** Nenhum `box-shadow` ou `--sombra*` leva desfoque; a profundidade é só a sombra dura do botão principal do dia (guarda em `scripts/contraste.test.ts`).

**The Sem Vidro Desfocado Rule.** O vidro é objeto (a caneta) e nunca superfície desfocada atrás de texto. Só os botões do modo foco têm transparência (a camada a 90%, sem desfoque), e é função, não enfeite; o dock do Leitor é uma barra sólida.

## Shapes

Angular de dia, arredondado à noite, e o que está dentro tem raio menor que o que o contém. Botão e campo: 6 px de dia e 12 px à noite (`--raio-botao`). Folha, cartão e bloco-herói: 8 e 14 px (`--raio-folha`). Chip: 6 e 10 px (`--raio-chip`). O trilho das abas de página e o dock do Leitor somam 4 px ao raio do botão (10 e 16 px), para as curvas de dentro e de fora serem concêntricas; a caixa de marcar tem metade do raio do botão. O "+", os pontos e a caneta são redondos (50%). Não há pílula de 999 px: a guarda da Q7 recusa `border-radius` de três dígitos. Ficam de propósito, dentro do texto, quatro raios de 2 a 4 px (grifo, foco da remissão, tarja da lacuna e "carregando"). Contornos de 1,5 px de dia e de 1 px à noite (`--espessura-contorno`; o Chromium arredonda o de 1,5 px para 1), em tinta cheia só no que está marcado. A caneta, os pontos de luz, a Estrela e o quadro do cacto são vetores.

## Components

### Buttons

- **Shape:** cantos de 6 px de dia e 12 px à noite, altura de 44 px, texto em Atkinson 600 de 15 px, contorno de `--espessura-contorno` em `--borda-botao`.
- **Primary:** tinta cheia com texto branco, a sombra dura de 2 px e sem contorno de dia; luz cheia com o texto da noite, sem sombra, à noite. Um por tela; largura total, 52 px de altura e 700 a 17 px na folha do Agora. Compacto fora dela.
- **Secondary:** o fundo do controle (a folha de dia, a serra 2 à noite), o contorno do mundo e o texto do mundo. Dentro da folha do Agora o fundo do controle é o da própria folha.
- **Hover / Focus:** o hover mexe só no fundo (6% do texto sobre o fundo do controle; o primário vai a `--acao-hover`: 80% tinta e 20% tinta 2 de dia, 88% luz e 12% vidro à noite), só com ponteiro; ao apertar, o aperto de cada mundo (desce 1 px com a sombra a 1 px de dia, encolhe a 0,975 à noite), com transição de 140 ms só de transformação e sombra (nunca de cor); anel de foco de 2 px com 2 px de recuo, na luz do mundo (tinta de dia, luz à noite).
- **Ghost (botão-texto):** sem caixa, sublinhado, peso 500, ao lado do primário ("Escolher outra coisa") ou sozinho no começo da linha, com a letra alinhada ao texto da página ("Voltar", "Mais"). **Perigoso:** contorno e texto vermelhos; cheio só dentro do diálogo de confirmação.

### Chips and Tabs

- **Chip:** o botão de alternar com `aria-pressed` que escolhe um valor (o resultado do erro, o filtro de estado dos cartões, as opções do "Trocar"): 14 px, `padding` de 0 14 px, raio do chip. Ligado, é a luz cheia, do mesmo tamanho.
- **Abas das áreas:** Hoje, Trilha, Fixar e Biblioteca. A atual é a luz do mundo em negrito, com um traço de caneta embaixo (30 × 6 px, só CSS); as outras são atenuadas.
- **Abas de página:** trilho `--superficie-2` com o raio do botão mais 4 px; a aba atual é a folha com o contorno do controle por dentro e o rótulo em negrito; no celular o trilho rola na horizontal.
- **Selo e marcador:** raio do chip, a superfície 2 (o selo) ou o aviso (o marcador). **Matéria:** pelo nome, em neutro.

### Cards / Containers

- **Cartão:** a folha, a linha do mundo, raio da folha (8 e 14 px), sem sombra, 20 px de respiro. Só onde agrupa: um formulário com os botões dele, a Sessão em andamento, o resumo do que houve.
- **Folha do Agora:** a folha com a linha do mundo; título em 26 px (800 de dia, 600 à noite), motivo e tempo em atenuado, um botão principal de 52 px ("Começar"; "Continuar" quando a ação é a leitura) e, logo abaixo, o botão-texto "Escolher outra coisa" de 44 px, centrado.
- **Linha de parada (Hoje):** "Retomar em" e o lugar exato em negrito (`LEP, art. 112, § 2º`, 17 px), e embaixo "salvo hoje, 22h10" (ou "salvo ontem, 21h40", ou "salvo dia 12/10, 22h10"; a hora e o dia de Brasília). De dia o lugar leva uma faixa de caneta embaixo e, no fim dela, o ponto de luz com o halo de lima; à noite, só o texto. A caneta de 68 × 91 px, a 35°, fica à direita com a ponta sobre a borda de cima da folha do Agora. Com o Dia fechado a linha fica só em texto: a caneta vai para o Resumo do Dia.
- **Pontos do Dia:** Leitura, Cartões e Frases, cada um com um ponto de 22 px e o nome em 13 px, peso 600. A forma muda por mundo e por estado, nunca só a cor: de dia um anel de caneta irregular, com a hachura de marca-texto, em tinta, até a metade (atual) ou inteira (feito); à noite um círculo, vazio, com a metade esquerda cheia ou cheio. O estado também vem em texto para o leitor de tela ("Leitura, feito hoje"). O ponto acende uma vez em 160 ms, na visita ao Hoje em que ficou aceso, e com `prefers-reduced-motion` aparece aceso.
- **Em seguida:** um `<details>` nativo subordinado ao Agora, sem fundo nem sombra. Fechado: o rótulo, a primeira atividade ("Ler arts. 112 a 117 da LEP, mais 1") e a seta. Aberto: uma linha de 56 px por atividade, com o nome, o tempo ("cerca de 6 min") e "Trocar", que abre as outras atividades de hoje em chips ("Trocar por"). **O "Trocar" é só apresentação:** vale nesta visita e não grava nada.
- **Para lembrar:** uma nota livre sobre o que fazer fora do app, sob o "Em seguida". Título em etiqueta de 13 px em caixa-alta; acima do campo, as notas do Estacionamento ainda por resolver, cada uma com uma caixa; campo de 3 linhas com "O que fazer fora do app"; "Salvar" é o botão secundário; o estado ("Ainda não salvo." ou "Salvo.", `role="status"`) no tamanho de `.dica`. Até 500 caracteres, texto simples; falha de gravação é um aviso com `role="alert"` e o texto fica no campo.
- **Resumo do Dia:** cartão com o que houve em linhas curtas e o próximo passo; "Fechar o Dia" é um botão secundário. Fechado, mostra o quadro do cacto com a caneta largada nele, a legenda do que ela desenhou hoje, "Bom descanso." e "Reabrir o Dia".
- **Estado vazio (`.vazio`):** é uma folha, com a linha do mundo, o título, a frase e os começos em coluna; vale para toda tela que usa `Vazio`.
- **Listas:** em linhas sobre o chão, com a divisória entre elas: título em 600, uma linha de apoio atenuada e a seta de traço único à direita, alvo de 64 px (`LinhaLista`; no Acervo, a marca de 22 px à esquerda). O "Voltar" vem acima do título, com a seta. A Estrela do Leitor tem a caixa de 44 × 44 (à esquerda da calha, nunca sobre o texto; 40 × 44 no celular e no cartão do modo foco, onde a folga é de 16 px), sem mexer na altura da linha.
- **Camadas que flutuam:** o diálogo, a bandeja do modo foco, o menu Ajuda e o dock do Leitor: a linha da folha, o fundo opaco, nenhuma sombra.

### Inputs / Fields

- **Style:** altura 48, contorno de `--espessura-contorno` em `--borda-campo`, raio do botão, fundo `--superficie` (a folha de dia, a serra à noite), fonte de pelo menos 16 px, rótulo sempre visível.
- **Focus:** o anel de foco padrão. **Placeholder:** o atenuado. **Caixa e rádio:** marca de 22 px num rótulo de 44, contorno de 2 px; marcada = a luz cheia com a marca na folha de dia e na noite à noite. A linha do rádio marcado leva o tom do lugar e um anel de 2 px.

### Fixar e revisão

- **Abas do Fixar:** Frases · Cartões · Histórico, no trilho das abas de página; `/recall` cai nas Frases. Os Erros não são aba: a lista com filtros é a página `/recall/erros`, a que se chega por "Ver os erros, com filtros" no fim da lista de Frases; o detalhe do Erro volta a ela.
- **Linha de frase:** o texto em Literata e, à direita, "Esconder trecho" como botão de texto sublinhado de 44 px.
- **Estado por palavra e desenho:** o desenho (SVG de um traço, `currentColor`, 18 px) vem antes da palavra: "Errei" (xis) e "Acertei sem certeza" (interrogação) na lista de Erros, "Para revisar" (relógio) no cartão que já está no prazo, e "De novo" (setas), "Difícil" (onda) e "Fácil" (marca) nas respostas. Nunca vermelho, nunca glifo de texto.
- **Cartão atual:** uma coluna só (40 rem a partir de 700 px) com a faixa da Sessão, o topo, o cartão e as respostas. No topo, "Sair" (texto sublinhado), o andamento ("1 de 4") e, no canto, a caneta encostada (58 × 78), fora do cartão, com a ponta 7 px dentro da borda dele. As respostas são três botões de borda de 2 px numa linha (até 379 px, com o desenho sobre o rótulo); "Mostrar resposta" é o único botão principal. Os dias da semana com revisão são o ponto do Dia do mundo, em 16 px.
- **Fim de rodada:** a caneta deitada em repouso (104 × 59) acima do título ("Feito.", ou o sotaque, uma em três), "Amanhã: N cartões." e as ações centradas: "Seguir para as frases (N)" como principal e "Voltar ao Fixar" em texto. Sem cachorro e sem desenho próprio: quem desenha é o Resumo do Dia, uma vez por Dia fechado.

### Navigation

- **Abas das áreas:** até 899 px, presas embaixo, no chão, com a divisória em cima, ícone de 24 px sobre o rótulo de 13 px, barra de 80 px (no tablet em pé, juntas no meio, em até 35 rem); a partir de 900, no centro do cabeçalho, só o rótulo, com o traço 3 px acima da base. Com o teclado aberto, as abas de baixo saem da frente (`data-teclado` na casca). Os nomes vêm de um mapa só (`ROTULO_DA_AREA`); as rotas seguem `/plano` e `/recall`.
- **Cabeçalho:** o lockup da marca, Ajuda (texto) e Conta (ícone de pessoa num alvo de 44); a partir de 900 px, "Registrar erro" neutro com a tecla E ao lado. Uma divisória de 1 px o separa do texto que rola por baixo.
- **"+" no título:** redondo, 48 px, com o contorno e o fundo do controle de cada mundo, na linha do título do Hoje e do Fixar; abre o registro de erro. Não é a ação da tela. A tecla E registra de qualquer tela.
- **Rodapé:** o aviso curto e "Backup e dados" como botão de texto de 44 px, no fim do conteúdo.

### A marca (signature)

O nome "arretado" escrito num traço só, em minúsculas, com o cacto simplificado ao lado (tronco e dois braços em L, o esquerdo mais alto) e o ponto de luz de "onde parei". No cabeçalho vive como lockup parado de 144 px (`LockupParado`, o traço segue o texto do mundo e o ponto é o único objeto de cor); na abertura o nome se escreve letra a letra, a caneta volta por baixo deixando um traço de luz e vira o cacto (o final B, 2,64 s). A frequência é uma constante só (`FREQUENCIA`, em `componentes/escrita/frequencia.ts`; a escolha é do Gabriel e segue aberta): completa só na primeira abertura no aparelho, curta (1,2 s) na primeira de cada Dia, parada nas demais; com movimento reduzido fica parada, no perfil Calmo só esmaece, e um toque ou uma tecla pula para o quadro final.

### Leitor da lei (signature)

Coluna de 70 ch em Literata sobre o chão. O trecho lido, do começo da norma até o "lido até", vai sobre a faixa da folha (raio da folha e a linha de 1 px do mundo por dentro, 12 px de folga de cada lado do texto; à direita, no máximo metade do recuo lateral da casca, 8 px no celular, para a faixa não encostar na borda da tela), e "Lido até aqui" fecha o lido com o rótulo em 13 px, peso 700, e a caneta deitada ao lado. Controles: o seletor de fonte como um controle só (A−, 18 px, A+) com o contorno, o fundo e o raio do botão secundário, e "Destaques" (ligado, a luz cheia), com a legenda dos sublinhados numa linha (Prazos, Exceções, Absolutos, Penas). A régua de leitura é em tinta (segue o dedo; a luz nunca segue). O dock é uma barra sólida (o fundo do controle, a linha da folha, o raio do botão mais 4 px, sem desfoque) com Buscar, Filtrar, Ações e Modo foco, e o "Lido até aqui" como botão principal ao lado; o modo foco tem penumbra, cartão e bandeja nos mesmos tokens. A Estrela é a estrela de luz de quatro pontas com contorno na luz do mundo e aro na cor do chão, com herança por bloco (direta, herdada, exceção) e a faixa da calha na luz. A partir de 700 px, a estrutura da norma fica ao lado do texto: o bloco de agora (o último cabeçalho que passou de um quarto da tela abaixo do alto) e os irmãos dele (as seções do capítulo) com um ponto de luz do estado (lida, em leitura, ainda não lida), o de agora na folha com o contorno do controle e os blocos de dentro dele logo abaixo. A partir de 1200 px as ferramentas saem do canto e ficam num trilho na margem da direita (o dock em pé e o "Lido até aqui" embaixo dele), à altura da estrutura da norma. Sem mascote.

### A caneta (signature)

Um tubo de vidro com tronco e dois braços que termina num cone do mesmo vidro (a ponta também é de vidro), com o furo de tinta à vista, um aro de 1,5 a 2 px, uma esfera de luz na ponta com o halo do mundo (lima de dia, âmbar à noite), três faíscas e uma sombra suave (só de dia). De dia o vidro é claro (#edf0f6 a 90%) e a tinta é a do papel; à noite o vidro é um traço a 14% e o furo vai do creme ao âmbar. É o único objeto com volume e o único gradiente do app. Três poses fixas: encostada a 35° na folha do Agora (Hoje; no Fixar, no Cartão atual), deitada a 65° ao fim de "Lido até aqui" (Leitor), largada sob o chão do quadro do cacto, quase deitada a 84° (Resumo do Dia); em repouso, deitada, no fim de rodada do Fixar. Muda de lugar por salto, nunca gira nem desliza; no quadro, ela anda sobre o traço que desenha e volta a ser largada. Nunca botão, painel, fundo de texto, nem mais de uma por tela. Decorativa (`aria-hidden`). O ícone do app é a caneta a 35° sobre o papel, em cores fixas do dia: no favicon (16 a 48 px) a silhueta cheia, em tinta, com a lima atrás da ponta (o vidro claro some nesse tamanho); do 180 ao 512 px, a caneta inteira com o furo de tinta (a "maskable" e a do iOS levam a caneta dentro do círculo de 40%).

No código (`componentes/Caneta.tsx`): uma caneta de pé desenhada com a ponta em (60, 262), numa caixa de 120 × 270 (a geometria do `pen.mjs` v5 do kit da marca, que fica fora do repositório), e girada em torno dela, 35° encostada e 65° deitada. As cores vêm dos 13 tokens `--pen-*` (o tema os troca, e o componente não leva cor literal). O aro de vidro vem de uma máscara de luminância (branco do tamanho do vidro mais 5 unidades, preto por cima). Cada instância leva quatro ids próprios (`useId`): o furo de tinta, o halo, a sombra e o aro. A "largada" é a caneta posta sob o chão do quadro do cacto a 84°, em escala 0,30 e com a ponta em (214, 183) (`REPOUSO`, em `quadro/cena.ts`); andando sobre o traço ela fica a 65° em escala 0,38 (`ANDANDO`). `QuadroDoCacto` a move dentro do próprio `<svg>` com `CanetaDefs` e `CanetaDesenho`. No Hoje, a caneta passa por salto da folha do Agora (Dia aberto) para o Resumo do Dia (Dia fechado).

### O quadro do cacto (A caneta que desenha)

Um desenho de traço em 16 partes que cresce a cada Dia fechado: o chão, o tronco, os dois braços, os espinhos, três flores, o sol, as aves, o calango, a nuvem, a chuva, o capim, o tatu-bola e a borboleta. O Dia fechado de número N desenha a parte ((N − 1) mod 16) + 1; depois da 16ª, o Dia seguinte abre uma folha nova. Conta Dias fechados, nunca uma sequência: faltar um Dia não apaga nada, e nenhum número aparece na tela. Só no Resumo do Dia, depois de fechar (`componentes/quadro/`). A caneta sai do repouso, anda sobre cada fio enquanto ele se faz e volta a ser largada. A cena é decorativa (`aria-hidden`); a legenda ("Hoje a caneta desenhou o chão.", `role="status"`) só é dita quando a parte terminou. Cores por papel: o cacto é um tubo oco (parede fina em `--quadro-aro`, núcleo de tinta em `--luz`, pontos de luz nas pontas e, na de hoje, a tinta da caneta com a marca atrás), tinta = bichos, flores e sol, tinta 2 = nuvem e chuva, `--quadro-chao` = o chão. O painel é o chão do mundo, sem borda.

### O traço de seleção e a passagem do cartão

O **traço** (`componentes/traco/`): ao escolher uma área, uma aba da Biblioteca ou uma resposta, uma linha fina (tinta de dia, luz à noite) se desenha em volta do item, com a ponta de luz à frente, e some. A **passagem** (`componentes/passagem.ts`): ao responder um Cartão ou uma Frase, o cartão sai para a esquerda e o seguinte entra pela direita; o último cartão não passa, o fim da rodada toma a tela. `movimentoAgora()` (`apresentacao/movimento.ts`) é lido na hora de usar: **reduzido** (`prefers-reduced-motion`) não anda nada, o quadro aparece pronto e o cartão troca na hora; **Calmo** (só o perfil Calmo, escolhido em Conta › Perfis) mantém o desenho do Dia, mas o traço só aparece e esmaece e o cartão só esmaece; **normal** (o padrão, sem perfil, e os perfis Guiado e Leitura) desenha o traço e desloca o cartão. Tempos em `docs/design/sistema-visual.md`.

## Do's and Don'ts

### Do:

- **Do** manter um só botão principal por tela, e dar a ele o texto de uma ação ("Continuar", "Começar").
- **Do** pôr lista em linhas sobre o chão e deixar o cartão para o que agrupa.
- **Do** separar a folha do chão pela linha de 1 px do mundo, e usar a luz do mundo para ação, foco, link e "onde estou".
- **Do** deixar a lima só como halo e o ponto de luz só para estado.
- **Do** mostrar onde a pessoa parou (a Norma e o Dispositivo exatos) e que está tudo salvo.
- **Do** medir todo par de cor novo em `scripts/contraste.mjs` nos dois temas antes de usar, e manter os três blocos de token de `estilos.css` iguais.
- **Do** respeitar `prefers-reduced-motion` (pontos acesos e quadro do cacto pronto) e `forced-colors`. Movimento de 160 a 220 ms, `cubic-bezier(.2, .7, .2, 1)`, só quando explica.
- **Do** hospedar fontes e ícones no próprio app; o app funciona offline.

### Don't:

- **Don't** usar vermelho, perda de sequência, culpa ou urgência para motivar. "Vencido" e "Você parou em" soam como dívida: prefira "para hoje", "Retomar em" e "Continuar".
- **Don't** pôr textura, foto, 3D, vidro desfocado, iridescência, sombra com desfoque, gradiente em texto, brilho pulsando, lens flare, parallax, confete ou som.
- **Don't** usar a lima como fundo ou cor de texto, a luz como texto, sem contorno, pulsando ou seguindo o dedo; nem mais de uma caneta por tela.
- **Don't** dar cor própria a uma disciplina, faixa colorida na borda de cartão, item ou aviso.
- **Don't** usar raio de pílula nem peça que dependa da folha se separar do chão pela cor.
- **Don't** usar glifos Unicode (✓, ⓘ) como ícone; os ícones são SVG desenhados num só traço.
- **Don't** usar texto abaixo de 13 px nem alvo abaixo de 44 px.
- **Don't** carregar fonte ou ícone de CDN (quebra o offline e envia o IP da pessoa a terceiros).
- **Don't** renderizar HTML colado sem sanitizar, nem aplicar rótulo clínico ou de diagnóstico em qualquer tela.
