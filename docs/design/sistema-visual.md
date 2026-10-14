# Sistema visual do Arretado — v3

Base: a identidade D-D2 (areia, espresso, cacto, mascote; aprovada em 14/10/2026), os papéis de cor e as plataformas da D-D3 e, por cima, a **D-D4** (paleta, botões, cartões por estado, Leitor e Sessão do Gabriel, 14/10/2026) — tudo em [`decisoes-design.md`](decisoes-design.md); a D-D3 e a D-D4 valem como padrão até o Gabriel vetar. A referência de fidelidade são os mockups do Gabriel em [`referencias/2026-10-14-gemini/`](referencias/2026-10-14-gemini/leia-me.md) (o protótipo [`prototipo/hoje.html`](prototipo/hoje.html) é da D-D2 e está superado nas cores e nos botões). Diagnóstico que originou esta versão: [`auditoria-ui-2026-10-14.md`](auditoria-ui-2026-10-14.md). Execução: [`../planos/redesign-v2.md`](../planos/redesign-v2.md). Só apresentação (D-D1).

**Fonte de verdade dos valores:** `src/apresentacao/estilos.css` (e os CSS dos pacotes). Este texto é o alvo e o mapa; enquanto uma fatia não chegou, o código ainda diverge dele. Contraste de cada par: `scripts/contraste.mjs` (e `npm run check`).

## Princípios

1. **Uma ação dominante por tela**, em Terracota (claro) ou Solace (escuro e dentro do bloco de Caatinga).
2. **Cor tem função** (tabela abaixo). Nada de verde "de enfeite".
3. **Bloco de cor orienta, não anima:** um bloco-herói por tela de orientação, e a cor do bloco diz o **estado** da pessoa. Leitor e Revisão em curso ficam calmos.
4. **O texto da lei é o protagonista**; tudo em volta cede.
5. **Segurança visível:** "salvo neste aparelho" e o ponto de retomada sempre à vista.
6. **Mesmo jeito em celular, tablet e desktop;** o que muda é a disposição, não o vocabulário visual.
7. **Nada depende de movimento, de transparência nem de cor sozinha.**

## Papéis de cor

| Papel | Pergunta | Claro | Escuro |
|---|---|---|---|
| Ação | "O que faço agora?" | Terracota `--acao` | Solace `--acao` |
| Ação dentro do bloco-herói | idem | Solace `--bloco-acao` | Solace |
| Lugar e selecionado | "Onde estou? O que guardei?" | Caatinga `--lugar`, `--selecionado-*`, `--bloco-*` | cacto `--lugar`; bloco Noite-cartão com borda Solace; selecionado em Caatinga com anel de cacto |
| Calma | "O que anda bem?" | Acqua `--acqua` (texto: `--acqua-texto`) | Acqua (texto `#79a79d`) |
| Superfície quente | quadro de estado | Areia `--quente` | `#2f261d` |
| Conteúdo | o que se lê | Tinta `--texto` | Palha `--texto` |
| Caminho | "Para onde posso ir?" | Terracota `--link` | Solace `--link` |
| Realce de termo | "Que tipo de termo é este?" | `--destaque-*` (sublinhado, ver Leitor) | os mesmos, mais claros |
| Perigo | "Isto apaga" ou falha técnica | `--perigo` | `--perigo` |

Regras: Terracota/Solace só em botão primário, "+", link e foco; Caatinga nunca em link; Acqua nunca como texto sem o passo `--acqua-texto`; vermelho nunca no estudo; amarelo, verde e rosa são dos grifos do leitor e de mais nada. O **tipo da tarefa** é um ponto de cor ao lado do texto (Frases = Solace, Cartões = Acqua, leitura = lugar); a matéria vai sempre em texto.

## Tokens

Todos os pares de texto passam em 4,5:1 e os gráficos (contorno, ícone, foco, sublinhado) em 3:1, medidos com `scripts/contraste.mjs`. Colunas: claro · escuro.

### A paleta (valores fixos, iguais nos dois temas)

`--areia #ead2b0` · `--palha #f6f1e6` · `--creme #faf6ee` · `--terracota #963417` · `--caatinga #3b3f21` · `--acqua #628981` · `--solace #cf893a` · `--noite #16130f` · `--noite-cartao #251f19` · `--tinta #2b1b12` · `--sobre-solace #231f1a` (texto sobre Solace) · `--cacto #6f9456` (o verde do cacto desenhado: só traço e anel, nunca texto pequeno).

