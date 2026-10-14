# Stitch — telas do app (registro)

Brief: `brief-app.md` (aprovado em 13/10/2026). Critérios: `criterios-avaliacao.md` (aprovados).
Projeto Stitch: "Arretado - telas do app", id `11739731513064417940`, https://stitch.google.com/projects/11739731513064417940
Conteúdo dos mockups: lei pública (LEP art. 112) e dados inventados. Nada do app real foi enviado.

## Rodada 1 — Hoje

| Direção | Dispositivo | Screen id | Observação |
|---|---|---|---|
| D1 padrão | desktop | `8f92b6d4a52c445397adaf34a9d44f94` | |
| D1 padrão | celular | `3d90ca7c76df43a9876bd5a979b220f3` | |
| D2 Stitch | desktop | `012c2e12877244dfb2a5d44cad644fcb` | 1ª tentativa (`3e291d45…`) saiu em formato celular; refeita |
| D2 Stitch | celular | `e9801fccab504794a6ea29d950e5bc72` | |
| D3 livre | desktop | `ce9326cb4df74385a579333a7f7f0f88` | 1ª tentativa (`a8f16a1a…`) saiu em formato celular; refeita |
| D3 livre | celular | `6fb4778d46e64e56baa236ebca43fc80` | |

Prompts: brief resumido da tela Hoje + restrições; D1 com os tokens atuais; D2 sem paleta imposta; D3 "livre e ousada".

## Avaliação (júri de prêmio de design) — Hoje, desktop

Notas 0–5 por critério (ordem de `criterios-avaliacao.md`: 1 clareza, 2 atenção, 3 identidade, 4 encantamento, 5 confiança, 6 ânimo, 7 tipografia, 8 cor, 9 acessibilidade/responsivo, 10 viabilidade).

| Direção | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total /50 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 padrão | 4 | 3 | 2 | 2 | 4 | 3 | 4 | 4 | 3 | 5 | **34** |
| D2 Stitch | 4 | 3 | 3 | 3 | 4 | 4 | 4 | 2 | 3 | 2 | **32** |
| D3 livre | 3 | 2 | 4 | 4 | 3 | 3 | 4 | 3 | 2 | 1 | **29** |

Nenhuma direção chega a nível de prêmio; nenhuma recebeu nota 5 em encantamento ou identidade.

## Achados comuns (as três)

- **Voz de pastiche de bem-estar.** "Respire fundo e no seu ritmo" aparece igual nas três (provável herança do sistema de design criado no 1º envio, o que também enfraquece a independência das direções). É a frase mais "ai-slop" da tela. "Nenhuma meta inatingível ou cobrança rígida" nomeia a pressão que quer negar.
- **Invenções.** Nome "Caderno Jurídico", "Lucas — Magistratura Estadual", citação motivacional no rodapé, "Ciclo Penal · Bloco 2", "Modo Concentração", "Ritmo calmo". Nada disso existe no produto.
- **Modelo errado.** "Página 38 de 52": o app lê por dispositivo (artigo), não por página.
- **Vocabulário do projeto violado:** "nota", "fila de repetição", "tópicos amadurecendo"; o app usa Frase correta, Revisão, Cartão.
- **Mais de uma ação competindo** com "Continuar leitura" (botão no topo, captura grande, dois cartões com o mesmo peso).
- **Bom, a aproveitar:** o marcador de fita "Você parou aqui"; "seu ponto de estudo está guardado exatamente aqui"; o cartão Agora com borda lateral; o trecho da lei em serifa como protagonista.

## Por direção

- **D1:** a mais próxima do app e a mais barata de implementar; calma e legível, mas com cara de template de SaaS de bem-estar. Sálvia mantida. Fraca em identidade e encantamento.
- **D2:** a mais calorosa e com mais ponto de vista, mas a paleta terracota entra em colisão com a semântica de perigo/alerta (sálvia é a cor de ação); foto de avatar e citação no rodapé são ruído. Viabilidade baixa sem trocar a identidade.
- **D3:** a mais editorial e autoral (margem de glosas, fita, tipografia), mas inventa produto (Jurisprudência, Doutrina, Caderno de Glosas, princípio didático), coluna lateral cortada no desktop (overflow), tem muitas ações. Não implementável sem escopo novo.

## Recomendação

Não aprovar nenhuma como está. Rodada 2: partir da D1 (estrutura e tokens), incorporar da D2 a fita "Você parou aqui" e a frase de segurança do ponto salvo, e da D3 a confiança editorial (titular em Literata, filete lateral no cartão), cortar a saudação de bem-estar, a citação e todo conteúdo inventado, e usar o vocabulário do projeto. Mostrar a recompensa discreta de fim de sessão como segunda tela.

## Rodadas 2 e 3 — Hoje (projeto novo, sem herdar a voz da rodada 1)

Projeto Stitch: "Arretado - Hoje rodada 2", id `8506778262986179771`, https://stitch.google.com/projects/8506778262986179771
Conceito: o app é o marcador que nunca se perde. "Ponto" é ponto de retomada e ponto de costura: um fio de sálvia marca a linha exata onde a pessoa parou. Voz direta, sem autoajuda, sem saudação com nome.

