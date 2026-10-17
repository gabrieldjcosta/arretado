# Tarefa: F1b — tokens, fontes e fundo da D-D5 (padrão do Stitch)
Atividade: fatia F1b de [`docs/planos/redesign-v2.md`](../redesign-v2.md) · Decisão: D-D5 em [`docs/design/decisoes-design.md`](../../design/decisoes-design.md) (respostas do Gabriel de 16/10/2026) · Referência: [`leia-me` do Stitch](../../design/referencias/2026-10-16-stitch-hoje/leia-me.md)
Nível **B** · Construtor: Antigravity (ou Sonnet) · Revisor: Gemini (muda o sistema de design) + Claude no diff de `estilos.css`
Branch: `claude/ui-f1b-tokens` · Base: `integracao` · PR para a `integracao` com auto-merge (CI verde).
**Antes de começar:** avisar a thread de UI (mexe em `estilos.css`). Rodar depois dos PRs A e D de 16/10, se estiverem abertos, para não brigar por CSS.

## Objetivo
Trocar a aparência do app inteiro para o padrão do Stitch **sem mudar estrutura de tela**: só valores de token, uma fonte nova nos títulos e o fundo com pontinhos. Nenhum rótulo, rota, componente ou dado muda (isso é a F2 em diante).

## Escopo
Arquivos permitidos: `src/apresentacao/estilos.css` (tokens, fundo, `@font-face`), os CSS de pacote em `src/apresentacao/**/estilos-*.css` **só** para trocar nome de token removido, `scripts/contraste.mjs` (pares novos), `src/apresentacao/fontes/` (woff2 novos), `docs/design/sistema-visual.md` (tabelas de token), testes de contraste e E2E de axe existentes.
Não alterar: `package.json` e `package-lock.json` (caminho protegido; **não instale dependência**), `Shell.tsx`, qualquer `.tsx` de tela, `src/core/`, `src/dominios/`, `Leitor*`.

## O que fazer
1. **Paleta (valores fixos nos dois temas).** `--creme #fff8ec` · `--marinho #14213d` · `--sol #ffb627` · `--argila #c8763a` · `--verde-foco #2fa36b` · `--azul-ceu #3ba7f0`, mais os passos derivados abaixo.
2. **Papéis (claro).** `--fundo` Creme com pontinhos (item 3) · `--superficie` branco a 70% sobre o fundo ou `#ffffff` quando precisar de opaco · `--texto` e `--titulo` Marinho · `--texto-atenuado` Marinho a 75% (medir; ≥ 4,5:1) · `--borda` Marinho a 12% · **primário** = fundo `--sol`, texto `--marinho`, borda Marinho de 1,5 px sobre fundo claro (e sem borda dentro de bloco Marinho) · bloco-herói = fundo `--marinho`, texto Creme · etiqueta de matéria = fundo `--argila`, **texto Marinho** · ponto de Frases = Verde-foco · ponto de Cartões = Azul-céu com ícone Marinho.
3. **Fundo com pontinhos.** No `body` (só nele): `background-color: var(--fundo); background-image: radial-gradient(var(--ponto-fundo) 0.75px, transparent 0.75px); background-size: 16px 16px;` com `--ponto-fundo #d6c9b3` (claro). Cartões, campos, Leitor, Drill e Sessão ficam com fundo liso (conferir que nenhum herda a imagem). `@media (prefers-contrast: more)` remove os pontos.
4. **Passos derivados e contraste (medir com `scripts/contraste.mjs`; todo texto ≥ 4,5:1, texto grande e gráfico ≥ 3:1).**
   - `--verde-foco-texto`: passo escuro do Verde-foco para **texto** sobre Creme e sobre superfície (o `#2fa36b` dá 3,0:1 como texto). Escolher o valor mais próximo que chegue a 4,5:1 e registrá-lo.
   - Ícone sobre Azul-céu: Marinho (branco dá 2,6:1). Texto branco sobre Verde-foco só em gráfico/ícone (3,2:1).
   - Placeholder de campo: Marinho a 70% ou mais.
   - Anel de foco: Marinho de 2 px com 2 px de recuo em fundo claro; Sol de 2 px dentro de bloco Marinho. Visível nos dois lados (≥ 3:1 contra o vizinho).
   - Os pares da tabela de correções da D-D5 entram no script como pares fixos.
