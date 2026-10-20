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
  button-mais:
    backgroundColor: '{colors.cal}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.pilula}'
    width: '44px'
    height: '44px'
---

# Design System: Arretado

> **Superado em 19/10/2026 pela D-D9 (Tinta e noite).** Os tokens do cabeçalho (`colors`, `typography`, `rounded`, `components`) e a descrição abaixo ainda são os da D-D7 (Ponto de luz) e só são reescritos na Q8 ([`docs/planos/tinta-e-noite.md`](docs/planos/tinta-e-noite.md)). Desde a Q1 o código tem a paleta, as letras e as formas da D-D9: dia "Tinta e marca-texto" (papel `#F6F8FB`, tinta `#0F1C3A`, lima `#EEFA4B` só como halo, Schibsted Grotesk) e noite "Noite de mandacaru" (noite `#0B1322`, serra `#131D31`, luz `#F2F6FF`, âmbar `#FFC53D`, Familjen Grotesk). Onde este arquivo divergir, valem [o contrato da D-D9](docs/design/referencias/2026-10-19-tinta-e-noite/contrato.md), [a decisão](docs/design/decisoes-design.md) e `src/apresentacao/estilos.css`.

## Overview

**Creative North Star: "Ponto de luz"**

A luz do sertão como tinta: areia clara, uma folha de cal com sombra fresca, e a caneta-cacto de vidro descansando exatamente onde a pessoa parou, com um ponto de luz na ponta. O sertão aqui é lugar de luz, energia e prova (eólica e solar no interior, o eclipse de Sobral), não a lista "seca, cangaço, cordel"; e o futuro dele acontece de dia claro, longe do marinho quase preto com neon que é o uniforme da categoria. Em vez de uma interface que cobra, há um chão calmo onde só uma coisa sobe: a folha do que fazer agora, com um botão de vidro. A sensação-alvo é ânimo e clareza, sem barulho: nada pisca, nada acusa, nada se acumula como dívida.

O sistema é claro e firme. O chão é areia lisa, sem textura; a profundidade vem só da sombra fresca da folha. Os títulos usam a Gabarito (geométrica, feita por fundição brasileira para uma plataforma de ensino, com o nome da folha de respostas); a interface usa a Atkinson Hyperlegible, desenhada para leitura difícil; a lei fica na Literata. A cor tem papel: vidro é a ação, cal é "onde estou", tinta é o texto e o marcado, a luz só reporta estado. Vermelho só para excluir e para falha técnica, nunca no estudo.