| Rodada | Tela | Screen id | Nota /50 |
|---|---|---|---|
| 2a | Hoje, página aberta | `aea69ee6f96e4224861e757944a22140` | 35 |
| 2b | Hoje, fio vertical | `2ba56f2e5e0c46b599d488749b470c5c` | 37 |
| 3 | Hoje, costura (refino da 2b) | `e48f8087a5d94c199e9cf1e8d8720fb0` | 39 |
| 3 | Fim de sessão (recompensa discreta) | `2384c728ca544b1297bbced68ae1ee69` | 36 |

Notas da rodada 3, Hoje (1 a 10): 5, 4, 4, 3, 5, 3, 4, 4, 3, 4.
- **Ganhos reais:** hierarquia e clareza; modelo certo (artigo e dispositivo, não página); vocabulário do projeto; uma só ação primária; trecho da lei em Literata como protagonista; fio, fita, borda pontilhada e trilha de pontos como assinatura reconhecível; texto do § 1º conferido.
- **Ainda fraco:** encantamento (fio e nó quase invisíveis, tela sóbria demais); ânimo (frio); legendas de ~11 px e rótulos de baixo contraste (acessibilidade a verificar no código, não pelo mockup); o nome "Vade Mecum" reaparece na tela de fim de sessão (invenção do Stitch; a marca é "Arretado").
- **Fim de sessão:** a recompensa é só um ponto a mais na trilha, discreta demais; "85% da subseção" é métrica inventada; "Registro incorporado ao índice do caderno de execução" é enchimento. Cortar os dois.

Nota: 50/50 exige 5 em todos os critérios, ou seja, excepcional em tudo; a meta prática é ≥ 45 sem nota abaixo de 4 em identidade, encantamento e ânimo.

## Rodada 4 — Hoje, nova direção pedida pelo Gabriel (13/10/2026)

Feedback sobre o conceito do fio e da costura: "fraco". Pedido: inspirar-se mais em planejadores visuais para foco (Tiimo), com branco e cinza no estilo do Claude e cinza escuro no modo escuro.
Projeto Stitch: "Arretado - Hoje rodada 4", id `2968782632555934720`, https://stitch.google.com/projects/2968782632555934720

Princípios tomados (não a identidade): linha do tempo do dia em blocos suaves; ícones grandes em círculos; formas muito arredondadas; uma coisa em destaque agora; uma cor pastel por disciplina. Neutros: branco quente `#faf9f5`, texto `#1f1e1d`; escuro `#1f1e1d` / `#262624`; botão primário em cinza escuro.

| Tela | Screen id |
|---|---|
| Hoje, desktop claro | `c96636907d1349429a94175f2b306b99` |
| Hoje, celular claro | `31514034e67e4682880356b79970e9b9` |
| Hoje, desktop escuro | `a1e992b0b5a4475c8ac0e4c95a4d66f8` |

Leitura do júri (desktop claro): clareza 5, atenção 5, identidade 3, encantamento 3, confiança 4, ânimo 4, tipografia 3, cor 4, acessibilidade 4, viabilidade 3 = **38**. Mais vivo e mais claro que a rodada 3, porém mais genérico em identidade (parece um planejador pastel qualquer).
- **Invenções a cortar:** subtítulos "Fixação doutrinária" e "Jurisprudência em teses"; aspas em volta da referência; ícone "99" para frases.
- **Escuro:** o cartão pêssego vira marrom lamacento; reduzir saturação ou trocar a lógica de cor no escuro.
- **Mobile:** caixa interna da referência pesa; "Conta" solta no meio da tela.
- **Decisão pendente (D-D2):** trocar a identidade sálvia/papel esverdeado por neutros do Claude + pastel por disciplina implica novos tokens, risco de colisão com as cores de grifo do leitor (amarelo, verde, rosa) e atualização de `arretado-design-principles`. Só vale se o Gabriel confirmar.

## Rodada 5 — Hoje, "Sol e anil" (inspirada em Structured, Evolve, Speechify e Tiimo)

Feedback sobre a rodada 4: "avanço, mas com cara de Claude, o que não é bom". Pedido: inspirar-se nos apps Structured, Evolve (ADHD), Speechify e Tiimo.
O que tomei deles (sem copiar identidade): cor saturada e confiante; esferas de ícone coloridas numa linha do tempo vertical (Structured, Tiimo); cartões muito arredondados e flutuantes; título em serifa de exibição (Tiimo); texto da lei com a linha atual realçada como leitura guiada e controle flutuante em pílula (Speechify); energia otimista e espaço para um companheiro (Evolve; fica para a etapa do avatar).
Identidade proposta: "Arretado" é expressão nordestina que significa excelente; a paleta nasce do Nordeste (sol, anil, folha, caju, argila, cordel), alegre e adulta: creme `#fff8ec`, tinta marinho `#14213d`, anil `#2b3fd6`, sol `#ffb627`, esferas por disciplina (caju `#f2542d`, folha `#2fa36b`, céu `#3ba7f0`, rosa `#f06292`, argila `#c8763a`).

