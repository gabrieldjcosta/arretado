# Contrato da direção: Ponto de luz, segunda versão

Escolhida pelo Gabriel no cartão da rodada 3 das direções visuais (genjutsu:bunshin, 18/10/2026, 15:46Z); construção no app autorizada por ele às 17:23Z do mesmo dia. Registro da decisão: [`../../decisoes-design.md`](../../decisoes-design.md) (D-D7). Execução em fases: [`../../../planos/ponto-de-luz.md`](../../../planos/ponto-de-luz.md). Este contrato é o que toda construção e toda revisão seguram o trabalho contra.

Página das três rodadas: https://claude.ai/artifact/5YB1iau1HZuaV9LAwkCDMb (seção "Ponto de luz, segunda versão"). Fontes do protótipo nos arquivos do projeto, em `redesenho/bunshin/.bunshin/direction/fonte/` (telas em `r3-script.js`, regras em `r2.css` e `r3.css`, caneta em `sertao-svg.mjs`, função `simboloCanetaV2`). Capturas do protótipo nesta pasta: [`hoje-celular-dia.png`](hoje-celular-dia.png), [`hoje-celular-noite.png`](hoje-celular-noite.png), [`leitor-tablet-dia.png`](leitor-tablet-dia.png).

> **Emendado em 19/10/2026 (D-D8, pedido do Gabriel):** o cachorro do Resumo do Dia saiu e a caneta passou a andar sobre o quadro do cacto, no traço de seleção e na passagem do cartão. Onde este contrato fala do cachorro, do `--traco-cachorro` ou da caneta que só muda de lugar por salto, vale [a D-D8](../../decisoes-design.md).

## Tese
A luz do sertão como tinta: areia clara, uma folha de cal com sombra fresca, e a caneta-cacto de vidro descansando exatamente onde você parou, com um ponto de luz na ponta. O futuro do sertão acontece de dia claro.

## Mundo próprio
O sertão como lugar de luz, energia, dado e prova: eólica e solar no interior, cabos de fibra na Praia do Futuro, o eclipse de Sobral (1919). O sertãopunk (2019) como recusa da lista "seca, cangaço, cordel". A caneta de vidro que o Gabriel trouxe é luz guardada num objeto; aqui ela vira o ponteiro da retomada. O oposto a evitar: marinho quase preto, um neon e vidro desfocado, que é o uniforme da categoria (fintech, Nothing, "IA"); o ícone dele está nesse lugar e a direção o traz para o dia.

## História
Abrir o Hoje e, em segundos, ver onde parei (a caneta encostada na folha do Agora, com a Norma e o Dispositivo exatos ao lado), que está tudo salvo (os pontos do Dia acesos) e qual é a uma coisa a fazer agora (a folha de cal com um botão). Ler a lei numa Sessão curta com o lido sobre a faixa de cal e a caneta deitada em Lido até aqui. Fechar o Dia e ver a caneta desenhar o cachorro num traço só.

## Primeira tela
Celular, Hoje, tema claro por padrão: marca e Ajuda no topo; título "Hoje" com o "+" na mesma linha; três pontos de luz (Leitura, Cartões, Frases); a linha de parada ("Você parou na LEP, art. 112, § 2º", hora) com a caneta inclinada à direita, ponta encostada na folha; a folha de cal "Continuar a leitura" com motivo, tempo, botão de vidro e "Escolher outra coisa"; "Em seguida" com dois itens; abas Hoje, Trilha, Fixar, Biblioteca sobre a areia com a ativa na cal. Uma ação dominante por tela.