### Superfície e texto

| Token | Claro · escuro | Uso | Contraste medido |
|---|---|---|---|
| `--fundo` | Palha · Noite | tela | — |
| `--superficie` | Creme · `#1e1914` | campos, cartões, linhas | — |
| `--superficie-2` | `#eae2d3` · `#2a231c` | trilho de abas, barra de paginação, trilho do progresso | — |
| `--quente` | Areia · `#2f261d` | cartão Distraído, tiles, chip inativo | `--texto` 11,3:1 · 13,2:1 |
| `--borda` | Caatinga a 16% · Palha a 14% | filetes decorativos | — |
| `--borda-campo` | `#8c7b68` · `#8a7a6a` | contorno de campo | 3,8:1 sobre `--superficie` · 4,2:1 |
| `--borda-forte` | Tinta · `#b5a898` | contorno de caixa e rádio | 15,4:1 · 7,5:1 |
| `--texto` | Tinta · Palha | texto | 14,7:1 sobre `--fundo` · 16,4:1 |
| `--texto-atenuado` | `#5d4d40` · `#b5a898` | apoio, rótulo | 7,2:1 · 8,0:1 (6,3:1 · 6,7:1 sobre `--superficie-2`) |
| `--titulo` | Caatinga · Palha | título de página (H1) | 9,7:1 · 16,4:1 |

### Ação, lugar, calma e bloco

| Token | Claro · escuro | Uso | Contraste medido |
|---|---|---|---|
| `--acao` / `--acao-texto` | Terracota / `#ffffff` · Solace / `--sobre-solace` | botão primário e "+" | 7,5:1 · 5,7:1 |
| `--link` | Terracota · Solace | link de texto | 6,7:1 sobre `--fundo`, 5,8:1 sobre `--superficie-2` · 6,4:1, 5,4:1 |
| `--foco` | Terracota · Solace | anel de foco global (3 px) | 6,7:1 · 6,4:1 |
| `--lugar` | Caatinga · cacto | filete, marca do "Lido até aqui", filtro ligado | 9,7:1 · 5,3:1 |
| `--acqua` | Acqua | progresso, ponto de Cartões, "salvo", interruptor | 3,4:1 sobre `--fundo` · 4,8:1 (3,0:1 sobre `--superficie-2`) |
| `--acqua-texto` / `--acqua-fundo` | `#416a63` / `#416a63` · `#79a79d` / `#416a63` | texto em Acqua; selo Acqua com texto branco | 5,4:1 · 6,9:1; branco sobre o selo 6,1:1 |
| `--bloco-fundo` | Caatinga · Noite-cartão | bloco-herói e cartão Estudando | — |
| `--bloco-texto` / `--bloco-atenuado` | Palha / `#d6d1b5` · Palha / `#b5a898` | texto no bloco | 9,7:1 / 7,1:1 · 14,5:1 / 7,0:1 |
| `--bloco-acao` / `--bloco-acao-texto` | Solace / `--sobre-solace` | botão primário **no bloco** | 5,7:1; Solace sobre Caatinga 3,8:1 |
| `--bloco-borda` | transparente · Solace a 35% | contorno do bloco no escuro | — |
| `--bloco-foco` | Solace | anel de foco dentro do bloco e do item selecionado | 3,8:1 · 5,7:1 |
| `--selecionado-fundo` / `-texto` / `-anel` | Caatinga / Palha / transparente · Caatinga / Palha / cacto | item atual, aba, chip, caixa marcada | 9,7:1; anel de cacto 3,2:1 |
| `--tinta-lugar` | Caatinga a 12% sobre a superfície · a 70% | linha selecionada, "Frase correta", ícone de lista | `--texto` 12,5:1 · 11,4:1 |
| `--regua-fundo` / `--regua-barra` | Areia a 45% / Caatinga · Solace a 16% / Solace | régua de leitura | `--texto` 13,4:1 · 12,1:1 |

O anel de foco global é Terracota no claro, que some no verde do bloco: dentro do bloco, do item selecionado e das abas ativas o anel passa a `--bloco-foco` (Solace). O bloco também reajusta `--acao`, `--acao-texto` e `--link` para Solace e Palha, então o `.principal` e os links dentro dele funcionam sem regra própria.

