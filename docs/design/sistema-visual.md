# Sistema visual do Arretado — v2

Base: a identidade D-D2 (areia, espresso, verde-cacto, caramelo/sol, mascote, vidro; aprovada em 14/10/2026), os papéis de cor e as plataformas da D-D3 ([`decisoes-design.md`](decisoes-design.md); proposta a vetar) e o protótipo [`prototipo/hoje.html`](prototipo/hoje.html), que é a referência de fidelidade (abrir no navegador; `?tema=claro` ou `?tema=escuro` força o tema). Diagnóstico que originou esta versão: [`auditoria-ui-2026-10-14.md`](auditoria-ui-2026-10-14.md). Execução: [`../planos/redesign-v2.md`](../planos/redesign-v2.md). Só apresentação (D-D1).

**Fonte de verdade dos valores:** `src/apresentacao/estilos.css` (e os CSS dos pacotes). Este texto é o alvo e o mapa; enquanto uma fatia não chegou, o código ainda diverge dele. Contraste de cada par: `scripts/contraste.mjs` (e `npm run check`).

## Princípios

1. **Uma ação dominante por tela**, no caramelo (claro) ou no sol (escuro).
2. **Cor tem função** (tabela abaixo). Nada de verde "de enfeite".
3. **Bloco de cor orienta, não anima:** um bloco-herói por tela de orientação. Leitor e Revisão em curso ficam calmos.
4. **O texto da lei é o protagonista**; tudo em volta cede.
5. **Segurança visível:** "salvo neste aparelho" e o ponto de retomada sempre à vista.
6. **Mesmo jeito em celular, tablet e desktop;** o que muda é a disposição, não o vocabulário visual.
7. **Nada depende de movimento, de transparência nem de cor sozinha.**

## Papéis de cor

| Papel | Pergunta | Claro | Escuro |
|---|---|---|---|
| Ação | "O que faço agora?" | caramelo `--acao` | sol `--acao` |
| Lugar | "Onde estou? O que está salvo?" | verde-cacto `--cacto`, `--bloco-*`, `--selecionado-*` | cacto claro `--cacto`; bloco espresso com borda caramelo; `--selecionado-*` em tinta de cacto |
| Conteúdo | o que se lê | tinta `--texto` | creme `--texto` |
| Caminho | "Para onde posso ir?" | argila `--link` | âmbar `--link` |
| Linha atual | "Em que linha estou?" | azul claro `--realce-*` | azul fundo `--realce-*` |
| Matéria | "De que matéria é?" | seis tons de disciplina | os mesmos, mais claros |
| Perigo | "Isto apaga" ou falha técnica | `--perigo` | `--perigo` |

Regras: caramelo/sol só em botão primário e no "+"; verde nunca em botão de ação nem em link; vermelho nunca no estudo; amarelo, verde e rosa são dos grifos do leitor e de mais nada.

## Tokens

Todos os pares de texto passam em 4,5:1 e os gráficos (contorno, ícone, foco) em 3:1, medidos com `scripts/contraste.mjs`. Colunas: claro · escuro.

### Superfície e texto

| Token | Claro · escuro | Uso | Contraste medido |
|---|---|---|---|
| `--fundo` | `#f4efe0` · `#1c1410` | tela | — |
| `--superficie` | `#fbf8ee` · `#251a14` | campos, cartões | — |
| `--superficie-2` | `#ebe5d1` · `#2b1f17` | trilho de abas, faixas | — |
| `--borda` | `#c9c19f` · `#4d3b2d` | filetes decorativos | — |
| `--borda-campo` | `#8a8266` · `#8a7561` | contorno de campo, caixa, rádio | 3,6:1 sobre `--superficie` · 3,9:1 |
| `--texto` | `#2d2a14` · `#fdf1de` | texto | 12,6:1 sobre `--fundo` · 14,4:1 sobre `--superficie-2` |
| `--texto-atenuado` | `#5f5a3c` · `#b9a897` | apoio, rótulo | 5,5:1 sobre `--superficie-2` · 6,9:1 |

### Ação, lugar, caminho, linha atual