Projeto Stitch: "Arretado - Hoje rodada 5", id `9953616237194891956`, https://stitch.google.com/projects/9953616237194891956

| Tela | Screen id |
|---|---|
| Hoje, celular claro | `e5587e57e910497cb01280e0909c2035` |
| Hoje, desktop claro | `d14cb62f25ee4cbeade2ed6aabeec59e` |
| Hoje, celular escuro | `e5e17687ac5f4924baa2a99197ce576b` |

Júri (celular/desktop claro): clareza 5, atenção 4, identidade 4, encantamento 4, confiança 4, ânimo 5, tipografia 4, cor 3, acessibilidade 3, viabilidade 3 = **39**. Melhor resposta ao problema declarado (morto, genérico, não motiva): identidade, encantamento e ânimo passam de 2, 3 e 3 para 4, 4 e 5.

Defeitos a corrigir na rodada 6:
- **Texto da lei errado:** o Stitch pôs o inciso do caput ("16% da pena…") como se fosse o § 1º. Texto real do § 1º: "Em todos os casos, o apenado terá que ostentar boa conduta carcerária, comprovada pelo diretor do estabelecimento, respeitadas as normas que vedam a progressão." Usar texto conferido no prompt.
- **Colisão de amarelo:** o botão primário e o realce da linha atual usam o mesmo sol. O amarelo do leitor pertence ao conteúdo marcado (grifo-1). Separar: realce da linha atual em azul claro ou sublinhado, mantendo o sol só para a ação.
- **Etiqueta Direito Penal em vermelho-caju:** perto do semântico de perigo. Testar rosa ou argila.
- **Escuro:** "§ 1º" quebra em duas linhas; a pílula flutuante cobre o campo de captura; sobras como "Artigo 112 · Leitura ativa" e "Concursos jurídicos" (não são do produto).
- **Desktop:** metade inferior vazia; coluna da direita pequena.
- **Logo:** martelo e balança são clichê jurídico; pensar marca própria (o avatar vem depois).
- **Viabilidade:** troca de identidade (D-D2) exige novos tokens, serifa de exibição e migração do tema; só apresentação, mas precisa de decisão e plano.

## Rodada 6 — Hoje, fim de sessão, retomada e revisão com o mascote (14/10/2026)

Entrada do Gabriel: duas imagens de mascote (cachorro caramelo com chapéu de couro marrom e lenço vermelho, folha vetorial com 4 estados: Estudando, Distraído, Sorrindo, Determinado; e um filhote 3D com boné azul bordado, lenço amarelo e caneta-cacto) e uma imagem de tela Hoje com cartão azul-marinho.
Método: as imagens foram enviadas como telas de referência ao projeto `9953616237194891956` (ids `10328291236108129510`, folha de estados; `17490486993676652548`, filhote 3D) e as telas novas foram geradas com `stitch edit screen --prompt` a partir da folha, o que cria uma tela nova por pedido.
Paleta nova (do mascote e do Nordeste): creme `#fdf1de`, marrom-tinta `#5a2a17`, azul-marinho `#14213d`, caramelo `#e8892b`, chapéu `#8a4b2a`, lenço `#c23b2b`, cacto `#7c8b3a`, sol `#ffb627` (só ação); etiqueta de disciplina em argila (`#c8763a`), sem vermelho de perigo.

| Tela | Screen id | Nota /50 |
|---|---|---|
| Hoje, celular | `da541f21e5bb4d588859643e4b826d94` | 41 |
| Fim de sessão, celular | `21f7219eeb8547f4aebfb198a4f8fdac` | 33 |
| Retomada ("voltei e perdi o fio"), celular | `8a239192a1c646c293b00b7737d676e0` | 40 |
| Revisar frases, celular | `371df1d81eb44418b494956dfc379aa7` | 38 |
| Hoje, desktop | `7262c4e30da64035bb395dc63c0e4a5b` | 35 |

Ganhos: texto do § 1º agora correto; realce da linha atual em azul claro (sem colisão com o botão sol); mascote integrado como coadjuvante; identidade própria e reconhecível; ânimo alto.
Defeitos:
- **Fim de sessão:** o Stitch colou o recorte retangular da folha (com fundo e legenda "Sorrindo!") em vez de integrar o personagem; inventou "Último destaque salvo · Código Penal" com texto falso.
- **Desktop:** conteúdo sai da largura (coluna direita cortada); frase de efeito inventada ("No sertão, a disciplina é água fresca na caminhada"); "Próximos tópicos da LEP" e "Modo de estudo offline" são invenções.
- **Revisão:** rótulos inventados ("Leitura atenta", "Literalidade", "Ritmo constante"); mascote pequeno demais.
- **Mascote:** "Determinado" tem sobrancelhas bravas e "Distraído" tem pontos de interrogação e notas musicais, que podem soar como cobrança; usar versões suaves. O filhote 3D e a folha vetorial são estilos diferentes: definir um canônico (recomendação: vetorial plano, que escala a ícone de 24 px e a SVG).
- **Reutilização:** o recorte do mascote precisa de arquivo próprio (PNG transparente ou SVG) para não depender do Stitch.
