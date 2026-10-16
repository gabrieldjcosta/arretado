# Retorno de design do Gabriel (16/10/2026) — índice dos pacotes

Origem: 18 anotações do Gabriel sobre o site publicado (`arretado.gabrieldjcosta.workers.dev`), feitas pela ferramenta de retorno de design. Cobertas pela exceção de fase de UI (13/10/2026, `docs/design/decisoes-design.md`): nenhum pacote toca esquema, sync ou sanitização. Quem mexe em `estilos.css`, `Shell.tsx`, `hoje/*` ou `Drill.tsx` avisa a thread de UI antes (`docs/proxima-sessao.md`).

| # | Anotação (resumo) | Pacote |
|---|---|---|
| 1 | Mascote do vazio do Hoje → vetor do PNG que o Gabriel vai mandar | **Aguarda o PNG** (pacote H, abaixo) |
| 2 | Fundo cor de areia com pontinhos | F1b (D-D5) |
| 3 | "Importar pontos do edital" colado no quadro de cima | C |
| 4 | Plano vazio mais convidativo + prompt para IA | C |
| 5 | Árvore de disciplinas/assuntos do onboarding crua | D |
| 6 | Onboarding: acrescentar disciplina e assunto | D |
| 7 | "Frases" antes de "Erros"; nomes pouco intuitivos | D-D5, pergunta 2 |
| 8 | "Recall" → "Revisão" ou "Reforço" | D-D5: "Fixar" (F2) |
| 9 | Orientação curta ao lado do título do Recall | G2 |
| 10 | "Tudo do edital da DPE-SP" deve seguir o plano escolhido | E |
| 11 | Caixa do acervo colada no texto; título como botão | A |
| 12 | "Mudar" → "Alterar disciplina", menor | A |
| 13 | "Disciplina:" → "Disciplinas sugeridas:" | A |
| 14 | Excluir os avisos de DIVERGÊNCIA (do edital) | B |
| 15 | Manter avisos gerais (valem para qualquer concurso) | B |
| 16 | Avisos gerais ocupam espaço demais | A |
| 17 | Menus da Conta; explicar o backup; backup com .txt | F |
| 18 | Biblioteca por disciplina, retrátil, com filtro e busca | E |

## Pacotes
| Pacote | Contrato | Nível | Construtor | Revisor | Arquivos principais |
|---|---|---|---|---|---|
| A | [`2026-10-16-ui-a-acervo.md`](2026-10-16-ui-a-acervo.md) | B | Antigravity | Gemini | `biblioteca/Acervo.tsx` |
| B | [`2026-10-16-ui-b-avisos-gerais.md`](2026-10-16-ui-b-avisos-gerais.md) | C | DeepSeek ou OpenCode | Claude (diff) | `acervo/curadoria.json`, `public/acervo/indice.json` |
| C | [`2026-10-16-ui-c-plano-vazio.md`](2026-10-16-ui-c-plano-vazio.md) | B | Antigravity | Gemini | `plano/Plano.tsx`, `plano/ImportarPontos.tsx` |
| D | [`2026-10-16-ui-d-onboarding.md`](2026-10-16-ui-d-onboarding.md) | B | Sonnet | Claude | `plano/onboarding/*` |
| E | [`2026-10-16-ui-e-biblioteca.md`](2026-10-16-ui-e-biblioteca.md) | B | Sonnet ou Antigravity | Gemini | `biblioteca/Normas.tsx` |
| F | [`2026-10-16-ui-f-conta.md`](2026-10-16-ui-f-conta.md) | B | Antigravity | Gemini | `conta/Conta.tsx`, `conta/dados/*` |
| G | `2026-10-16-ui-g-fundo-e-recall.md` | — | **Substituído**: fundo na F1b, orientação no G2 | — | — |

Ordem sugerida (no máximo 3 workers por Run, um por conta): **1ª rodada** A (antigravity-1), B (deepseek-harness), D (Sonnet). **2ª rodada** C, E, F. A e B tocam o acervo em arquivos diferentes e não conflitam; A e E tocam a Biblioteca em arquivos diferentes (`Acervo.tsx` × `Normas.tsx`); o G original foi absorvido pela F1b (ver abaixo).

## H — Mascote (aguarda o PNG)
Quando o Gabriel mandar o PNG: vetorizar em SVG limpo (paths, sem imagem embutida), com as cores do sistema visual, e trocar o arquivo usado por `img.vazio-mascote` em `src/apresentacao/hoje/EstadoVazio.tsx`. Contrato escrito quando o arquivo chegar.

## Padrão do Stitch (D-D5, 16/10/2026) e o que muda nestes pacotes
O Gabriel trouxe o Hoje do projeto Stitch `9953616237194891956` e pediu o mesmo padrão em todas as telas (`docs/design/decisoes-design.md`, D-D5; plano em `docs/planos/redesign-v2.md`, fatias **F1b** e **F12**). Efeito:
- **A a F** usam só tokens, rótulos e componentes existentes: não precisam mudar. Quando a F1b trocar os valores dos tokens, as telas deles acompanham. Os construtores não devem fixar cor nem fonte.
- **G** foi dividido: o fundo com pontinhos (anotação 2) passa para a **F1b** (valores já definidos na D-D5: `#fff8ec` com pontos `#d6c9b3`); a orientação do Recall (anotação 9) fica como pacote próprio, **G2**, abaixo.
- **Nomes do menu (anotações 7 e 8):** o Stitch já resolve o módulo: **Fixar** (antes Recall), junto de **Trilha** (antes Plano) e **Em seguida** (antes Depois). Falta só o nome das abas de dentro do Fixar, na pergunta 2 da D-D5 (proposta: "Frases certas · Questões · Cartões · Histórico"). A troca de rótulos entra na **F2** (casca), com o mapa único de rótulos do glossário; a mudança do `CLAUDE.md` (caminho protegido) pede o rótulo `aprovado-gabriel`.

## G2 — Orientação no Fixar (anotação 9)
Nível C, Antigravity, revisor Claude. Depois da F2. Em `src/apresentacao/recall/RecallInicio.tsx`, ao lado do título (abaixo, em tela estreita), em tom de dica, texto de 13 px ou mais: "Errou ou chutou uma questão? Registre a frase ou a alternativa certa. Assim você acerta da próxima vez." Teste do texto e do rótulo do módulo; E2E do Fixar com axe. Contrato completo escrito quando a F2 estiver mesclada (usa o nome final do módulo).

## H — Mascote (aguarda o PNG)
Quando o Gabriel mandar o PNG: vetorizar em SVG limpo (paths, sem imagem embutida), com as cores da D-D5, e trocar o arquivo usado por `img.vazio-mascote` em `src/apresentacao/hoje/EstadoVazio.tsx`. No Stitch o cartão Agora já reserva espaço para o mascote acima dele. Contrato escrito quando o arquivo chegar.
