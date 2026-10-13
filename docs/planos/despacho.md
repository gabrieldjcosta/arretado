# Despacho Arretado

Instruções da rotina "Despacho Arretado (sessão nova por disparo)" (trig_01HBpo7vCg5RCLZutuhxC4qe). A rotina só aponta para este arquivo; edite aqui, não no prompt da rotina.

Você só despacha; não implementa. REGRA DE OURO: uma atividade por sessão filha.

## Decisões permanentes do Gabriel (11/10/2026)

- Correções pequenas e óbvias (formatação com prettier, lint, typo, doc desatualizada) podem ser feitas sem perguntar, só avisando no resumo final.
- A regra para documentos sem artigos (PNAS, SINASE, Orientações Técnicas, Tipificação; Tarefa 14 do plano do acervo) está APROVADA.
- A proposta da fatia 6 do redesign está aprovada e feita no que já foi mergeado.

## Passos

0. Se o horário atual em Brasília estiver fora de 07:00–22:59, responda "fora do horário" e pare.
1. Atualize o repositório: `git fetch origin; git checkout main; git pull --ff-only`.
2. `list_sessions`: se existir sessão com tag `arretado-atividade` e status working ou blocked, responda "atividade em andamento" e pare — EXCETO se o branch dela (`external_metadata.current_branches`) já estiver mergeado na origin/integracao (`git branch -r --merged origin/integracao`) e não houver PR aberto dele: nesse caso ela já terminou e deve ser ignorada.
3. Leia CLAUDE.md, docs/planos/fluxo-diario.md, docs/planos/plano-mestre.md, docs/proxima-sessao.md (do branch integracao: `git show origin/integracao:docs/proxima-sessao.md`) e docs/planos/proximos-passos.md.
4. Descubra a atividade: (a) parada, isto é, branch origin/claude/* com commit "wip:" não mergeado na integracao, ou PR aberto para a integracao (sem sessão ativa); senão (b) a próxima atividade de proximos-passos.md. Se não houver atividade pendente, responda "nada pendente" e pare. VERIFIQUE com `list_sessions` que a atividade não foi realmente despachada (sessões filhas às vezes afirmam ter despachado sem criar a sessão).
5. Escolha o modelo da filha pela tabela de CLAUDE.md: 11.7, 10.4, planejamento e execução da F3/F4 e /code-review das etapas 8, 9 e 11 => claude-opus-5-5; as demais => claude-sonnet-5-5 (11.9, 13.1 e 12.2 pedem esforço alto: diga isso no prompt da filha). Atividade que só roda com rede (lotes de súmulas/teses/3b/3d, 12.2, 12.3, 6b) não se despacha em nuvem: pule-a e avise.
6. `create_session` com source_url https://github.com/gabrieldjcosta/arretado, source_revision integracao (ou o branch retomado), model escolhido, tags ["arretado-atividade"], title "Arretado: <atividade>" e prompt:

   > Projeto Arretado. Execute UMA atividade: <atividade e, se retomada, o branch>. Leia CLAUDE.md, docs/planos/plano-mestre.md, docs/planos/fluxo-diario.md e docs/proxima-sessao.md. Siga o fluxo diário: critério Pronto quando, npm run check verde, commits wip: a cada bloco com push, PR para a branch integracao (nunca main), merge com Create a merge commit quando o CI estiver verde. Nunca mergear na main nem force push. Correções pequenas e óbvias (prettier, lint, typo) você faz sem perguntar e avisa no resumo. Ao concluir, atualize docs/proxima-sessao.md e docs/planos/proximos-passos.md e responda em até 3 linhas. Não inicie a atividade seguinte. ÚLTIMA AÇÃO, só depois do PR mergeado na integracao: chame fire_trigger no trigger trig_01HBpo7vCg5RCLZutuhxC4qe (Despacho Arretado, sessão nova por disparo) para o despachante lançar a próxima atividade já; se a ferramenta não existir ou falhar, só termine.

7. Responda em uma linha: qual atividade, qual modelo, id da sessão filha.
