# Contrato da direção: Tinta e noite (dia "Tinta e marca-texto", noite "Noite de mandacaru")

Escolhida pelo Gabriel nas pranchas da marca v2 (thread "Marca e identidade visual", 19/10/2026: os mundos às 18:04Z, o mundo 3 dispensado às 18:19Z) e autorizada para o app às 19:25Z ("pode implementar os mundos quando resetar o uso diário"). Registro da decisão: [`../../decisoes-design.md`](../../decisoes-design.md) (D-D9). Execução em fases (Q1 a Q8): [`../../../planos/tinta-e-noite.md`](../../../planos/tinta-e-noite.md). Este contrato é o que toda construção e toda revisão da D-D9 seguram o trabalho contra. **Vale sobre a seção "Visual vigente" da skill `arretado-design-principles`**, que fica falsa desde a Q1 e só é reescrita na Q8 (caminho protegido, PR próprio com o rótulo `aprovado-gabriel`). O contrato da D-D7 ([`../2026-10-18-ponto-de-luz/contrato.md`](../2026-10-18-ponto-de-luz/contrato.md)) fica como histórico, marcado superado.

**De onde vêm os valores.** As pranchas ficam nos arquivos do projeto, fora do repositório (`redesenho/marca/v2/canvas/project/`: `m2-*.dc.html` no dia e `m1-*.dc.html` na noite, cada mundo com identidade, agora, vazio, dia-fechado e agora-aberto; o mapa está em `redesenho/marca/v2/LEIAME.md`), e o repositório não as enxerga. Por isso os valores abaixo são cópia das regras `.w2` e `.w1` de `m2-agora` e `m1-agora` (e do que `dia-fechado` e `vazio` acrescentam). Onde a prancha não desenha (Leitor, Fixar, Trilha, Biblioteca, Conta, Sessão, Orientações, tablet e desktop), a fase deriva a regra dos dois mundos e mostra folhas antes e depois (suposição 6 da decisão). O kit da marca (escrita do nome, lockup, caneta) é só de geometria e lê variáveis CSS; a paleta é deste contrato.

## Tese

Duas luzes para o mesmo estudo. De dia, tinta sobre papel: texto, ação e ponto em tinta azul-noite sobre um papel quase branco, a folha branca com um filete, formas angulares, o botão com a sombra baixa e dura de 2 px, e a lima do marca-texto só como halo atrás do ponto de "onde parei" (nunca fundo de texto). À noite, a Noite de mandacaru: noite azul funda, a serra um tom acima, texto frio, formas arredondadas, sem filete nem sombra, e o ponto âmbar. A promessa é a mesma nos dois (voltar de onde parou, uma coisa por vez) e o tema escolhe o mundo: o interruptor de tema é o de sempre.

## Os dois mundos

Paletas cruas, fixas nos dois temas em `:root` (o que muda de tema são os papéis, na seção seguinte). A da noite leva o prefixo `--n-` porque `--linha` e `--luz` já existem no dia.

| Dia (mundo 2) | Valor | Noite (mundo 1) | Valor |
|---|---|---|---|
| `--papel` (chão) | `#F6F8FB` | `--n-noite` (chão) | `#0B1322` |
| `--folha` | `#FFFFFF` | `--n-serra` (folha) | `#131D31` |
| `--tinta` (texto, ação, ponto) | `#0F1C3A` | `--n-serra-2` (campo, "+", chip) | `#1C2942` |
| `--tinta-2` (atenuado) | `#4A5878` | `--n-texto` | `#EEF2FA` |
| `--tinta-funda` (sombra do botão) | `#0A1428` | `--n-texto-2` (atenuado) | `#A4B1CB` |
| `--contorno` (contorno de controle) | `#6E7A96` | `--n-luz` (ação, foco, traço) | `#F2F6FF` |
| `--linha` | `#838FA7` | `--n-ambar` (o ponto de "onde parei") | `#FFC53D` |
| `--filete` (borda decorativa) | `#DDE2EA` | `--n-borda` (borda decorativa) | `#34425E` |
| `--marca` (lima, só halo) | `#EEFA4B` | `--n-linha` (contorno de controle) | `#5C6B8C` |
| | | `--n-vidro` (hover, vidro da caneta) | `#9DB7E8` |

