# Referências do Gabriel de 14/10/2026 (Gemini) — o que mostram e como entram no app

Quatro mockups e duas especificações de código, mandados pelo Gabriel em 14/10/2026 (11:18 e 11:28 UTC). A decisão que os incorpora é a **D-D4** em [`../../decisoes-design.md`](../../decisoes-design.md); o alvo visual está em [`../../sistema-visual.md`](../../sistema-visual.md) (v3) e a execução em [`../../../planos/redesign-v2.md`](../../../planos/redesign-v2.md). O link do Gemini (`https://share.gemini.google/TG0j5Eez0Spd`) não resolve a partir do ambiente do Claude; o que não estiver aqui precisa ser colado de novo.

| Arquivo | O que é |
|---|---|
| `hoje-claro-escuro.jpg` | Hoje no celular, claro e escuro |
| `design-system-cards.jpg` | Paleta e os quatro cartões de estado (Estudando, Distraído, Sorrindo, Determinado) |
| `sessao-estudo-e-fechar.jpg` | Sessão de estudo e Fechar sessão |
| `leitor-acoes-paisagem.jpg` | Leitor em texto corrido, modal de ações do artigo e modo foco em paisagem |
| `especificacao-gabriel.md` | Paleta, botões (primário compacto, fantasma, linha de ação) e três SVGs (cactos, lâmpada, distração), verbatim |
| `especificacao-leitor-sessao.md` | Especificação estruturada do Leitor e da Sessão, verbatim |

## Hoje (`hoje-claro-escuro.jpg`)

Cabeçalho com "Arretado." (ponto final) e dois botões de contorno, "Conta" e "?". Cartão Agora com o mascote apoiado na borda, rótulo "Estudando!", título em sans bold, botão primário compacto "Continuar leitura →" e ao lado, sem caixa, "Trocar tarefa". "DEPOIS · NA SEQUÊNCIA" com **duas** linhas em cartão (título, matéria · minutos, ponto colorido por tipo e seta). Campo "Anote a frase correta…" com o botão "Guardar" dentro, na tinta de Caatinga. Barra de baixo reta, com ícone e rótulo nas quatro áreas, sem "+" no Hoje.

**Entra:** tudo isso, na F3 (Hoje). A captura inline é a que o plano já previa; "Depois" com até 2 itens confirma o padrão da D-D3; o ponto colorido por tipo (Frases = Solace, Cartões = Acqua) **substitui** os seis tons de matéria.
**Diverge:** (1) o cartão Agora do claro é **Areia** com botão Terracota, e no escuro um marrom com botão Solace; o texto da especificação ("Caatinga: Card Hero principal"), o cartão "Estudando!" do sistema e a Sessão usam **Caatinga**. Padrão adotado: Caatinga (claro) e Noite-cartão (escuro) para o Agora, porque é o que a especificação escreve; **a decidir com o Gabriel na F3** (a troca é só um token). (2) A barra de baixo não tem bloco verde no item atual; entra na F2.

## Sistema de cartões (`design-system-cards.jpg`)

Paleta (Sand `#EAD2B0`, Terracotta `#963417`, Caatinga `#3B3F21`, Acqua `#628981`, Solace `#CF893A`) e quatro estados, cada um com cor de bloco e ação própria:

| Estado | Bloco | Ação | Conteúdo |
|---|---|---|---|
| Estudando! | Caatinga | Solace "Continuar leitura →" e "Escolher outra coisa" sublinhado | "Você parou no Art. 112, § 1º", mascote com livro e lâmpada |
| Distraído… | Areia | linhas de ação (livro, arquivo, relógio) | "Por onde começar?": "Adicionar uma lei para ler", "Escolher uma matéria", "Sessão curta de 15 min" |
| Sorrindo! | Palha (cartão claro) | botão de contorno "Ver resumo do dia" | "Dia fechado com constância!", pontos de andamento |
| Determinado | cinza-areia | Terracota "Iniciar 6 frases →" | "Revisões prontas para hoje" |

**Entra:** o bloco muda de cor conforme o **estado** da pessoa (F3, e Retorno e Fechar o dia). **Cuidado:** o "Daily tracker" de pontos entra só como **andamento das tarefas do dia**, nunca como sequência de dias (sem streak, regra do produto). O texto "Checklist e chcklistes" da imagem é erro de geração; ignorar.

