# Ponto de luz — construção da direção no app (18/10/2026)

Trabalho de UI, em esforço máximo; **não conta** no limite de 2 tarefas de código. Decisão: **D-D7** em [`../design/decisoes-design.md`](../design/decisoes-design.md), com o contrato da direção em [`../design/referencias/2026-10-18-ponto-de-luz/contrato.md`](../design/referencias/2026-10-18-ponto-de-luz/contrato.md). Alvo visual e valores: [`../../DESIGN.md`](../../DESIGN.md) e [`../design/sistema-visual.md`](../design/sistema-visual.md). Este plano assume a casca, as telas e a harmonização que o [`redesign-v2.md`](redesign-v2.md) previa nas fatias F2, F3 e F12 (a F1 e a F1b de lá já estão no código e esta P1 troca os valores delas); o rascunho da F2 de 14/10 (`/mnt/project-files/redesenho/f2-casca-rascunho.patch`, barra reta da D-D4) serve de base para a P2 só no que não é visual (teclado aberto, `MenuAjuda`, ajudas de teste).

## Como cada fase é entregue

- Um PR por fase, de rascunho para a `integracao`; sai de rascunho com CI verde (a Fila de merges mergeia). Só apresentação (D-D1).
- Pronto de uma fase: `npm run check` verde; E2E das telas tocadas verde nos três projetos, com axe nos dois temas; `node scripts/capturas-ui.mjs` nas telas da fase, com folhas "antes e depois" (claro e escuro; celular, tablet e desktop) em `docs/redesign/ponto-de-luz/<fase>/` (JPEG, até 500 kB por PR); docs atualizados (`DESIGN.md` e `sistema-visual.md` se um valor mudou, `glossario.md` se nasceu termo, `solucao-de-problemas.md` se houve tropeço).
- O contrato decide forma, cor, letra, movimento e o que é proibido; rotas, identificadores, vocabulário e dados não mudam.

## Fases

| # | Fase | O que entra | Toca | Depende de |
|---|---|---|---|---|
| P1 | **Fundação** | Paleta D-D7 nos dois temas (areia, cal, tinta, vidro, luz); fundo liso; Gabarito hospedada no lugar da Playfair; raios 16 e 12; sombra fresca na folha do Agora; área e aba atuais em cal; marcado em tinta; régua em tinta; Estrela de luz no Leitor; o "+" flutuante em cal (um vidro por tela) até sair na P2; faixa de cor dos grupos de disciplina fora; contraste medido | `estilos.css`, `fontes/`, `index.html`, `scripts/contraste.*`, docs | — |
| P2 | **Casca** | Cabeçalho na areia com marca (Gabarito e o cacto em vidro), Ajuda e Conta; abas Hoje · Trilha · Fixar · Biblioteca sobre a areia, atual em cal (embaixo até 899 px, no alto a partir de 900); "+" redondo em cal na linha do título das telas que criam algo (sai o "+" flutuante); teclado aberto esconde as abas; reserva de rolagem | `Shell.tsx`, casca em `estilos.css`, `MenuAjuda.tsx`, E2E da navegação | P1 |
| P3 | **Hoje** | Pontos do Dia (Leitura, Cartões, Frases: apagado, metade, aceso; acende uma vez em 160 ms); linha de parada com a caneta encostada na folha; folha de cal com título, motivo, tempo, botão de vidro e "Escolher outra coisa"; "Em seguida" com dois itens; Resumo do Dia com o traço do cachorro e a caneta largada; o mascote antigo sai do Agora e do estado vazio | `hoje/*`, `componentes/AcaoAgora`, componentes novos `Caneta`, `PontoDeLuz`, `TracoDoCachorro` | P2 |
| P4 | **Leitor** | O lido sobre a faixa de cal; "Lido até aqui" com a caneta deitada; Estrela de luz de quatro pontas; estrutura com pontos de luz por seção; régua, dock e modo foco nos tokens novos | `biblioteca/Leitor*`, CSS do leitor | P1, P3 (componentes) |
| P5 | **Fixar e revisão** | Cartão atual com a caneta encostada; fim de rodada com o traço do cachorro e a caneta largada; respostas sem vermelho (o estado "errou" sai do vermelho); abas Frases · Cartões · Histórico | `recall/*` | P2, P3 |
| P6 | **Demais telas** | Trilha, Biblioteca, Conta, Sessão e Orientações na paleta e nas regras novas (uma ação de vidro por tela; listas em linhas sobre a areia; cartões só onde agrupam); mascote antigo fora da Sessão | `plano/*`, `biblioteca/*`, `conta/*`, `sessao/*`, `orientacoes/*` | P2 |
| P7 | **Plataformas** | Ícone do app com a caneta sobre a areia, favicon, manifest, `theme-color` dos dois temas, `viewport-fit` | `index.html`, `public/`, `vite.config.ts` | P3 |

## Estado

- **P1 em PR** (18/10/2026).
