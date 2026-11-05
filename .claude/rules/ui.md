---
paths:
  - 'src/apresentacao/**'
  - 'public/**/*.css'
---

# Regras de UI (carregam ao mexer em componente ou CSS)

- Há mockup aprovado para a tela? Ler `docs/design/mockups/` e `DESIGN.md` antes de escrever, e seguir a skill
  `design-fidelity`. Sem mockup, seguir `arretado-design-brief`.
- Portar CSS, keyframes, curvas e durações do mockup quase literalmente. Não reconstruir com componente ou
  token antigo; o teto de JS e os limites antigos cedem à cara nova (Gabriel, 04/11), mas informe o tamanho.
- Usar de verdade as bibliotecas da pesquisa, por tipo de elemento (tabela em `docs/design/movimento-e-bibliotecas.md`: View Transitions, Motion lazy, Auto-Animate, canvas-confetti, Sonner, referências uiverse/Aceternity/Magic UI). O PR cita qual foi usada por elemento, ou "nenhuma, porque ...", e informa o tamanho de JS.
- Proibido: `transition: all`; botão sem `:hover`, `:active` e `:focus-visible`; raio genérico repetido sem token;
  glifo Unicode como ícone (SVG); animar propriedade que não seja `transform`, `opacity` ou o que o mockup anima.
- "Reduzir movimento" reduz: fade curto no lugar de deslize e mola, feedback de estado mantido. Não zerar.
- Tela nova de PR sai com animação e acabamento no mesmo PR.
- Antes do merge: `npm run build`, `node scripts/fidelidade-fio.mjs --telas <tela>`, olhar o par, `npm run tamanho`.
- Divergência do mockup: registrar em `docs/entradas/desvios/` (uma linha por arquivo, desvio com o número do PR; ver `docs/entradas/README.md`); a tabela inteira fica em `docs/design/desvios.md`.