## Sessão (`sessao-estudo-e-fechar.jpg`)

"Modo Só Estudo" (interruptor Acqua), chips 15m, 25m, 45m, 60m com "18 min passados (só informa)", bloco Caatinga com o mascote "Estudando!", "Voltar à leitura →" (Solace) e "Pausar" (contorno), "Estacionamento de Distração…" (Areia, mascote Distraído, campo e "Estacionar") e o fechamento ("Sessão concluída no seu ritmo!", mascote Sorrindo entre dois cactos, selo Acqua "25 min · Art. 112 a 118 lidos", caixas para resolver o estacionado, Terracota "Guardar e fechar sessão →").

**Entra:** F9 (Conta e Sessão). O **componente** da faixa "Sessão · Pausar · Encerrar" é da thread "Aprimoramentos das revisões"; o visual (bloco, botões, chips) é daqui. O tempo continua **só informando**, sem alarme (regra existente).

## Leitor (`leitor-acoes-paisagem.jpg`)

Texto corrido com seletor de fonte segmentado (A-, 18px, A+), "Destaques ✓" em Caatinga e **legenda recolhível** dos destaques (sublinhado duplo, tracejado, ondulado, pontilhado), régua de leitura em Areia com filete de Caatinga e as ações do bloco (☆ e "Ações") no canto, dock flutuante (Buscar, Filtrar, Foco em pílula e "Lido até aqui" em Caatinga), modal "Ações de Art. 2º" (Estrelar, Copiar ref., Corrigir texto; "Registrar erro neste artigo →"; "Criar cartão deste trecho"), e o foco em paisagem com painel à direita (‹ 3 / 219 ›, Estrelar, Lido, Buscar, Filtrar, "Sair do foco").

**Entra:** F6 (Leitor), com os valores da especificação. A régua deixa de ser azul (cai a cor "linha atual" da D-D3). O mascote **não** aparece no Leitor (regra mantida).
**Diverge:** (1) a legenda de "Prazos" aparece como "acqua" na imagem e como `#173F52` no texto; padrão adotado: o texto (contraste de 10:1 contra 3,4:1 do Acqua). (2) A barra de baixo do Leitor mostra casa, lupa, marcador e engrenagem; o app tem Hoje, Plano, Recall e Biblioteca, que ficam. (3) O botão "Lido até aqui" traz "#3B3F21" escrito, vazamento do token; o rótulo é "Lido até aqui".

## Especificações de código

- **Paleta e botões** (`especificacao-gabriel.md`): viram os tokens `--areia`, `--palha`, `--creme`, `--terracota`, `--caatinga`, `--acqua`, `--solace`, `--noite`, `--noite-cartao`, `--tinta`, `--sobre-solace` e os papéis `--acao`, `--lugar`, `--bloco-*`, `--selecionado-*`. Os botões viram classes CSS (`.principal`, `.botao-texto`, `.linha-acao`), não strings de estilo em TypeScript. O caminho `src/apresentacao/componentes-comuns/` do texto não existe: os componentes ficam em `src/apresentacao/componentes/`.
- **Elementos vetoriais** (`ElementoCactos`, `ElementoLampada`, `ElementoDistracao`): entram como componentes React na F3, junto dos cartões de estado. São decorativos (`aria-hidden`).
- **Leitor e Sessão** (`especificacao-leitor-sessao.md`): F6 e F9.

## O que mudou nos tokens por contraste (nada disso altera a paleta)

| Pedido | Medida | Ajuste |
|---|---|---|
| Acqua `#628981` como texto ou com texto branco | 3,4:1 sobre Palha; 3,9:1 com texto branco | `--acqua-texto` e `--acqua-fundo` = `#416a63` (5,4:1 e 6,1:1); Acqua puro fica só em traço, ponto, barra e interruptor |
| Sublinhado de condição em Solace `#CF893A` sobre Palha | 2,5:1 (mínimo gráfico 3:1) | no claro, `--destaque-condicao` = `#b06f22` (3,6:1); no escuro, Solace |
| Areia como superfície no escuro (estacionamento, tiles, chip inativo) | texto claro sobre Areia não passa | `--quente` = Areia no claro e `#2f261d` no escuro |