## Mapa dos papéis (como a Q1 os deixou)

Os nomes dos papéis não mudaram; mudaram os valores. O papel novo `--luz` é a "luz do mundo": tinta de dia, `--n-luz` à noite. Quase todo papel de destaque é apelido dele, e o tema o troca num lugar só.

| Papel | Dia | Noite |
|---|---|---|
| `--fundo` | papel | noite |
| `--superficie` | folha | serra |
| `--superficie-2` (provisório) | tinta a 5% sobre o papel | serra 2 |
| `--texto`, `--titulo` | tinta | texto |
| `--texto-atenuado` | tinta 2 | texto 2 |
| `--borda` (decorativa) | filete | borda |
| `--borda-campo`, `--borda-botao` | contorno | linha |
| `--borda-forte` | tinta | texto 2 |
| `--luz` | tinta | luz |
| `--foco`, `--acao`, `--link`, `--cacto`, `--andamento`, `--lugar`, `--estrela`, `--fio-selecao`, `--ponto-luz`, `--ponto-contorno`, `--selecionado-fundo`, `--bloco-acao`, `--bloco-foco` | `--luz` | `--luz` |
| `--acao-texto`, `--bloco-acao-texto` | `#FFFFFF` | noite |
| `--acao-hover` | 80% tinta e 20% tinta 2 | 88% luz e 12% vidro |
| `--ponto-halo` (novo) | marca (lima) | âmbar |
| `--ponto-apagado` | tinta 2 | texto 2 |
| `--selecionado-texto` | folha | noite |
| `--penumbra` | tinta a 10% sobre o papel | `#060A13` |
| `--sucesso` | texto (sem verde) | texto |

Provisórios, a refazer na fase que toca a peça: `--caneta-*` (13 tokens, ainda o vidro verde da D-D7; viram `--pen-*` na Q4), `--caramelo` (sol e miolo das flores do quadro do cacto), `--atual-fundo` e `--atual-sombra` (a aba atual vira texto em negrito com o traço de caneta embaixo na Q2; o anel é provisório), `--quente` (apelido morto de `--superficie-2`), `--destaque-*`, `--grifo-*`, `--perigo`, `--aviso-*` (as pranchas não os desenham: o matiz fica e o contraste é medido).

## Forma por mundo

O dia é angular e leva filete; a noite é arredondada e sem filete. Estes tokens existem nos três blocos de tema (`:root`, o escuro por preferência do sistema e o escuro manual) e os papéis de raio apontam para eles.

| Token | Dia | Noite |
|---|---|---|
| `--raio-botao` (botão, campo) | 6 px | 12 px |
| `--raio-folha` (folha do Agora, cartão, bloco-herói) | 8 px | 14 px |
| `--raio-chip` (chip, opção de troca) | 6 px | 10 px |
| `--sombra-botao` | `0 2px 0 #0A1428` (ao apertar, desce 1 px e a sombra vai a 1 px) | nenhuma (ao apertar, escala 0,975) |
| `--borda-folha` | 1 px sólida `--filete` (`--sombra-folha`: `inset 0 0 0 1px`) | nenhuma |
| `--peso-titulo` | 800 | 700 |
| `--fonte-titulo` | Schibsted Grotesk | Familjen Grotesk |

Alvo de 44 px, piso de 13 px, foco visível de 2 px (`outline-offset` 3 px, em tinta de dia e em luz à noite) e contraste AA continuam. Botão, campo, folha, cartão e bloco-herói já seguem os tokens (os papéis `--raio-*` apontam para eles); ficam fora 15 raios literais (2, 4, 6, 8, 12, 22 e 26 px) e dois tokens ainda sem uso, `--raio-chip` e `--borda-folha`: a Q3 os liga.

## Letras

