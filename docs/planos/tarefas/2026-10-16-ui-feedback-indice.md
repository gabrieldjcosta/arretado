# Retorno de design do Gabriel (16/10/2026) — índice dos pacotes

Origem: 18 anotações do Gabriel sobre o site publicado (`arretado.gabrieldjcosta.workers.dev`), feitas pela ferramenta de retorno de design. Cobertas pela exceção de fase de UI (13/10/2026, `docs/design/decisoes-design.md`): nenhum pacote toca esquema, sync ou sanitização. Quem mexe em `estilos.css`, `Shell.tsx`, `hoje/*` ou `Drill.tsx` avisa a thread de UI antes (`docs/proxima-sessao.md`).

| # | Anotação (resumo) | Pacote |
|---|---|---|
| 1 | Mascote do vazio do Hoje → vetor do PNG que o Gabriel vai mandar | **Aguarda o PNG** (pacote H, abaixo) |
| 2 | Fundo cor de areia com pontinhos | G |
| 3 | "Importar pontos do edital" colado no quadro de cima | C |
| 4 | Plano vazio mais convidativo + prompt para IA | C |
| 5 | Árvore de disciplinas/assuntos do onboarding crua | D |
| 6 | Onboarding: acrescentar disciplina e assunto | D |
| 7 | "Frases" antes de "Erros"; nomes pouco intuitivos | **Decisão do Gabriel** (abaixo) |
| 8 | "Recall" → "Revisão" ou "Reforço" | **Decisão do Gabriel** (abaixo) |
| 9 | Orientação curta ao lado do título do Recall | G |
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
| G | [`2026-10-16-ui-g-fundo-e-recall.md`](2026-10-16-ui-g-fundo-e-recall.md) | B | Antigravity | Gemini | `estilos.css`, `recall/RecallInicio.tsx` |

Ordem sugerida (no máximo 3 workers por Run, um por conta): **1ª rodada** A (antigravity-1), B (deepseek-harness), D (Sonnet). **2ª rodada** C, E, F, G. A e B tocam o acervo em arquivos diferentes e não conflitam; A e E tocam a Biblioteca em arquivos diferentes (`Acervo.tsx` × `Normas.tsx`); G só depois que a thread de UI liberar o `estilos.css`.

## H — Mascote (aguarda o PNG)
Quando o Gabriel mandar o PNG: vetorizar em SVG limpo (paths, sem imagem embutida), com as cores do sistema visual, e trocar o arquivo usado por `img.vazio-mascote` em `src/apresentacao/hoje/EstadoVazio.tsx`. Contrato escrito quando o arquivo chegar.

## Decisão do Gabriel: nomes do Recall (anotações 7 e 8)
"Recall", "Erros" e "Frases" estão no vocabulário obrigatório (`CLAUDE.md`, `docs/glossario.md`); trocar mexe em menu, títulos, rotas, textos de ajuda, glossário e E2E. Proposta do coordenador, a confirmar:
- Módulo: **"Reforço"** (não "Revisão": "Revisão" já é a resposta a um Cartão, e repetiria "Revisar" dentro do próprio módulo).
- Abas, nesta ordem: **"Frases certas"** (antes "Frases"), **"Questões"** (antes "Erros": o registro de cada questão errada ou chutada), **"Cartões"**, **"Histórico"**.
- Só os textos da tela mudam; identificadores de código (`recall`, `Erro`, `Frase`) e rotas ficam como estão, para não mexer em dado gravado.
Depois da decisão vira o pacote I (nível B, Sonnet), que também atualiza o glossário e o `CLAUDE.md` (caminho protegido: precisa do rótulo `aprovado-gabriel`); a orientação do pacote G já usa o texto que valer.