5. **Tema escuro.** `--fundo` Marinho profundo (partir de `#0c1527`; ajustar para contraste), superfície `#1b2a47`, bloco-herói `#223559` (mais claro que o fundo), texto Creme, primário igual (Sol com texto Marinho, sem borda), pontinhos `#ffffff` a 8% (decorativos, sem exigência de contraste). Vermelho continua só em excluir e falha técnica.
6. **Fonte.** Playfair Display 600 e 700, **só** em: `h1`, o nome "Arretado" no cabeçalho e títulos de bloco-herói/cartão que hoje usam Literata como título. A interface continua em Atkinson e o texto da lei em Literata (`--fonte-leitura` não muda). Arquivos woff2 latinos de 600 e 700 em `src/apresentacao/fontes/`, vindos de `npm pack @fontsource/playfair-display` **numa pasta temporária fora do repositório** (copiar só os dois `.woff2` e a licença OFL; não adicionar a dependência). `font-display: swap`, sem CDN, sem `@import` remoto. Novo token `--fonte-titulo: 'Playfair Display', Georgia, serif`.
7. **Piso de 13 px.** Nenhum texto abaixo de `0.8125rem`. Procurar `font-size` menor no CSS e subir (etiquetas, chips, rótulos de barra); caixa-alta com `letter-spacing` só em etiqueta.
8. **Aliases temporários.** Os nomes antigos (`--terracota`, `--solace`, `--caatinga`, `--acqua`, `--areia`, `--palha`, `--tinta`, `--noite*`) continuam existindo e apontam para o papel novo equivalente (mapa em `sistema-visual.md`, topo), para nenhum CSS de pacote quebrar. Não renomear classes. A F12 limpa os aliases.
9. **Documentar.** Atualizar as tabelas de `docs/design/sistema-visual.md` (paleta, superfície e texto, ação, escuro, tipografia) com os valores finais e os contrastes medidos.

## Critérios de aceite
- [ ] `node scripts/contraste.mjs` passa nos dois temas com os pares novos, sem relaxar nenhum limite
- [ ] E2E com axe verde nos 2 temas e nos 3 aparelhos (nenhuma violação de contraste nova)
- [ ] pontinhos só no fundo da página: capturas da Hoje, Biblioteca, Leitor e Drill mostram cartões e leitor lisos
- [ ] nenhuma requisição de rede para fonte (aba Rede vazia de `fonts.googleapis.com`/`gstatic`); offline continua igual
- [ ] nenhum `.tsx` alterado; `git diff --stat` só em CSS, `scripts/contraste.mjs`, `fontes/` e `sistema-visual.md`
- [ ] nenhum texto abaixo de 13 px (busca por `font-size` no relatório)
- [ ] vocabulário, rótulos e rotas idênticos aos de antes

## Verificação
`npm run check` verde · `node scripts/contraste.mjs --tudo > contraste.txt` e anexar as falhas (esperado: nenhuma) · E2E da Hoje, Recall, Biblioteca, Plano e Conta nos 3 aparelhos · evidência: capturas antes/depois da Hoje, do Recall, da Biblioteca e do Leitor, claro e escuro.

## Pare e pergunte se
- precisar mexer em `package.json`, `package-lock.json`, `.github/`, `.claude/` ou qualquer `.tsx`
- algum par obrigatório não chegar ao contraste mínimo com valores razoáveis (não afrouxe o limite: mostre os números)
- um CSS de pacote usar cor literal que não dê para mapear a um papel
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · valores finais dos passos derivados (`--verde-foco-texto` etc.) · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