## Forma
- Chão areia `#f1e6d3`; folha e lido em cal `#ffffff` com sombra fresca (`0 14px 28px -10px rgba(23,36,58,.16)`); tinta sombra `#17243a` (12,6:1 na areia); botão vidro `#0f7f72` com texto branco (4,9:1); ponto de luz `#6fe3d6` sempre com contorno na tinta; traço do cachorro caramelo `#c8742f`.
- Noite: chão `#0b1b33`, folha `#142a4a` (texto `#eef3f8`, 12,9:1), botão e luz `#7df3e1` com texto `#0b1b33`, traço `#ffb46b`.
- A caneta: coluna de vidro com dois braços, do ciano ao verde (`#dffcff`, `#9af0dc`, `#5fcf8f`, `#2b8f5e`, `#17422f`), brilho de borda, três pontos de luz nas pontas dos membros, ponta cônica escura com o ponto de luz. Desenhada em pé e girada: 35° encostada; 65° deitada. É o único objeto com volume e o único lugar com gradiente. Nunca botão, nunca painel, nunca atrás de texto, nunca mais de uma por tela.
- Três poses fixas: encostada na folha do Agora (Hoje; no Fixar, no Cartão atual); deitada ao fim de Lido até aqui (Leitor); largada ao fim do traço do cachorro, com a ponta no lenço (Resumo do Dia e fim de rodada).
- Pontos do Dia: apagado (anel), aceso pela metade (atual), aceso (feito). Estrela: estrela de luz com contorno.
- Letras: Gabarito nos títulos (feita por fundição brasileira para plataforma de ensino; geométrica, clara, e leva o nome da folha de respostas); Atkinson Hyperlegible Next na interface; Literata na lei. Hospedadas no app, nunca CDN. No app de loja, corpo na fonte do sistema com Dynamic Type e Gabarito só nos títulos.
- Raios: folha 16, botão 12, abas pílula. Alvo de toque 44 px. Contraste AA em todos os pares acima.
- Mascote: o cachorro em um traço só (`TRACO_CACHORRO`), caramelo pela cor, orelha semiereta, focinho e olho como pontos, lenço em V; só no Resumo do Dia e no fim de rodada, nunca no Leitor nem na Revisão.

## Acabamento
Sem textura, sem foto, sem 3D, sem vidro desfocado, sem iridescência. A profundidade vem só da sombra fresca da folha e do halo na ponta da caneta. Tudo em vetor (caneta, pontos, traço, Estrela). Tema escuro é modo de foco: mesma luz à noite, halo maior só na ponta.

## Tese de interação
Entre 160 e 220 ms, `cubic-bezier(.2, .7, .2, 1)`. Um ponto acende em 160 ms (escala 0,6 a 1, opacidade 0 a 1), uma vez. A caneta muda de lugar por salto, nunca gira nem desliza. Ao fechar o Dia, o traço do cachorro se desenha uma vez em 300 ms (linear, `stroke-dashoffset`); olho e nariz aparecem ao fim. A luz é fixa: não pulsa, não segue o ponteiro nem a rolagem; o halo só cresce à noite e só na ponta. Com `prefers-reduced-motion`, os pontos aparecem acesos e o cachorro pronto; ordem, conteúdo e ação não mudam. Proibido: brilho pulsando, lens flare, parallax, superfície iridescente, vidro desfocado atrás de texto, luz que acompanha o dedo, ciclo de dia e noite, confete, som.

## Padrões permitidos
- Pontos para os itens do Dia: o andamento em pontos já é padrão do produto, e cada ponto reporta um estado real (feito, atual, falta).
- Sombra projetada como profundidade: é a sombra fresca da luz dura do dia.
- Brilho só na ponta da caneta: é o único ponto de luz, e cresce só à noite.
- Gradiente só dentro do vidro da caneta: é o único objeto com volume.
- Chão quente (areia): é o material do mundo, não um papel de reflexo.

## Reflexos do catálogo (referência web)
Permitidos pela tese, com a razão acima: "Decorative status dots" (só como pontos do Dia, que reportam estado); "Glow and neon" (só a ponta da caneta); "Warm paper ground" (a areia). Descartados: "Glassmorphism" (vidro é objeto, nunca superfície atrás de texto), "Gradient text", "Blurred blobs", "Decorative grids and crosshairs", "Display face by reflex" (Gabarito tem razão registrada), "Numbered eyebrow", "Middle-dot runs", travessão longo (U+2014) na interface.

## O que este contrato não decide
- Rotas, identificadores, vocabulário (Aparelho, Problema, Erro, Dispositivo, Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta) e as quatro áreas ficam como estão.
- Fatos de pesquisa usados no "porquê" foram lidos pelos trechos de busca, não nas páginas; conferir na fonte antes de uso público.
