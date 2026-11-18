# Brief de design — telas do app (rascunho para aprovação)

Fontes: grill-me de 13/10/2026 (rodadas 1–3), `decisoes-design.md` (D-D1), código atual (`src/apresentacao/App.tsx`). Estado de partida: #98, #99 e #101 como já integrados.

## 1. Resumo

Redesenhar a apresentação de **todas as telas do app** para que pareçam cuidadas, seguras e inconfundivelmente Arretado, sem pedir mais atenção do que dão. Saída do Stitch é referência para adaptar ao código (tokens e arquitetura do app), nunca HTML colado.

## 2. Resultado do usuário

Abrir o app e, em poucos segundos, saber onde parou, sentir que está tudo salvo e fazer uma coisa por vez, com ânimo e conforto.

## 3. Público por comportamento

- Gabriel hoje; desenhado para quem pagará depois.
- **"Não sei por onde começar":** quer estudar para concurso e não sabe o que importa mais.
- **"Voltei e perdi o fio":** já estudou ou usou o app, parou e não sabe recomeçar.
- Sem rótulo clínico em nenhuma tela.

## 4. Problema atual (palavras do Gabriel)

Parece morto, não motiva, é genérico ("ai-slop"), não passa segurança, não impressiona, e não acerta a relação economia de atenção × encantamento.

## 5. Sensação-alvo

**Ânimo e conforto.** Referência de sensação: Headspace (calor, acolhimento, humanidade) — referência de sensação, não de estética; sem copiar identidade nem personagens.

## 6. Inventário de telas (rotas atuais)

| Área | Rota | Tela |
|---|---|---|
| Hoje | `/` | Hoje (Agora, Depois, revisões, captura rápida) |
| Plano | `/plano` | Plano |
| Recall | `/recall`, `/frases`, `/cartoes`, `/historico` | Início, lista de frases, de cartões, histórico |
| Recall | `/recall/registrar` | Registrar erro (só a frase correta obrigatória) |
| Recall | `/recall/revisar` | Revisão (cartão central) |
| Recall | `/recall/erros/:id`, `/recall/cartoes/:id` | Detalhe do erro, editar cartão |
| Biblioteca | `/biblioteca` | Normas |
| Biblioteca | `/biblioteca/acervo`, `/sumulas`, `/teses` | Acervo, súmulas, teses |
| Biblioteca | `/biblioteca/normas/:id` | Leitor (foco, grifos, estrela) |
| Biblioteca | `/biblioteca/importar` | Importador |
| Conta | `/conta`, `/aparencia`, `/dados`, `/privacidade` | Conta e ajustes |
| Ajuda | `/orientacoes` | Orientações |
| Sistema | `*` | Não encontrada |

**Telas novas a desenhar** (sem rota hoje):
- **Primeiro uso**, para "não sei por onde começar" e para "voltei e perdi o fio".
- **Resumos do usuário:** a pessoa insere os próprios resumos. Funcionalidade nova: ver pendências.

## 7. Direções por tela-chave

Para Hoje, Leitor e Revisão (desktop, celular, claro e escuro): 3 versões.
1. **Padrão:** segue o sistema atual (papel esverdeado, tinta, sálvia, Atkinson, Literata).
2. **Stitch:** o que ele propuser com o mesmo brief.
3. **Livre:** mais ousada, só para comparar.

As demais telas herdam a direção escolhida, com uma passada de verificação.

## 8. Encantamento

- Acabamento: tipografia, espaço, material e microdetalhes.
- **Recompensa discreta** (aprovada em princípio), por exemplo ao fechar uma sessão ou concluir uma revisão. Sem streak, ranking, perda, culpa ou urgência.
- Movimento só quando explica (150–220 ms no app); `prefers-reduced-motion` mantém ordem, conteúdo e ação.

## 9. Restrições

- Fonte de verdade: `CLAUDE.md`, plano-mestre e `arretado-design-principles`.
- Só apresentação. Sem esquema, sync, sanitização nem domínio de fase posterior (D-D1). Telas de fase futura ficam especificadas, sem dado real.
- Vocabulário obrigatório; uma ação dominante por tela; alvos de 44 px; contraste AA; estado nunca só por cor.
- Local-first e uso sem rede continuam verdadeiros nos textos e estados.

## 10. Conteúdo dos mockups

Lei pública real (CF, LEP, CC e semelhantes) e **dados pessoais inventados** (frases, erros, cartões, datas). Nada do app real do Gabriel vai ao Stitch (nuvem do Google). Onde o texto real atrapalhar o desenho, usar texto fictício melhor e marcar.

## 11. Viewports e estados

1440×900, 768×1024 e 390×844; claro e escuro; estados principal, vazio, retomada, offline e erro recuperável quando houver.

## 12. Como será julgado

1. **Avaliação "júri de prêmio de design"** feita por mim antes de você ver: critérios definidos, nota por critério e percepção intuitiva (ver `criterios-avaliacao.md`).
2. Você decide a direção.
3. Se aprovada: revisão visual (`arretado-visual-review`) e de experiência (`arretado-experience-review`) antes de cada PR.

## 13. Critérios de aceite observáveis

- Em 5 segundos: onde estou, o que faço agora, o que fica salvo.
- Nenhuma tela com mais de uma ação dominante.
- Três tamanhos de tela e dois temas sem overflow; teclado e foco visíveis; axe sem violação.
- Direção 1 reutiliza tokens existentes; qualquer token novo documentado em `docs/design/DESIGN.md`.

## 14. Decisões pendentes

- Resumos do usuário: onde moram (Biblioteca? Frases?), formato (texto, HTML colado sanitizado, markdown) e em que fase entram. É domínio novo: fica só como especificação até haver decisão.
- Se a recompensa discreta aparece no fechamento da sessão, na revisão ou em ambos.
- Quanto de personagem entra agora (a etapa seguinte é o avatar).
- Quais das 3 direções vão além de Hoje, Leitor e Revisão.