### Destaques do leitor (sublinhado, nunca fundo)

| Token | Claro · escuro | O quê | Estilo |
|---|---|---|---|
| `--destaque-prazo` | `#173f52` · `#7fb4cf` | prazos e tempo | duplo, deslocamento de 4 px |
| `--destaque-condicao` | `#b06f22` · Solace | exceções e condições | tracejado, 4 px |
| `--destaque-absoluto` | Terracota · `#e07b55` | termos absolutos | ondulado, 3 px |
| `--destaque-pena` | Terracota · `#e07b55` | penas, quóruns e frações | pontilhado, 4 px |

Contra `--fundo`: 10,0:1 · 8,2:1; 3,6:1 · 6,4:1; 6,7:1 · 6,3:1 (e o mesmo para pena). O estilo da linha é o que distingue os quatro (a cor sozinha não distingue).

### Estado (sem mudança)

`--perigo`, `--sucesso`, `--aviso-fundo/-texto`, grifos (`--grifo-1` a `-3`) e `--estrela` ficam como estão. **Saíram** na F1: `--primaria`, `--primaria-texto`, `--agora-fundo`, `--agora-borda`, `--depois`, `--progresso`, `--cartao-agora-*`; o teste de contraste falha se algum CSS voltar a usá-los.

## Forma, espaço, tipografia

| Item | Valor |
|---|---|
| Raios | `--raio-heroi` 24 · `--raio-cartao` 16 · `--raio-botao` 12 · `--raio-campo` 12 · `--raio-pilula` 999 (chip, aba, barra, interruptor) |
| Espaço | `--espaco-1` 0,25 rem · `-2` 0,5 · `-3` 1 · `-4` 1,5 · `-5` 2 · `-6` 3 |
| Sombras | `--sombra` (cartão) · `--sombra-botao` (`0 2px 6px`, no primário) · `--sombra-flutuante` (`0 4px 16px`, dock, "+", folha); no escuro, preto |
| Alvo | `--alvo` 44 px: botões, links isolados, linhas de lista; campos 48 |
| Gutter | 16 px (celular) · 24 (tablet em pé) · 32 (≥ 900) |
| Coluna | 40 rem (celular e tablet em pé) · 65 rem (≥ 900) · leitura 70 ch |
| Título de página (H1) | Literata 700, cor `--titulo`, 1,75 rem (celular) · 2 (tablet) · 2,25 (≥ 900), linha 1,15 |
| Título de cartão e de bloco | Atkinson 700 (sans), 1,0625 a 1,3 rem |
| Seção (H2) / cartão (H3) | Atkinson 700, 1,25 rem / 1,0625 rem |
| Corpo · pequeno · rótulo | Atkinson 1 rem · 0,875 · 0,8125 (mínimo; caixa-alta com 0,04 em só em etiqueta) |
| Cartão de destaque e frase de revisão | Literata 700, 1,5 a 1,75 rem |
| Lei | Literata, `--tamanho-leitura` (18 px, preferência da pessoa) |

Itálico nunca no trecho da lei. Em celular, campos com no mínimo 16 px (o iOS aproxima abaixo disso).

## Componentes

