# Tarefa: ajuste do PR #154 (e2e tablet)

Atividade: destravar o PR #154 · Risco: **C** · Construtor: DeepSeek Harness (`dsh`) · Revisor: CI + coordenador
Branch: `claude/orca-orquestracao` (o do PR; este é o único agente que escreve nele) · Base do PR: `integracao`

## Contexto
O PR #154 só acrescenta documentos, hooks, um workflow e `CLAUDE.md`. Mesmo assim o job `e2e (tablet)` falhou **2 de 2** no mesmo teste, com 111 de 112 passando:
`e2e/leitor.spec.ts:487` — "mudar o tamanho do texto fora da norma não perde a posição, e a procedência da versão fica à vista: LEP compilada (13.5)". Erro: `Timeout 15000ms exceeded while waiting on the predicate` no `expect.poll` de `distanciaDoAlto(art41)` (linhas ~523–525). Execução: `gh run view 38756623565 --job 116499902771 --log-failed`. Os últimos 4 CIs da `integracao` passaram. Uma tentativa local com `playwright test --project=tablet e2e/leitor.spec.ts:487` respondeu "No tests found" (a sintaxe `arquivo:linha` não serviu; use `-g` com um trecho do título).

## Objetivo
Descobrir se a falha vem deste branch ou é instabilidade do teste/CI, e deixar o PR verde **sem esconder defeito real**.

## Escopo
Pode editar: `e2e/leitor.spec.ts` (por exemplo, trocar espera frágil por espera por condição), sem enfraquecer o que o teste afirma sobre a posição.
Não alterar: `src/`, `package.json`, `.github/`, `.githooks/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `docs/planos/contratos-agentes.md`.

## Passos
1. Ler `AGENTS.md` e `docs/solucao-de-problemas.md` (seção de testes de tempo; o CI é a referência).
2. Reproduzir localmente, uma vez por vez: `npx playwright test --project=tablet --workers=1 -g "mudar o tamanho do texto fora da norma" --reporter=line`.
3. Se falhar local: ver se também falha em `origin/integracao` (worktree temporária com `git worktree add`, removida no fim). Se falhar só neste branch, a causa está no branch: **pare e relate** (não edite `src/`).
4. Se passar local e o log do CI mostrar espera frágil: estabilizar o teste e rodar 3 vezes seguidas.
5. Push no branch e acompanhar `gh pr checks 154`.

## Aceite
- [ ] Causa explicada com evidência (comando e saída relevante).
- [ ] `e2e (tablet)` verde no CI do PR, ou relatório dizendo por que não dá para fechar sem alterar `src/`.
- [ ] Nenhum arquivo fora do escopo alterado (`git diff --stat origin/integracao...HEAD` confere).

## Máquina (6 GB de RAM)
Não rode `npm run check` nem o vitest inteiro: estouram a memória. Use `--workers=1` no Playwright. Commits começam com `wip:` (o check completo não roda aqui; o CI do PR é a verificação).

## Pare e pergunte se
Precisar editar `src/`, dependências, CI ou hooks; a causa não for de tempo; a mesma falha repetir duas vezes.

## Relatório final
Resumo · causa · arquivos · comandos e resultado · riscos · SHA · estado do CI do PR.