| Token | Claro · escuro | Uso | Contraste medido |
|---|---|---|---|
| `--acao` / `--acao-texto` | `#e8892b` / `#2d2a14` · `#ffb627` / `#1c1410` | botão primário e "+" | 5,5:1 · 10,4:1 |
| `--cacto` | `#5f7a2c` · `#9bab4a` | cacto da marca, ícone de "salvo", progresso | 4,2:1 sobre `--fundo` (gráfico) · 7,2:1 |
| `--cacto-texto` | `#4f6a1f` · `#9bab4a` | texto verde sobre superfície (raro) | 5,4:1 sobre `--fundo` · 7,2:1 |
| `--bloco-fundo` | `#3f4a1a` · `#2b1f17` | bloco-herói e item ativo da navegação | — |
| `--bloco-texto` / `--bloco-atenuado` | `#fdf1de` / `#d9d3b0` · `#fdf1de` / `#b9a897` | texto no bloco | 8,5:1 / 6,3:1 · 14,4:1 / 6,9:1 |
| `--bloco-borda` | transparente · `rgb(255 182 39 / 35%)` | contorno do bloco no escuro | — |
| `--selecionado-fundo` / `--selecionado-texto` | `#3f4a1a` / `#fdf1de` · `#38311d` / `#9bab4a` | item ativo da navegação, aba e chip selecionados, caixa marcada | 8,5:1 · 5,1:1 |
| `--bloco-foco` | `#ffb627` · `#ffb627` | anel de foco **dentro** do bloco | 5,4:1 sobre `#3f4a1a` |
| `--link` | `#9a4a1c` · `#ffb454` | link de texto | 5,4:1 sobre `--fundo`, 4,9:1 sobre `--superficie-2` · 10,3:1 |
| `--realce-fundo` / `--realce-texto` | `#bcd9ff` / `#14213d` · `#2c4a68` / `#fdf1de` | linha atual | 11,0:1 · 8,2:1 |

O anel de foco global (`--foco`, 3 px) é `#b35900` no claro: sobre o verde do bloco dá só 2,0:1, por isso dentro do bloco o anel passa a `--bloco-foco`.

### Seis tons de disciplina

Esfera com ícone branco (claro) ou espresso (escuro); texto do tom sobre o bloco de tinta (`color-mix(in srgb, <esfera> 14% claro | 16% escuro, <superfície>)`).

| Tom | Esfera · texto (claro) | Esfera e texto (escuro) | Contraste do texto sobre a tinta (claro · escuro) |
|---|---|---|---|
| cacto | `#5f6e22` · `#3f4a1a` | `#9bab4a` | 7,5:1 · 5,1:1 |
| caramelo | `#a85a0c` · `#7a3f06` | `#e8892b` | 6,5:1 · 5,0:1 |
| céu | `#1f6f9f` · `#14506f` | `#5cb3e6` | 6,8:1 · 5,6:1 |
| anil | `#4a54b8` · `#343d8c` | `#9aa4ff` | 7,4:1 · 5,5:1 |
| ameixa | `#8a3f74` · `#652c54` | `#e08cc8` | 7,9:1 · 5,3:1 |
| turquesa | `#0e7466` · `#0a5449` | `#4fd1bd` | 6,9:1 · 6,6:1 |

O ícone sobre a esfera passa de 5:1 no claro e de 6,9:1 no escuro. O tom de cada matéria sai de uma função pura (a mesma matéria, sempre o mesmo tom; nome da matéria no texto, nunca só a cor).

### Estado (sem mudança)

`--perigo`, `--sucesso`, `--aviso-fundo/-texto`, `--foco`, grifos, destaques automáticos e `--estrela` ficam como estão. **Sai** (migrar os usos e apagar na F1): `--primaria`, `--primaria-texto`, `--agora-fundo`, `--agora-borda`, `--depois`, `--progresso`, `--cartao-agora-*` (viram `--bloco-*`).

## Forma, espaço, tipografia

