# Próxima sessão — ponto de partida

Atualizado em 15/11/2026. Ler antes de qualquer trabalho, junto com o `CLAUDE.md`. Ordem e decisões abertas: [`planos/plano-mestre.md`](planos/plano-mestre.md) §9 e §10 (fonte única). Problemas conhecidos: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário: [`glossario.md`](glossario.md). Todo o histórico de passagens de bastão e dos blocos de estado até 15/11/2026 (D-D7, D-D9, D-D10, F4-A, F4-B, Boas-vindas etc.): [`planos/arquivo/proxima-sessao-ate-2026-11-15.md`](planos/arquivo/proxima-sessao-ate-2026-11-15.md). Antes disso: [`planos/arquivo/proxima-sessao-ate-2026-10-13.md`](planos/arquivo/proxima-sessao-ate-2026-10-13.md).

## Estado

- **O Fio é a única casca (14 e 15/11/2026).** Agora, Destino e Varal; o app abre no Agora. A interface de antes (Hoje, abas, Abertura, Entrada do Dia, quadro do cacto, chave "Arretado novo") saiu e não volta (Gabriel, 14/11). Trilha, Fixar, Biblioteca, Conta, Sessão e Leitor são telas dentro da casca (`CascaLegada`), sem aba; a porta da Trilha é a folha da Conta (grupo "Prova") e a busca. Os avisos do Hoje viraram a linha de retorno do Agora. Leitor: "Voltar" à origem, folha "Aa", foco na frase, sumário em folha. #476 e #477 estão na `integracao` (15/11).
- **Fases:** F0, F1, F2 (portão fechado em 13/10) e F4-A/F4-B implementadas; F3 absorvida pelo Fio. Esquema v6.
- **Sessão de questões (Acertei e Errei)** fica só pela Trilha por ora (Gabriel, 15/11); volta a decidir quando o Praticar do Fio cobrir o mesmo uso.
- **Supabase `arretado` pausado (15/11, ~16:22Z):** login, sincronização e exclusão de conta fora até restaurar o projeto; o estudo local segue normal.
- **Apps baixáveis:** Fase 0 feita (#441, "Instalar no aparelho" só na Conta antiga). Próxima: Fase 1, casca Android (Capacitor), para o Galaxy A56 e o Tab S10 FE. Plano: `/mnt/project-files/planos-apps/plano-apps-windows-android-ios-2026-11-05.md`.
- **`main`:** a `integracao` entra no `main` só pelo Gabriel, uma vez por dia.

## Próxima atividade

Ordem em [`planos/plano-mestre.md`](planos/plano-mestre.md) §9. Em curso desde 15/11, em threads separadas: religar o Supabase, limpar o código sem uso do Hoje (`apresentacao/hoje/`, `entrada/regras.ts`, `fecharDia`, `Caneta`, `scripts/capturas-ze.mjs`), corrigir `CLAUDE.md` e a skill `arretado-design-principles` (ainda citam as quatro áreas; PR próprio com `aprovado-gabriel`) e a casca Android.

## Pendências do Gabriel

Decisões: plano-mestre §10. Ações: restaurar o Supabase (se ninguém o fez); backup (Conta › Dados › Exportar) antes do merge da `integracao` no `main` quando o esquema mudar; merge diário da `integracao` no `main`.

## Como abrir a próxima sessão

Sessão nova por atividade (`/proxima`): branch a partir da `integracao`, `npm run check` verde, commits `wip:` com push a cada bloco, PR para a `integracao` (merge commit). Fluxo em [`planos/fluxo-diario.md`](planos/fluxo-diario.md); regras de branch e revisão em [`planos/estrategia-de-desenvolvimento.md`](planos/estrategia-de-desenvolvimento.md). Antes de editar arquivo que outra thread mexeu: `npm run licoes -- <arquivo>`. Meta: até ~200 mil tokens por sessão; nunca abrir inteiros `corpus/normas/*.html`, `package-lock.json` nem relatórios do Playwright.

## Passagem de bastão

Formato no `CLAUDE.md`; registrar aqui só a passagem aberta, e arquivar as fechadas em `planos/arquivo/`. Nenhuma aberta agora.