- **Títulos.** Dia: **Schibsted Grotesk** 800, `letter-spacing -.02em`. Noite: **Familjen Grotesk** 700 (o `h2` da folha do Agora é 600 na prancha da noite), `letter-spacing -.015em`. Variáveis e hospedadas em `src/apresentacao/fontes/` (nunca CDN), licença OFL (os dois textos estão na pasta). O arquivo da Schibsted vai de 400 a 900 (46.752 B), o da Familjen de 400 a 700 (18.916 B). O `index.html` pré-carrega uma por `prefers-color-scheme`, então cada pessoa baixa só a do tema do aparelho.
- **Interface.** Atkinson Hyperlegible Next. As pranchas usam o peso 600 em vários rótulos; o app tem 400, 500 e 700 e casa o 600 com o 700 (a variável 400 a 800 seria opcional, ajuste futuro).
- **Lei.** Literata (18 px ajustável, até 70 ch, sem itálico), como sempre. "Sem serifa" (Conta › Aparência) troca só a letra da lei.
- **Escala da prancha (celular).** `h1` 40/1; `h2` da folha 26/1,15; "Retomar em" 15/1,35 com o artigo em 17/24 e peso 700; rótulos de ponto, aba e botão secundário 600 a 15 px (aba 13 px); botão principal 700 a 17 px; dica e legenda 13 e 14 px; corpo 16/1,4. Piso do app: 13 px.

## Cabeçalho e abas

- **Cabeçalho.** Altura 60, `padding 0 8px 0 20px`. À esquerda o lockup da marca (nome "arretado" escrito num traço só, em minúsculas, com o cacto simplificado ao lado e o ponto de luz; 144 px de largura, alvo de 44 px de altura, `aria-label`); no lugar do "Arretado" em Gabarito com o cacto de vidro. À direita Ajuda (texto 600 a 15 px, alvo 44) e Conta (ícone de pessoa, 44 × 44); ícones de 24 px, traço de 1,8.
- **Título e "+".** `padding 6px 16px 0 20px`; o "+" é redondo de 48 px: no dia, borda de 1,5 px em `--contorno` e fundo folha; na noite, borda de 1 px em `--linha` e fundo serra 2.
- **Abas** (Hoje · Trilha · Fixar · Biblioteca). Barra de 80 px (8 de folga), borda de cima de 1 px em filete (dia) ou borda (noite), fundo do chão, quatro colunas. Cada aba: ícone de 24 (traço 1,7) sobre o rótulo de 13 px 600, `gap` 4, alvo de 44. **A atual** é tinta em negrito (dia) ou luz (noite) com um **traço de caneta embaixo**, persistente: 30 × 6 a 5 px da base (dia) e 28 × 6 a 4 px (noite), traço de 2 px, ponta redonda. Acaba a aba "em cal"; a aba atual deixa de depender de contraste entre folha e chão.
- Tablet (700 a 899 px) e desktop (900 px ou mais) seguem derivados do celular, com a barra no alto, sem prancha: a Q2 deriva e mostra.

**Como a Q2 aplicou (casca, 19/10/2026).** Folhas antes e depois em [`docs/redesign/tinta-e-noite/q2/`](../../../redesign/tinta-e-noite/q2/).

