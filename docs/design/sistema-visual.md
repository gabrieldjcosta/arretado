# Sistema visual do Arretado (rascunho para implementação)

Base: mockups das rodadas 6 e 7 que o Gabriel aprovou em 14/10/2026 (cartão verde da paleta "cacto e areia" no claro, "espresso" no escuro, tipografia da marca) e o protótipo isolado [`prototipo/hoje.html`](prototipo/hoje.html). Só apresentação (D-D1). Para ver o protótipo: abrir o arquivo no navegador; `?tema=claro` ou `?tema=escuro` força o tema.

## Decisões do Gabriel (14/10/2026)

1. **Cartão verde** (Agora) no tema claro: foi bom. Escuro: espresso.
2. **Tipografia da marca "Arretado"** mantida: serifa de exibição (no protótipo, Literata 700; em produção, a mesma Literata do app).
3. **Cores mais harmônicas** que as rodadas anteriores: creme/areia + verde-cacto + caramelo + chocolate.
4. **Mascote aparece de forma estratégica, só ele**: sem cactos, sol, lâmpada, notas ou outros elementos de fundo.
5. **Cacto verde ao lado do nome "Arretado"** no cabeçalho.
6. **Transparências sutis nos botões** (vidro).

## Tokens

Claro ("areia e cacto"):

| Token | Valor | Uso |
|---|---|---|
| `--fundo` | `#f4efe0` | fundo da tela |
| `--superficie` / `--superficie-2` | `#fbf8ee` / `#ebe5d1` | campos e cartões secundários |
| `--texto` / `--texto-atenuado` | `#2d2a14` / `#5f5a3c` | texto |
| `--borda` | `#d9d1b6` | filetes e bordas |
| `--agora-fundo` | `#3f4a1a` | cartão Agora (verde-cacto profundo) |
| `--agora-texto` / `--agora-atenuado` | `#fdf1de` / `#d9d3b0` | texto no cartão |
| `--acao` / `--acao-texto` | `#e8892b` / `#2d2a14` | botão primário (caramelo) |
| `--etiqueta-fundo` | `#9a4a1c` | etiqueta de disciplina (argila escura) |
| `--realce-fundo` / `--realce-texto` | `#bcd9ff` / `#14213d` | linha atual (azul claro; o amarelo é do grifo) |
| `--esfera-verde` / `--esfera-caramelo` / `--esfera-ceu` | `#5f6e22` / `#a85a0c` / `#1f6f9f` | esferas de ícone na linha do tempo |
| `--cacto` | `#5f7a2c` | cacto da marca e confirmações |

Escuro ("espresso", modo de foco): fundo `#1c1410`, superfície `#251a14`/`#2b1f17`, texto `#fdf1de`, atenuado `#b9a897`, borda `#3d2d22`, cartão Agora `#2b1f17` com borda caramelo a 35%, ação `#ffb627` com texto `#1c1410`, etiqueta `#c8763a` com texto `#1c1410`, realce `#2c4a68`, cacto `#9bab4a`.

Medidas já feitas (WCAG): ver `stitch-app.md`, rodada 7. As correções de argila (`#9a4a1c`) e caramelo de ícone (`#a85a0c`) já estão nos tokens. **A conferir nas telas reais com axe e `scripts/contraste.mjs` antes de implementar:** `--texto-atenuado` sobre `--fundo`, `--agora-atenuado` sobre `--agora-fundo`, etiqueta escura e o par do botão no escuro.

## Botões em vidro

- **Primário** (uma por tela): preenchimento da cor de ação a 88–90% de opacidade, brilho suave de cima para baixo (`linear-gradient` de branco 22% a 0), borda branca a 38%, sombra colorida curta e `inset` de 1 px; `backdrop-filter: blur(8px)`. Texto sólido, nunca translúcido.
- **Secundário**: fundo da tinta a 6% (escuro: creme a 7%), borda a 14–16%, `blur(10px)`.
- **Dentro do cartão verde**: creme a 12% com borda a 26%.
- Regra: a transparência nunca baixa o contraste do texto abaixo de 4,5:1 sobre o pior fundo possível; o botão primário mantém `--acao` como piso de contraste. Reduzir transparência quando `prefers-reduced-transparency` existir.

