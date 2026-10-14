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

**Implementação (14/10/2026):** a thread "Ajuste de UI do Arretado", dona de `estilos.css`, tokens e `AcaoAgora` (`docs/planos/f3-pacotes.md`), aplicou a D-D2 no app (#120: tokens, cacto na marca, cartão do Agora verde com mascote, botão em vidro; depois, mascote no estado vazio da Hoje). A thread de design (Stitch) **não** mexe em `estilos.css` nem em componentes: só docs, protótipo e arte do mascote. Pendente na UI (do #120): Hoje com Retorno e Fechar o Dia, Revisão, Leitor e Biblioteca na nova paleta, conferir os grifos do leitor.
- Tema claro: fundo areia, **cartão Agora em verde-cacto profundo**, botão primário caramelo. Tema escuro: **espresso**, botão amarelo-sol.
- Tipografia da marca "Arretado" (serifa de exibição) mantida; interface em Atkinson; texto da lei em Literata.
- **Cacto verde ao lado do nome** no cabeçalho.
- **Mascote** (cachorro caramelo com chapéu e lenço) em aparições estratégicas, **só o personagem, sem elementos de fundo**.
- **Botões com transparências sutis** (vidro), com texto sólido e contraste preservado.
- Detalhes, tokens e regras de uso: [`sistema-visual.md`](sistema-visual.md); protótipo: [`prototipo/hoje.html`](prototipo/hoje.html).

> **A conferir depois:** (1) `CLAUDE.md` e a skill `arretado-design-principles` ainda descrevem a identidade sálvia; atualizar ao implementar. (2) Contraste das combinações reais com axe e `scripts/contraste.mjs`. (3) Colisão com cores de grifo e estrela. (4) SVGs do mascote são redesenho próprio e precisam de revisão de proporções e mãos. (5) A arte do mascote foi gerada por IA a pedido do Gabriel; registrar a origem e confirmar que o uso comercial futuro está coberto antes de cobrar pelo produto.

## D-D3 — Papéis de cor, blocos de cor e plataformas (14/10/2026, proposta da thread "Redesenho de telas e plataformas"; vale como padrão até o Gabriel vetar)

**Motivo.** Pedido do Gabriel em 14/10/2026: adaptar as decisões de design, porque a tentativa anterior manteve o plano original em verde e reduziu a qualidade das interfaces e dos blocos de cor do Stitch. A [auditoria](auditoria-ui-2026-10-14.md) confirma: a D-D2 só chegou ao cartão Agora e ao botão do Hoje. No resto do app o verde-oliva da identidade anterior segue como cor de interface (links, aba ativa, "Mostrar resposta", "Continuar", "Salvar"), os campos são nativos e a navegação é chapada.

**A D-D2 não muda** (areia, espresso, cacto, caramelo/sol, mascote em pontos estratégicos, vidro). **A D-D3 dá a cada cor um papel e diz onde há bloco de cor**, para o app inteiro falar a língua do protótipo:

| Cor | Responde a | Aparece em | Nunca em |
|---|---|---|---|
| Caramelo (claro) · sol (escuro) | "O que faço agora?" | botão primário (um por tela, em vidro), "+" da captura | link, aba, ícone decorativo |
| Verde-cacto | "Onde estou? O que está salvo?" | cartão Agora e outros blocos-herói, item ativo da navegação (bloco sólido), aba e chip selecionados, "✓ salvo", progresso | botão de ação, link |
| Tinta | o conteúdo | texto, títulos, texto da lei | — |
| Argila (claro) · âmbar (escuro) | "Para onde posso ir?" | links de texto | botão |
| Azul claro | "Em que linha estou?" | só a linha atual (Agora, Leitor) | qualquer outro realce |
| Seis tons de disciplina (cacto, caramelo, céu, anil, ameixa, turquesa) | "De que matéria é?" | esfera, etiqueta, filete do cartão | botão, texto corrido |
| Vermelho | "Isto apaga" ou falha técnica | excluir, Problema | estudo (nada de "Errei" em vermelho) |

**Blocos de cor com função** (o que o Stitch tinha e o app perdeu):
1. *Bloco-herói* verde-cacto, raio 28, texto creme: no máximo um por tela de orientação (Hoje, Retorno, fim de rodada, "Comece por aqui" do Plano).
2. *Esferas de disciplina* de 44 px na linha do tempo e nas listas.
3. *Bloco de tinta*: o tom da disciplina a 14% sobre a superfície, para linhas e etiquetas.
4. *Callout* com filete lateral para "Frase correta" e avisos.

**Telas de estudo em curso (Leitor, Revisão) ficam calmas:** superfície, tinta e uma ação; sem bloco-herói.

**Forma, vidro e tipografia.** Raios 28 (herói), 20 (cartão), 14 (campo), pílula (botão, chip, navegação). Vidro (blur 8 a 16) no primário, no secundário e na navegação flutuante; sólido com `prefers-reduced-transparency` e em cores forçadas. Título de página em Literata 700 (2,25 rem no celular, 2,5 rem a partir de 900 px) com linha de apoio; interface em Atkinson; rótulo mínimo de 0,8125 rem.

**Plataformas.** Celular (< 700 px): pílula flutuante de vidro com o "+" ao lado, uma coluna. Tablet em pé (700 a 899): a mesma pílula, centralizada, coluna de 680 px. Desktop e tablet deitado (≥ 900): navegação no topo, duas colunas no Hoje e no Recall, coluna de leitura de 70 ch. Detalhes em [`sistema-visual.md`](sistema-visual.md).

**O Gabriel pode vetar** (se não houver resposta, vale o padrão): (a) o "+" vira satélite ao lado da pílula, em vez de canto flutuante; (b) o "Depois" mostra até 2 itens; (c) títulos de página em serifa; (d) links em argila, não em verde; (e) seis tons de disciplina.

**Efeitos.** Muda tokens, botões, campos, abas e navegação (`estilos.css` e CSS dos pacotes) em 11 fatias ([`../planos/redesign-v2.md`](../planos/redesign-v2.md)), cada uma com E2E, axe nos dois temas e contraste medido. Não toca esquema, dados nem regra de domínio (D-D1).

> **A conferir depois:** (1) grifos do leitor (amarelo, verde, rosa) contra verde-cacto e caramelo, e `--estrela`; (2) o "+" ao lado da pílula em aparelho real com o teclado aberto; (3) os seis tons de disciplina contra a lista real de matérias (hoje o catálogo tem 4 carreiras; mais 5 vêm do Gabriel).

