# Tarefa: T5 Portão da F4-A (documento), roteiro da fumaça e varredura de docs
Atividade: F4-A, A8 (parte documento) e passagem de bastão · Nível de risco: **C** (só docs) · Construtor: OpenCode (conta `opencode`) · Revisor: coordenador (Claude)
Branch: `claude/f4a-t5-portao-docs` · Base: `integracao` com T2 e T3 mesclados (pode começar com a T4 em andamento; marque o E2E conforme o estado dela)

## Objetivo
1. **`docs/portoes/F4A.md`** no formato de `docs/portoes/F2.md`: entregas (pacote, PR, SHA), cada critério do portão (`docs/planos/f4a-pacotes.md` › "Critérios do portão da F4-A") ligado ao teste que o mede (arquivo e nome do teste) ou marcado **"não medido"** com quem mede (Gabriel, na fumaça; T6, na revisão). Não declarar o portão fechado: ele fecha com a fumaça do Gabriel e a T6.
2. **Roteiro da fumaça** (seção do `F4A.md` ou `docs/planos/v1-preparo.md` §3 expandido): passo a passo com 2 contas de teste, o que olhar em cada passo e onde anotar; inclui rodar `supabase/verificacao-rls-remota.sql` e `supabase/verificacao-f4a-remota.sql` no projeto real (o Gabriel roda, ou autoriza por escrito a sessão pelo conector) e a consulta "nenhum conteúdo de estudo no servidor".
3. **Varredura (só acréscimo ou correção de estado):** `docs/planos/plano-mestre.md` §9 (linhas da F4-A e da V1) e a linha da F4 na tabela de fases ("não iniciada" → "F4-A em portão"); `docs/planos/f4a-pacotes.md` (coluna ou lista de estado com PR); `docs/planos/v1-preparo.md` §5 conferido contra o código; `docs/proxima-sessao.md` com a passagem de bastão no formato do `CLAUDE.md` (acréscimo no fim; o histórico fica).

## Escopo
Arquivos permitidos: `docs/portoes/F4A.md` (novo), `docs/planos/plano-mestre.md`, `docs/planos/f4a-pacotes.md`, `docs/planos/v1-preparo.md`, `docs/proxima-sessao.md` (só acréscimo no fim e marcação de feito), `docs/glossario.md` por acréscimo.
Não alterar: `src/`, `e2e/`, `supabase/`, `.github/`, `CLAUDE.md`, `AGENTS.md`, `docs/planos/contratos-agentes.md` (protegidos), o bloco do Ponto de luz no topo do `proxima-sessao.md` (thread de UI).

## Critérios de aceite
- [ ] Cada critério do portão aparece com teste citado (caminho que existe; conferir com `git grep`) ou "não medido" + quem mede.
- [ ] Toda afirmação de "feito" cita PR e SHA conferidos com `git log origin/integracao`.
- [ ] Nenhum `[A DEFINIR PELO GABRIEL]` preenchido; nenhuma decisão do Gabriel tomada no texto.
- [ ] Fila e decisões batem com [`../f4a-fila-2026-10-18.md`](../f4a-fila-2026-10-18.md) (ou registram a divergência).

## Verificação
`npm run format:check` e `npm run lint`. Evidência: lista dos testes citados com `git grep -l` de cada um.

## Pare e pergunte se
- um critério do portão não tiver como ser medido nem por teste nem pela fumaça;
- o estado do código divergir da fila de 18/10 de um jeito que mude a ordem;
- precisar tocar arquivo fora da lista.

## Relatório final
resumo · arquivos · comandos e resultado · riscos · SHA · link do PR
