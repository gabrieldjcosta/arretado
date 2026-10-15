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
4. Push, PR para a `integracao` e **auto-merge** ligado no PR (método "Create a merge commit"): a regra de proteção da `integracao` exige `verificar` e os três `e2e` verdes, então o GitHub mergeia sozinho quando passarem. Se o auto-merge for recusado, esperar o CI e mergear à mão. Cada atividade vira **um** merge commit na `integracao`. Auto-merge nunca em PR para o `main`.
5. Atualizar `docs/proxima-sessao.md` no próprio branch da atividade.

## Interrupção por limite de uso e retomada
- O contêiner some junto com o trabalho não enviado: ao perceber que o limite de uso se aproxima, ou a cada bloco de trabalho concluído, o Claude faz `git commit -m "wip: <atividade>"` e push no branch da atividade (o commit `wip:` pula o check; o merge na `integracao` continua exigindo check verde e CI verde).
- **Despachante horário extinto em 15/10/2026** (gastava token Claude à toa). Rotinas Despacho, Verificação diária e Checagem semanal estão suspensas (reativáveis na tela de rotinas). Quem despacha agora é o Orca, por demanda, sob os contratos de `contratos-agentes.md`. Segue ativa só a rotina **Backup** (05:53): cria o branch `backup/AAAA-MM-DD` a partir do `main`.
- Retomada após limite de uso: o coordenador lê o commit `wip:` ou o PR aberto e despacha de novo, para o mesmo agente ou outro (a regra "um agente por branch" vale).
- Portões: valem para todos os agentes (hooks em `.githooks`, proteção de branch e job `guarda` no GitHub). Ver `contratos-agentes.md` §8.

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
