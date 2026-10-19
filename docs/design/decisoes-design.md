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

> **Parcialmente substituída pela D-D4 (mais abaixo)** (paleta, botões, vidro, navegação, seis tons de matéria, raios). O que a D-D4 não toca segue valendo.

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

## D-D4 — Paleta, botões e cartões por estado do Gabriel; Leitor e Sessão (14/10/2026, material do Gabriel; vale como padrão até ele vetar; substitui a D-D3 onde divergem)

**Origem.** Às 11:18 e 11:28 UTC o Gabriel mandou quatro mockups (Gemini), a paleta com o sistema de botões e a especificação estruturada do Leitor e da Sessão. Guardados, com a leitura de cada imagem e as divergências entre imagem e texto, em [`referencias/2026-10-14-gemini/`](referencias/2026-10-14-gemini/leia-me.md). O link do Gemini não abre do ambiente do Claude.

**Paleta e papéis.** Substitui o caramelo, o verde-cacto de interface, a argila e o âmbar da D-D3 (a D-D2 muda de nome, não de espírito: areia, espresso, cacto, mascote).

| Cor | Valor | Responde a | Aparece em |
|---|---|---|---|
| Terracota | `#963417` | "O que faço agora?" no claro; "para onde posso ir?" | botão primário (um por tela), "+", links, anel de foco, sublinhado de termos absolutos e penas |
| Solace | `#CF893A` | "O que faço agora?" dentro do bloco de Caatinga e no escuro | botão primário no bloco e no tema escuro, links e foco no escuro, ponto de Frases, sublinhado de condição |
| Caatinga | `#3B3F21` | "Onde estou? O que guardei?" | bloco-herói, item, aba e chip selecionados, "Guardar", "Lido até aqui", "Sair do foco", título de página (H1), filete da régua de leitura |
| Acqua | `#628981` | "O que anda bem?" (calma) | progresso, ponto de Cartões, "salvo", interruptor e selo da Sessão; como texto, o passo `#416a63` |
| Areia | `#EAD2B0` | superfície quente | cartão Distraído e estacionamento, tiles, chip inativo, régua de leitura (a 45%) |
| Palha · Creme | `#F6F1E6` · `#FAF6EE` | fundo · superfície | página · cartões, campos, linha de ação |
| Noite · Noite-cartão | `#16130F` · `#251F19` | fundo e bloco no escuro | — |
| Tinta | `#2B1B12` | o conteúdo | texto, contorno de caixa e rádio, traço dos SVGs |

Vermelho continua só em excluir e falha técnica. Os três realces do leitor (amarelo, verde, rosa) seguem do conteúdo, não da interface.

**Botões** (classes CSS, não strings de estilo): *primário compacto* (altura 44, raio 12, peso 600, `.9375rem`, sombra curta; largura total só em cartão e formulário), *secundário* de contorno, *fantasma* (`.botao-texto`: sem caixa, sublinhado, ao lado do primário) e *linha de ação* (`.linha-acao`: 52 de altura, filete de Caatinga a 12%, no lugar de botões empilhados e em modais). **O vidro cai**: botão sólido; o desfoque fica só no dock flutuante do Leitor.

**Cartões e blocos por estado** (F3): o bloco muda de cor conforme o estado da pessoa. *Estudando* = Caatinga com ação Solace; *Distraído* ("Por onde começar?") = Areia com linhas de ação; *Sorrindo* (dia fechado) = cartão claro com o andamento do dia em pontos (**andamento, não sequência de dias**: sem streak); *Determinado* (revisões prontas) = cinza-areia com ação Terracota. Título de página em Literata na cor de lugar; título de cartão e de bloco em sans bold. Raios: 24 (bloco), 16 (cartão), 12 (botão e campo), pílula (chip e navegação).

**Tipo da tarefa em ponto de cor**, no lugar dos seis tons de matéria: Frases = Solace, Cartões = Acqua, leitura = lugar. A matéria vai em texto, nunca só em cor.