| Componente | Especificação |
|---|---|
| **Botão primário** (`.principal`) | Compacto: altura 44, padding `0 20px`, raio 12, peso 600, `.9375rem`, espaçamento `-0,01em`, `--sombra-botao`; fundo `--acao`, texto `--acao-texto`. Largura total só em cartão e formulário (altura 52 no bloco-herói). **Um por tela.** Hover escurece 12%; pressionado desce 1 px; desabilitado a 50% sem sombra; transição de 140 ms só em `transform` e `box-shadow` e só sem `prefers-reduced-motion` (nunca em cor: ao virar o tema o texto troca na hora e o fundo ficaria atrasado, o que o axe lê como contraste baixo). |
| **Botão secundário** (`button`, `.botao`) | Mesma forma, fundo `--superficie`, contorno de 1 px `--borda-botao`, texto `--texto`. |
| **Botão fantasma** (`.botao-texto`) | Sem caixa, sublinhado de 4 px, cor herdada e 82% de opacidade, peso 500, `.875rem`, alvo 44. Vai **ao lado** do primário ("Trocar tarefa", "Pausar") e é o "Voltar ao Plano" e o "Editar pontos": link isolado nunca fica com 19 px de altura. |
| **Botão de ícone** (`.botao-icone`) | Quadrado de 44 com o contorno do secundário; `aria-label` sempre. |
| **Linha de ação** (`.linha-acao`) | Linha inteira de toque: altura 52, padding `10px 14px`, raio 12, filete `--borda`, fundo da superfície; texto à esquerda e seta ou duração à direita. Substitui botões empilhados ("Por onde começar?", folhas, modais). |
| **Destrutivo** (`.perigoso`) | Secundário com texto e borda `--perigo`; só vira cheio dentro do diálogo de confirmação. |
| **Link em texto** | `--link`, sublinhado fino com `text-underline-offset: 0.2em`, 2 px no hover e no foco. Nunca em verde. |
| **Campo** | Altura 48, raio 12, fundo `--superficie`, contorno 1,5 px `--borda-campo`, 16 px, rótulo sempre visível acima. Vale para `input` com qualquer `type` (ou sem), `select` (seta própria feita com gradiente, para caber na CSP) e `textarea`. Erro: contorno e texto `--perigo` mais ícone e frase; nunca só cor. |
| **Caixa e rádio** | Marca própria de 22 px com contorno de 2 px em `--borda-forte` (Tinta no claro), raio 6 (caixa) ou círculo (rádio), dentro de um rótulo de 44 de altura; marcada = `--selecionado-fundo` com marca em `--selecionado-texto` (e anel de cacto no escuro). A linha inteira é o alvo. |
| **Aba** (`.abas`) | Trilho `--superficie-2` em pílula; aba atual = `--selecionado-*`; no celular rola na horizontal sem quebrar linha; anel de foco por dentro. |
| **Chip** | Pílula 32 de altura dentro de alvo de 44; selecionado = `--selecionado-*`; inativo = `--quente`. |
| **Linha de lista** | Altura mínima 56, alvo inteiro, título, apoio em atenuado, sem sublinhado; ponto de tipo, seta ou duração à direita; filete entre linhas. |
| **Cartão** | `--superficie`, raio 16, borda `--borda`, `--sombra`; título de cartão em sans bold. |
| **Bloco-herói** | `--bloco-fundo`, raio 24, texto `--bloco-texto`, padding 20 a 28; carrega no máximo etiqueta, título (sans bold), apoio, um botão primário e um fantasma. A cor do bloco é o estado (ver abaixo). Mascote só aqui (e no estado vazio). |
| **Callout** | Fundo `--tinta-lugar`, filete de 4 px à esquerda, ícone e texto; "Frase correta" em lugar, aviso em `--aviso-*`, perigo em `--perigo`. |
| **Ponto de tipo** | 10 a 12 px, decorativo (`aria-hidden`): Frases Solace, Cartões Acqua, leitura `--lugar`; o tipo vem em texto. |
| **Progresso** | Barra de 6 px `--superficie-2` com preenchimento `--acqua`; sempre com texto ("3 de 12"). |
| **Estado vazio** | Ícone ou mascote pequeno, frase curta, um botão primário. Sem texto longo. |
| **Navegação** | Barra reta embaixo no celular e no tablet em pé (ver plataformas): ícone 24 + rótulo 0,75 rem, item atual em `--selecionado-*` ou peso 700 e cor de lugar; alvo ≥ 56 × 56. |
| **Cabeçalho** | "Arretado." (Literata 700, ponto final em Terracota) com o cacto; "Conta" e "?" como botões de contorno; no desktop, a navegação entra no meio e "Registrar erro" (com a tecla E) à direita. |
| **Rodapé** | Linha legal curta e o link "Backup e dados" (botão fantasma, 44). No fim do conteúdo, nunca sob a navegação fixa. |
| **Diálogo** | `dialog` nativo, raio 16, `--superficie`, fundo `rgb(0 0 0 / 45%)`, `--sombra-flutuante`; no celular, folha presa à borda de baixo. |

### Blocos por estado (F3, Retorno e Fechar o dia)