- **Tokens da casca** (nos três blocos de tema; o teste exige os mesmos valores nos dois blocos escuros): `--marca-ponto` (dia `--ponto-luz`, a tinta; noite `--ponto-halo`, o âmbar), `--marca-disco` (dia `--ponto-halo`, o halo de lima de raio 20; noite `transparent`), `--espessura-contorno` (1,5 px / 1 px; o Chromium arredonda a borda de 1,5 px para 1 px, ver `solucao-de-problemas.md`) e `--fundo-controle` (folha / serra 2). A Q3 reaproveita os dois últimos em campo, chip e botão secundário.
- **Lockup.** O SVG da prancha (`LockupParado.tsx`, mesma geometria do kit, `viewBox` `-14 18 1015 154`), 9 rem (144 px) de largura, no link `.marca` de 44 px de altura; o traço segue `--texto`, o ponto é o único objeto de cor (o halo só no dia).
- **Traço da aba atual.** Uma forma só nos dois mundos, a do dia (30 × 6, `M2 4 C9 2.6 19 4.4 28 2.2`, 5 px da base): a prancha da noite tem uma variante de 28 × 6 a 4 px, que difere em 1 px e não compensou um segundo caminho. É máscara de CSS pintada por `--luz` (sem JS). O `TracoDeSelecao` (D-D8) segue nas abas: o contorno que se desenha ao toque é a resposta do toque; o traço de baixo é o estado.
- **Medidas da casca.** Barra de baixo de 80 px (era 77: 1 de borda, 71 de aba, 8 de folga ou a área segura), quatro colunas sem vão, ícone de 24 (traço de 1,7) sobre o rótulo de 13 px, `gap` de 4. Cabeçalho de 60 px (era 58), "+" de 48 px (era 44) e ícone da Conta de 24 px (era 22).
- **Tablet em pé (700 a 899 px), derivado.** Mantém a barra de baixo (o corte de 900 px é o da P2): as quatro colunas ficam numa faixa centrada de 35 rem, como a coluna de leitura, em vez de se esticar pela tela. Se o Gabriel quiser as abas no alto já nessa faixa, é mover o corte.
- **Desktop e tablet deitado (900 px ou mais), derivados.** As abas passam para o cabeçalho, no centro, só com o rótulo (15 px) e o traço de caneta 3 px acima da base da aba; o lockup fica no começo da coluna do conteúdo (alinhado ao título) e, à direita, "Registrar erro" (tecla E), Ajuda e Conta.
- **Cabeçalho sem filete na prancha.** A prancha não tem linha embaixo do cabeçalho; o app mantém o filete de 1 px (`--borda`), que separa o cabeçalho do conteúdo quando a página rola. Fica assim até o Gabriel decidir (poderia aparecer só depois de rolar, com `animation-timeline: scroll()`).
- **`--atual-fundo`, `--atual-texto` e `--atual-sombra`** deixam de pintar as abas de área, mas seguem nas abas de página (`.abas`, Q3) e na estrutura da norma (Q7); saem na Q8.

## Hoje

- **Pontos do Dia** (Leitura, Cartões, Frases). Lista com `gap` 20, rótulo 600 a 15 px em `--texto-atenuado` (o atual em `--texto`), ícone de 22 px; o estado também está no texto escondido (", em andamento", ", ainda não", ", feito"). **A forma muda por mundo.** Dia: aros irregulares, desenhados à mão e girados um a um, em tinta 2 com traço de 1,5 (ainda não); o atual leva o aro em tinta e uma hachura de rabisco (traço de 2,1, seis riscos) clipada por dentro; o feito, o aro em tinta com o rabisco cobrindo o círculo todo (doze riscos). Noite: círculo de raio 8 com anel de 1,6 em texto 2 (ainda não); o atual tem o anel em luz e a metade esquerda cheia em luz; o feito é o círculo cheio em luz.
- **"Retomar em".** Substitui "Você parou em" **só na linha do Hoje**: "Retomar em" + o artigo exato em negrito (`LEP, art. 112, § 2º`, 17/24) + "salvo hoje, 22h10" (hora com `tabular-nums`; a frase final vem de `parada.ts`). Margem `22px 20px 0`, largura máxima 210 px, 15/1,35 em atenuado. No dia, o artigo leva uma faixa de marca-texto desenhada (traço de 2,4 px em tinta, ponta redonda) e, ao final, o ponto de tinta com o halo de lima de 5 px; a lima só no halo. As outras ocorrências de "Você parou" (Biblioteca, Leitor, Fechar o Dia) ficam como estão e vão numa lista para o Gabriel decidir (suposição 4).
- **Folha do Agora.** Margem `14px 16px 0`, `padding 24px 20px 0`; dia: folha com filete e raio 8; noite: serra e raio 14. Título 26/1,15 (Schibsted 800 / Familjen 600); estimativa 16 px em atenuado. A caneta fica encostada na borda de cima, à direita (x = 308 de 358), a 35°, na escala 0,34.
- **Botão principal.** 52 px de altura, largura total, 700 a 17 px. Dia: fundo tinta, texto `#FFFFFF`, raio 6, sombra `0 2px 0 #0A1428`. Noite: fundo luz, texto `#0B1322`, raio 12, sem sombra. Um botão principal por tela. "Escolher outra coisa" é link sublinhado (1 px, `offset` 4), 600 a 15 px, alvo de 44.
- **"Em seguida".** Menu expansível nativo (`<details>`): fechado mostra o rótulo, o que vem e a seta de 24 px; aberto, a lista com divisória de 1 px (filete / borda) e, por atividade, uma linha de 56 px com o nome, a nota (13 px, `tabular-nums`) e o botão "Trocar" (sublinhado, alvo de 44). Ao abrir uma atividade, as opções de troca em chips de 44 px de altura (`padding 0 14px`, raio 6 / 10, borda de 1,5 / 1 px em contorno / linha, 600 a 14 px; escolhido = tinta cheia / luz cheia). A seta gira 180° em 180 ms e a lista entra em 180 ms; o rodapé some com o menu aberto. O rótulo "Em seguida": Schibsted 800 a 15 px (dia), Atkinson 700 a 14 px (noite), em atenuado. O sumário precisa de rótulo acessível e de Enter e Espaço (a prancha foi testada). As opções de troca são só desenho na prancha: ver suposição 3.
- **Rodapé do Hoje.** 13 px em atenuado, centralizado; o link é 600, sublinhado, com `padding` vertical de 14 para dar alvo.