**Navegação.** Barra de baixo reta, com ícone e rótulo nas quatro áreas e o item atual em destaque (sem pílula flutuante); "+" simples de Terracota (Solace no escuro) nas telas sem captura inline; no Hoje a captura é o campo "Anote a frase correta" com "Guardar". Cabeçalho: "Arretado." com o ponto final em Terracota e o cacto, "Conta" e "?".

**Leitor e Sessão.** Valores da [especificação](referencias/2026-10-14-gemini/especificacao-leitor-sessao.md) tal como vieram: controles (A-, 18px, A+ e Destaques), legenda recolhível dos quatro sublinhados (duplo, tracejado, ondulado, pontilhado), régua em Areia a 45% com filete de Caatinga, dock com Buscar, Filtrar, Foco e "Lido até aqui", reserva de 156 px sob o artigo, foco em retrato e paisagem com painel de 220 px, modal "Ações" em folha (celular) e diálogo de 420 px (desktop); Sessão com Modo Só Estudo, chips de 15, 25, 45 e 60 min (o tempo só informa), bloco de Caatinga com o mascote Estudando, estacionamento em Areia e fechamento com o mascote Sorrindo. Mascote continua **fora do Leitor** e da Revisão em curso.

**O que cai da D-D3:** vidro nos botões e na navegação; pílula flutuante com "+" satélite; seis tons de matéria; régua azul; raios 28, 20 e 14; nomes caramelo, argila e âmbar. **O que continua:** cor tem função; um bloco-herói por tela de orientação; Leitor e Revisão calmos; plataformas por largura (celular < 700, tablet em pé 700 a 899, desktop e tablet deitado ≥ 900); "Depois" com até 2 itens; mascote só em pontos estratégicos; vermelho nunca no estudo.

**Ajustes de contraste** (a paleta não muda; mudam os usos): Acqua como texto, ou com texto branco, só no passo `#416a63`; o sublinhado de condição em Solace dá 2,5:1 sobre Palha, então no claro vale `#b06f22` (3,6:1) e no escuro, Solace; no escuro a Areia como superfície vira `#2f261d`. Medidos em `scripts/contraste.mjs`.

**O Gabriel pode vetar** (vale o padrão se não houver resposta): (a) o Agora do Hoje em Caatinga, porque o mockup do Hoje o mostra em Areia (a troca é um token); (b) "Prazos" em `#173F52`, como o texto da especificação, e não em Acqua, como diz a imagem; (c) cacto mantido ao lado do nome, ausente em três dos quatro mockups; (d) barra de baixo reta, sem a pílula flutuante da D-D3; (e) as quatro cores de estado dos cartões; (f) Calmo sem View Transitions (pergunta da D-D3, sem resposta).

**Efeitos.** A F1 (tokens, botões, campos, abas, links, linhas, diálogos) já usa esta paleta. O plano ([`../planos/redesign-v2.md`](../planos/redesign-v2.md)) muda em: F2 (barra reta, "+" simples, cabeçalho), F3 (cartões por estado, captura inline, elementos vetoriais), F6 (Leitor pela especificação) e F9 (Sessão pela especificação). Só apresentação (D-D1): nada de esquema, dado nem regra de domínio.

> **A conferir depois:** (1) o Agora em Caatinga ou Areia (a); (2) o dock do Leitor com o teclado aberto e em tablet; (3) grifos do leitor contra Areia e Caatinga; (4) a arte do mascote nas poses novas (Determinado) e a origem dos SVGs de cacto, lâmpada e distração; (5) o selo de Acqua com texto branco só passa no passo `#416a63`.

## D-D5 — Padrão do Stitch (projeto 9953616237194891956): marinho, creme e sol, em todas as telas (16/10/2026, material do Gabriel; vale como padrão até ele vetar; substitui a D-D4 onde divergem)

**Origem.** Em 16/10/2026 o Gabriel mandou o HTML da tela Hoje (celular, 390 px) do projeto Stitch `9953616237194891956` e pediu que **todas as outras telas** sigam o mesmo padrão, compatíveis e harmônicas entre si. O link do Stitch não abre do ambiente do Claude (exige login); a leitura vem do HTML colado. Valores e leitura tela a tela: [`referencias/2026-10-16-stitch-hoje/leia-me.md`](referencias/2026-10-16-stitch-hoje/leia-me.md). Só apresentação (D-D1): nada de esquema, dado nem regra de domínio.