| Estado | Bloco | Ação | Conteúdo |
|---|---|---|---|
| Estudando (retomar: "Você parou no Art. 112, § 1º") | Caatinga (Noite-cartão no escuro) | Solace + fantasma "Escolher outra coisa" | mascote Estudando com a lâmpada |
| Distraído ("Por onde começar?") | Areia (`--quente`) | linhas de ação | mascote Distraído e os símbolos de distração |
| Sorrindo (dia fechado) | Palha (cartão claro) | botão de contorno "Ver resumo do dia" | mascote Sorrindo entre os cactos e o andamento do dia em pontos — **andamento das tarefas, nunca sequência de dias** |
| Determinado (revisões prontas) | cinza-areia (`--superficie-2`) | Terracota "Iniciar N frases →" | mascote Determinado e a lista do que está pronto |

O Agora do Hoje usa o primeiro (Caatinga) por padrão; o mockup do Gabriel o desenha em Areia (veto em aberto, D-D4 a).

### Botões não são vidro

O vidro (transparência com desfoque) saiu dos botões e da navegação. Fica **só** onde algo flutua sobre o texto: o dock do Leitor (fundo da superfície a 92%, `blur(12px)`) e, no modo foco, os botões fixos de `--superficie-translucida` (90%). Com `prefers-reduced-transparency: reduce` e em `forced-colors` vira cor sólida, sem `backdrop-filter`. Texto sempre sólido: a transparência nunca baixa o contraste do texto abaixo de 4,5:1 sobre o pior fundo possível.

## Plataformas

Pontos de quebra: **celular < 700 px**, **tablet em pé 700 a 899**, **desktop e tablet deitado ≥ 900** (os de hoje no CSS). Referências: 390×844, 768×1024 (e 712×1138 na suíte), 1440×900 (e 1024×768).

| Elemento | Celular | Tablet em pé | Desktop e tablet deitado |
|---|---|---|---|
| Cabeçalho | 64 px: "Arretado." à esquerda; "Conta" e "?" à direita | igual, gutter 24 | 72 px: marca · navegação ao centro · "Registrar erro (E)", "Conta", "?" |
| Navegação | barra reta de baixo, ícone e rótulo nas quatro áreas, `env(safe-area-inset-bottom)`; "+" simples de 56 px acima dela, sobre uma reserva de rolagem (some no Hoje, onde a captura é inline) | a mesma barra, centralizada em até 560 px | no cabeçalho, pegajosa (`sticky`), item atual em bloco; sem "+" fixo |
| Conteúdo | 1 coluna, gutter 16, reserva embaixo para a barra e o "+" | 1 coluna de 40 rem centralizada | até 65 rem, 2 colunas (7fr · 5fr) no Hoje, no Recall e no Plano |
| H1 | 1,75 rem | 2 rem | 2,25 rem |
| Hoje | cartão Agora por estado, Depois (até 2 linhas), captura inline "Anote a frase correta" + Guardar | Agora em 2 colunas internas (texto · mascote) | à esquerda o Agora; à direita Depois e captura; mascote apoiado na borda do bloco |
| Recall | resumo + abas rolantes + lista | idem, lista em cartões | à esquerda resumo e abas; à direita a lista; revisão em coluna única de 40 rem |
| Biblioteca | abas rolantes, filtros recolhidos, lista de normas | grade de 2 colunas | grade de 3 colunas, filtros em barra lateral |
| Plano | matérias recolhidas com andamento; pontos ao abrir | idem | matérias à esquerda, pontos à direita |
| Leitor | ver abaixo | ver abaixo | coluna de 70 ch centralizada; ferramentas num trilho à direita (≥ 1200) |
| Rodapé | fim do conteúdo, acima da reserva | idem | uma linha, centralizada |
| Formulários | largura total, rótulo acima | coluna de 32 rem | coluna de 32 rem alinhada à esquerda do conteúdo |

Regras de plataforma: o "+", o dock e a barra nunca cobrem texto (reserva de rolagem = altura da barra + 12 px + `safe-area` + 16 px); com o teclado aberto o "+" some (o campo ganha a tela); `viewport-fit=cover` e `env(safe-area-inset-*)` em tudo que é fixo; toque sem depender de `:hover`; teclado e atalhos do desktop intactos (E registra erro; Esc fecha).

## Leitor e Sessão (D-D4; valores da especificação do Gabriel)