## Dia fechado e estado vazio

- **Dia fechado.** A folha leva `padding 22px 20px 18px` e, diferente da folha do Agora, uma borda de 1 px em `#838FA7` (dia, mais escura que o filete) ou em `#34425E` (noite, onde a folha do Agora não tem borda). O quadro mede 318 × 200, raio 6 / 12, no fundo do chão (`--cq-fundo`). No dia: chão do quadro em `--linha` (1,5), aro do cacto em tinta, miolo no fundo, núcleo em tinta (3,4), a parte de hoje em tinta com contorno de 2,2 e o halo de lima que cresce uma vez. Na noite: chão em borda (2), aro em vidro a 70%, núcleo em luz, a parte de hoje em âmbar com contorno de luz. Legenda 14 px em atenuado; "Amanhã você começa de onde parou" fica como está (suposição 5). "Reabrir o Dia": botão secundário de 44 px, raio 6 / 12, borda de 1,5 px em contorno / linha, fundo folha / transparente. O quadro do cacto de 16 partes, a regra do Dia N e o movimento em três modos da D-D8 valem; muda só a cor.
- **Vazio.** Folha com margem de 38 de cima e 296 de altura; sob o título e a frase, os começos em coluna com `gap` 10: o principal (como acima) e os demais botões secundários de 52 px (600 a 16 px, borda de 1,5 px em contorno / linha, fundo folha / transparente, raio 6 / 12). Os estados carregando, offline e erro não têm prancha: derivam das mesmas regras (suposição 6).

## A caneta de vidro

Toda de vidro, ponta incluída, com o miolo de tinta à vista (pedido do Gabriel, 17:49Z e 17:52Z, feito nas pranchas). Geometria de `pen.mjs` do kit: 120 × 270, ponta em (60, 262), aro por máscara, dois filtros (halo e sombra), cores por variáveis `--pen-*`. É a única peça com volume e com gradiente: o vidro (de `--pen-vidro` a `--pen-vidro2`) e o furo de tinta (de `--pen-tinta` a `--pen-tinta2`). Decorativa (`aria-hidden`), no máximo uma por tela.

| Variável | Dia | Noite |
|---|---|---|
| `--pen-rim` (aro) | `#0A1428` | `#9DB7E8` |
| `--pen-vidro`, `--pen-vidro2` | `#EDF0F6`, `#C7CEDB` | `#9DB7E8`, `#9DB7E8` |
| `--pen-vidro-a` (opacidade do vidro) | 0,9 | 0,14 |
| `--pen-tinta`, `--pen-tinta2` | `#0F1C3A`, `#0F1C3A` | `#FFF1C2`, `#FFC53D` |
| `--pen-brilho` | `#FFFFFF` | `#E8F0FF` |
| `--pen-halo`, `--pen-halo-op` | `#EEFA4B`, 1 | `#FFD978`, 0,9 |
| `--pen-esfera` | `#0F1C3A` | `#FFFBE8` |
| `--pen-luz` | `#FFFFFF` | (não definida; vale a do kit) |
| `--pen-sombra`, `--pen-sombra-op` | `#0F1C3A`, 0,16 | (não definida), 0 |