Estado desta descrição: a base (tokens, letras, botões, campos, cartões, folha do Agora, área e aba atuais, Estrela de luz) está no código desde a fase P1 de [`docs/planos/ponto-de-luz.md`](docs/planos/ponto-de-luz.md), e a casca (cabeçalho, abas sobre a areia com a atual em cal, "+" na linha do título) desde a P2. O Hoje (P3) também está no código: os pontos do Dia, a linha de parada com a caneta encostada na folha, a folha do Agora com o botão de vidro e "Escolher outra coisa", o "Em seguida" e o Resumo do Dia com o quadro do cacto e a caneta largada nele (pós-P3, "A caneta que desenha", 19/10/2026: o traço de seleção e a passagem do cartão também estão no código). O Leitor (P4) também: o lido sobre a faixa de cal, a caneta deitada em "Lido até aqui", a Estrela de quatro pontas, a estrutura da norma com pontos de luz, o dock em vidro e o modo foco nos tokens novos. O Fixar e a revisão (P5) também: abas Frases · Cartões · Histórico, estado por palavra e desenho, o Cartão atual com a caneta encostada e o fim de rodada com a caneta deitada, sem cachorro. A P7 (plataformas) também: o ícone, o favicon e o manifest, a cor da barra nos dois temas, as áreas seguras do aparelho em tudo que é fixo e o trilho de ferramentas do Leitor a partir de 1200 px. O Hoje em duas colunas, a partir de 900 px, e o campo "Para lembrar" (P7b) também. As demais telas (P6) também: ícones de traço único no lugar dos glifos, listas em linhas sobre a areia, um vidro por tela e a Estrela com alvo de 44 px. Decisão: D-D7 em [`docs/design/decisoes-design.md`](docs/design/decisoes-design.md); contrato: [`docs/design/referencias/2026-10-18-ponto-de-luz/contrato.md`](docs/design/referencias/2026-10-18-ponto-de-luz/contrato.md).

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
- **Traço** (#c8742f, token `--caramelo`): só o sol e o miolo das flores do quadro do cacto (à noite, #ffb46b). Caramelo nunca é cor de interface.

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

**The Lei Sem Itálico Rule.** A lei não vai em itálico e o destaque dela é sublinhado, nunca fundo. Prazos, condições, termos absolutos e penas têm sublinhados distintos (#173f52, #ab6b21, #a5582a).

**The Título Com Razão Rule.** Gabarito só em títulos e marca, porque tem razão registrada (ensino, folha de respostas). "Sem serifa" troca só a letra da lei.

## Layout

Um conteúdo de coluna única de até 900 px, centrado, com respiro generoso, e a lei em até 70ch. Escala de espaço de 4 em 4 (4, 8, 16, 24, 32, 48 px). Três larguras: celular até 699 px, tablet em pé de 700 a 899 px e desktop a partir de 900 px. No celular e no tablet em pé as abas das áreas ficam embaixo; no desktop, no cabeçalho. Com `viewport-fit=cover` a página vai até a borda do vidro, e tudo que é fixo ou encosta nas bordas (cabeçalho, abas, conteúdo, rodapé, prévia, modo foco) lê as áreas seguras do aparelho (`env(safe-area-inset-*)`): a ilha e o indicador de início nunca cobrem texto nem controle, em pé ou deitado.

A casca (P2): cabeçalho preso no alto, na areia, com a marca, Ajuda e Conta; abas Hoje · Trilha · Fixar · Biblioteca sobre a areia, com ícone e rótulo de 13 px ou mais e a atual em cal; o título da página leva o "+" redondo em cal na mesma linha, nas telas em que se registra (Hoje e Fixar). Recuo lateral de 16 px no celular, 24 no tablet em pé e 32 a partir de 900 px; a partir de 900 o cabeçalho segue a coluna de 900 px, e a marca alinha com o título. O rodapé legal fica no fim do conteúdo, e a rolagem reserva a altura das abas (com a área segura do aparelho): no fim da página, nada fica embaixo delas. No Hoje (P3), a ordem é: título com "+", pontos do Dia, linha de parada com a caneta, folha do Agora, "Em seguida" e, quando houve algo hoje, o Resumo do Dia; o aviso de retorno e a Sessão aberta, quando há, vêm antes da linha de parada. A tela inteira sai de um só retrato dos dados (`useRetratoDoHoje`), para os pontos, a linha de parada, o Agora e o "Em seguida" nunca discordarem entre si. A partir de 900 px (P7b), a parte do meio vira duas colunas, 7fr · 5fr, dentro da coluna de 900 px: à esquerda a linha de parada e a folha do Agora; à direita o "Em seguida" e o "Para lembrar", no alto das duas. O Resumo do Dia, as revisões, a captura e o aviso de backup seguem em largura inteira, embaixo. Abaixo de 900 px é uma coluna só, na mesma ordem: Agora, "Em seguida", "Para lembrar".

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

**The Sem Vidro Desfocado Rule.** Vidro é objeto (a caneta) e cor de ação, nunca superfície desfocada atrás de texto. Só os botões do modo foco têm transparência (a camada a 90%, sem desfoque), e é função, não enfeite; o dock do Leitor é uma pílula sólida.

## Shapes

Firme e claro, em degraus: botões e campos em 12 px, cartões e a folha em 16 px, abas e navegação em pílula (999 px). Contornos de 1 px nos cartões e de 1,5 px nos campos. A caneta, os pontos de luz, a Estrela e o quadro do cacto são vetores; a caneta é o único objeto com volume e o único lugar com gradiente.

## Components

### Buttons

- **Shape:** cantos de 12 px, altura de 44 px, texto em Atkinson 600 de 15 px.
- **Primary:** fundo vidro, texto branco (à noite, vidro claro com o texto da noite), sem borda. Um por tela; largura total e 52 px de altura na folha do Agora. Compacto fora dela.
- **Secondary:** fundo cal, contorno de 1 px, texto tinta.
- **Hover / Focus:** o primário escurece 14% em direção à tinta no hover (só com ponteiro) e desce 1 px ao ser pressionado, com transição de 140 ms só de transformação e sombra (nunca de cor); anel de foco de 2 px com 2 px de recuo, tinta no dia e vidro claro à noite.
- **Ghost (botão-texto):** sem caixa, sublinhado, ao lado do primário ("Escolher outra coisa") ou sozinho no começo da linha, com a letra alinhada ao texto da página ("Voltar", "Mais"). **Perigoso:** contorno vermelho; cheio só dentro do diálogo de confirmação.

### Chips and Tabs

- **Abas:** trilho em pílula na areia funda, rolável na horizontal; a aba atual é cal com a sombra fresca, texto tinta e peso 700.
- **Selo:** pílula na areia funda com texto tinta.
- **Matéria:** pelo nome, em neutro.

### Cards / Containers

- **Cartão:** cal, raio de 16 px, borda de 1 px (tinta a 12%), sombra de cartão, 20 px de respiro.
- **Folha do Agora:** cal com a sombra fresca, raio 16, texto tinta; título em Gabarito 750, motivo e tempo em tinta 2, um botão de vidro de 52 px ("Começar"; "Continuar" quando a ação é a leitura) e, logo abaixo, o botão-texto "Escolher outra coisa" de 44 px, centrado. Quem parou de ler já vê onde na linha de parada, logo acima: a folha não repete o motivo. A caneta fica fora da folha, de pé à direita da linha de parada, com a ponta 16 px dentro da folha (que abre 26 px de topo); nenhum mascote.
- **Linha de parada (P3):** "Você parou em LEP, art. 112, § 2º" em 15 px atenuado, com a norma e o Dispositivo em negrito na tinta, e a hora em 13 px ("hoje, 22h10", "ontem, 22h10" ou "dia 12/10, 22h10"; nunca conta dias fora). Aparece com a leitura salva; a caneta de pé (76 × 104) aparece com a folha, mesmo sem leitura. Com o Dia fechado a linha fica só em texto: a caneta vai para o Resumo do Dia.
- **Pontos do Dia (P3):** Leitura, Cartões e Frases, cada um com um ponto de luz de 22 px e o nome em 13 px, peso 600: apagado (anel na tinta a 55%, 3,4:1 na areia), aceso pela metade (atual) e aceso (feito), com o estado também em texto para o leitor de tela ("Leitura, feito hoje"). Feito: houve atividade hoje e nada mais está na vez. Atual: é o que o Agora oferece, ou foi começado hoje e ainda há o que fazer. Apagado: ainda não hoje (um anel não cobra, nem quando nada vence). O ponto acende uma vez em 160 ms, na visita ao Hoje em que ficou aceso (feito) e na anterior, no mesmo dia, ainda não estava; o que passa a ser a vez (pela metade) aparece sem animação, dispensar a sugestão não acende nada, a primeira visita do dia abre quieta, e com `prefers-reduced-motion` ele aparece aceso.
- **Em seguida:** até 2 itens (a mesma decisão do Agora, sem o que ele já mostra nem o que a pessoa dispensou), nome em negrito 600 e tempo em 13 px, sobre a areia. Só texto: sem botão, porque a ação é uma só.
- **Para lembrar (P7b):** uma nota livre sobre o que fazer fora do app (D-D5, resposta 6), sob o "Em seguida", sobre a areia. Título em etiqueta de 13 px em caixa-alta, como o "Em seguida"; campo de 3 linhas (mínimo 5,5 rem) com o texto de apoio "O que fazer fora do app"; "Salvar" é o botão secundário (o vidro é do Agora), sempre ligado, e ao lado o estado no tamanho de `.dica`: "Ainda não salvo." ou "Salvo." (`role="status"`). Sair do campo também grava: o texto escrito e não salvo não some ao tocar em "Começar" ou noutra aba. Falha de gravação é um aviso `.aviso.falha` com `role="alert"`; o texto fica no campo e sair dele de novo, ou "Salvar", tenta outra vez. Até 500 caracteres, texto simples; a partir de 450 o contador "n/500" aparece no canto da linha, porque colar mais que o teto corta sem dizer. Sem data, lista, hora nem aviso: não vira tarefa nem entra no cálculo do Agora, e vazio é um estado normal.
- **Resumo do Dia (P3):** cartão com o que houve em linhas curtas (Sessões, cartões e Frases revisados) e o próximo passo; "Fechar o Dia" é um botão secundário (o vidro é do Agora). Fechado, mostra o quadro do cacto com a caneta largada nele e a legenda do que ela desenhou hoje, "Bom descanso." e "Reabrir o Dia".

- **Listas (P6):** em linhas sobre a areia, com o filete entre elas: título em 600, uma linha de apoio atenuada e a seta de traço único à direita, alvo de 64 px (`LinhaLista`; no Acervo, a marca de 22 px à esquerda). O cartão fica para o que agrupa: um formulário com os botões dele, a Sessão em andamento, o resumo do que houve. O "Voltar" vem acima do título, com a seta. A Estrela do Leitor tem a caixa de 44 × 44 (à esquerda da calha, nunca sobre o texto; 40 × 44 no celular e no cartão do modo foco, onde a folga é de 16 px), sem mexer na altura da linha.

### Inputs / Fields

- **Style:** altura 48, contorno de 1,5 px em #727c8f, raio de 12 px, fonte de pelo menos 16 px, rótulo sempre visível.
- **Focus:** o anel de foco padrão. **Placeholder:** tinta a 70% ou mais. **Caixa e rádio:** marca de 22 px num rótulo de 44; marcada = tinta cheia com a marca em cal.

### Fixar e revisão (P5)

- **Abas do Fixar:** Frases · Cartões · Histórico, no trilho da areia funda; `/recall` cai nas Frases. Os Erros não são aba: a lista com filtros é a página `/recall/erros` ("Erros" e "Voltar às frases"), a que se chega por "Ver os erros, com filtros" no fim da lista de Frases (também sem Frase nenhuma); o detalhe do Erro volta a ela.
- **Linha de frase:** o texto em Literata e, à direita, "Esconder trecho" como botão de texto sublinhado de 44 px (era 139 × 29).
- **Estado por palavra e desenho:** o desenho (SVG de um traço, `currentColor`, 18 px) vem antes da palavra, na tinta: "Errei" (xis) e "Acertei sem certeza" (interrogação) na lista de Erros, "Para revisar" (relógio) no cartão que já está no prazo, e "De novo" (setas), "Difícil" (onda) e "Fácil" (marca) nas respostas. Nunca vermelho, nunca glifo de texto.
- **Cartão atual:** uma coluna só (40 rem a partir de 700 px) com a faixa da Sessão, o topo, o cartão e as respostas. No topo, "Sair" (texto sublinhado), o andamento ("1 de 4") e, no canto, a caneta encostada (56 × 76), fora do cartão, com a ponta 7 px dentro da borda dele. As respostas são três botões de borda de 2 px numa linha (até 379 px, com o desenho sobre o rótulo); "Mostrar resposta" é o único vidro.
- **Fim de rodada:** a caneta deitada em repouso (104 × 58) acima do título ("Feito.", ou o sotaque, uma em três), "Amanhã: N cartões." e as ações centradas: "Seguir para as frases (N)" em vidro e "Voltar ao Fixar" em texto. Sem cachorro e sem desenho próprio: quem desenha é o Resumo do Dia, uma vez por Dia fechado.

### Navigation

- **Abas das áreas:** Hoje, Trilha, Fixar e Biblioteca, sobre a areia. Até 899 px, presas embaixo, com filete em cima, ícone de 22 px sobre o rótulo de 13 px, aba de 56 px (no tablet em pé, juntas no meio, em até 560 px); a partir de 900, no centro do cabeçalho, só o rótulo, em pílula de 44 px. A atual em cal, com a sombra fresca e o rótulo em negrito. Com o teclado aberto, as abas de baixo saem da frente (`data-teclado` na casca). Os nomes vêm de um mapa só (`ROTULO_DA_AREA`); as rotas seguem `/plano` e `/recall`.
- **Cabeçalho:** "Arretado" em Gabarito 700 com o cacto em vidro, Ajuda (texto) e Conta (ícone de pessoa num alvo de 44); a partir de 900 px, "Registrar erro" neutro com a tecla E ao lado.
- **"+" no título:** redondo, 44 px, cal com tinta e a sombra fresca, na linha do título do Hoje e do Fixar; abre o registro de erro. Não é vidro. A tecla E registra de qualquer tela.
- **Rodapé:** o aviso curto e "Backup e dados" como botão de texto de 44 px, no fim do conteúdo.

### Leitor da lei (signature)

Coluna de 70 ch em Literata sobre a areia. O trecho lido, do começo da norma até o "lido até", vai sobre uma faixa de cal (raio 8, 12 px de folga de cada lado do texto; à direita, no máximo metade do recuo lateral da casca, 8 px no celular, para a cal não encostar na borda da tela), e "Lido até aqui" fecha o lido com o rótulo em 13 px, peso 700, e a caneta deitada ao lado. Controles: o seletor de fonte numa pílula (A−, 18 px, A+) e "Destaques" (ligado, tinta cheia com o texto em cal), com a legenda dos sublinhados numa linha (Prazos, Exceções, Absolutos, Penas). A régua de leitura é em tinta (segue o dedo; a luz nunca segue). O dock é uma pílula sólida (a superfície, sem desfoque) com Buscar, Filtrar, Ações e Modo foco, e o "Lido até aqui" de vidro de ação ao lado; o modo foco tem penumbra, cartão e bandeja nos mesmos tokens. A Estrela é a estrela de luz de quatro pontas com contorno na tinta e aro na cor do chão, com herança por bloco (direta, herdada, exceção) e a faixa da calha em vidro. A partir de 700 px, a estrutura da norma fica ao lado do texto: o bloco de agora (o último cabeçalho que passou de um quarto da tela abaixo do alto) e os irmãos dele (as seções do capítulo) com um ponto de luz do estado (lida, em leitura, ainda não lida), o de agora em cal e os blocos de dentro dele logo abaixo. A partir de 1200 px as ferramentas saem do canto e ficam num trilho na margem da direita (o dock em pé e o "Lido até aqui" embaixo dele), à altura da estrutura da norma. Sem mascote.

### A caneta (signature)

Coluna de vidro com dois braços, do ciano ao verde (#dffcff, #9af0dc, #5fcf8f, #2b8f5e, #17422f), brilho de borda, três pontos de luz nas pontas dos membros e a ponta cônica escura com o ponto de luz. Três poses fixas: encostada a 35° na folha do Agora (Hoje; no Fixar, no Cartão atual), deitada a 65° ao fim de "Lido até aqui" (Leitor), largada no canto do quadro do cacto (Resumo do Dia); em repouso, deitada, no fim de rodada do Fixar. Muda de lugar por salto, nunca gira nem desliza; no quadro, ela anda sobre o traço que desenha e volta a ser largada. Nunca botão, painel, fundo de texto, nem mais de uma por tela. Decorativa (`aria-hidden`). O ícone do app (P7) é a mesma caneta a 35° sobre a areia, em cores fixas do tema claro e sem sombra, no favicon, no ícone instalável e no do iOS (a versão "maskable" leva a caneta inteira dentro do círculo de 40%).

No código (`componentes/Caneta.tsx`): uma caneta de pé desenhada com a ponta em (32, 200) e girada em torno dela, 35° encostada e 65° deitada; as cores vêm dos tokens `--caneta-0` a `--caneta-4`, `--caneta-miolo`, `--caneta-borda` e `--caneta-brilho` (o tema os troca, e o componente não leva cor literal), e o halo da ponta são dois círculos cujas opacidades (`--caneta-halo-dia`, `--caneta-halo-noite`) o tema troca. A "largada" é a deitada posta no canto do quadro do cacto (`QuadroDoCacto` a move dentro do próprio `<svg>` com `CanetaDesenho`). No Hoje, a caneta passa por salto da folha do Agora (Dia aberto) para o Resumo do Dia (Dia fechado).

### O quadro do cacto (A caneta que desenha)

Um desenho de traço em 16 partes que cresce a cada Dia fechado: o chão, o tronco, os dois braços, as nervuras e os espinhos, três flores, o sol, as aves, o calango, a nuvem, a chuva, o capim, o tatu-bola e a borboleta. O Dia fechado de número N desenha a parte ((N − 1) mod 16) + 1; depois da 16ª, o Dia seguinte abre uma folha nova. Conta Dias fechados, nunca uma sequência: faltar um Dia não apaga nada, e nenhum número aparece na tela. Só no Resumo do Dia, depois de fechar (`componentes/quadro/`). A caneta sai do repouso, anda sobre cada fio enquanto ele se faz e volta a ser largada. A cena é decorativa (`aria-hidden`); a legenda ("Hoje a caneta desenhou o chão.", `role="status"`) só é dita quando a parte terminou. Cores por papel: vidro = o cacto, tinta = bichos e flores, tinta 2 = chão e nuvem, caramelo = só o sol e o miolo das flores.

### O traço de seleção e a passagem do cartão

O **traço** (`componentes/traco/`): ao escolher uma área, uma aba da Biblioteca ou uma resposta, uma linha fina (tinta de dia, luz à noite) se desenha em volta do item, com a ponta de luz à frente, e some. A **passagem** (`componentes/passagem.ts`): ao responder um Cartão ou uma Frase, o cartão sai para a esquerda e o seguinte entra pela direita; o último cartão não passa, o fim da rodada toma a tela. `movimentoAgora()` (`apresentacao/movimento.ts`) é lido na hora de usar: **reduzido** (`prefers-reduced-motion`) não anda nada, o quadro aparece pronto e o cartão troca na hora; **Calmo** (só o perfil Calmo, escolhido em Conta › Perfis) mantém o desenho do Dia, mas o traço só aparece e esmaece e o cartão só esmaece; **normal** (o padrão, sem perfil, e os perfis Guiado e Leitura) desenha o traço e desloca o cartão. Tempos em `docs/design/sistema-visual.md`.

## Do's and Don'ts

### Do:

- **Do** manter um só botão de vidro por tela, e dar a ele o texto de uma ação ("Continuar", "Começar").
- **Do** pôr lista em linhas sobre a areia e deixar o cartão para o que agrupa.
- **Do** usar cal para "onde estou", tinta para o texto e o marcado, a luz só para estado.
- **Do** mostrar onde a pessoa parou (a Norma e o Dispositivo exatos) e que está tudo salvo.
- **Do** medir todo par de cor novo em `scripts/contraste.mjs` nos dois temas antes de usar.
- **Do** respeitar `prefers-reduced-motion` (pontos acesos e quadro do cacto pronto) e `prefers-contrast`. Movimento de 160 a 220 ms, `cubic-bezier(.2, .7, .2, 1)`, só quando explica.
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