**Adotado (vem do Stitch):**
- **Rótulos do menu:** Hoje · **Trilha** (antes Plano) · **Fixar** (antes Recall) · Biblioteca. "Em seguida" no lugar de "Depois". Só texto de tela: rotas, identificadores (`plano`, `recall`, `Depois`) e dados gravados não mudam.
- **Paleta:** Creme `#fff8ec` (fundo) · Marinho `#14213d` (texto, título, bloco-herói, barra de baixo) · Sol `#ffb627` (botão primário, texto Marinho) · Argila `#c8763a` (etiqueta da matéria) · Verde-foco `#2fa36b` (Frases, "+", "salvo") · Azul-céu `#3ba7f0` (Cartões). Substitui Palha, Caatinga, Terracota, Solace e Acqua; Areia e Tinta saem; a Noite do tema escuro é refeita sobre o Marinho (F1b).
- **Fundo creme com pontinhos:** `radial-gradient(#d6c9b3 0.75px, transparent 0.75px)` a cada 16 px, só no fundo da página (atende à anotação 2 do Gabriel, de 16/10).
- **Arranjo (celular):** cabeçalho com "Arretado" + cacto verde e o botão "Conta" (pílula com ícone); título da página com data em minúsculas e o **"+" redondo verde na mesma linha**; **um** cartão Marinho "Agora" (etiqueta da matéria, etiqueta "no seu ritmo", título serifado, trecho da lei em caixa translúcida, **um** botão Sol de largura total "Avançar um tiquinho →"); **"Em seguida"** com até 2 itens numa linha do tempo (ponto verde = Frases, azul = Cartões; título, matéria, duração "4 min"); linha de calma "✓ Seu ponto está salvo neste aparelho."; campo "Para lembrar" com "Salvar"; **barra de baixo em pílula flutuante** Marinho com as 4 áreas e o item atual em destaque.

**Mantido da D-D4 (o Stitch não mostra, ou conflita com regra do produto):**
- **Fontes:** Atkinson Hyperlegible na interface e Literata na lei. O Stitch usa Playfair Display e Plus Jakarta Sans via Google CDN: carregar de CDN quebra o local-first/offline e envia o IP da pessoa ao Google (T10, LGPD). Padrão: **Playfair Display só nos títulos e na marca "Arretado", hospedada no próprio app (woff2 em `src/apresentacao/fontes/`)**; a interface segue em Atkinson, desenhada para leitura difícil. Pergunta 1 abaixo.
- **Lei sem itálico e destaque sublinhado, nunca fundo** (o Stitch mostra a lei em itálico e o destaque como fundo azul): regra de leitura do `sistema-visual.md`.
- **Mínimo de 13 px** (0,8125 rem) para qualquer texto e alvo de 44 px. O Stitch usa 10–12 px em etiquetas, na barra e no campo.
- Sem sequência de dias; mascote só em pontos estratégicos; Calmo; plataformas por largura; vermelho só em excluir e falha técnica.

**Correções de contraste** (medidas em 16/10 com a fórmula do `scripts/contraste.mjs`):

| Par do Stitch | Medido | Uso corrigido |
|---|---|---|
| Branco sobre Argila (etiqueta) | 3,4:1 | texto Marinho sobre Argila (4,7:1), corpo ≥ 13 px |
| Branco sobre Azul-céu (ícone) | 2,6:1 | ícone Marinho sobre Azul-céu, ou um azul mais escuro com branco |
| Branco sobre Verde-foco ("+", ✓) | 3,2:1 | vale como gráfico (≥ 3:1); como **texto**, usar passo escuro do Verde-foco (a medir; alvo ≥ 4,5:1 sobre Creme) |
| Verde-foco como texto sobre Creme | 3,0:1 | idem: passo escuro |
| Placeholder Marinho a 40% | 2,4:1 | rótulo visível "Para lembrar" e placeholder a 70% ou mais |
| Sol sobre Creme (botão fora do cartão Marinho) | 1,6:1 | borda Marinho de 1,5 px no botão Sol sobre fundo claro |
| Creme a 60% e 70% sobre Marinho | 6,3 · 8,1:1 | passa |
| Marinho sobre Sol · Marinho sobre Creme | 9,1 · 15,1:1 | passa |