As poses são as da D-D7 (encostada a 35° na folha do Agora e no Cartão atual, deitada ao fim de "Lido até aqui" e no quadro do cacto); as pranchas só mostram os 35°, então a deitada fica como está até a Q4 provar o contrário. O halo do dia é lima, o da noite âmbar. Os ícones do app (favicon, `icone-*.png`, maskable, `apple-touch-icon`) passam a ser a caneta nova sobre o papel (Q4); até lá seguem os da D-D7.

## Escrita do nome e virada em cacto

Resumo do `escrita-contrato.md` do kit, para quem constrói a Q6 sem ver a pasta do projeto. **Fechado, sem reabrir sem o Gabriel:** nome em minúsculas, um traço só (largura 18), o "t" simples (o t-cacto leu "arreψado"), o cacto simplificado ao lado do nome com o mesmo traço (tronco e dois braços em L, o esquerdo mais alto), o ponto de luz = "onde parei", e o **final B** (19/10/2026, 17:41Z): depois de escrever, a caneta volta ao começo, corre sob o nome deixando um traço de luz e vira o cacto; o final A (vira o cacto direto, 2,15 s) fica de reserva.

- **Geometria** (coordenadas do letreiro, base y = 151): 14 traços na ordem da mão (a2 r2 r2 e1 t2 a2 d2 o1; o "o" termina em x = 800); cacto com o tronco em x = 923 (`M923 151 V37`), braço esquerdo `M923 111 H890 A24 24 0 0 1 866 87 V65`, braço direito `M923 131 H956 A24 24 0 0 0 980 107 V87`; ponto de luz em (980, 87), raio 11; traço de luz do final B em `M-2 182 H812`. `viewBox` animado `-43 -8 1048 204`, do par parado `-14 18 1015 154`.
- **Tempos** (`--k` = 1, ciclo de 4 s): a caneta pousa em 0,20 s; escreve os 14 traços até 1,50 s (cada traço de 33 a 87 ms, pausa de 70 ms entre letras, curva `cubic-bezier(.4,0,.3,1)`); no B, volta por baixo (1,50 a 1,72 s), corre sob o nome deixando o traço de luz (1,74 a 2,02 s) e vira o cacto (2,04 a 2,64 s). **Modo curto** (`--d:-1.45s`): nome já escrito, 1,2 s. Esses tempos passam do limite de 800 ms de entrada que a pesquisa recomenda; é de propósito (pedido do Gabriel: letra a letra e a virada visível).
- **Estados.** `prefers-reduced-motion`: o quadro final na hora. Perfil Calmo (classe `calmo`): só o desenho esmaece, em 0,24 s. `pulou`: vai ao quadro final. Uma vez por abertura (`--n` = 1).
- **Frequência (suposição 2, ainda aberta com o Gabriel):** completa (2,6 s) na primeira abertura no aparelho, curta (1,2 s) na primeira abertura de cada Dia, parada nas demais e sob movimento reduzido ou Calmo; uma constante só.
- **Suporte.** `d: path()` animado e `offset-path` em keyframes valem no Chromium e no Firefox (Safari recente no segundo); sem eles, `@supports not` esconde a luz e mostra o cacto por dissolvência. Os dois planos de reserva só foram lidos no CSS, nunca exercitados.

## Acabamento e movimento

Sem textura, sem foto, sem 3D, sem vidro desfocado (`backdrop-filter: none`, o E2E do Leitor exige), sem iridescência. Profundidade: no dia, só a sombra dura de 2 px do botão primário; na noite, nenhuma (a folha sai do chão pelo tom). Brilho: só o halo da ponta da caneta. Gradiente: só dentro da caneta. Entre 160 e 220 ms, `cubic-bezier(.2, .7, .2, 1)`; um ponto acende uma vez; os laços de 9 s das pranchas são demonstração (no app a animação roda uma vez ou fica parada). Com `prefers-reduced-motion`, tudo aparece pronto; os três modos de movimento da D-D8 (reduzido, Calmo, normal) valem.

## Padrões permitidos

- Pontos para os itens do Dia: cada ponto reporta um estado real (feito, atual, falta).
- A sombra dura de 2 px do botão do dia: é o carimbo do mundo, não profundidade decorativa.
- O halo atrás do ponto de "onde parei" e na ponta da caneta (lima de dia, âmbar de noite): é o único brilho.
- A lima nunca é fundo de texto (1,07:1 no papel) e nunca cor de texto.
- Gradiente só dentro do vidro da caneta.

