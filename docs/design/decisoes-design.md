# Decisões do programa de design (Stitch)

Registro das decisões do Gabriel sobre o programa de design com o Stitch. Respostas do grill-me de 13/10/2026.

## D-D1 — Exceção de fase: design e implementação de UI em paralelo às fases (13/10/2026, decisão do Gabriel)

O `CLAUDE.md` e o plano-mestre mandam a F3 (Hoje/Plano) só depois do portão da F2. **O Gabriel decidiu em 13/10/2026** que o trabalho de design e a implementação das telas do app rodam **em paralelo** à F2, para **todas as telas do app**, como já foi a exceção da F2 em paralelo ao uso da F1.

Efeitos e limites:
- Vale para a camada de apresentação (telas, tokens, CSS, componentes). **Não** libera esquema, sincronização, sanitização, importação nem regra de domínio de fase posterior: essas continuam nas fases do plano-mestre.
- Telas cujo comportamento depende de fase futura (Hoje/Plano da F3-A, Frases 2 e 3, sync da F4) podem ser **desenhadas e deixadas prontas** (spec, protótipo, componentes sem dado real) para quando a etapa chegar. A ligação com os dados fica para a etapa dona.
- A F3 só tem planejamento depois do portão da F2; o desenho antecipado não substitui esse planejamento, só o alimenta.

> **A conferir depois (conflitos possíveis):** (1) o plano da F3 e o das Frases 2/3 podem pedir telas diferentes das desenhadas aqui; reconcilie ao planejar cada etapa e registre o que mudou. (2) O `CLAUDE.md` e o plano-mestre ainda dizem "não antecipar funcionalidade de fase posterior"; esta decisão é a exceção e deve ser citada ao atualizar esses textos. (3) Ao abrir um PR de tela, confirmar que não toca esquema nem dados de fase posterior.

## Respostas do grill-me

| Tema | Decisão |
|---|---|
| Ordem | Telas do app (todas) → personagem → landing e venda |
| Uso do resultado | Base para virar código. O HTML do Stitch nunca entra no app: é adaptado à arquitetura e aos tokens |
| Estado de partida | Considerar #98, #99 e #101 como já no `main` (tokens, Hoje com cartão Agora, Revisão com cartão central) |
| Direções | 3 versões por tela-chave: (1) segue o padrão atual (papel esverdeado, tinta, sálvia, Atkinson, Literata); (2) a que o Stitch propuser; (3) mais livre |
| Dispositivo | Celular e desktop, os dois |
| Tema escuro | Entra |
| Conteúdo | Texto real do app, com sugestão de texto fictício melhor onde o real estragar o desenho |
| Público | Gabriel hoje; desenhado para quem vai pagar depois |
| Situações do público | "Não sei por onde começar": quer estudar para concurso e não sabe o que importa mais. "Voltei e perdi o fio": já estudou ou usou o app, parou e não sabe recomeçar |

## Problema a resolver (palavras do Gabriel)

O app hoje "parece morto, não motiva, é genérico, bem 'ai-slop', não passa segurança para quem usa, não impressiona, e não é perfeito na relação economia de atenção × encantamento".

Leitura de design (hipótese a validar nas rodadas): o alvo não é enfeitar, é dar **vida, segurança e identidade própria** sem custo de atenção. Cada tela precisa responder: o que mostra que alguém cuidou? o que dá confiança de que o ponto de retomada está salvo? o que é reconhecível como Arretado e não como template?

Restrições que continuam valendo (de `arretado-design-principles`): sem streak, culpa ou urgência artificial; sem diagnóstico clínico; movimento só quando explica; leitura jurídica e revisão funcionam sem camada de movimento.

## D-D2 — Identidade visual: areia, verde-cacto, caramelo e mascote (14/10/2026, decisão do Gabriel, confirmada)

Substitui a identidade "papel esverdeado, tinta e sálvia" dos tokens atuais, para a camada de apresentação. **Confirmada pelo Gabriel em 14/10/2026**: libera trocar os tokens do app (em PR próprio, com contraste e E2E) e atualizar o plano-mestre, o CLAUDE.md e a skill rretado-design-principles. Mascote canônico: **vetorial plano**.

**Implementação no app adiada (Gabriel, 14/10/2026):** não há PR de componentes nem mudança em `estilos.css` por ora; o PR de documentação fica só com docs. Os tokens, a troca de componentes (cartão verde, botões em vidro, cacto na marca, mascote na Hoje) e a atualização de `scripts/contraste.mjs` ficam para quando o Gabriel mandar. Até lá, o app continua na identidade sálvia.
- Tema claro: fundo areia, **cartão Agora em verde-cacto profundo**, botão primário caramelo. Tema escuro: **espresso**, botão amarelo-sol.
- Tipografia da marca "Arretado" (serifa de exibição) mantida; interface em Atkinson; texto da lei em Literata.
- **Cacto verde ao lado do nome** no cabeçalho.
- **Mascote** (cachorro caramelo com chapéu e lenço) em aparições estratégicas, **só o personagem, sem elementos de fundo**.
- **Botões com transparências sutis** (vidro), com texto sólido e contraste preservado.
- Detalhes, tokens e regras de uso: [`sistema-visual.md`](sistema-visual.md); protótipo: [`prototipo/hoje.html`](prototipo/hoje.html).

> **A conferir depois:** (1) `CLAUDE.md` e a skill `arretado-design-principles` ainda descrevem a identidade sálvia; atualizar ao implementar. (2) Contraste das combinações reais com axe e `scripts/contraste.mjs`. (3) Colisão com cores de grifo e estrela. (4) SVGs do mascote são redesenho próprio e precisam de revisão de proporções e mãos. (5) A arte do mascote foi gerada por IA a pedido do Gabriel; registrar a origem e confirmar que o uso comercial futuro está coberto antes de cobrar pelo produto.