**O que isto muda nos planos:** [`../planos/redesign-v2.md`](../planos/redesign-v2.md) ganha a **F1b** (tokens e fontes D-D5), antes da F2, e a **F12** (harmonização de todas as telas contra o padrão). A F2 passa a ter a pílula flutuante, o "+" ao lado do título e os rótulos novos; a F3 segue o cartão Agora do Stitch. **Reverte o veto (d) da D-D4** (barra reta, sem pílula), pois o Stitch traz a pílula de volta.

**Respostas do Gabriel (16/10/2026)** às cinco perguntas da D-D5:
1. **Fontes:** Playfair Display hospedada só em títulos e marca; interface em Atkinson. Confirmado.
2. **Abas do Fixar:** **Frases · Cartões · Histórico** (três abas; "Erros" deixa de ser aba). Consequência: a lista e o detalhe do Erro passam a ser alcançados pela aba Frases (cada Frase leva ao Erro que a originou, com resultado, situação e causa). Nenhum dado muda; a rota `/recall/erros` fica como alias até a F5 decidir o destino. "Erro" segue como termo de estudo no vocabulário e nos filtros.
3. **Tablet e desktop:** derivados do celular; a pílula vira barra no alto a partir de 700 px. Confirmado.
4. **Botão primário nas telas claras:** Sol com texto Marinho e borda Marinho. Confirmado.
5. **Tema escuro:** fundo em Marinho profundo, cartão Agora em Marinho mais claro, botão Sol igual (valores a medir na F1b). Confirmado.
6. **Campo "Para lembrar":** serve para a pessoa **anotar o que precisa fazer fora do app** (não é a Frase correta). A **Frase correta é registrada pelo "+"**, que passa a ser o único caminho de captura (D25 continua: só a frase é obrigatória). O "Anote a frase correta" do Hoje sai.
   - **Como guardar (simples, sem esquema novo):** um campo de texto livre, opcional, em `Preferencias` (`lembrete?: string`), como já foi feito com `destacarCondicionantesEPrazos` (opcional, ausente = vazio, **sem migração**, esquema segue). Sem coleção, sem data, sem lista, sem hora, sem notificação, fora do Recall e do cálculo de "Agora". "Salvar" grava o texto; esvaziar apaga. Entra com o Hoje na F3 (nível B); só se o arquivo de backup rejeitar o campo novo é que vira tarefa de nível A.

## D-D6 — Harmonização da D-D5: raios macios, matéria em Argila, ícones SVG e fontes (17/10/2026, pedido do Gabriel)

Fecha as divergências achadas ao documentar o sistema (`DESIGN.md` e `PRODUCT.md` na raiz). Só apresentação (D-D1).

- **Macio e convidativo:** botão e campo passam de 12 a **14 px**, o bloco-herói de 24 a **28 px** (como o cartão Agora do Stitch) e o raio genérico `--raio` a 14. Cartão fica em 16, pílula em 999: o que está dentro tem raio menor que o que o contém. Valores em `src/apresentacao/estilos.css`.
- **Matéria em Argila, sem tom por disciplina:** a matéria se identifica pela etiqueta Argila com texto Marinho. Fica vetado dar a cada disciplina uma cor própria ou uma faixa colorida na borda (reafirma a D-D4 e a D-D5). Grupos de disciplina na Biblioteca usam nome e contagem, em neutro.
- **Ícones são SVG de um só traço**, não glifos Unicode (✓, ⓘ, ☆, 📍). O estado continua sem depender só de cor.
- **Fontes:** a Playfair Display fica em `src/apresentacao/fontes/` (não em `public/fontes/`), como no código da F1b.
- **Palavra "vencido":** sai da linha principal do Hoje (soa como dívida); o título é a ação em verbo e o motivo vem abaixo.
- **Marca:** "Arretado" sem ponto final, com o cacto verde (o ponto final em Terracota era da D-D4 e saiu).
- **Documentos atualizados:** `sistema-visual.md`, `redesign-v2.md` (F2 e F3 reescritas na D-D5), `glossario.md`, `solucao-de-problemas.md` e a skill `arretado-design-principles`. Os registros D-D2, D-D3 e D-D4 acima ficam como histórico: onde divergem, vale a D-D5 e depois esta.