## Contrastes medidos na Q1 (`node scripts/contraste.mjs`, WCAG, nos dois temas)

| Par | Razão | Mínimo |
|---|---|---|
| Dia: tinta / papel · tinta / folha | 15,82 · 16,83 | 4,5 |
| Dia: tinta 2 / papel · tinta 2 / folha | 6,67 · 7,10 | 4,5 |
| Dia: contorno / papel · contorno / folha | 4,04 · 4,30 | 3 |
| Dia: linha / papel · linha / folha | 3,06 · 3,25 | 3 |
| Dia: botão (`#FFFFFF` / tinta) · hover | 16,83 · 14,59 | 4,5 |
| Dia: tinta / lima (o ponto dentro do halo) | 14,76 | 3 |
| Dia: filete / papel · folha / papel · lima / papel | 1,22 · 1,06 · 1,07 | decorativos |
| Noite: texto / noite · texto / serra | 16,56 · 15,00 | 4,5 |
| Noite: texto 2 / noite · texto 2 / serra | 8,61 · 7,80 | 4,5 |
| Noite: linha / noite · linha / serra | 3,48 · 3,16 | 3 |
| Noite: âmbar / noite · âmbar / serra | 11,77 · 10,66 | 3 |
| Noite: vidro / noite · vidro / serra | 9,18 · 8,31 | 3 |
| Noite: botão (noite / luz) · luz / serra | 17,16 · 15,55 | 4,5 |
| Noite: borda / noite · serra / noite | 1,85 · 1,10 | decorativos |

Duas consequências a carregar nas fases seguintes: **a folha deixa de se separar do chão** (1,06:1 no dia e 1,10:1 na noite; na D-D7 eram 1,24 e 1,20), então a separação vem do filete (dia) e do tom (noite), e nenhuma peça pode depender de "cal sobre areia"; e **`--n-linha` sobre `--n-serra-2` dá 2,72:1** e reprova o 3:1, então o contorno de controle não vai sobre a serra 2 (o "+" da prancha tem o contorno por fora, sobre a noite, a 3,48:1).

## Armadilhas do kit

- Fragmentos que são só um `<svg>` ganham um manifesto C2PA de cerca de 7,7 kB (`<metadata>` e `xmlns:c2pa`) ao serem gravados na pasta compartilhada. Não copiar para o app: gerar de novo (`node kit/escrita.mjs`, fora da pasta compartilhada) ou tirar o bloco (`s.replace(/ xmlns:c2pa="[^"]*"/, '').replace(/<metadata>[\s\S]*?<\/metadata>/, '')`). No app o teto do pacote é apertado e esse bloco não comprime.
- Dentro do SVG da escrita, todo caminho só de preenchimento precisa de `stroke="none"` (a raiz herda `stroke` e `stroke-width`). Ids de `<defs>` precisam ser únicos por instância (`uid`).
- O SVG do final B tem 49 `style="…"`; atributo `style` em HTML é bloqueado pela CSP (`style-src 'self'`), mas `style={{}}` em JSX passa (CSSOM). Gerar os 14 traços (`tracos.json`, cerca de 1,3 kB) como dado e `.map`.
- Pacote: o SVG da escrita custa cerca de 1,6 kB gzip em JSX (o lockup parado, 432 B); a folga do teto de 425 kB é pequena. Quem encostar nele mede e pede ao Gabriel (suposição 7).

## O que este contrato não decide

- Rotas, identificadores, vocabulário (Aparelho, Problema, Erro, Dispositivo, Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta) e as quatro áreas ficam como estão. Só apresentação (D-D1): nada de esquema, dado nem regra de domínio.
- O que o "Trocar" do "Em seguida" faz sem regra de domínio, a frequência da escrita do nome e as demais suposições abertas estão na decisão (D-D9) e no plano.
- O mundo 3 ("Azulejo": vidrado `#F3F6F4`, cobalto `#1B3FB8`, lavis `#DCE6FB`, ocre `#AD7400`, Geologica) foi dispensado e não entra no app.
