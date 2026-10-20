# Sistema visual do Arretado — v5 (Tinta e noite)

> **D-D9 (19/10/2026) — Tinta e noite.** Direção escolhida pelo Gabriel e construída na `integracao` em oito fases, Q1 a Q8 ([`../planos/tinta-e-noite.md`](../planos/tinta-e-noite.md); decisão em [`decisoes-design.md`](decisoes-design.md), D-D9; valores copiados das pranchas em [`referencias/2026-10-19-tinta-e-noite/contrato.md`](referencias/2026-10-19-tinta-e-noite/contrato.md)). São dois mundos, e o tema escolhe: o dia é o mundo 2, **"Tinta e marca-texto"** (papel azulado, folha branca com uma linha fina, tinta azul-noite, a lima só como halo, Schibsted Grotesk, formas angulares, o botão principal com a sombra dura); a noite é o mundo 1, **"Noite de mandacaru"** (noite azul, serra, luz, âmbar, Familjen Grotesk, formas arredondadas, nenhuma sombra). O interruptor é o de sempre (Conta › Aparência: claro, escuro ou igual ao aparelho). A D-D7 (Ponto de luz, [`../planos/ponto-de-luz.md`](../planos/ponto-de-luz.md)) e as anteriores ficam como histórico.

Base: as decisões D-D1 a D-D9 em [`decisoes-design.md`](decisoes-design.md); onde uma delas diverge da D-D9, vale a D-D9. Resumo no formato do Stitch: [`../../DESIGN.md`](../../DESIGN.md). Só apresentação (D-D1).

**Fonte de verdade dos valores:** `src/apresentacao/estilos.css` (e os CSS dos pacotes). Este texto foi conferido contra eles na Q8 (20/10/2026), com a Q1 a Q7 na `integracao`. Contraste de cada par: `scripts/contraste.mjs` (e `npm run check`).

## Princípios

1. **Uma ação dominante por tela**, na luz do mundo: o botão cheio, com texto branco sobre a tinta de dia e o texto da noite sobre a luz à noite.
2. **Cor tem função** (tabela abaixo). Nada de cor "de enfeite": a luz do mundo é a ação, o foco, o link e o "onde estou"; o ponto de luz só reporta estado; a lima e o âmbar são halo.
3. **Uma folha sobe do chão**, pela linha de 1 px do mundo, não pela cor nem pela sombra: a folha do Agora é o único lugar de foco da tela de orientação. Leitor e Revisão em curso ficam calmos.
4. **O texto da lei é o protagonista**; tudo em volta cede.
5. **Segurança visível:** onde a pessoa parou (a Norma e o Dispositivo exatos) e que está tudo salvo (os pontos do Dia acesos) sempre à vista.
6. **Mesmo jeito em celular, tablet e desktop;** o que muda é a disposição, não o vocabulário visual.
7. **Nada depende de movimento, de transparência nem de cor sozinha.**
8. **A forma é do mundo:** angular de dia, arredondada à noite. Os papéis, os tamanhos e a ordem das coisas são os mesmos nos dois.

## Papéis de cor

| Papel | Pergunta | Dia | Noite |
|---|---|---|---|
| Ação | "O que faço agora?" | Tinta cheia `--acao` (texto branco), a sombra dura embaixo | Luz cheia `--acao` (texto da noite), sem sombra |
| Ação dentro da folha | idem | `--bloco-acao` (a mesma luz) | idem |
| Onde estou | "Onde estou?" | A luz do mundo `--lugar`: rótulo em negrito e traço de caneta na aba da área; folha com o contorno do controle na aba de página e na seção atual da norma | a mesma, em luz |
| Marcado | "O que liguei?" | A luz cheia `--selecionado-*`, com a marca na folha | a luz cheia, com a marca na noite |
| Estado | "Está feito? Está salvo?" | Ponto de luz `--ponto-luz` em tinta, com o contorno `--ponto-contorno`; forma de rabisco; halo de lima | Ponto de luz em luz; forma de círculo |
| Caminho | "Para onde posso ir?" | `--link` (a luz do mundo, sublinhada) | idem |
| Realce de termo | "Que tipo de termo é este?" | `--destaque-*` (sublinhado, ver Leitor) | os mesmos, mais claros |
| Perigo | "Isto apaga" ou falha técnica | `--perigo` | `--perigo` (mais claro) |

Regras: a luz do mundo (`--luz`) é uma cor só para ação, foco, link, "onde estou" e marcado, e o tema a troca num lugar só; a lima (`--marca`) e o âmbar (`--n-ambar`) são halo, nunca fundo nem cor de texto; o ponto de luz nunca é texto, nunca pulsa, nunca segue o dedo e sempre tem o contorno na luz do mundo; vermelho nunca no estudo; amarelo, verde e rosa são dos grifos do leitor e de mais nada. O **tipo da tarefa** (Leitura, Cartões, Frases) vai em texto, com o ponto de luz dizendo o estado; a matéria vai sempre em texto, em neutro.

## Tokens

Todos os pares de texto passam em 4,5:1 e os gráficos (contorno, ícone, foco, sublinhado) em 3:1, medidos com `scripts/contraste.mjs` nos dois temas. Os três blocos de tema de `estilos.css` (`:root`, o escuro por `prefers-color-scheme` e o escuro manual `[data-tema='escuro']`) levam os mesmos valores: `scripts/contraste.test.ts` confere. Colunas: dia · noite.

### A paleta (valores fixos e canônicos da D-D9)

