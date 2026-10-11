# Fatia 6 do redesign — acabamento (proposta)

Proposta de 11/10/2026, **aguardando aprovação do Gabriel**. Origem: plano do Perplexity (clareza, acolhimento) mais leitura de capturas do TikoNote, filtrados contra D1–D24 e o `CLAUDE.md`. Prévias: [`../redesign/acabamento-previa-claro.png`](../redesign/acabamento-previa-claro.png) e [`../redesign/acabamento-previa-escuro.png`](../redesign/acabamento-previa-escuro.png) (mockups, não o app). Sem subida de esquema.

## Decisão central: o marcador amarelo sai

O marca-texto (`--agora`, `--agora-faixa`) deixa de ser o acento. O **"agora"** passa a ser um cartão **tingido de sálvia com borda sálvia**; botão preenchido em sálvia; o resto neutro. Os grifos do leitor (`--grifo-1..3`) ficam: são conteúdo do usuário. Altera a spec do redesign §3, a T19 e o comentário do bloco "Identidade nova" em `estilos.css`.

## Tokens

| Token | Claro | Escuro |
|---|---|---|
| `--agora-fundo` | `#e3ede5` | sálvia `#8fbf9f` a 13% sobre a superfície |
| `--agora-borda` | `#4f7a64` (1,5 px) | `#8fbf9f` |
| `--raio-cartao` | 16 px | 16 px |
| `--raio` (controles) | 12–14 px (hoje 8) | idem |
| `--alvo` | 44 px (já existe); botão principal 50 px | idem |
| Espaço | escala 8, 12, 16, 24, 32 | idem |

Valores a **medir** em `scripts/contraste.mjs` antes de gravar (borda do "agora" ≥ 3:1 contra o fundo; texto sobre o tingido ≥ 4,5:1; selo "Há versão nova"; estado selecionado nos dois temas). Retirar `--agora`, `--agora-texto`, `--agora-faixa` e os pares antigos do script.

## Componentes e telas

- **6.1 Tokens e contraste.** Troca acima; script de contraste; atualizar T19, spec e glossário (`agora` = cartão tingido).
- **6.2 Componentes.** `AcaoAgora` (cartão tingido, sem traço amarelo); **controle segmentado** (pílula, item ativo preenchido) para as abas de Recall e de Biblioteca; **linha de lista** (ícone em quadrado tingido 44 px, título, uma linha de apoio, seta); **selo** em pílula ("Há versão nova", "vigente"); estado **selecionado** único (tinta + borda sálvia) para filtros, disciplina e Conta › Aparência.
- **6.3 Casca.** Área ativa preenchida (barra inferior e cabeçalho do desktop). Resolver o **+ sobre a lista**: no celular, reservar margem inferior para o último item não ficar escondido (visto na prévia da Biblioteca).
- **6.4 Biblioteca.** "Continuar leitura" compacta, busca, segmentado Normas/Súmulas/Teses, lista (não grade). "Há versão nova" como selo na própria norma.
- **6.5 Drill.** Frente centralizada e grande; **Virar** é o único botão em destaque; após virar, "Frase correta" em callout tingido e **Errei / Difícil / Fácil** com texto e borda (Errei não depende só da cor); contador e **Sair** no topo; "Depois:" embaixo.
- **6.6 Leitor.** Bloco ativo com **barra lateral sálvia**; vizinhos esmaecidos (legíveis, conferir AA); no modo foco, "Lido até aqui" secundário e "Próximo artigo" principal; "Sair do foco" recuado. Sem caixa por artigo.
- **6.7 Estado por texto.** Resultado do erro, situação da norma e cartão vencido sempre com palavra e ícone além da cor.
- **6.8 Testes e pronto.** `npm run check`, E2E nos 3 aparelhos, axe nos dois temas nas telas tocadas, capturas antes e depois, `docs/solucao-de-problemas.md`, `docs/glossario.md`, `docs/proxima-sessao.md`.

## Fora desta fatia (de propósito)

- **Tela Hoje** (F3, depois do portão da F2), renomear Recall, mascote, IA, confete, rótulos em caixa-alta, degradê, fundo pontilhado.
- **Menu "Ajuda"** juntando "?" e "!" (muda o D6): só com aprovação à parte.
- **+ fora do leitor:** manter como está até a validação com pessoas.

## Onde entra no curso de ação

A fatia 6 é refinamento da casca e do leitor, **sem nova funcionalidade**. Entra **entre duas atividades da F2**, como as fatias 1 a 5 (regra de convivência do `redesign.md`):

1. Depois do JSON curado das teses (próxima atividade hoje).
2. **Fatia 6 (esta), 2 sessões**: 6.1 a 6.3 numa; 6.4 a 6.8 noutra. Sonnet 5.5 médio.
3. Segue o que já estava: etapa 12 e 6b, etapa 10 e 11.7, `/code-review` das etapas 8, 9 e 11, etapa 13 e portão da F2, F3.

Motivo da posição: a **validação com 3 a 5 pessoas** (depois da F3) deve ver o visual final, e a fatia 6 mexe em `estilos.css`, que a F2 também edita, então convém mergear antes de a etapa 10/11.7 abrir novas telas. Cada item sai num PR para a `integracao`. O drill centrado muda o Recall no meio da medição do portão da F1: registrar o dia da mudança na linha de base.