| Item | Valor |
|---|---|
| Raios | `--raio-heroi` 28 · `--raio-cartao` 20 · `--raio-campo` 14 · `--raio-pilula` 999 (botão, chip, navegação, aba) |
| Espaço (base 4 px) | `--e1` 4 · `--e2` 8 · `--e3` 12 · `--e4` 16 · `--e5` 24 · `--e6` 32 · `--e7` 48 |
| Sombras | `--sombra` (cartão, a atual) · `--sombra-flutuante` (navegação e "+": `0 12px 32px -12px` da tinta a 28% mais `0 2px 6px` a 10%; no escuro, preto a 60%) |
| Alvo | `--alvo` 44 px: botões, links isolados, linhas de lista, campos (48) |
| Gutter | 16 px (celular) · 24 (tablet em pé) · 32 (≥ 900) |
| Coluna | 40 rem (celular e tablet em pé) · 65 rem (≥ 900) · leitura 70 ch |
| Título de página (H1) | Literata 700, 2 rem (celular) · 2,25 (tablet) · 2,5 (≥ 900), linha 1,15, linha de apoio em Atkinson 0,9375 rem atenuada |
| Seção (H2) / cartão (H3) | Atkinson 700, 1,25 rem / 1,0625 rem |
| Corpo · pequeno · rótulo | Atkinson 1 rem · 0,875 · 0,8125 (mínimo; caixa-alta com 0,04 em de espaçamento só em etiqueta) |
| Cartão de destaque e frase de revisão | Literata 700, 1,5 a 1,75 rem |
| Lei | Literata, `--tamanho-leitura` (18 px, preferência da pessoa) |

Itálico nunca no trecho da lei. Em celular, campos com no mínimo 16 px (o iOS aproxima abaixo disso).

## Componentes

| Componente | Especificação |
|---|---|
| **Botão primário** (`.principal`) | Pílula, altura 52 (celular) ou 48, largura total em formulário e cartão. Fundo `--acao` a 90% com brilho de cima para baixo (`linear-gradient` de branco 22% a 0), borda branca a 38%, sombra curta da própria cor e `inset` de 1 px, `backdrop-filter: blur(8px)`. Texto sólido `--acao-texto`, peso 700. **Um por tela**; o segundo botão do mesmo nível é secundário. Estados: hover claro +4%, pressionado desce 1 px, desabilitado a 50% sem sombra. |
| **Botão secundário** (`button`, `.botao`) | Pílula, altura 44, fundo da tinta a 6% (escuro: creme a 7%), borda a 16%, `blur(10px)`, texto `--texto`. Dentro de bloco-herói: creme a 12% com borda a 26%. |
| **Botão de texto** (`.botao-texto`) | Sem fundo, texto `--link`, alvo 44. É o "Voltar ao Plano" e o "Editar pontos": link isolado nunca fica com 19 px de altura. |
| **Botão de ícone** | Círculo de 44 com o vidro do secundário; `aria-label` sempre. Ajuda, Conta, ferramentas do Leitor. |
| **Destrutivo** | Secundário com texto e borda `--perigo`; só vira cheio dentro do diálogo de confirmação. |
| **Link em texto** | `--link`, sublinhado fino com `text-underline-offset: 0.2em`, 2 px no hover e no foco. Nunca em verde. |
| **Campo** | Altura 48, raio 14, fundo `--superficie`, contorno 1,5 px `--borda-campo`, 16 px, rótulo sempre visível acima. Vale para `input` com qualquer `type` (ou sem), `select` (seta própria, `appearance: none`) e `textarea`. Erro: contorno e texto `--perigo` mais ícone e frase; nunca só cor. |
| **Caixa e rádio** | Marca própria de 24 px dentro de um rótulo de 44 de altura; marcada = `--selecionado-fundo` com marca em `--selecionado-texto`. A linha inteira é o alvo. |
| **Aba** (`.abas`) | Trilho `--superficie-2` em pílula; aba ativa = `--selecionado-*`; no celular rola na horizontal sem quebrar linha. |
| **Chip** | Pílula 32 de altura dentro de alvo de 44; selecionado = `--selecionado-*`; de matéria = bloco de tinta com texto do tom. |
| **Linha de lista** | Altura mínima 56, alvo inteiro, esfera de matéria à esquerda (44), título, apoio em atenuado, sem sublinhado; seta ou duração à direita; filete entre linhas. |
| **Cartão** | `--superficie`, raio 20, borda `--borda`, `--sombra`; título de cartão = H3. |
| **Bloco-herói** | `--bloco-fundo`, raio 28, texto `--bloco-texto`, padding 20 a 28; carrega no máximo: etiqueta, título serifado, apoio, trecho em caixa translúcida (com a linha atual em `--realce-*`), um botão. Mascote só aqui (e no estado vazio). |
| **Callout** | Fundo de tinta da cor do papel, filete de 4 px à esquerda, ícone e texto; "Frase correta" em verde-cacto, aviso em `--aviso-*`, perigo em `--perigo`. |
| **Esfera** | 44 px, círculo do tom da matéria com ícone de 24; decorativa (`aria-hidden`), a matéria vem em texto. |
| **Progresso** | Barra de 6 px `--superficie-2` com preenchimento `--cacto`; sempre com texto ("3 de 12"). |
| **Estado vazio** | Ícone ou mascote pequeno, frase curta, um botão primário. Sem texto longo. |
| **Navegação** | Pílula de vidro (ver plataformas). Item = ícone 24 + rótulo 0,75 rem; ativo = `--selecionado-*` (bloco sólido); alvo ≥ 56 × 56. |
| **Cabeçalho** | Marca (Literata 700 + cacto) à esquerda; Ajuda e Conta como botões de ícone; no desktop, a navegação entra no meio e "Registrar erro" (com a tecla E) à direita. |
| **Rodapé** | Linha legal curta e o link "Backup e dados" (botão de texto, 44). No fim do conteúdo, nunca sob a navegação fixa. |
| **Diálogo** | `dialog` nativo, raio 20, `--superficie`, fundo `rgb(0 0 0 / 45%)`; no celular, folha presa à borda de baixo. |

