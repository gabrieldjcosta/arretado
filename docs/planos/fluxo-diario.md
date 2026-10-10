# Fluxo diário (10/10/2026)

Objetivo: o Claude trabalha o dia todo sem pedir autorização a cada passo; o Gabriel valida uma vez, no fim do dia, sem perder o dia inteiro por causa de uma atividade ruim.

## Ramos
- `main`: só o Gabriel faz merge nele, uma vez por dia.
- `integracao`: recebe cada atividade pronta. Criar na primeira vez a partir do `origin/main`. Depois do merge diário no `main`, trazer o `main` de volta para a `integracao` (merge, nunca force push).
- `claude/<atividade>`: um branch e um PR por atividade, com base na `integracao`.

## Durante o dia (Claude)
1. Início da sessão: o hook cria a branch `backup/AAAA-MM-DD` no `origin/main` (uma vez por dia).
2. Atividade: branch a partir da `integracao`; se depende de outra ainda não mergeada, a partir do branch dela.
3. Commit só passa se `npm run check` estiver verde (hook `check-antes-do-commit`); o hook de parada barra encerrar com alteração pendente e check vermelho.
4. Push, PR para a `integracao`, CI verde (`verificar` e os três `e2e`), merge com "Create a merge commit". Cada atividade vira **um** merge commit na `integracao`.
5. Atualizar `docs/proxima-sessao.md` no próprio branch da atividade.

## Interrupção por limite de uso e retomada
- O contêiner some junto com o trabalho não enviado: ao perceber que o limite de uso se aproxima, ou a cada bloco de trabalho concluído, o Claude faz `git commit -m "wip: <atividade>"` e push no branch da atividade (o commit `wip:` pula o check; o merge na `integracao` continua exigindo check verde e CI verde).
- Rotina "Retomar Arretado" (a cada hora, das 7h às 22h de Brasília, sessão nova): se nenhuma sessão de atividade estiver ativa, lê `docs/proxima-sessao.md` e os branches `claude/*` com commit `wip:` ou PR aberto, e continua a atividade parada; se não houver, começa a próxima do plano. Para quando a próxima exige modelo acima do Sonnet médio (tabela do `CLAUDE.md`) e avisa.
- Sessões de atividade levam a tag `arretado-atividade` (evita duas sessões na mesma atividade).

## Fim do dia (Gabriel)
1. `npm run fim-do-dia`: lista os merges da `integracao` ainda fora do `main`.
2. Validar no app (checklist de cada atividade em "Pronto quando").
3. Uma atividade errada? Na `integracao`: `git revert -m 1 <sha do merge>`. As demais seguem. Se outra dependia da revertida, ela é revertida junto (o Claude avisa no PR quais dependem de quais).
4. PR `integracao` → `main`, merge por "Create a merge commit".
5. Desastre: restaurar o `main` a partir da branch `backup/AAAA-MM-DD` do dia.

## Garantias por hook (`.claude/settings.json`)
| Hook | O que garante |
|---|---|
| SessionStart `backup-diario` | branch de backup diária (só código; dados de estudo seguem o backup do app) |
| PreToolUse `guarda` | sem push no main, sem force push em main/integracao, sem leitura inteira de arquivo grande |
| PreToolUse `check-antes-do-commit` | commit só com check verde |
| Stop `parada` | não encerra com check vermelho |

## "Pronto quando" por atividade
Cada atividade do plano termina com um bloco objetivo (passa ou falha): comandos que precisam ficar verdes e comportamento verificável no app. Serve de critério para o `/goal`. Modelo:

    Pronto quando:
    - npm run check verde
    - npx playwright test <spec da atividade> verde nos 3 aparelhos
    - <comportamento visível em uma frase, que o Gabriel confere no app>
