# Aprimoramentos das revisões de 14/10/2026 — plano consolidado

Fontes: avaliação de design de produto (`docs/design/avaliacao-critica-produto.md`, PR #125) e revisão de arquitetura (`docs/revisoes/arquitetura-2026-10-14.md`, PR #126, que já entrega `LimiteDeErro`, lazy por rota, `navigator.storage.persist` e os contratos `useUltimoBackup`/`useEstadoDeArmazenamento`). Identidade visual D-D2 já aplicada (#120, #123). Este documento é a ordem de execução; os detalhes de cada achado ficam nas fontes.

## Regras de convivência
- Dona da camada visual (`estilos.css`, tokens, `Shell.tsx`, `AcaoAgora.tsx`, `Aparencia.tsx`): thread "Ajuste de UI do Arretado". Aqui só lógica, texto, testes e build.
- F3-B (B2 onboarding, B3 pontos, B4 tarefas) em paralelo: dono de `plano/`, `dominios/catalogo|pontos|tarefas`. Este plano não toca nessas pastas. Os §7 da avaliação de design são requisitos de desenho para B2–B4.
- Máx. 2 tarefas de código ao mesmo tempo; `npm run check` verde antes de cada PR; PR para `integracao`, rascunho, sem squash.

## Ordem

| # | Item (id da fonte) | Dono | Estado |
|---|---|---|---|
| 1 | Persistência, `LimiteDeErro`, lazy por rota (arq. 1–3) | #126 | feito, aguarda merge |
| 2 | Este plano | aqui | este PR |
| 3 | E2E do Leitor estável: `expect.poll` no lugar de `scrollY` imediato (arq. 8) | aqui | feito (PR #128) |
| 4 | Build: `manualChunks` (dexie/zod/react), teto de tamanho no CI (arq. 3) | aqui | feito (PR #128) |
| 5 | Texto: A-2 ("Definir até onde"), R-6 (instrução do Drill só na 1ª vez), N-8 (atalho E em Orientações) | aqui | feito (PR #128); N-8 já existia em Orientações |
| 6 | A-1 "Começar" direto ao alvo (4 → 2 toques) e unificar `RecallInicio` com `hoje/proxima-acao.ts` | aqui | "Começar" direto feito (PR #128); unificar `RecallInicio` com `proxima-acao` pendente |
| 7 | Lembrete de backup: linha única no Hoje após N dias, dispensável 7 dias (lógica e hook aqui; lugar e visual com a UI) | aqui + UI | depois do #126 |
| 8 | N-1/N-2, N-3, N-6, A-3, A-4, R-2, R-7, T-1, T-3, "Fechar o Dia" abaixo do Agora, indicador de último backup em Conta › Dados | UI | proposto à UI |
| 9 | L-1 barra do Leitor (Lido até aqui primário; Buscar+Filtrar; Ações em "⋯") | PR dedicado, junto da UI | depois; avisar antes |
| 10 | Dividir `Leitor.tsx` em hooks (arq. 7) | PR dedicado, sem feature | entre pacotes |
| 11 | A-6 (texto de roadmap no Plano) | B3 | F3-B troca |
| 12 | F4-A/B (não agora): CSP com domínio Supabase/IA (arq. 9), checkpoint e poda do log (arq. 4), `check` de coleção por FK (arq. 5), Worker com JWT/limite (arq. 10), backup automático antes de subida de esquema | F4 | registrado |

## Mudança de divisão (14/10, Gabriel)
- Thread de arquitetura implementa dados/infra: log de alterações, CSP, camada de dados do backup, decisão Dexie. Itens 7 (lógica do lembrete) e 12 passam a ela; o E2E e o build já estão no #128.
- Thread de UI: #127 (ajustes visuais), tela Conta › Dados "último backup" (depois do #126), transições (fatia própria).
- Esta thread: plano, fluxo (A-1 feito; R-3, R-4, N-5 quando o Gabriel decidir) e copy pelo guia de voz (`docs/design/guia-de-voz.md`, #125; voz regional aprovada: neutra, sotaque só em momentos leves, ex. "danado" na recompensa).
- Ordem de merge: #125 → #124 → #126 → #127 → fatia 2 da UI → #128 → F3-B.

## Decisões abertas do Gabriel (seguindo o padrão)
- Um banco Dexie por conta × um banco com `usuarioId`: padrão = recomendação da revisão (um banco por `usuarioId`); nada implementado agora.
- Voz regional na cópia: rótulos neutros, sotaque só em momentos leves; **sem mudar copy** até aprovação.
- N-5 (rodapé legal curto, muda D6), R-3 (vocabulário Errei/Difícil/Fácil × Li/De novo), R-4 (uma fila "Revisar"), L-4/L-5 (Importar como "Avançado"): aguardam o Gabriel; não implementados.
