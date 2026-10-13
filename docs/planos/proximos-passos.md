# Próximos passos — resumo para o Gabriel

Atualizado em 13/10/2026, ao consolidar o [`plano-mestre.md`](plano-mestre.md) (que vale em divergência). Linguagem simples; detalhes técnicos em `docs/proxima-sessao.md`.

## 1. Feito até agora
- **F0 e F1** (Recall) prontas; o portão da F1 (14 dias com revisão em pelo menos 10) segue sendo medido.
- **F2 (Legislação)** quase toda: importar colando, estruturar, revisar e corrigir o rascunho (linha, bloco, texto inteiro, escrever do zero), publicar, ler (foco, artigo por artigo, estrela, grifos, busca, remissões), corrigir o texto já publicado com histórico e "Desfazer"; acervo de normas, súmulas e teses (155 das 169 teses; 14 esperam sua decisão); cara nova (fatias 1 a 6); revisão de código das etapas 8, 9 e 11 (14 problemas corrigidos).
- **Um plano só:** `docs/planos/plano-mestre.md`. Os planos antigos foram para `docs/planos/arquivo/`.

## 2. Onde está cada coisa
- **No `main` (o app publicado):** tudo até a correção do texto publicado (11.7).
- **Só na `integracao`, esperando seu merge:** a revisão de código (PR #83) e o plano-mestre. Nenhum dos dois sobe o esquema: não precisa de backup.

## 3. Próximas atividades, em ordem
| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| ✔ | 13.1 Segurança e privacidade da F2 (feita em 13/10/2026) | — | — |
| ✔ | 13.3 Backup com normas (feita em 13/10/2026) | — | — |
| 3 | 13.2 Ajuda e Orientações da Legislação | Sonnet médio | Nuvem, sem rede |
| 4 | 13.5 Verificação de fechamento (posição, toque, grifos que sobrevivem, voltar ao artigo depois do erro) | Sonnet médio | Nuvem, sem rede |
| 5 | 12.2 Publicar a busca por endereço e testar com leis reais | Sonnet médio | **Espera você, com rede** |
| 6 | 12.3 Campo de endereço na tela Importar; depois 6b (verificar atualização pelo aparelho) | Sonnet médio | Nuvem, depois da 12.2 |
| 7 | 13.4 Documento do portão da F2 | Sonnet médio | Nuvem |
| 8 | **2 semanas lendo lei no Arretado** | — | **Você** |
| 9 | Planejar a F3 (tela Hoje, Sessão, Plano) | **Opus** | Nuvem, só depois do portão |

Depois da F3: teste com 3 a 5 pessoas, depois conta e sincronização (F4); só então leitura de imagem (OCR), IA opcional, voz e a decisão de cobrar.

Sem bloquear nada: lotes que precisam de rede (Súmula Vinculante 30, lotes 3b/3d, 63 normas a converter) e a busca de súmula mais leve (Sonnet médio, nuvem).

## 4. Pendências suas
- Decidir as **14 teses com número repetido**.
- Dizer se o **sumário da importação** deve refletir a edição.
- Decidir o **critério dos gabaritos** no portão: a reconferência virou rotina de estudo, mas o portão ainda pede os gabaritos conferidos (CP, ECA, CDC e CF estão pendentes).
- Mergear a `integracao` no `main`; publicar a busca por endereço (12.2) e rodar os lotes com rede.
- Sem pressa: as suposições reversíveis das atividades 8.7 a 11.6 (lista no histórico arquivado) e as capturas "antes/depois" do redesign.

## 5. Como integrar no `main` e quando fazer backup
- O Claude mergeia cada atividade na `integracao` (merge commit). **O merge da `integracao` no `main` é só seu, uma vez por dia**, com o CI verde.
- **Backup do app (Conta › Dados) antes de mergear no `main` só quando o esquema sobe.** A última subida foi a v5 (acervo e releitura), já no `main`. Nada na `integracao` hoje sobe o esquema.