Fonte completa: [`referencias/2026-10-14-gemini/especificacao-leitor-sessao.md`](referencias/2026-10-14-gemini/especificacao-leitor-sessao.md). Aqui, o que o código precisa saber.

**Leitor (F6).**

| Parte | Especificação |
|---|---|
| Controles | linha `space-between`, gap 8: seletor de fonte segmentado (pílula de 38, contorno Caatinga a 18%, A- e A+ de 44 × 38, rótulo "18px") e "Destaques" (pílula de 38; ligado = Caatinga com texto Palha e ✓) |
| Legenda dos destaques | uma linha recolhível sob os controles, só com Destaques ligado: Prazos, Exceções, Absolutos, Penas, cada um com o seu sublinhado |
| Régua de leitura | Areia a 45%, filete esquerdo de 4 px de Caatinga, raio `0 12px 12px 0`, padding `12px 14px`; no canto de cima à direita, ☆ (alvo 44 × 44) e o chip "Ações" (32 de altura, raio 8, Creme) |
| Dock (retrato) | fixo, `bottom: 76px` (acima da barra), 16 px dos lados, `z-index: 30`, gap 10: pílula à esquerda (altura 52, Creme a 92%, `blur(12px)`, 3 colunas Buscar, Filtrar, Foco) e "📍 Lido até aqui" à direita (`min-width` 112, altura 52, raio 14, Caatinga e Palha, peso 600); o artigo tem `padding-bottom: 156px` |
| Modo foco | retrato: coluna centrada, padding 16, gap 12; paisagem (`orientation: landscape` e `max-height: 560px`, ou largura ≥ 768): grade `minmax(0, 1fr) 220px`, gap 16, `100dvh` sem rolagem; vizinhos em `max-height: 2.8em`, opacidade 0,42 e máscara em gradiente; painel: barra de paginação (44, `--superficie-2`, raio 10), grade 2 × 2 de ações (54, Areia, raio 12) e "Sair do foco" (44, Caatinga) |
| Ações do dispositivo | folha de baixo (celular) ou diálogo de 420 px (desktop): três tiles (Estrelar, Copiar ref., Corrigir texto; 64 de altura, Areia, raio 12), primário Terracota de 48 "Registrar erro neste artigo →", linha de ação "Criar cartão deste trecho" |

O texto da lei nunca é animado e o Leitor nunca é remontado (regras existentes); sem mascote no Leitor.

**Sessão (F9).**

| Parte | Especificação |
|---|---|
| Cabeçalho | "Modo Só Estudo" (interruptor em Acqua; ligado, esconde a barra global e os avisos do rodapé) e chips 15, 25, 45 e 60 min (34 de altura; ativo Caatinga, inativo Areia) com "X min passados (só informa)" |
| Tarefa ativa | bloco de Caatinga, mascote Estudando à esquerda (96 px), primário Solace "Voltar à leitura →" e fantasma "Pausar" |
| Estacionamento | cartão Areia, mascote Distraído no cabeçalho, campo (Creme, raio 10) e "Estacionar" compacto (40, raio 10, Areia, contorno Caatinga) |
| Fechar sessão | mascote Sorrindo entre os cactos, selo Acqua "25 min · Art. 112 a 118 lidos", caixas de 22 px para resolver ou descartar o estacionado, primário Terracota "Guardar e fechar sessão →" |

## Movimento

| O quê | Como |
|---|---|
| Pressionar, hover, foco | 120 a 160 ms, `ease-out`, só cor, sombra e 1 px de deslocamento |
| Cartão virando, aba trocando, folha abrindo | 180 a 220 ms |
| Entre rotas (F10) | View Transitions, fade de até 150 ms, cabeçalho e navegação fixos; **nunca** anima texto da lei nem remonta o Leitor; desligada com `prefers-reduced-motion` e no perfil Calmo (plano C do dia 14/10) |
| Carregando | `Esqueleto` com atraso de 150 ms; operações longas no padrão "andamento" (ver [`../planos/transicoes-e-carregamento.md`](../planos/transicoes-e-carregamento.md)) |

Movimento só quando explica. Nenhuma informação depende dele; sem movimento a ordem e o conteúdo são os mesmos.

## Acessibilidade e robustez

