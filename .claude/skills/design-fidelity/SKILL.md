---
name: design-fidelity
description: >-
  Fidelidade visual ao portar um mockup HTML/CSS aprovado (hoje: docs/design/fio/mockup-aprovado.html)
  para componentes React do Arretado. Use SEMPRE que a tarefa traduzir, portar ou refatorar tela,
  animação, transição, hover/focus ou layout que já existe num mockup. NÃO use para design do zero
  (use arretado-design-brief) nem para lógica pura (estado, rotas, dados).
---

# Fidelidade ao mockup (HTML → React/Vite)

O mockup aprovado é a fonte da verdade. Troca-se a tecnologia, nunca o resultado. Perda de animação, de
estado de botão ou de espaçamento é bug, com a gravidade de um bug funcional. Origem: regra
"FIDELIDADE AO MOCKUP" do Gabriel (04/11/2026), mais a pesquisa de práticas de portagem do mesmo dia.

## Antes de codar
1. Ler o mockup inteiro da tela (HTML, CSS e o JS que a anima) e `DESIGN.md` (seção "O Fio"). O mockup do
   Fio anima por Web Animations API (`el.animate`) e por transições CSS: portar os dois do mesmo jeito.
2. Montar a matriz de estados da tela: default, hover, focus-visible, active, disabled, entrada, saída,
   e os três modos de movimento (normal, calmo, reduzido).
3. Se algo não puder ser reproduzido, parar e reportar a limitação; não improvisar um substituto.

## Regras
1. **Portar, não reconstruir.** Copiar CSS, `@keyframes`, curvas e durações quase literalmente. Manter os
   nomes dos tokens do mockup (`--mola`, `--sair`, `--trocar`, `--neon`, `--ponto`...), sem renomear para
   "semânticos". Cascata e especificidade preservadas (`.a:hover .b`, `[data-x]`, pseudo-elementos).
2. **Nada de "detalhe morto".** Borda, sombra composta, outline, gradiente e micro-espaçamento têm destino.
3. **Tempo é sagrado.** 0,26 s não vira 0,3 s. Stagger e delay ficam no CSS ou na WAAPI como no mockup.
4. **CSS puro do projeto:** arquivo `.css` ao lado do componente, como o resto do repo. Sem Tailwind,
   CSS-in-JS nem UI kit. Inline style só para valor calculado em runtime (posição de arrasto).
5. **Interação em CSS fica em CSS** (`:hover`, `:active`, `:has()`, `transition`). Sem `useState` +
   `onMouseEnter` para o que o mockup faz com CSS.
6. **Saída exige estratégia.** Desmontar corta a transição: usar fase `saindo` sincronizada com a duração
   do token, como o `ir()` do mockup.
7. **Rerender não reinicia animação.** Nada de `key` mudando nem classe de animação recriada por timer do pai.
8. **Movimento reduzido reduz, não zera.** Seguir os três modos do mockup (`normal`, `calmo`, `reduzido`)
   e `data-movimento`/`data-perfil='calmo'` do app: trocar deslize e mola por fade curto, manter o feedback
   de estado (foco, progresso, acerto). Só `transform` e `opacity`.
9. **Divergência intencional** (o mockup contradiz uma regra do projeto) vai para
   `docs/entradas/desvios/` antes de mudar (desvio com o número do PR; `docs/entradas/README.md`). Cortar algo do mockup só com cartão de opções ao Gabriel.
10. **Usar as bibliotecas de verdade.** Para cada tipo de elemento (botão, sobreposição, menu, troca de tela, lista, conquista, aviso) consultar `docs/design/movimento-e-bibliotecas.md` e usar a biblioteca ou referência indicada, medindo o JS. O mockup manda na aparência; a biblioteca dá o comportamento. **O PR cita qual foi usada** por elemento, ou diz "nenhuma, porque ...".
11. **Um PR de tela = tela inteira, com animação e acabamento.** Nunca "funcional agora, polimento depois".

## Prova (obrigatória antes de pedir merge)
- `npm run build` e `node scripts/fidelidade-fio.mjs --telas <tela> [--tema dia]`: gera o par
  mockup | app | diferença e a razão de pixels. É medidor, não portão (o conteúdo semeado difere): olhar o par.
- Movimento não aparece em foto: gravar o app e o mockup lado a lado (Playwright `recordVideo`) ou conferir
  `getAnimations()` por elemento (nome, duração, easing) contra o mockup.
- Diff do CSS lido linha a linha atrás de remoção silenciosa; `npm run tamanho` informado no PR.
- Tabela de movimento do mockup no E2E (`e2e/fio-passos.spec.ts`, `scripts/fio-animacoes-do-mockup.mjs`, com guarda de cobertura): animação nova do mockup entra na tabela.
- Contraste de texto sobre degradê: `textoLegivelNoFio` (`e2e/apoio.ts`, dentro de `semViolacoesNoFio`), porque o axe não decide ali.
- Medir geometria só com o conteúdo pronto, e o mundo dia/noite só depois de `data-mundo` trocar. Tela do quadro não leva Suspense próprio.
- Revisão da Marca contra o arquivo aprovado. Teste verde não prova fidelidade.

## Checklist do PR (responder cada linha, dizendo como verificou)
- Espaçamento, tipografia e cor iguais ao mockup (valores computados)
- Toda `transition`/`@keyframes`/`animate()` presente, com mesma duração, curva e atraso; saídas incluídas
- Estados hover, focus-visible, active, disabled e cursor iguais
- Três modos de movimento conferidos
- Nenhuma lib de estilo; nenhum CSS apagado sem checar seletor dinâmico
- Bibliotecas usadas por elemento citadas (ou "nenhuma, porque ..."), com o tamanho de JS
- Par do `fidelidade-fio.mjs` anexado; desvios registrados