## Marca

- **Nome**: "Arretado" em serifa de exibição, peso 700, seguido de **um cacto verde** (SVG simples, `currentColor` = `--cacto`), do tamanho da altura de caixa-alta.
- **Cacto**: ícone próprio e simples (tronco e dois braços), original; vale também como favicon.
- Sem martelo, balança nem outros clichês jurídicos.

## Mascote

- **Estilo canônico: vetorial plano** (decisão do Gabriel, 14/10/2026). O filhote 3D não é o mascote do app.
- Arquivos: [`mascote/`](mascote/) com `estudando.svg`, `distraido.svg`, `sorrindo.svg`, `determinado.svg`: redesenho vetorial próprio a partir da folha enviada pelo Gabriel, fundo transparente, **só o personagem**, 400×450, cores fixas da folha (pelo, chapéu, lenço). Gerados por script (`docs/design/mascote/gerar-mascote.mjs`), então qualquer ajuste de pose é uma edição de código e não de arquivo binário.
- **Lápis apontando para baixo** na pose Distraído (pedido do Gabriel): ponta para baixo, borracha em cima.
- Determinado foi reinterpretado: caderno de espiral e punho levantado, sobrancelhas retas e sorriso discreto (a folha original tinha sobrancelhas bravas).
- **Onde aparece** (estratégico): Hoje (Estudando, apoiado na borda do cartão Agora), retomada depois de dias fora (Distraído acolhedor, sem culpa), fim de sessão (Sorrindo), estado vazio e abertura. Tamanho 80–110 px no app.
- **Onde não aparece**: durante a leitura, na revisão de frases e cartões (no máximo bem pequeno e só fora do cartão), em erro punitivo, em todas as telas ao mesmo tempo.
- **Nunca** com elementos de fundo (cacto, sol, lâmpada, notas, interrogações).
- Imagem decorativa: `alt=""`; nenhuma informação depende do mascote. Cada SVG já traz `<title>` e `aria-label` para o caso de uso informativo.
- Próximo: refinar as poses com o Gabriel (proporções, mãos, expressão) e, se vier a ser necessário, um ilustrador para a versão final.

## Tipografia

Marca e títulos: Literata (serifa) 700. Texto da lei: Literata. Interface: Atkinson Hyperlegible Next. Evitar itálico no trecho da lei (o gerador do Stitch trocou por itálico em uma das variantes).

## Layout

- Celular primeiro (390 px); desktop em duas colunas (Agora à esquerda, Depois e captura à direita).
- Uma ação primária por tela; "Depois" em linha do tempo com esferas.
- Navegação inferior flutuante em vidro, com 4 áreas (Hoje, Plano, Recall, Biblioteca); Conta fica no cabeçalho.
- Alvos de toque ≥ 44 px; foco visível; movimento só de 150–220 ms e respeitando `prefers-reduced-motion`.

## Para implementar (quando o Gabriel liberar)

1. Trocar os tokens de `src/apresentacao/estilos.css` pelos acima (claro e escuro), mantendo os nomes existentes quando possível; reconferir `scripts/contraste.mjs`.
2. Atualizar a skill `arretado-design-principles` (paleta e mascote no lugar de sálvia e papel esverdeado).
3. Telas por ordem de valor: Hoje, Revisão, Leitor, Biblioteca, Recall, Conta; cada uma com E2E e axe nos dois temas.
4. Conflitos a vigiar: cores de grifo do leitor (amarelo, verde, rosa) versus verde-cacto e caramelo; `--estrela` e `--foco` existentes.