- Contraste: texto 4,5:1, gráficos e contornos 3:1, nos dois temas e em cada fundo possível (inclusive no bloco-herói, na régua e sob o dock).
- Alvos de 44 px em botões, links isolados, linhas de lista, campos e abas (exceção: link dentro de frase corrida). A suíte passa a varrer as rotas principais.
- Foco visível de 3 px em tudo, com `--bloco-foco` dentro do bloco; link "pular para o conteúdo"; atalhos mantidos.
- Texto quebra qualquer palavra longa (`overflow-wrap: anywhere` no conteúdo) e nenhuma tela rola na horizontal a 320 px nem a 200% de zoom.
- Transparência e movimento têm saída (`prefers-reduced-transparency`, `prefers-reduced-motion`, `forced-colors`).
- Cor nunca sozinha: tipo de tarefa, destaque, andamento, erro e "salvo" têm texto, ícone ou estilo de linha.
- Mascote, cactos, lâmpada e símbolos de distração são decorativos: `alt=""` ou `aria-hidden`; nada depende deles.

## Marca e mascote

- **Nome:** "Arretado." em Literata 700, com o ponto final em Terracota, e **um cacto verde** ao lado (SVG em `--cacto`), na altura da caixa-alta; vale também como favicon (F11). Sem martelo, balança nem outros clichês jurídicos. (Três dos quatro mockups não têm o cacto no cabeçalho: veto em aberto, D-D4 c.)
- **Mascote:** vetorial plano (decisão de 14/10/2026), [`mascote/`](mascote/) com `estudando`, `distraido`, `sorrindo` e `determinado`, gerado por `mascote/gerar-mascote.mjs`. **Aparece** no Hoje (apoiado na borda do bloco Agora), na retomada depois de dias (Distraído, acolhedor, sem culpa), na Sessão (Estudando, Distraído e Sorrindo), no estado vazio e na abertura; 80 a 124 px. **Não aparece** no Leitor, na Revisão em curso, em erro punitivo nem em todas as telas ao mesmo tempo.
- **Elementos vetoriais** do Gabriel (`ElementoCactos`, `ElementoLampada`, `ElementoDistracao`, na especificação): componentes decorativos em `src/apresentacao/componentes/` (F3), traço `--tinta`.
- Próximo: refinar as poses com o Gabriel (proporções, mãos, expressão); origem da arte e uso comercial a confirmar (D-D2, "a conferir").

## Mapa do código

| Parte | Onde |
|---|---|
| Tokens, base, botões, campos, abas, cartões, navegação, rodapé | `src/apresentacao/estilos.css` (F1 e F2; cada fatia seguinte move para o CSS do próprio pacote o que for da sua tela) |
| Casca (cabeçalho, navegação, "+", rodapé) | `src/apresentacao/Shell.tsx` |
| Hoje | `src/apresentacao/hoje/*`, `componentes/AcaoAgora.tsx`, `LinhaDepois.tsx`, `LinhaLista.tsx`; lógica pura em `src/dominios/hoje/` |
| Revisão e Recall | `src/apresentacao/recall/*` (`Drill.tsx`, `RevisarFrases.tsx`, `RecallInicio.tsx`, listas) |
| Leitor e Biblioteca | `src/apresentacao/biblioteca/*` |
| Plano | `src/apresentacao/plano/*` (`pontos/`, `tarefas/`, `onboarding/`) |
| Conta e Sessão | `src/apresentacao/conta/*`, `src/apresentacao/sessao/*` |
| Contraste | `scripts/contraste.mjs`, `scripts/contraste.test.ts` |
| Capturas e medidas | `scripts/capturas-ui.mjs` |

## Como conferir

1. `npm run check` (lint, tipos, testes, auditoria) e o E2E da tela tocada, com axe nos dois temas.
2. `npm run build && node scripts/capturas-ui.mjs --rotas todas --medir --folhas`: fotografa 27 rotas × 3 aparelhos × 2 temas e mede rolagem horizontal, alvos de 44 px e texto sob o "+". Comparar com [`../redesign/auditoria-2026-10-14/antes-medidas.json`](../redesign/auditoria-2026-10-14/antes-medidas.json). `--zoom 2` repete a 200%.
3. Revisão pelo formato de `.claude/skills/arretado-visual-review` (achados com id, prioridade e correção).
4. Em cada PR de fatia: folhas "antes e depois" da tela, tema claro e escuro, celular, tablet e desktop.