### Vidro

Primário: 88 a 90% de opacidade, `blur(8px)`. Secundário: tinta a 6%, `blur(10px)`. Navegação: `--superficie` a 78%, `blur(16px)`, borda branca a 40% (claro) ou creme a 10% (escuro), sombra flutuante. Texto sempre sólido; a transparência nunca baixa o contraste do texto abaixo de 4,5:1 sobre o pior fundo possível, e o primário mantém `--acao` como piso. Com `prefers-reduced-transparency: reduce` e em `forced-colors` o vidro vira cor sólida (`--superficie`, `--acao`) sem `backdrop-filter`.

## Plataformas

Pontos de quebra: **celular < 700 px**, **tablet em pé 700 a 899**, **desktop e tablet deitado ≥ 900** (os de hoje no CSS). Referências: 390×844, 768×1024 (e 712×1138 na suíte), 1440×900 (e 1024×768).

| Elemento | Celular | Tablet em pé | Desktop e tablet deitado |
|---|---|---|---|
| Cabeçalho | 64 px: marca; Ajuda e Conta em botões de ícone | igual, gutter 24 | 72 px: marca · navegação em pílula · "Registrar erro (E)", Ajuda, Conta |
| Navegação | pílula flutuante de vidro, 64 px, 12 px da borda e do `env(safe-area-inset-bottom)`; "+" de 64 px ao lado, no caramelo/sol | mesma pílula, centralizada (440 a 560 px), "+" ao lado | no cabeçalho, pegajosa (`sticky`), item ativo em bloco; sem "+" fixo |
| Conteúdo | 1 coluna, gutter 16, reserva embaixo para a pílula | 1 coluna de 40 rem centralizada | até 65 rem, 2 colunas (7fr · 5fr) no Hoje, no Recall e no Plano |
| H1 | 2 rem | 2,25 rem | 2,5 rem |
| Hoje | bloco Agora, segurança, Depois (até 2), captura, revisões do dia | Agora em 2 colunas internas (texto · mascote de 124 px) | à esquerda o Agora; à direita Depois e captura; mascote apoiado na borda do bloco |
| Recall | resumo + abas rolantes + lista | idem, lista em cartões | à esquerda resumo e abas; à direita a lista; revisão em coluna única de 40 rem |
| Biblioteca | abas rolantes, filtros recolhidos, lista de normas | grade de 2 colunas | grade de 3 colunas, filtros em barra lateral |
| Plano | matérias recolhidas com andamento; pontos ao abrir | idem | matérias à esquerda, pontos à direita |
| Leitor | coluna cheia; dock embaixo com **Lido até aqui** (primário) e quatro botões de ícone (Buscar, Filtrar, Ações, Modo foco); reserva de rolagem para o dock nunca cobrir o texto | idem, dock centralizado | coluna de 70 ch centralizada; ferramentas num trilho à direita (≥ 1200) |
| Rodapé | fim do conteúdo, acima da reserva | idem | uma linha, centralizada |
| Formulários | largura total, rótulo acima | coluna de 32 rem | coluna de 32 rem alinhada à esquerda do conteúdo |

