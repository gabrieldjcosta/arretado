# O Zé, antes e depois (M4 do Zé, 29/10/2026)

Cinco folhas em `m4/` mostram o que o Zé (D-D10) e o néon suave mudaram. **Antes** é a `integracao` em `ad3a2a2` (#342, 28/10), sem nenhum PR do Zé. **Depois** é a `integracao` em `91bb437` (#351, M3b), que traz M1, M2, L1, M3a, N1 e M3b e, no meio do caminho, a Onda 3 (#344, #345, #348) e o #353. As folhas somam 373 kB (a regra do `docs/planos/redesign-v2.md` é de até 500 kB por PR). O contrato está em `docs/design/referencias/2026-10-27-ze/contrato.md`; o componente de M1 tem a folha própria em `m1/`.

## As folhas

| Folha | O que mostra |
|---|---|
| `m4/primeira-vez-celular.jpg` | A primeira abertura num Aparelho novo, a 390×844 (2×), claro e escuro. Primeira coluna: o que havia antes, a folha única da Chegada com quatro botões. Demais colunas: o depois aos 1,0, 2,0, 3,0, 3,6, 4,1, 4,6, 5,6 e 8,0 s da navegação. O nome se escreve, a luz pausa, voa ao pé do Zé e o desenha, as Boas-vindas sobem (só "Vamos" e "Agora não") e o rosto aparece. |
| `m4/primeira-vez-desktop.jpg` | O mesmo caminho a 1280×800, em quadros menores (3,0 a 8,0 s). |
| `m4/chegada-antes-depois.jpg` | A Chegada inteira: a folha única de antes e, depois, as Boas-vindas, os quatro passos do passeio (Hoje, Trilha, Fixar, Biblioteca) e o Começar. O Começar vem do build com a conta ligada (`VITE_CONTA=1`), que é como o app de verdade o mostra; no build padrão ele só tem "Experimentar sem conta…". |
| `m4/carregamento.jpg` | A tela de carregamento (L1) com o pacote barrado: fundo liso até 1 s, o contorno do Zé aos 1,8 s, inteiro aos 2,5 s, com rosto aos 3,2 s, "Abrindo o Arretado…" aos 6,6 s e o aviso com "Tentar de novo" aos 26 s. Antes, o `index.html` só tinha o fundo liso. |
| `m4/neon-tres-tracos.jpg` | O néon (N1) nos três traços que já existiam: o nome parado, o traço de seleção da aba (aos 130 e 333 ms) e o quadro do cacto (aos 900 ms e pronto), de dia e de noite, antes e depois. O repouso é 0 de dia e 0,30 à noite. |

## Como foram tiradas

- Chromium do Playwright (com `--font-render-hinting=full`, que dá o texto do CI) sobre o `vite preview` de cada build, com o mesmo script nos dois lados (o de agora, apontado por `--url`). O "antes" saiu de um `git worktree` em `ad3a2a2`, com o `node_modules` ligado por link simbólico.
- `scripts/capturas-ui.mjs --medir`: 15 rotas × 3 Aparelhos (celular, tablet, desktop) × 2 temas, 90 telas, relógio fixo e a Chegada e a Abertura semeadas como vistas.
- `scripts/capturas-ze.mjs`: as cenas novas (primeira vez, passeio, carregamento, traço, quadro), cada uma num Aparelho novo, a 390×844 (2×) e 1280×800, claro e escuro. A primeira vez é fotografada pelo `performance.now()` (cerca de 50 ms de tolerância). A tela de carregamento "salta" o relógio das animações CSS (`document.getAnimations()`) e sai pelo protocolo (CDP), porque o pacote barrado deixa o documento carregando e o `page.screenshot` fica esperando as fontes. O quadro do cacto fecha três Dias (o relógio anda 24 h a cada um) e fotografa o quarto, que é quando a caneta desenha um braço e o brilho aparece.
- As folhas são JPEG (qualidade 58, progressivo), compostas a partir desses quadros com um script de uso único que não está no repositório. O `--folhas` do `capturas-ze.mjs` gera folhas de contato equivalentes para qualquer build.

## Medidas

**Telas (`--medir`, 90 por build).** Rolagem horizontal: 0 nas duas versões. Alvos menores que 44 px: 112 nas duas, 28 deles em texto corrido (só em Recall e na Norma, sem nada novo). Abas sobre texto: 0. Diferenças de medida: nenhuma.

**Pixels (tolerância de 16 em 255, a de `pontosDiferentes` em `e2e/apoio.ts`).** 39 das 90 telas ficam idênticas. As outras 51 diferem por três motivos, todos esperados:

- o brilho do nome no cabeçalho à noite (N1): 39 telas, só na caixa do nome;
- a linha "Passeio pelos menus" na Conta (M3a): 6 telas;
- a Trilha no Plano (Onda 3, não é do Zé): 6 telas.

**JS (`npm run tamanho`, gzip).**

| Build | JS do app (teto 600) | Início (teto 360) |
|---|---|---|
| `ad3a2a2`, antes | 482 kB | 314 kB |
| `bd691ba`, M1 | 482 kB | 314 kB |
| `73a7337`, Onda 3 | 483 kB | 315 kB |
| `91bb437`, depois | 494 kB | 326 kB |

Do Onda 3 ao depois o Zé custa 11 kB de JS, todos no início: a Abertura, a Chegada e o componente `Ze` entram no pacote principal. O contrato (§11) estimava até 6 kB fora do início, e a estimativa não tinha sido medida. Os tetos seguem com folga (106 kB no total, 34 kB no início). Carregar a Chegada sob demanda, testado num worktree e não adotado, leva o início a 320 kB (6 kB a menos) e o total a 495 kB. O `index.html` e o `carregamento.css` da tela de carregamento somam cerca de 4,5 kB comprimidos, fora do JS.

## Conferência do contrato (§12)

Evidência por critério. "E2E" são os arquivos em `e2e/`; os demais ficam em `src/` e `scripts/`.

| Critério | Evidência |
|---|---|
| 1 a 2. Primeira vez, Dias seguintes | E2E `abertura.spec.ts` (primeira vez, "Pular", toque, tecla, modo curto, segunda abertura do Dia) e `abertura-ao-ze.spec.ts` (a luz pousa no pé do Zé; o texto sobe na metade do contorno); folhas `primeira-vez-*` |
| 3. Reduzido e Calmo | E2E `abertura.spec.ts`, `abertura-ao-ze.spec.ts` e `carregamento.spec.ts`; `Ze.test.tsx`; `vida-do-ze.test.ts` |
| 4. Esc e "Rever as boas-vindas" | E2E `abertura-ao-ze.spec.ts` e `abertura.spec.ts` (Ajuda); `Chegada.test.tsx` |
| 5 a 6. 320×568, 200%, axe, contraste | E2E `passeio.spec.ts` (as cinco telas, axe nos dois temas, 195 px e texto a 200%), `abertura.spec.ts` e `abertura-ao-ze.spec.ts`; `scripts/contraste.test.ts` |
| 7. Nada guardado, sem rede, sem dependência, JS no orçamento | `Chegada.test.tsx`; `package.json` e lockfile iguais entre `ad3a2a2` e `91bb437`; JS em 494 e 326 kB (tetos 600 e 360), acima da estimativa do §11 (ver Medidas) |
| 8. `/comecar` e Entrar sem mudança | E2E `comecar.spec.ts` e `conta-entrar.spec.ts` |
| 9. Textos da fonte única | `passos.test.ts` |
| 10. Capturas e folhas | esta pasta |
| 11. Nome nunca coberto | E2E `abertura.spec.ts` ("com a Chegada por abrir") |
| 12. Néon | `scripts/neon-css.test.ts`, `scripts/ze-css.test.ts` e a varredura de `neon` e `bloom` em `scripts/contraste.test.ts`; folha `neon-tres-tracos` |
| 13. Custo do néon | medido no N1 (`solucao-de-problemas.md`: 0,7 a 1,1% dos quadros acima de 33 ms, limite 2%); Aparelho real não medido |
| 14. Rosto | `Ze.test.tsx` e `ze-css.test.ts` |
| 15. Boas-vindas vivas | `vida-do-ze.test.ts` e `Chegada.test.tsx` |
| 16. Passeio refeito | E2E `passeio.spec.ts` ("o passeio refeito na Conta"); `Chegada.test.tsx` e `LinhaDoPasseio.test.tsx` |
| 17. Sem linha do chão | sem teste dedicado; as folhas mostram o Zé sem chão |
| 18. Começar | E2E `conta-passeio.spec.ts`; `Chegada.test.tsx` |
| 19. Sem atalho, botão alcançável | `Chegada.test.tsx`; E2E `passeio.spec.ts` |
| 20 a 26. Tela de carregamento | E2E `carregamento.spec.ts`; `carregamento-css.test.ts`, `carregamento-html.test.ts`, `carregamento.test.ts` e `ProvedorRepositorioCarregamento.test.tsx`; folha `carregamento`. Cache (22): app pronto em até 0,73 s a 4× de CPU (`solucao-de-problemas.md`) |

## Não verificado

- **Aparelho real.** O custo do néon (critério 13), o silêncio de 1 s da tela de carregamento (`--c-t0`) e a leitura do brilho ao ar livre só foram vistos num Chromium sem placa de vídeo.
- **Safari e Firefox.** Nada rodou fora do Chromium. O E2E "sem `d: path()` e `offset-path`" simula a falta desses recursos e confere que o quadro final é o nome parado; o Zé nunca rodou num WebKit nem num Gecko.
- **Leitor de tela.** O Zé é `aria-hidden` e o foco vai ao título (testado em unidade e no axe), mas ninguém ouviu a Chegada num leitor de verdade.
- **Pessoas de fora (V1).** O "fantasminha" do juiz cego (contrato §13, item 5) segue sem teste com gente.
- **Quadros da primeira vez.** Os instantes saem do `performance.now()`, não de quadros exatos; os tempos do critério 1 são os dos E2E.

## Como refazer

```bash
# antes: worktree do commit, com o node_modules ligado
git worktree add ../arretado-antes ad3a2a2 && ln -s "$PWD/node_modules" ../arretado-antes/node_modules
(cd ../arretado-antes && npm run build && npx vite preview --port 4174 &)
# depois: o build de agora
npm run build && npx vite preview --port 4173 &
# telas e medidas (rodar o mesmo script nos dois)
node scripts/capturas-ui.mjs --medir --url http://localhost:4174 --saida /tmp/capt-antes
node scripts/capturas-ui.mjs --medir --url http://localhost:4173 --saida /tmp/capt-depois
# Zé: primeira vez, passeio, carregamento, traço e quadro
node scripts/capturas-ze.mjs --url http://localhost:4173 --saida /tmp/ze-depois --folhas
# Começar com a conta ligada (como o app de verdade)
VITE_CONTA=1 npx vite build --mode e2e-conta --outDir node_modules/.arretado-e2e-conta --emptyOutDir
npx vite preview --outDir node_modules/.arretado-e2e-conta --port 4175 &
node scripts/capturas-ze.mjs --url http://localhost:4175 --cenas passeio --saida /tmp/ze-conta
```

Na nuvem o Playwright 1.56 não acha o Chromium: `docs/solucao-de-problemas.md`, seção "O Zé, fecho (M4 do Zé, 29/10/2026)".