Dia: `--papel #f6f8fb` · `--folha #ffffff` · `--tinta #0f1c3a` · `--tinta-2 #4a5878` · `--tinta-funda #0a1428` · `--contorno #6e7a96` · `--linha #838fa7` · `--filete #dde2ea` · `--marca #eefa4b`.
Noite (prefixo `n-`, porque `--linha` e `--luz` já existem no dia): `--n-noite #0b1322` · `--n-serra #131d31` · `--n-serra-2 #1c2942` · `--n-texto #eef2fa` · `--n-texto-2 #a4b1cb` · `--n-luz #f2f6ff` · `--n-ambar #ffc53d` · `--n-borda #34425e` · `--n-linha #5c6b8c` · `--n-vidro #9db7e8`.
Fora da paleta e trocados pelo tema: `--perigo` (#a4262c · #ff8a8a), `--aviso-fundo` e `--aviso-texto` (#fff4d6 e #4d3800 · #3a2f10 e #ffe6a3) e os destaques e grifos do leitor (abaixo).
Saíram, com a D-D9 e com cada fase, os tokens das identidades anteriores (a verde-oliva, a D-D5, a D-D7: areia, cal, vidro, noite-\*, `--caneta-*`, `--caramelo`, `--atual-*`, `--sombra-flutuante`, `--raio-pilula`, `--ponto-nucleo`, `--bloco-borda`). O teste de contraste falha se algum CSS voltar a usá-los: a lista é `TOKENS_REMOVIDOS`, em `scripts/contraste.test.ts`. `--tinta`, `--tinta-2` e `--luz` voltaram com outro sentido.

### Superfície e texto

| Token | Dia · noite | Uso | Contraste medido |
|---|---|---|---|
| `--fundo` | Papel `#f6f8fb` · Noite `#0b1322` | tela, cabeçalho, barra das áreas | — |
| `--superficie` | Folha `#ffffff` · Serra `#131d31` | campos, cartões, folha, linhas | folha sobre o chão 1,06:1 · 1,10:1 (por isso a linha) |
| `--superficie-2` | tinta a 5% sobre o papel · Serra 2 `#1c2942` | trilho de abas, selo, trilho do andamento, esqueleto | `--texto-atenuado` 6,1:1 · 6,7:1 |
| `--fundo-controle` | Folha · Serra 2 | botão secundário, chip, "+", seletor de fonte, dock do Leitor (na folha do Agora e no estado vazio, o da própria folha) | `--texto-atenuado` 7,1:1 · 6,7:1 |
| `--borda` | Filete `#dde2ea` · `#34425e` | divisórias decorativas | 1,22:1 no papel · 1,85:1 na noite (decorativas) |
| `--borda-folha` | `1px solid` `--linha` · `1px solid` `--n-borda` | a linha da folha, do cartão, do diálogo, do dock e do estado vazio | `--linha` 3,1:1 no papel e 3,3:1 na folha |
| `--borda-campo` / `--borda-botao` | Contorno `#6e7a96` · `#5c6b8c` | contorno de campo e de botão secundário | 4,0:1 no papel, 4,3:1 na folha · 3,5:1 na noite, 3,2:1 na serra |
| `--borda-forte` | Tinta · `#a4b1cb` | contorno de caixa e rádio | 16,8:1 · 7,8:1 |
| `--texto` | Tinta `#0f1c3a` · `#eef2fa` | texto | 15,8:1 no papel, 16,8:1 na folha · 16,6:1 na noite, 15,0:1 na serra |
| `--texto-atenuado` | Tinta 2 `#4a5878` · `#a4b1cb` | apoio, rótulo | 6,7:1 no papel, 7,1:1 na folha · 8,6:1 e 7,8:1 |
| `--titulo` | Tinta · `#eef2fa` | título de página (H1) | 15,8:1 · 16,6:1 |
| `--penumbra` / `--luz-do-cartao` | tinta a 10% sobre o papel / Folha · `#060a13` / Serra | palco do modo foco | `--texto-atenuado` na penumbra 5,5:1 · 9,2:1 |

### Ação, lugar, estado e folha

| Token | Dia · noite | Uso | Contraste medido |
|---|---|---|---|
| `--luz` | Tinta · `#f2f6ff` | a luz do mundo; `--foco`, `--link`, `--lugar`, `--cacto`, `--andamento`, `--estrela`, `--fio-selecao` e `--ponto-luz` são apelidos dela | 15,8:1 no papel · 17,2:1 na noite |
| `--acao` / `--acao-texto` | Tinta / branco · `#f2f6ff` / `#0b1322` | botão primário | 16,8:1 · 17,2:1 |
| `--acao-hover` | 80% tinta e 20% tinta 2 · 88% luz e 12% vidro | fundo do primário com o ponteiro em cima | texto 14,6:1 · 16,0:1 |
| `--foco` | a luz | anel de foco global (2 px, `outline-offset: 2px`) | 15,8:1 · 17,2:1 |
| `--link` | a luz | link de texto, sublinhado | 15,8:1 no papel, 13,0:1 na penumbra · 17,2:1 |
| `--sucesso` | o texto | texto de "salvo" (sem cor própria: o estado vem em palavra) | 15,8:1 · 16,6:1 |
| `--ponto-luz` / `--ponto-contorno` / `--ponto-apagado` | a luz / a luz / Tinta 2 · a luz / a luz / `#a4b1cb` | pontos do Dia, Estrela, ponta da caneta; o apagado é só o anel | 15,8:1 · 17,2:1; apagado 6,7:1 e 8,6:1 |
| `--ponto-halo` | Lima `#eefa4b` · Âmbar `#ffc53d` | halo atrás do ponto (de dia); o âmbar é o ponto do lockup à noite | tinta sobre a lima 14,8:1; âmbar 11,8:1 na noite |
| `--marca-ponto` / `--marca-disco` | `--ponto-luz` / lima · `--ponto-halo` / nenhum | o ponto e o disco do lockup (e do nome escrito) | 15,8:1 · 11,8:1 |
| `--marca-da-parada` | 1 · 0 | a faixa de caneta e o ponto da linha de parada só existem de dia | — |
| `--estrela` / `--estrela-luz` / `--estrela-contorno` | a luz | faixa da calha / miolo / contorno da Estrela | 15,8:1 · 17,2:1 |
| `--pen-*` (13) | dia: vidro `#edf0f6` e `#c7cedb` a 90%, aro e esfera `--tinta-funda` e `--tinta`, furo `--tinta`, halo `--marca`, sombra a 16% · noite: vidro e aro `--n-vidro` (vidro a 14%), furo `#fff1c2` → `--n-ambar`, halo `#ffd978` a 90%, esfera `#fffbe8`, sem sombra | a caneta de vidro (`-rim`, `-vidro`, `-vidro2`, `-vidro-a`, `-tinta`, `-tinta2`, `-brilho`, `-halo`, `-halo-op`, `-esfera`, `-luz`, `-sombra`, `-sombra-op`) | aro 17,3:1 · 9,2:1; furo ≥ 11,8:1; esfera sobre o halo 14,8:1 (dia) |
| `--quadro-chao` / `--quadro-aro` / `--quadro-marca` | `--linha` / Tinta / `--marca` · `--n-borda` / vidro a 70% sobre a noite / nenhuma | o chão, a parede dos tubos do cacto e a marca de hoje do quadro do cacto | aro 15,8:1 · 5,1:1; o chão é decoração (sem par medido) |
| `--bloco-fundo` / `--bloco-texto` / `--bloco-atenuado` | Folha / Tinta / Tinta 2 · Serra / `#eef2fa` / `#a4b1cb` | a folha do Agora e o texto dentro dela | 16,8:1 e 7,1:1 · 15,0:1 e 7,8:1 |
| `--bloco-acao` / `--bloco-acao-texto` / `--bloco-foco` | a luz / branco · a luz / `#0b1322` | botão primário e foco **na folha** | 16,8:1 · 17,2:1 |
| `--selecionado-fundo` / `-texto` | a luz / Folha · a luz / `#0b1322` | caixa e rádio marcados, botão ligado, chip ligado, item escolhido | 16,8:1 · 17,2:1 |
| `--tinta-lugar` | tinta a 6% sobre a superfície · `#eef2fa` a 8% | linha marcada, "Frase correta" | `--texto-atenuado` 6,3:1 nos dois |
| `--regua-fundo` / `--regua-barra` | tinta a 6% / Tinta 2 · `#eef2fa` a 8% / `#a4b1cb` | régua de leitura (segue o dedo; por isso nunca é a luz) | atenuado 5,9:1 no papel · 7,1:1 |

O anel de foco global é a luz do mundo (2 px, `outline-offset: 2px`). Dentro da folha do Agora, `--bloco-foco`.

### Destaques do leitor (sublinhado, nunca fundo)

| Token | Dia · noite | O quê | Estilo |
|---|---|---|---|
| `--destaque-prazo` | `#173f52` · `#7fb4cf` | prazos e tempo | duplo, deslocamento de 4 px |
| `--destaque-condicao` | `#ab6b21` · `#f2c062` | exceções e condições | tracejado, 4 px |
| `--destaque-absoluto` | `#a5582a` · `#f09a68` | termos absolutos | ondulado, 3 px |
| `--destaque-pena` | `#a5582a` · `#f09a68` | penas, quóruns e frações | pontilhado, 4 px |

Contra o papel: 10,6:1 (prazo), 4,1:1 (condição), 4,9:1 (absoluto e pena); na folha, 11,2:1, 4,3:1 e 5,2:1; sob a régua, a condição fica em 3,6:1 no papel e 3,8:1 na folha. À noite, 8,3:1 · 11,1:1 · 8,4:1 na noite. O estilo da linha é o que distingue os quatro (a cor sozinha não distingue).

### Estado (sem mudança)

`--perigo` (e `--perigo-texto`), `--aviso-fundo/-texto` e os grifos (`--grifo-1` a `-3`, os marca-textos do aluno) ficam como estavam. `--perigo` mede 6,8:1 no papel e 8,2:1 na noite.

## Forma, espaço, tipografia

| Item | Dia · noite |
|---|---|
| Raios | `--raio-botao` (botão, campo) 6 · 12 px; `--raio-folha` (`--raio-heroi`, `--raio-cartao`, `--raio`: folha do Agora, cartão, diálogo) 8 · 14; `--raio-chip` (chip, selo, marcador, tecla de atalho) 6 · 10. O trilho das abas de página e o dock do Leitor somam 4 px ao raio do botão (10 · 16), para as curvas de dentro e de fora serem concêntricas; a caixa de marcar tem metade do raio do botão. Redondos (50%): o "+", os pontos e a caneta. Não há pílula: a guarda da Q7 recusa `border-radius` de três dígitos em px. Ficam de propósito, dentro do texto, quatro raios de 2 a 4 px (grifo, foco da remissão, tarja da lacuna e "carregando"). O que está dentro tem raio menor que o que o contém. |
| Contorno | `--espessura-contorno` 1,5 px · 1 px (o Chromium arredonda o de 1,5 px para 1); em tinta cheia só no que está marcado |
| Sombras | `--sombra-botao` `0 2px 0 var(--tinta-funda)` · nenhuma (só no botão primário); `--sombra-botao-aperto` `0 1px 0` · nenhuma; `--sombra` e o resto: nenhuma. A única "sombra" a mais é `--sombra-folha`, a mesma linha de 1 px por dentro (`inset 0 0 0 1px`), que pinta a faixa do lido no Leitor. Nenhum `box-shadow` leva desfoque (guarda em `scripts/contraste.test.ts`). |
| Aperto | `--aperto-botao` `translateY(1px)` · `scale(0.975)` |
| Fundo | Liso, sem textura. |
| Espaço | `--espaco-1` 0,25 rem · `-2` 0,5 · `-3` 1 · `-4` 1,5 · `-5` 2 · `-6` 3 |
| Alvo | `--alvo` 44 px: botões, links isolados, linhas de lista; campos 48 |
| Gutter | 16 px (celular) · 24 (tablet em pé) · 32 (≥ 900) |
| Coluna | casca de 900 px (`--largura-casca`) · leitura 70 ch (`--largura-texto`) · Cartão atual do Fixar 40 rem a partir de 700 px · diálogo 560 px |
| Título de página (H1) | Schibsted Grotesk 800 · Familjen Grotesk 700 (`--fonte-titulo`, `--peso-titulo`), `-0,02em`, cor `--titulo`, linha 1,1; 1,875 rem (30 px, celular) · 2,125 (34 px, ≥ 700) · 2,375 (38 px, ≥ 900). É a escala do app, que o Gabriel escolheu em 20/10/2026; a prancha tinha 40/1, 44 e 48 px |
| Título da folha | `.agora-titulo`: 1,625 rem, linha 1,15; 800 e `-0,02em` de dia, 600 e `-0,005em` à noite (`--peso-titulo-folha`, `--espaco-titulo-folha`) |
| Rótulo "Em seguida" | `--fonte-rotulo` e `--tamanho-rotulo`: título 800 a 15 px de dia, Atkinson 700 a 14 px à noite |
| Seção (H2) / cartão (H3) | Atkinson 700, 1,25 rem / 1,0625 rem |
| Corpo · pequeno · rótulo · dica | Atkinson 1 rem · 0,875 · 0,8125 (piso de 13 px mantido em `.rodape`, `.rotulo-discreto`, `.marcador`) · `.dica` 0,9 rem |
| Cartão de destaque e frase de revisão | Literata 700, 1,5 a 1,75 rem |
| Lei | Literata, `--tamanho-leitura` (18 px, preferência da pessoa); "Sem serifa" (Conta › Aparência) troca só esta letra |

Fontes hospedadas no app (nada de CDN), com a licença OFL ao lado em `src/apresentacao/fontes/`: Schibsted Grotesk (variável, 400 a 900), Familjen Grotesk (variável, 400 a 700; pedir mais que 700 dá 700), Atkinson Hyperlegible Next (400, 500, 700) e Literata (variável). O `index.html` pré-carrega a fonte de título do tema do aparelho (`prefers-color-scheme`), então cada pessoa baixa só uma. Itálico nunca no trecho da lei. Em celular, campos com no mínimo 16 px (o iOS aproxima abaixo disso).

## Componentes

| Componente | Especificação |
|---|---|
| **Botão primário** (`.principal`) | Compacto: altura 44, padding `0 20px`, raio `--raio-botao`, Atkinson 600, `.9375rem`, `-0,01em`; fundo `--acao`, texto `--acao-texto`, `--sombra-botao`, borda transparente de 1,5 px. Na folha do Agora: largura total, 52 de altura, 17 px e peso 700. **Um por tela.** Hover (só com ponteiro): `--acao-hover`; aperto: `--aperto-botao` e `--sombra-botao-aperto`; desabilitado a 50% sem sombra; transição de 140 ms só em `transform` e `box-shadow` e só sem `prefers-reduced-motion` (nunca em cor: ao virar o tema o texto troca na hora e o fundo ficaria atrasado, o que o axe lê como contraste baixo). |
| **Botão secundário** (`button`, `.botao`) | Mesma forma, fundo `--fundo-controle`, contorno de `--espessura-contorno` em `--borda-botao`, texto `--texto`. Hover: 6% do texto sobre o fundo do controle. |
| **Chip** (`.chip`, `aria-pressed`) | O botão de alternar que escolhe um valor (o resultado do erro, o filtro de estado dos cartões, as opções do "Trocar"): 14 px, padding `0 14px`, raio `--raio-chip`. Ligado, é a luz cheia, do mesmo tamanho (sem pular de largura). |
| **Botão fantasma** (`.botao-texto`, `.discreto`) | Sem caixa, sublinhado afastado 4 px (`text-underline-offset`), cor herdada sem opacidade (a 82%, a cor atenuada de uma dica cai para 3,8:1), peso 500, `.875rem`, alvo 44. Vai **ao lado** do primário ("Escolher outra coisa", "Pausar") ou **sozinho** no começo da linha ("Voltar", "Mais", "Importar outra planilha"); sozinho leva `.na-margem` (margem de −12 px: tira o recuo do alvo e alinha a letra ao texto da página). Só o cabeçalho (Ajuda e o menu dela) fica em texto simples. Um `<summary>` sozinho num `<details>` é este botão (`botao botao-texto na-margem`). |
| **Botão de ícone** (`.botao-icone`) | Quadrado de 44 com o contorno do secundário; `aria-label` sempre. |
| **Ícone** (`componentes/Icone.tsx`) | SVG de traço único em 24 × 24 (`stroke` 2, pontas redondas, `currentColor`, `aria-hidden`); nomes: `voltar`, `seta`, `abre`, `marca`, `fechar`, `nota`, `info`. Na altura do texto (`.icone-svg`, 18 px; 1 em dentro do botão pequeno e da linha de texto). Nenhum glifo de texto (`← › ▾ ✎ ✕ ✓ ⓘ`) serve de ícone, e o botão só com ícone leva `aria-label`. |
| **Voltar** (`componentes/Voltar.tsx`) | Link fantasma com a seta, **acima do título** da tela (Trilha › Pontos e Tarefas, Biblioteca › Acervo e o Leitor). O nome acessível é o texto visível, ou `nome` quando o texto é curto (no Leitor, "Biblioteca" → "Voltar à Biblioteca"). |
| **Linha de ação** (`.linha-acao`) | Linha inteira de toque: altura 52, raio do botão, filete `--borda`, fundo da superfície; texto à esquerda e seta ou duração à direita. |
| **Destrutivo** (`.perigoso`) | Secundário com texto e contorno `--perigo`; só vira cheio dentro do diálogo de confirmação. |
| **Link em texto** | `--link` (a luz do mundo), sublinhado fino com `text-underline-offset: 0.2em`, 2 px no hover e no foco. |
| **Campo** | Altura 48, raio do botão, fundo `--superficie` (a folha de dia, a serra à noite; não o do controle: à noite o contorno tem 3,2:1 sobre a serra, mas só 2,7:1 sobre a serra 2), contorno de `--espessura-contorno` em `--borda-campo`, 16 px, rótulo sempre visível acima. Erro: contorno e texto `--perigo` mais ícone e frase; nunca só cor. |
| **Caixa e rádio** | Marca própria de 22 px com contorno de 2 px em `--borda-forte`, raio de metade do botão (caixa) ou círculo (rádio), dentro de um rótulo de 44; marcada = `--selecionado-fundo` com a marca em `--selecionado-texto`. A linha inteira é o alvo. |
| **Aba da área** (`.areas`) | O rótulo atenuado; a atual vai na luz do mundo, em negrito, com o **traço de caneta** embaixo (30 × 6 px, a 5 px da base, a 3 px no cabeçalho a partir de 900; máscara de SVG de 2 px, só CSS). O estado não depende só da cor: negrito, traço e `aria-current`. O ícone (24 px) aparece só nas abas de baixo. |
| **Aba de página** (`.abas`) | Trilho `--superficie-2` com o raio do botão mais 4 px; a aba atual é a folha com o contorno do controle por dentro (`--borda-campo`) e o rótulo em negrito; no celular o trilho rola na horizontal sem quebrar linha; anel de foco por dentro. |
| **Botão ligado** (`aria-pressed`) | `--selecionado-*`: a luz cheia com o texto na folha (ex.: "Destaques" no Leitor, item escolhido no Acervo, o chip). |
| **Selo e marcador** | Raio do chip, `--superficie-2` com texto `--texto` (o selo) ou `--aviso-*` (o marcador). |
| **Linha de lista** (`LinhaLista`, `.linha-lista`) | Em linha sobre o chão, sem cartão e sem ladrilho de glifo: altura mínima 64, alvo inteiro, título em 600 e uma linha de apoio atenuada, o selo e a seta (`Icone`) à direita; o filete é o do `li` (`.lista-simples`); o hover sublinha o título. Normas, súmulas, teses, resumos e precedentes da Biblioteca, e o menu da Conta. |
| **Item do Acervo** (`.item-acervo-botao`) | Uma linha sobre o chão, sem cartão por item: a marca de 22 px à esquerda (a da caixa de seleção: marcada = a luz cheia com a marca na folha; "Já adicionada" = marca só desenhada, atenuada), o título e a dica. "Norma parecida" e os avisos do item são uma linha compacta com o ícone `info`. |
| **Cartão** (`.cartao-bloco`) | `--superficie`, raio `--raio-cartao`, `--borda-folha`, padding 20, sem sombra; título de cartão em sans bold, sem a margem de cima do título. **Só onde agrupa:** um formulário com os botões dele (Conta › Dados), a Sessão em andamento, o resumo do que houve. Lista de itens e texto corrido ficam sobre o chão. |
| **Folha do Agora** (`.acao-agora`) | `--bloco-fundo`, `--borda-folha`, raio da folha, texto `--bloco-texto`, padding 20; carrega título (26 px), motivo e tempo em `--bloco-atenuado`, o botão primário e, logo abaixo (`.agora-acoes`, 6 px), o fantasma "Escolher outra coisa" (44, peso 600, 15 px, centrado). O fundo dos controles dentro dela é o da folha. A caneta fica fora da folha, à direita da linha de parada, com a ponta sobre a borda de cima; nenhum mascote. |
| **Linha de parada** (`Parada`, `.parada`) | "Retomar em" (15 px, `--texto-atenuado`) e o lugar exato em negrito (17 px; Norma e Dispositivo); embaixo, a hora em 15 px ("salvo hoje, 22h10", "salvo ontem, 21h40", "salvo dia 12/10, 22h10"). De dia o lugar leva uma faixa de caneta embaixo e, no fim dela, o ponto de luz com o halo de lima; à noite só o texto (`--marca-da-parada`). Com a caneta (`.com-caneta`): linha flex, texto à esquerda, caneta de pé de 68 × 91 px à direita, a 35°, com a ponta sobre a borda de cima da folha do Agora (que sobe 7,5 px por baixo dela). Sem a caneta (Dia fechado), só o texto: a caneta vai para o Resumo do Dia. |
| **Pontos do Dia** (`PontosDoDia`, `PontoDeLuz`, `luz.css`) | Leitura, Cartões e Frases; cada um com um ponto de 22 px e o nome em 13 px, peso 600. Duas máscaras de SVG de dados (o anel e o miolo), com a forma por mundo e por estado: de dia o anel de caneta irregular e a hachura de marca-texto, em tinta (até a metade no atual, inteira no feito); à noite um círculo, vazio, com a metade esquerda cheia ou cheio (`--forma-ponto-*`). Nunca só a cor: apagado é o anel em `--ponto-apagado`, atual é o miolo pela metade, feito é o miolo inteiro; o estado vem também em texto para o leitor de tela ("Leitura, feito hoje"). Acende uma vez em 160 ms, na visita ao Hoje em que ficou aceso (`arretado.pontos-vistos` em `localStorage`); a vez (pela metade) aparece sem animação e a primeira visita do dia abre quieta. Em listas, o anel de dia gira um pouco em cada item; em cores forçadas o ponto vira `CanvasText`. |
| **Em seguida** (`hoje/Depois.tsx`) | Um `<details>` nativo subordinado ao Agora, sem fundo nem sombra: fechado, o rótulo, a primeira atividade ("Ler arts. 112 a 117 da LEP, mais 1") e a seta; aberto, uma linha de 56 px por atividade com o nome, o tempo ("cerca de 6 min") e "Trocar", que abre as outras atividades de hoje em chips ("Trocar por"). **O "Trocar" é só apresentação:** vale nesta visita e não grava nada. Abre em 180 ms (a lista desce 4 px); no perfil Calmo, sem animação. |
| **Para lembrar** (`ParaLembrar`) | Uma nota livre sobre o que fazer fora do app, sob o "Em seguida". Título em etiqueta de 13 px, peso 700, caixa-alta com 0,06 em de espaço; acima do campo, as notas do Estacionamento ainda por resolver, cada uma com uma caixa; campo de 3 linhas ("O que fazer fora do app"); "Salvar" é o botão secundário; o estado ("Ainda não salvo." ou "Salvo.", `role="status"`) no tamanho de `.dica`. Até 500 caracteres, texto simples; falha de gravação é um aviso `role="alert"` e o texto fica no campo. |
| **Resumo do Dia** (`FecharDia`) | `.cartao-bloco`: título, linhas do que houve, próximo passo e um botão secundário ("Fechar o Dia" ou "Reabrir o Dia"). Fechado: o quadro do cacto (até 30 rem de largura, proporção 340 × 200) com a caneta largada sob o chão e a legenda do que ela desenhou hoje; "Bom descanso. Amanhã você começa de onde parou." |
| **Abas do Fixar** (`RecallInicio`) | Frases · Cartões · Histórico no trilho `.abas`; `/recall` redireciona para `/recall/frases`. "Erros" não é aba: a lista com filtros é a página `/recall/erros` (`ErrosComFiltros`), a que se chega por "Ver os erros, com filtros" no fim das Frases (e também quando não há Frase nenhuma); o detalhe do Erro volta a ela ("Voltar aos erros"). |
| **Linha de frase** (`ListaFrases`) | Texto em Literata (`.texto-leitura`) que abre o erro de origem e, à direita, "Esconder trecho" como `.botao-texto` de 44 px (`aria-label` com a frase); o botão se recua 12 px para o texto ficar na margem. |
| **Estado por palavra e desenho** (`Icone`, `.estado-texto`) | SVG de traço único em `currentColor` (18 px, traço de 2, pontas redondas), `aria-hidden`, antes da palavra em `--texto`; nunca vermelho, nunca glifo Unicode. Nomes: `errei` (xis), `inseguro` (interrogação), `relogio` (relógio), `deNovo` (setas), `dificil` (onda) e `facil` (marca). "Para revisar" (o prazo chegou) no lugar de "Vencido". |
| **Revisão em coluna** (`.coluna-drill`; `.revisao` é a revisão do rascunho da Biblioteca) | Faixa da Sessão, topo, cartão, respostas, "Depois" e "Mais opções" numa coluna só, de 40 rem centralizada a partir de 700 px. Respostas: três `button.grande` de borda de 2 px, `flex: 1` e `min-width: min-content`, o rótulo em uma linha, com o desenho antes dele (até 379 px, o desenho sobre o rótulo); "Mostrar resposta" é o único botão principal. Os dias da semana com revisão são o `PontoDeLuz` de 16 px (`DiasDaSemana`). |
| **Topo da revisão** (`TopoDaRevisao`, `.topo-drill`) | "Sair" (`.botao-texto`), `BarraFina` ("1 de 4") e a caneta encostada (`.topo-caneta`, 58 × 78, `align-self: flex-end`, margem de −13 px embaixo, `z-index: 2`): a ponta fica 7 px dentro da borda do cartão. A caneta fica fora do `<article>`, para não andar com a passagem do cartão. |
| **Fim de rodada** (`Vazio` com `marca`) | `.vazio` na coluna `.coluna-drill`: a caneta deitada em repouso (`.fim-caneta`, 104 × 59) acima do título ("Feito." ou o sotaque), "Amanhã: N cartões." e as ações centradas (primário para seguir, `.botao-texto` para voltar). Sem cachorro e sem desenho próprio. |
| **Estrela** | A estrela de luz de quatro pontas (`Estrela.tsx`): miolo `--estrela-luz`, contorno `--estrela-contorno` e aro na cor do chão (`--aro-da-estrela`, que corta a faixa); faixa da calha em `--estrela` (cheia na direta, tracejada na herdada). A exceção é a estrela vazia cortada. O botão mede 44 × 44: a caixa avança para a margem da página, à esquerda da calha (nunca sobre o texto), e sobe e desce o que falta à altura da linha; a estrela fica onde estava e a altura da linha não muda. A caixa só avança até onde há folga à esquerda (`--estrela-folga`: o recuo da página e o do cartão do modo foco): 44 × 44 de 700 px para cima, 40 × 44 no celular (recuo de 16 px) e no cartão do modo foco (recuo de 1 rem). |
| **Callout** | Fundo `--tinta-lugar`, filete de 4 px à esquerda, ícone e texto; "Frase correta" em lugar, aviso em `--aviso-*`, perigo em `--perigo`. |
| **Progresso** (`BarraFina`) | Trilho de 0,4 rem `--superficie-2` com preenchimento `--andamento`, raio do chip ÷ 3; sempre com texto ("3 de 12"). |
| **Estado vazio** (`.vazio`) | Uma folha (a linha do mundo, o raio da folha, `--superficie`, 2 rem de recuo em cima e embaixo): o título, a frase de até 36 ch e os começos em coluna, centrados. Os botões de dentro ficam só com o contorno. Sem texto longo e sem mascote. |
| **Navegação** (`nav.areas`) | Abas Hoje · Trilha · Fixar · Biblioteca no chão, a atual em negrito na luz do mundo com o traço de caneta. Até 899 px, presas embaixo, com a divisória em cima: ícone de 24 sobre o rótulo de 13 px (`min(0.8125rem, 4.4vw)`: a 100% é 13 px, só encolhe com a fonte muito ampliada), barra de 80, `safe-area` embaixo; no tablet em pé as quatro colunas ficam numa faixa centrada de 35 rem; com o teclado aberto saem da frente (`.shell[data-teclado]`, `useTecladoAberto`). A partir de 900, no centro do cabeçalho, só o rótulo, com o traço 3 px acima da base. Nomes de `ROTULO_DA_AREA` (`textos.ts`); rotas `/plano` e `/recall`. |
| **Cabeçalho** (`.topo`) | Preso no alto (`sticky`), de 60 px, no chão, com a divisória embaixo: o lockup da marca (nome "arretado" escrito e o cacto, 144 px; `LockupParado`) à esquerda; Ajuda (texto) e Conta (ícone de pessoa num alvo de 44) à direita; a partir de 900 px, as áreas no meio e "Registrar erro" neutro com a tecla E. O Leitor mede a altura dele (`.topo`) para prender as próprias barras logo abaixo. |
| **"+" no título** (`TituloComMais`) | O título e o "+" na mesma linha; o "+" é redondo, 48 px, com o contorno e o fundo do controle de cada mundo, e abre o registro de erro. No Hoje e no Fixar (as telas em que se registra); nas outras, a tecla E e, a partir de 900 px, o "Registrar erro" do cabeçalho. Não é a ação da tela e não há "+" flutuante. |
| **Rodapé** | Linha legal curta e "Backup e dados" como botão de texto de 44 px, centralizados no fim do conteúdo, acima da reserva das abas; nunca sob a navegação fixa. |
| **Diálogo** | `dialog` nativo, `min(560px, 100vw − 2rem)`, raio da folha, `--superficie`, `--borda-folha`, padding 24, véu `rgb(0 0 0 / 45%)`, nenhuma sombra. A prévia da remissão (`dialogo-previa`) é folha presa à borda de baixo no celular e balão no canto a partir de 700 px; a busca na norma fica no alto da tela. |

### A marca, a caneta e o quadro do cacto

| Peça | Especificação |
|---|---|
| **Marca** (`componentes/escrita/Marca.tsx`, `EscritaDoNome.tsx`, `LockupParado.tsx`) | O nome "arretado" escrito num traço só, em minúsculas, com o cacto simplificado ao lado (tronco e dois braços em L, o esquerdo mais alto) e o ponto de luz de "onde parei" (`--marca-ponto` e `--marca-disco`). Parado, é o lockup de 144 px do cabeçalho (o traço segue o texto do mundo e o ponto é o único objeto de cor). Na abertura o nome se escreve letra a letra, a caneta volta por baixo deixando um traço de luz e vira o cacto (o final B). A frequência é uma constante só, `FREQUENCIA`, em `componentes/escrita/frequencia.ts`: **completa** (2,64 s) só na primeira abertura no aparelho, **curta** (1,2 s, com o nome já escrito) na primeira de cada Dia, **parada** nas demais; só o Dia da última escrita fica no aparelho (`arretado:escrita-do-nome:v1`). Movimento reduzido: sempre parada; perfil Calmo: o desenho só esmaece (0,24 s), sem caneta nem traço; um toque ou uma tecla em qualquer lugar pula para o quadro final. |
| **Caneta** | Tubo de vidro de tronco e dois braços que termina num cone do mesmo vidro (a ponta também é de vidro), com o furo de tinta à vista (do tronco à ponta, gradiente `--pen-tinta` → `--pen-tinta2`), aro de 1,5 a 2 px, brilho, esfera de luz na ponta com halo (lima de dia, âmbar à noite), três faíscas e sombra suave (só de dia). É o único objeto com volume e o único gradiente do app. Geometria do `pen.mjs` v5 do kit da marca, fora do repositório (caixa de 120 × 270, ponta em (60, 262)). SVG inline (`Caneta`, `CanetaDefs` e `CanetaDesenho`): uma caneta de pé girada em torno da ponta; o aro é uma máscara de luminância (branco = vidro mais 5 unidades, preto = o vidro exato); quatro ids por instância (`useId`: tinta, halo, sombra, aro); cores só nos 13 tokens `--pen-*`, nenhuma literal no componente. Elemento só de preenchimento leva `stroke: none` (o `<svg>` do quadro passa traço por herança). Poses: encostada a 35° (viewBox 170 × 228; Hoje 68 × 91, Cartão atual 58 × 78), deitada a 65° (viewBox 246 × 140; "Lido até aqui" 104 × 59 e, em repouso, o fim de rodada do Fixar, 104 × 59). No quadro do cacto (Resumo do Dia) a mesma caneta está largada sob o chão do desenho, quase deitada (84°, escala 0,30, ponta em (214, 183): `REPOUSO`, em `quadro/cena.ts`), e anda sobre o traço de hoje a 65°, em escala 0,38 (`ANDANDO`). Decorativa (`aria-hidden`); uma por tela; muda de lugar por salto, nunca gira nem desliza. |
| **Quadro do cacto** (`componentes/quadro/`) | 16 partes de traço (`cena.ts`, viewBox 340 × 200), uma por Dia fechado: a parte de número ((N − 1) mod 16) + 1, e depois da 16ª o Dia seguinte abre uma folha nova. Conta Dias fechados, nunca uma sequência: faltar um Dia não apaga nada, e nenhum número aparece na tela. As partes: o chão, o tronco, os dois braços, os espinhos, três flores, o sol, as aves, o calango, a nuvem, a chuva, o capim, o tatu-bola e a borboleta. O cacto é um tubo oco: a parede fina (`--quadro-aro`, papel de cor `vidro`, com a chuva e o capim), o núcleo de tinta que corre pelo meio (`nucleo`, `--luz`, 3,4) e um ponto de luz (r 4) onde o núcleo termina (`Fio.ponta`); o de hoje (r 5,5) leva a tinta da caneta com contorno na luz e a marca atrás (`--quadro-marca`: lima de dia, nada à noite). O sol e as flores são tinta; a nuvem e a chuva, tinta 2; o chão, `--quadro-chao`. O painel é o `--fundo` do mundo, com o raio do botão e sem borda. Cada fio é um `<path>` com `stroke-dasharray`/`stroke-dashoffset` por subtraço (`M`), de 520 a 1100 ms conforme o comprimento, com a curva senoidal `suave`; a caneta anda no ponto (`getPointAtLength`) e volta ao repouso; a aguada (`lavis`) aparece na segunda metade do fio e o miolo das flores e a ponta do núcleo brotam em 180 ms. Só no instante em que o Dia é fechado (aberto já fechado, o quadro aparece pronto); com `prefers-reduced-motion`, pronto. Cena `aria-hidden`; a legenda ("Hoje a caneta desenhou o chão.", `role="status"`) é dita ao terminar. |
| **Traço de seleção** (`componentes/traco/`) | Ao escolher uma área, uma aba da Biblioteca ou uma resposta, uma linha fina na luz do mundo se desenha em volta do item, com a ponta de luz (com contorno) à frente, e some. Sem brilho. |
| **Passagem do cartão** (`componentes/passagem.ts`) | Ao responder um Cartão ou uma Frase, o cartão sai para a esquerda e o seguinte entra pela direita; o último cartão não passa, o fim da rodada toma a tela. |

### Vidro é objeto, nunca superfície

O vidro desfocado não existe no app (o contrato da D-D9 o proíbe atrás de texto): nem em botão, nem em navegação, nem no dock do Leitor, que é uma barra sólida de `--fundo-controle`. A única transparência é a dos botões fixos do modo foco (`--superficie-translucida`, 90%, sem `backdrop-filter`), onde a letra de trás aparece de leve. Com `prefers-reduced-transparency: reduce` e em `forced-colors` ela vira cor sólida. Texto sempre sólido: a transparência nunca baixa o contraste do texto abaixo de 4,5:1 sobre o pior fundo possível. As camadas que flutuam (diálogo, bandeja do modo foco, menu Ajuda e dock do Leitor) levam a linha da folha e o fundo opaco, sem sombra; o diálogo ainda tem o véu. O "vidro" é o material da caneta e do tubo do cacto, nunca a cor de uma ação.

## Plataformas

Pontos de quebra: **celular < 700 px**, **tablet em pé 700 a 899**, **desktop e tablet deitado ≥ 900**. Referências: 390×844, 768×1024 (e 712×1138 na suíte), 1440×900 (e 1024×768).

| Elemento | Celular | Tablet em pé | Desktop e tablet deitado |
|---|---|---|---|
| Cabeçalho | no chão, gutter 16: lockup à esquerda; Ajuda e Conta à direita | igual, gutter 24 | lockup · navegação ao centro · "Registrar erro (E)", Ajuda, Conta |
| Navegação | abas no chão, ícone e rótulo nas quatro áreas, atual em negrito com o traço de caneta, `env(safe-area-inset-bottom)` | as mesmas, numa faixa centrada de 35 rem | no cabeçalho, pegajosa (`sticky`), só o rótulo |
| "+" | redondo, na linha do título do Hoje e do Fixar | idem | idem, e "Registrar erro (E)" no cabeçalho |
| Conteúdo | 1 coluna, gutter 16, reserva embaixo para as abas | 1 coluna, gutter 24 | coluna de até 900 px, gutter 32; o Hoje divide a parte do meio em 2 colunas, 7fr · 5fr |
| H1 | 1,875 rem | 2,125 rem | 2,375 rem |
| Hoje | título com "+", pontos do Dia, linha de parada com a caneta, folha do Agora, Em seguida, "Para lembrar" | idem, folha mais larga | à esquerda a linha de parada e o Agora; à direita Em seguida e "Para lembrar"; o Resumo do Dia, as revisões, a captura e o aviso de backup seguem em largura inteira, embaixo |
| Leitor | ver abaixo; sem estrutura (o filtro por bloco faz o papel) | estrutura à esquerda (11 rem), coluna de lei à direita | coluna de 70 ch centralizada com a estrutura (13 rem) ao lado e, a partir de 1200, na margem; nessa largura as ferramentas saem do canto e ficam num trilho na margem da direita |
| Rodapé | fim do conteúdo, acima da reserva | idem | uma linha, centralizada |

Regras de plataforma: as abas e o dock nunca cobrem texto (reserva de rolagem = `--abas-altura`: a divisória de 1 px, as abas de 71 px e, embaixo, 8 px ou a área segura, o que for maior, 80 px no total; o rodapé termina 16 px acima delas; o dock do Leitor fica 16 px acima das abas); com o teclado aberto as abas somem (o campo ganha a tela); `viewport-fit=cover` e `env(safe-area-inset-*)` em tudo que é fixo; toque sem depender de `:hover`; teclado e atalhos do desktop intactos (E registra erro; Esc fecha). No app de loja (futuro): corpo na fonte do sistema com Dynamic Type, Schibsted e Familjen só nos títulos; a caneta sobre o papel é o ícone.

**Ícone, manifest e cor da barra.** O ícone é a caneta de vidro de `Caneta.tsx` a 35°, sobre o papel `#f6f8fb`, em cores fixas do dia (o ícone é da marca, não do tema: não tem versão escura), sem fundo degradê. O vidro claro some sobre o papel em 16 a 48 px, então o favicon é a silhueta cheia (tronco, braços e bico em tinta, com a lima atrás da ponta); do 180 ao 512 px é a caneta inteira, com o furo de tinta e o halo. `scripts/icones-app.mjs` desenha tudo e o Chromium do Playwright rasteriza (`node scripts/icones-app.mjs`; `config/plataformas.test.ts` acusa se o papel, a tinta, a lima ou a geometria da caneta mudarem e o ícone não):

| Arquivo (`public/`) | O que é |
|---|---|
| `icone.svg` | favicon vetorial, quadrado arredondado (raio 22%); a silhueta cheia da caneta em composição justa (escala 1,9), para ser legível em 16 px |
| `favicon.ico` | 16, 32 e 48 px (PNG dentro do ICO), para quem não lê SVG (o Safari); a mesma silhueta |
| `icone-192.png`, `icone-512.png` | ícone "any" do manifest: quadrado arredondado de cantos transparentes, a caneta inteira (escala 1,7) |
| `icone-maskable-512.png` | ícone "maskable": papel até a borda e a caneta inteira, com o halo, dentro do círculo de 40% (escala 1,4; a zona segura que o Android garante depois de recortar) |
| `apple-touch-icon.png` | 180 px, papel até a borda e a caneta inteira (o iOS arredonda sozinho e não aceita transparência) |
| `manifest.webmanifest` | `id: arretado`, `start_url` e `scope` `./`, `display: standalone`, `lang: pt-BR`, `background_color` e `theme_color` no papel `#f6f8fb` (o manifest não varia com o esquema de cor) |

A barra do navegador e a moldura do app instalado leem `theme-color`: o `index.html` traz uma meta por esquema do aparelho (papel `#f6f8fb` no claro, noite `#0b1322` no escuro) e `aplicarCorDaBarra` (`cor-da-barra.ts`, chamado por `AplicarAparencia`) põe a escolha de Conta › Aparência nas duas, e "Igual ao aparelho" devolve a cada uma a sua. Não há `apple-mobile-web-app-status-bar-style`: o comportamento do iOS instalado não pôde ser conferido sem um aparelho (fica no padrão do sistema).

**Áreas seguras.** `viewport-fit=cover` estende a página até a borda do vidro, então todo recuo lê `env(safe-area-inset-*)`: no cabeçalho (topo e lados, também a partir de 900 px), no conteúdo e no rodapé (lados, no mínimo o gutter), nas abas de baixo (embaixo e nos lados), na reserva de rolagem (`--abas-altura` é a área segura de baixo mesmo sem abas: de 900 px em diante e no "Só estudo"), na folha e no balão da prévia, nos diálogos (a altura máxima desconta o maior entre 1 rem e a área segura de cima e de baixo), no dock e na bandeja do modo foco e, no modo foco, no alto do texto (sem o cabeçalho que reservava a ilha). No celular deitado (altura até 540 px) a bandeja do foco vira duas colunas e rola por dentro se ainda não couber. `e2e/areas-seguras.spec.ts` emula as áreas (`Emulation.setSafeAreaInsetsOverride`, só Chromium) em três iPhones (em pé 393×852 com 59 e 34 px; deitado 852×393 e Pro Max deitado 932×430 com 59 px dos lados e 21 embaixo) e confere em Hoje, Trilha, Fixar, Biblioteca, Conta, Começar a Sessão, na Sessão (também no "Só estudo"), no Leitor (com a busca cheia) e no modo foco que nenhum texto nem controle à vista cai dentro delas, e que o modo foco do artigo não deixa a página rolar sobrando.

## Leitor e Sessão

Fonte da especificação de comportamento: [`referencias/2026-10-14-gemini/especificacao-leitor-sessao.md`](referencias/2026-10-14-gemini/especificacao-leitor-sessao.md) (D-D4). As cores e as formas de lá leem-se pelos tokens deste arquivo: onde divergirem, vale este texto.

**Leitor.**

| Parte | Especificação |
|---|---|
| Lido | da primeira linha ao "lido até" (`data-lido`), o texto vai sobre a faixa da folha (`--superficie`, raio da folha, a linha de 1 px do mundo por dentro: `--sombra-folha`) sobre o chão, com 12 px de folga de cada lado do texto (`--margem-do-lido`, só na lista; o cartão do artigo não tem faixa); no fim da linha a folga é a menor entre 12 px e metade do recuo lateral da casca (`--margem-do-lido-fim`, 8 px no celular), para a faixa não encostar na borda da tela, e o texto não muda de lugar. A geometria é a mesma lido ou não (borda transparente de 3 px e `background-clip: padding-box`, vão de 6 px entre as faixas de linhas vizinhas), para a altura da linha não mudar quando o "lido até" anda e o virtualizador não derivar. O que falta ler fica no chão |
| "Lido até aqui" | `.marca-lido-ate`: rótulo de 13 px, peso 700, em `--texto` (Atkinson) e, logo ao lado, a caneta deitada (`Caneta pose="deitada"`, 104 × 59) com a ponta no fim da frase; a linha tem no mínimo 60 px de altura (o corpo da caneta sobe da ponta). A caneta é decorativa (`aria-hidden`); o botão e o anúncio ("Lido até Art. 1º, I.") não mudam |
| Estrutura | `EstruturaDaNorma` (`estrutura.ts` faz as contas), a partir de 700 px e fora do modo foco: faixa de 11 rem (13 rem em 900 px ou mais) à esquerda da coluna de lei; de 1200 px em diante fica na margem esquerda e a coluna mantém os 70 ch. Lista o bloco de agora e os irmãos dele (as seções do capítulo), cada um com o `PontoDeLuz` de 20 px do estado (lida = inteiro, em leitura = pela metade, ainda não lida = só o anel; também em texto para o leitor de tela), rótulo em 700 e nome em atenuado (até 3 linhas); o de agora vai na folha com o contorno do controle (`--borda-campo`) e `aria-current="location"`, e os blocos de dentro dele logo abaixo, um degrau à direita num filete (as seções, se ele é um capítulo); acima, o caminho (título, capítulo) em texto atenuado, e tocar no caminho sobe um nível (o bloco de lá vira o de agora, e a lista, a dos irmãos dele). Segue a rolagem por salto: o bloco de agora é o primeiro cabeçalho de bloco entre o alto da tela e a linha de leitura (um quarto da tela abaixo da barra fixa; o pé da tela no fim da página), ou o do alto se não há; ele muda quando a leitura passa de bloco, não a cada nó, e tocar numa seção (que a leva ao alto) a deixa como a de agora e fica preso abaixo do cabeçalho, rolando por dentro quando a lista é maior que a tela. Tocar leva o bloco ao alto; se o filtro o escondeu, desliga o filtro e avisa. Não aparece no celular (lá o filtro por bloco faz o papel) nem em normas sem título ou capítulo |
| Controles | o seletor de fonte é um controle só (A−, o tamanho de 18 px e A+ como segmentos de 44 de alvo) com o contorno, o fundo e o raio do botão secundário; "Destaques" é um botão que, ligado, vira a luz cheia (sem pílula) |
| Legenda dos destaques | uma linha sob os controles, só com "Destaques" ligado: Prazos, Exceções, Absolutos, Penas (o nome inteiro na dica), cada um com o seu sublinhado; cabe até em 320 px. Recolher não foi preciso: ela some com o botão |
| Régua de leitura | `--regua-fundo` e filete de 3 px em `--regua-barra` (tinta: segue o dedo, então nunca é a luz); a cor entra como camada de imagem, para somar à faixa do lido |
| Estrela | a estrela de luz de quatro pontas na calha (`--estrela-luz` com contorno `--estrela-contorno`), com o aro na cor do chão (`--aro-da-estrela`) cortando a faixa, nos dois temas; a herdada é a mesma estrela, menor |
| Dock | `.dock-do-leitor`: Buscar, Filtrar, Ações e Modo foco numa só barra sólida (raio do botão + 4 px, padding 4 px, `--fundo-controle`, `--borda-folha`, sem sombra e sem desfoque: a letra da lei não passa por trás); "Lido até aqui" fica fora, em botão primário. Em `forced-colors` é `Canvas` com contorno `CanvasText`. Em 320 px o respiro dos botões cai para 8 px e os quatro cabem numa linha; com o texto ampliado quebra em duas, sem alargar a página. **Trilho:** de 1200 px em diante (fora do modo foco) o dock e "Lido até aqui" ficam em coluna na margem da direita, a 1,5 rem da coluna de lei (`left: calc(50% + 35ch + 1.5rem)`, até 13 rem de largura), presos à altura do fim do cabeçalho mais 0,75 rem, a mesma da estrutura da norma (`--barra-fixa`, posta no `.leitor`); as ações do trecho marcado e o aviso da Estrela ocupam o mesmo trilho. Limite conhecido: com a fonte a 300% no celular o dock e o "Lido até aqui" não cabem entre o cabeçalho e as abas (a 200% cabem; a WCAG pede 200%) |
| Cores forçadas | o fundo e a sombra caem: a borda do vão da faixa passa à cor do fundo (`Canvas`), o realce da régua, o filtro ligado do dock e a seção de agora na estrutura vão em contorno `Highlight` de 2 px, e a barra da estrela vira borda de 3 px em `CanvasText` (cheia na direta, tracejada na herdada). A faixa do lido some nesse modo: "Lido até aqui", em texto, diz onde a pessoa parou |
| Modo foco | penumbra `--penumbra` no fundo da página, cartão em `--luz-do-cartao` com `--borda-folha` e raio da folha, bandeja com `--superficie`, `--borda-folha` e raio da folha, botões fixos de `--superficie-translucida` (90%, opacos com `prefers-reduced-transparency`), menos "Próximo artigo" na bandeja aberta, que é o botão primário e o mais visível, enquanto "Sair do foco" recua (sem caixa, peso 400); o "⋯" e as setas do cartão são SVG de um traço. A penumbra e o cartão entram em 200 ms (`ease-out`) |

O texto da lei nunca é animado e o Leitor nunca é remontado; sem mascote no Leitor.

**Sessão.** Tudo vem dos componentes acima, sem token próprio. A Sessão em andamento e as telas de começar e de encerrar a Sessão são cartões (`.cartao-bloco`) com campos comuns, o botão primário e o fantasma ao lado; a faixa da Sessão (`.faixa-sessao`) é uma linha atenuada acima do Leitor e das revisões do Fixar, com "Pausar" (ou "Voltar") e "Encerrar" em botão-texto. As alavancas (`.alavancas`) são seções em grade: o Estacionamento (um campo e a lista de notas, cada uma com uma caixa de alvo de 44), o Temporizador (opcional) e o "Modo Só Estudo" (caixa de marcar, `.so-estudo-rotulo`; ligado, somem as áreas, a Ajuda, a Conta e o rodapé). As notas do Estacionamento ainda não resolvidas aparecem no "Para lembrar" do Hoje. Sem o mascote antigo; o Resumo do Dia tem o quadro do cacto.

## Movimento

| O quê | Como |
|---|---|
| Pressionar, hover, foco | 140 ms, `ease`, só transformação e sombra (nunca cor): de dia o botão desce 1 px e a sombra vai a 1 px; à noite encolhe a 0,975 |
| Ponto do Dia acendendo | 160 ms, `cubic-bezier(.2, .7, .2, 1)`, escala 0,6 a 1 e opacidade 0 a 1, uma vez |
| "Em seguida" abrindo | 180 ms, `cubic-bezier(.2, .7, .2, 1)`: a lista desce 4 px; no perfil Calmo, sem animação |
| Modo foco | a penumbra e o cartão entram em 200 ms, `ease-out`, só na entrada |
| Carregando | `Esqueleto`: a opacidade das linhas pulsa até 50% em 0,6 s, duas vezes; com movimento reduzido, parado |
| Caneta | muda de lugar por salto; nunca gira nem desliza |
| Quadro do cacto | de 520 a 1100 ms por fio (a parte inteira leva de 1,3 a 2,5 s, medido no Chromium), uma vez, ao fechar o Dia; só aqui a caneta anda |
| Escrita do nome | completa 2,64 s (primeira abertura no aparelho), curta 1,2 s (primeira de cada Dia), parada nas demais; reduzido: parada; Calmo: esmaece em 0,24 s; um toque ou uma tecla pula |
| Traço de seleção | normal: 240 ms desenhando, 120 ms parado, 260 ms sumindo; Calmo: contorno inteiro que esmaece em 380 ms; reduzido: nada |
| Passagem do cartão | normal: sai 190 ms (28 px à esquerda) e entra 210 ms (de 12 px à direita, dentro da calha da tela) com pausa de 150 ms; Calmo: só opacidade, 150 e 170 ms, pausa de 140 ms; reduzido: troca na hora |

Ainda só em plano (não estão no código): a transição entre rotas (View Transitions de até 150 ms) e o atraso de 150 ms do `Esqueleto`, em [`../planos/transicoes-e-carregamento.md`](../planos/transicoes-e-carregamento.md). Quando entrarem, nunca animam o texto da lei nem remontam o Leitor.

Proibido: brilho pulsando, lens flare, parallax, superfície iridescente, vidro desfocado atrás de texto, sombra com desfoque, luz que acompanha o dedo, ciclo de dia e noite, confete, som. Com `prefers-reduced-motion`, os pontos aparecem acesos, o quadro do cacto pronto, o nome parado; o traço de seleção não é desenhado e o cartão troca na hora; ordem, conteúdo e ação não mudam.

## Acessibilidade e robustez

- Contraste: texto 4,5:1, gráficos e contornos 3:1, nos dois temas e em cada fundo possível (inclusive na folha, na régua e sob o dock). A folha só se separa do chão pela linha de 1 px do mundo: nenhuma peça pode depender de "folha sobre chão" como contraste.
- Alvos de 44 px em botões, links isolados, linhas de lista, campos e abas (exceção: link dentro de frase corrida).
- Foco visível em tudo, com `--bloco-foco` dentro da folha; link "pular para o conteúdo"; atalhos mantidos.
- Texto quebra qualquer palavra longa (`overflow-wrap: anywhere` no conteúdo) e nenhuma tela rola na horizontal a 320 px, a 200% de zoom nem com a fonte a 200%.
- Transparência e movimento têm saída (`prefers-reduced-transparency`, `prefers-reduced-motion`, `forced-colors`).
- Cor nunca sozinha: tipo de tarefa, destaque, andamento, área atual, erro e "salvo" têm texto, ícone, peso ou estilo de linha; os pontos do Dia têm forma por estado.
- Caneta, pontos de luz decorativos, o nome escrito e o quadro do cacto: `aria-hidden` (a legenda do quadro é `role="status"`); o estado de cada ponto do Dia vem em texto acessível.

## Marca e mascote

- **Nome:** "arretado" escrito num traço só, com o cacto simplificado ao lado (a seção "A marca", acima). Sem martelo, balança nem outros clichês jurídicos.
- **A caneta-cacto de vidro** é o objeto da marca no app: ponteiro da retomada nas três poses; no app de loja, ícone sobre o papel.
- **Mascote:** nenhum. O cachorro do Resumo do Dia saiu em 19/10/2026 (o Gabriel não gostou) e o mascote antigo saiu na P2 da D-D7 (18/10/2026); no lugar, a caneta desenha o quadro do cacto a cada Dia fechado. Os desenhos ficam só como histórico em `docs/design/mascote/`.

## Mapa do código

| Parte | Onde |
|---|---|
| Tokens, base, botões, campos, abas, cartões, navegação, rodapé | `src/apresentacao/estilos.css` (o CSS de cada pacote leva o que for da sua tela) |
| Fontes | `src/apresentacao/fontes/` (Schibsted Grotesk e Familjen Grotesk, licença OFL); Atkinson e Literata de `node_modules/@fontsource*` |
| Casca (cabeçalho, navegação, "+", rodapé) | `src/apresentacao/Shell.tsx`, `componentes/TituloComMais.tsx` (o "+"), `componentes/teclado-aberto.ts` (teclado aberto), `componentes/MenuAjuda.tsx`; nomes das áreas em `textos.ts` (`ROTULO_DA_AREA`) |
| Marca e escrita do nome | `componentes/LockupParado.tsx`, `componentes/escrita/` (`Marca.tsx`, `EscritaDoNome.tsx`, `frequencia.ts`) |
| Caneta, quadro do cacto, traço e passagem | `componentes/Caneta.tsx`, `componentes/luz.css`, `componentes/quadro/`, `componentes/traco/`, `componentes/passagem.ts` |
| Hoje | `src/apresentacao/hoje/*` (`Parada.tsx`, `Agora.tsx`, `Depois.tsx` = "Em seguida", `ParaLembrar.tsx`, `PontosDoDia.tsx`, `FecharDia.tsx`), `componentes/AcaoAgora.tsx`, `PontoDeLuz.tsx`, `LinhaLista.tsx`; lógica pura em `src/dominios/hoje/` |
| Revisão e Fixar | `src/apresentacao/recall/*` (`Drill.tsx`, `RevisarFrases.tsx`, `TopoDaRevisao.tsx`, `RecallInicio.tsx`, listas); a linha "Depois: …" do Fixar é `componentes/LinhaDepois.tsx`; `componentes/DiasDaSemana.tsx` |
| Leitor e Biblioteca | `src/apresentacao/biblioteca/*` |
| Trilha | `src/apresentacao/plano/*` (`pontos/`, `tarefas/`, `onboarding/`) |
| Conta, Sessão e Orientações | `src/apresentacao/conta/*`, `src/apresentacao/sessao/*`, `src/apresentacao/orientacoes/*` (`estilos-orientacoes.css`: `.documento`, `.indice-de-secoes`); ícone, voltar e linha de lista em `componentes/Icone.tsx`, `Voltar.tsx` e `LinhaLista.tsx` |
| Contraste | `scripts/contraste.mjs`, `scripts/contraste.test.ts` |
| Capturas e medidas | `scripts/capturas-ui.mjs` |

## Como conferir

1. `npm run check` (lint, tipos, testes, auditoria) e o E2E da tela tocada, com axe nos dois temas.
2. `node scripts/contraste.mjs`: todos os pares, nos dois temas.
3. `npm run build && node scripts/capturas-ui.mjs --rotas todas --medir --folhas`: fotografa as rotas × 3 aparelhos × 2 temas e mede rolagem horizontal, alvos de 44 px e texto sob as abas de baixo no fim da página. `--zoom 2` repete a 200%; a fonte a 200% e a 300% também se medem.
4. Comparar com as pranchas e com o contrato da D-D9 em [`referencias/2026-10-19-tinta-e-noite/`](referencias/2026-10-19-tinta-e-noite/) (tese, forma, acabamento, interação, padrões permitidos).
5. Em cada PR de fase: folhas "antes e depois" da tela, tema claro e escuro, celular, tablet e desktop, em `docs/redesign/tinta-e-noite/<fase>/`.