Regras de plataforma: o "+" e a pílula nunca cobrem texto (reserva de rolagem = altura da pílula + 12 px + `safe-area` + 16 px); com o teclado aberto a pílula some (o campo ganha a tela); `viewport-fit=cover` e `env(safe-area-inset-*)` em tudo que é fixo; toque sem depender de `:hover`; teclado e atalhos do desktop intactos (E registra erro; Esc fecha).

## Movimento

| O quê | Como |
|---|---|
| Pressionar, hover, foco | 120 a 160 ms, `ease-out`, só cor, sombra e 1 px de deslocamento |
| Cartão virando, aba trocando, folha abrindo | 180 a 220 ms |
| Entre rotas (F10) | View Transitions, fade de até 150 ms, cabeçalho e navegação fixos; **nunca** anima texto da lei nem remonta o Leitor; desligada com `prefers-reduced-motion` e no perfil Calmo (plano C do dia 14/10) |
| Carregando | `Esqueleto` com atraso de 150 ms; operações longas no padrão "andamento" (ver [`../planos/transicoes-e-carregamento.md`](../planos/transicoes-e-carregamento.md)) |

Movimento só quando explica. Nenhuma informação depende dele; sem movimento a ordem e o conteúdo são os mesmos.

## Acessibilidade e robustez

- Contraste: texto 4,5:1, gráficos e contornos 3:1, nos dois temas e em cada fundo possível (inclusive no bloco-herói e sob o vidro).
- Alvos de 44 px em botões, links isolados, linhas de lista, campos e abas (exceção: link dentro de frase corrida). A suíte passa a varrer as rotas principais.
- Foco visível de 3 px em tudo, com `--bloco-foco` dentro do bloco; link "pular para o conteúdo"; atalhos mantidos.
- Texto quebra qualquer palavra longa (`overflow-wrap: anywhere` no conteúdo) e nenhuma tela rola na horizontal a 320 px nem a 200% de zoom.
- Transparência e movimento têm saída (`prefers-reduced-transparency`, `prefers-reduced-motion`, `forced-colors`).
- Cor nunca sozinha: matéria, andamento, erro e "salvo" têm texto ou ícone.
- Mascote e esferas decorativos: `alt=""` ou `aria-hidden`; nada depende deles.

## Marca e mascote (sem mudança)

- **Nome:** "Arretado" em Literata 700 e **um cacto verde** ao lado (SVG de `currentColor` = `--cacto`), na altura da caixa-alta; vale também como favicon (F11). Sem martelo, balança nem outros clichês jurídicos.
- **Mascote:** vetorial plano (decisão de 14/10/2026), [`mascote/`](mascote/) com `estudando`, `distraido`, `sorrindo` e `determinado`, só o personagem, gerado por `mascote/gerar-mascote.mjs`. **Aparece** no Hoje (apoiado na borda do bloco Agora), na retomada depois de dias (Distraído, acolhedor, sem culpa), no fim de sessão (Sorrindo), no estado vazio e na abertura; 80 a 124 px. **Não aparece** no Leitor, na Revisão em curso, em erro punitivo nem em todas as telas ao mesmo tempo. Nunca com elementos de fundo (cacto, sol, lâmpada, notas, interrogações). Decorativo (`alt=""`).
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
