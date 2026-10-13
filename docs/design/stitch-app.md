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