## D-D7 — Ponto de luz: areia, cal, vidro e luz; Gabarito nos títulos; a caneta de vidro (18/10/2026, decisão do Gabriel)

> **Emendada em 19/10/2026 pela D-D8:** o cachorro do Resumo do Dia saiu (no lugar, o quadro do cacto) e a caneta, que mudava de lugar só por salto, passa a andar sobre o traço que desenha no quadro. O resto vale.

**Origem.** Nas rodadas de direção visual de 18/10/2026 (genjutsu:bunshin, nível "só a direção"; página https://claude.ai/artifact/5YB1iau1HZuaV9LAwkCDMb), o Gabriel escolheu a direção **"Ponto de luz, segunda versão"** no cartão da rodada 3 (15:46Z). Às 17:23Z ele autorizou a construção no app ("leve o contrato dessa thread a uma nova thread para continuar o desenvolvimento do bushin. tem minha autorização"). A direção troca a paleta da D-D5, e esta autorização é a decisão de design nova que o contrato pedia. Contrato da direção: [`referencias/2026-10-18-ponto-de-luz/contrato.md`](referencias/2026-10-18-ponto-de-luz/contrato.md). Execução: [`../planos/ponto-de-luz.md`](../planos/ponto-de-luz.md). Só apresentação (D-D1): nada de esquema, dado nem regra de domínio. **Substitui a D-D5 e a D-D6 onde divergem.**

**Paleta (troca a da D-D5).** Contraste medido com `scripts/contraste.mjs`, nos dois temas.

| Papel | Dia | Noite | Uso |
|---|---|---|---|
| Chão (areia) | `#f1e6d3` | `#0b1b33` | fundo da página, cabeçalho, barra das áreas |
| Areia funda | `#e7d8be` | `#07152a` | trilho das abas, selo, faixa quente, trilho do andamento |
| Folha (cal) | `#ffffff` | `#142a4a` | folha do Agora, cartões, campos, área e aba atuais ("onde estou"), o lido no Leitor |
| Tinta | `#17243a` (12,6:1 na areia) | `#eef3f8` (12,9:1 na folha) | texto, títulos, foco, caixa marcada |
| Tinta 2 | `#4f5b70` (5,5:1 na areia) | `#a9b7cc` | texto atenuado |
| Vidro | `#0f7f72`, texto branco (4,9:1) | `#7df3e1`, texto `#0b1b33` (13:1) | a ação: botão primário, cacto da marca, andamento (o "+" é cal com tinta) |
| Vidro texto | `#0a6157` (5,9:1 na areia) | `#7df3e1` | link e texto de "salvo" |
| Luz | `#6fe3d6` | `#7df3e1` | pontos do Dia, Estrela, ponta da caneta; nunca texto, sempre com contorno na tinta |
| Traço | `#c8742f` | `#ffb46b` | só o traço do cachorro |

**Regras novas.**
- **Um vidro por tela:** o vidro é a única cor de ação (substitui "Um Sol"); dois botões disputando o vidro = um deles é secundário.
- **Cal é "onde estou":** a folha do Agora, a área e a aba atuais (cal sobre a areia, com a sombra fresca e o rótulo em negrito) e o lido no Leitor. Marcado (caixa, rádio, botão ligado) é tinta cheia com a marca em cal.
- **A luz só reporta estado** (pontos do Dia: apagado, aceso pela metade, aceso; a Estrela) e marca a ponta da caneta. Nunca segue o dedo nem a rolagem: a régua de leitura fica em tinta.
- **Sem textura:** o fundo é liso (os pontinhos da D-D5 saem). Profundidade só pela sombra fresca da folha (`0 14px 28px -10px` tinta a 16%) e pelo halo na ponta da caneta.
- **Matéria em neutro:** sem Argila e sem cor por disciplina; nem couro nem caramelo como cor de interface. O caramelo fica só no traço do cachorro. Os grupos de disciplina da Biblioteca perdem a faixa de cor (fica o filete neutro).
- **Destaques da lei** ficam (sublinhado, nunca fundo), com o passo de absolutos e penas escurecido para `#a5582a` (4,2:1 na areia), o de condições escurecido para `#ab6b21` (3,5:1 na areia e 3,1:1 sob a régua) e, à noite, em `#f2c062`.

**Letras.** **Gabarito** (variável, 400 a 900, hospedada em `src/apresentacao/fontes/`, licença OFL) nos títulos e na marca, no lugar da Playfair Display; Atkinson Hyperlegible Next na interface; Literata na lei. "Sem serifa" (Conta › Aparência) troca só a letra da lei, porque os títulos já são sem serifa. No app de loja: corpo na fonte do sistema com Dynamic Type e Gabarito só nos títulos.

**Raios.** Folha e cartão 16; botão e campo 12; abas e navegação em pílula. Alvo de 44 px e piso de 13 px continuam.

**A caneta.** A caneta-cacto de vidro (coluna com dois braços, do ciano ao verde, ponta cônica escura com o ponto de luz) é o único objeto com volume e o único lugar com gradiente, em três poses fixas: encostada na folha do Agora (Hoje; no Fixar, no Cartão atual), deitada ao fim de "Lido até aqui" (Leitor) e largada ao fim do traço do cachorro (Resumo do Dia e fim de rodada). Nunca botão, painel, fundo de texto, nem mais de uma por tela.

**Mascote.** O cachorro em um traço só, caramelo pela cor, só no Resumo do Dia e no fim de rodada (nunca no Leitor nem na Revisão). As ilustrações atuais do mascote saem do Agora, do estado vazio e da Sessão nas fases de cada tela.

**Movimento.** 160 a 220 ms, `cubic-bezier(.2, .7, .2, 1)`; o ponto acende uma vez (escala 0,6 a 1); a caneta muda de lugar por salto; o traço do cachorro se desenha uma vez em 300 ms; com `prefers-reduced-motion`, tudo aparece pronto.

**Mantido da D-D5 e da D-D6.** Rótulos Hoje · Trilha · Fixar · Biblioteca e "Em seguida"; abas do Fixar (Frases · Cartões · Histórico); campo "Para lembrar"; uma ação dominante por tela; sem vermelho no estudo; sem sequência de dias; Calmo; ícones SVG de um só traço; "vencido" fora da linha principal; fontes e ícones hospedados no app; plataformas por largura (celular até 699 px, tablet de 700 a 899, desktop a partir de 900); tablet e desktop derivados do celular.

**Revogado da D-D5 e da D-D6.** A paleta (Creme, Marinho, Sol, Argila, Verde-foco, Azul-céu), o fundo com pontinhos, o bloco-herói Marinho, o botão Sol com borda Marinho, a Playfair Display, os raios de 14 (botão) e de 28 (bloco-herói), a etiqueta de matéria em Argila, o verde como "salvo", o azul como Cartões, a pílula flutuante Marinho (a navegação vira abas sobre a areia, com a atual em cal) e o mascote sentado na borda do cartão Agora. Da D-D4, sai a opacidade de 82% do botão fantasma: dentro de uma dica, a cor herdada já é a atenuada e cairia para 3,8:1 na areia (o axe reprovou no E2E).

**Construção em fases**, cada uma num PR para a `integracao` ([`../planos/ponto-de-luz.md`](../planos/ponto-de-luz.md)): P1 fundação (tokens, letras, componentes base, contraste) → P2 casca → P3 Hoje → P4 Leitor → P5 Fixar e revisão → P6 demais telas → P7 plataformas. Os documentos `DESIGN.md`, `sistema-visual.md`, `glossario.md` e `.impeccable/design.json` passam a descrever esta decisão; a skill `arretado-design-principles` (caminho protegido) é atualizada no PR da P2, com o rótulo `aprovado-gabriel`. Os registros D-D2 a D-D6 acima ficam como histórico.

## D-D8 — A caneta que desenha: o quadro do cacto no lugar do cachorro, e a caneta no traço de seleção e na passagem do cartão (19/10/2026, decisão do Gabriel)

**Origem.** O Gabriel não gostou do cachorro ao fechar o Dia e pediu que a caneta entrasse nas animações de sucesso, de um jeito coerente com o conceito (a cada Dia fechado ela desenha um traço de um cacto; depois de pronto, flores, animais e outros elementos), e nas animações sutis de seleção, migração e passagem de cartão (por exemplo, uma linha néon singela em volta). Prévia: https://claude.ai/artifact/Q8cGYPvUrVCM77RG3o51Qr. Aprovada em 19/10/2026 às 02:07Z ("Construir tudo"). Pediu ainda para usar as skills ponytail, genjutsu:bunshin e impeccable (vindas no PR #194) na construção.

**Quadro do cacto.** Um desenho em 16 partes (chão, tronco, dois braços, nervuras e espinhos, três flores, sol, aves, calango, nuvem, chuva, capim, tatu-bola, borboleta). O Dia fechado de número N (Dias distintos com `fechadoEm`) desenha a parte ((N − 1) mod 16) + 1; depois da 16ª, o Dia seguinte abre uma folha nova. Nunca uma sequência: faltar um Dia não tira nada, e nenhum número aparece na tela (a legenda só diz "Hoje a caneta desenhou o chão."). Só no Resumo do Dia, depois de fechar; reaberto o Dia, o quadro some e, ao fechar de novo, a mesma parte se desenha de novo. A caneta deitada sai do canto, anda sobre cada fio enquanto ele se faz e volta a ser largada: é a única exceção ao "só por salto" da D-D7.

**Traço de seleção.** Ao escolher uma área, uma aba da Biblioteca ou uma resposta, uma linha fina (tinta de dia, luz à noite) se desenha em volta do item, com o ponto de luz à frente, espera um instante e some. Sem brilho: a luz continua só estado, com contorno de tinta.

**Passagem do cartão.** Ao responder um Cartão (Drill) ou uma Frase, o próprio cartão sai para a esquerda e o seguinte entra pela direita; o último cartão não passa, o fim da rodada toma a tela.

**Movimento em três modos**, lidos na hora de usar (`movimentoAgora()`): **reduzido** (`prefers-reduced-motion`, vence tudo) não anda nada: o quadro aparece pronto, não há traço e o cartão troca na hora; **Calmo** (só o perfil Calmo, escolhido em Conta › Perfis) desenha o quadro do Dia igual, mas o traço de seleção vira o contorno inteiro que só aparece e esmaece e o cartão só esmaece, sem deslocamento; **normal** (o padrão, sem perfil, e os perfis Guiado e Leitura) desenha o traço e desloca o cartão, como na prévia. Frequência manda: o que se repete a cada toque é mais curto e mais sutil do que o que acontece uma vez por Dia. Proibido continua: brilho pulsando, lens flare, parallax, confete.

**O que sai.** O cachorro (`TracoDoCachorro`) e o token `--traco-cachorro` (vira `--caramelo`, só o sol e o miolo das flores). Não há mais personagem; a skill `arretado-design-principles` (caminho protegido) foi atualizada no PR, com o rótulo `aprovado-gabriel`.

**Escolha reversível, confirmada pelo Gabriel em 19/10/2026 (o movimento completo).** Sem perfil escolhido o app usa o movimento normal (a prévia aprovada abria assim), ao contrário da voz regional, que sem perfil fica neutra: quem nunca abriu Perfis vê o traço e o deslocamento, e só o perfil Calmo os troca por esmaecer. Para o padrão ser o Calmo, é trocar uma linha em `movimentoAgora()` (`src/apresentacao/movimento.ts`) e em `Aparencia.tsx`.
