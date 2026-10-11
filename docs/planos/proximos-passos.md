# Próximos passos — resumo para o Gabriel

Atualizado em 11/10/2026, ao fechar a etapa 10.3. Linguagem simples; detalhes técnicos em `docs/proxima-sessao.md`.

## 1. Feito até agora
- **F0 e F1** (Recall) prontas; **F2** (Legislação) em andamento.
- F2 pronta: importar lei colando, estruturar, publicar, ler (foco, artigo por artigo, estrela, grifos, busca, remissões), revisar o rascunho (10.1), **corrigir por bloco (10.3)** (abrir um capítulo ou um intervalo de artigos, confirmar tudo, converter um tipo de linha em outro, trocar uma palavra) e **editar linha a linha (10.2)**: converter a linha em outro tipo, juntar com a de cima, dividir no cursor, salvar sozinho ("Salvo"). Número e recuo são do sistema, e o que você corrigiu não se perde ao reabrir o rascunho.
- Acervo (esquema v5), súmulas, teses, palco do foco e acabamento do redesign (6.1 a 6.8) feitos.

## 2. Em andamento
- Nada aberto. A 10.3 está no PR para a `integracao`.

## 3. Próximas atividades, em ordem
| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| 1 | **10.4** edição integral e inserção manual (súmula, norma pequena) | **Opus** | Nuvem, sem rede |
| 2 | **11.7** corrigir texto de norma publicada gera versão nova | **Opus** | Nuvem, sem rede |
| 3 | `/code-review` das etapas 8, 9 e 11 | **Opus** | Nuvem, sem rede |
| 4 | Etapa 13 e portão da F2 | Sonnet alto (portão: Opus) | Nuvem; o portão pede 2 semanas de uso seu |
| 5 | F3 e F4 (Hoje/Plano; sincronização) | **Opus** | Nuvem; a F4 pede o Supabase |
| 6 | 12.2, 12.3 e 6b | Sonnet médio | **Esperam você, com rede** (publicar o Worker) |
| 7 | Lotes com rede: SV 30, 3b/3d e as 63 normas a converter | Sonnet médio | **Precisam de rede** (você ou ambiente com acesso) |

## 4. Pendências suas
- Decidir as **14 teses com número repetido**.
- Publicar o Worker (12.2) e rodar os lotes com rede (item 7 acima).
- Dizer se o sumário da importação deve passar a refletir a edição (hoje mostra a estrutura da fonte; ver `solucao-de-problemas.md`).
- Capturas "antes/depois" do redesign (6.4 a 6.7) ainda não geradas.

## 5. Como integrar no `main` e quando fazer backup
- O Claude mergeia cada atividade na `integracao` (merge commit). **O merge da `integracao` no `main` é só seu, uma vez por dia**, com o CI verde.
- **Backup do app (Conta › Dados) antes de mergear no `main` só quando o esquema sobe.** A 10.2 e a 10.3 **não** subiram o esquema: não precisa de backup por causa delas. A última subida foi a v5 (acervo e releitura); se esse merge ainda não foi para o `main`, faça o backup antes e recarregue as abas abertas depois.
