# Estratégia de desenvolvimento (05/11/2026)

Regras para o trabalho render mais por token e por hora, sem afrouxar segurança. Aprovadas pelo Gabriel em 05/11/2026 (pacote R1 a R10, com o cuidado dele no R8). A proposta e as medições ficam no arquivo do projeto `estrategia/estrategia-de-desenvolvimento-2026-11-05.md`. Branches e merge: [`fluxo-diario.md`](fluxo-diario.md). Contratos: [`contratos-agentes.md`](contratos-agentes.md).

## Por que (o que se mediu de 03 a 05/11)

- 57 PRs mesclados e 38 merges de manutenção (a integracao trazida para dentro de um branch), dois a cada três PRs.
- 30 desses 38 tinham conflito de texto do jeito que o GitHub vê (27 mesmo com o `merge=union` local), medido com `git merge-tree` em cada um. Os conflitos ficam em `desvios.md` (12), `glossario.md` (10), `decisoes-design.md` (10), `ajustes.css` (6) e `solucao-de-problemas.md` (6). Os outros 8 eram preventivos: o GitHub não exige branch atualizado (o #436 estava atrás da base e com estado `clean`).
- **Em 05/11/2026, `main` e `integracao` estavam sem proteção nem conjunto de regras** (`gh api .../branches/integracao`: `protected: false`; `/rules/branches/integracao`: vazio), ao contrário do que diz `contratos-agentes.md` §8. O CI e o `guarda` só valiam pela disciplina da Fila, e o auto-merge era recusado ("Protected branch rules not configured"). Passo a passo para o Gabriel ligar o conjunto de regras: guia de orientações do projeto, item 14.
- 17 commits só para renumerar desvios; uma revisão da Marca feita sobre um SHA velho (#424).
- Os hooks do `.claude/settings.json` (guarda, check antes do commit, backup) **não são garantidos nas threads da nuvem**: em 05/11 não rodaram na thread desta mudança (um `Read` inteiro do `package-lock.json` e um `git reset --hard origin/main` dentro de heredoc passaram), embora tenham rodado numa sessão da nuvem em 20/10. Os portões que sempre valem são os do GitHub (proteção de branch, `verificar`, `e2e`, `guarda`). O plugin claude-mem nem chegava a instalar (saiu na mesma mudança).

## As regras

**R1. Entrada de log em arquivo próprio.** Entrada nova de `docs/design/desvios.md`, `docs/design/decisoes-design.md`, `docs/glossario.md` ou `docs/solucao-de-problemas.md` vai num arquivo em `docs/entradas/<destino>/AAAA-MM-DD-<nome>.md` (ver o [README](../entradas/README.md)), nunca no fim do registro. Corrigir uma entrada antiga continua sendo no registro. Quem leva a integracao ao main roda `npm run entradas:consolidar` uma vez por dia, num PR próprio.

**R2. Desvio numerado pelo PR.** O desvio novo se chama pelo número do PR que o traz: "desvio 440"; o segundo do mesmo PR, "desvio 440b". Abra o PR rascunho cedo para ter o número. Os desvios 1 a 49 ficam como estão. Nada de "próximo desvio livre" na memória.

**R3. Revisão vale para um SHA.** O revisor (Marca ou outro) escreve o SHA que viu: "aprovado em `abc1234`". Antes de mesclar PR de tela, a Fila roda `npm run revisao:cobre -- abc1234 origin/<branch>`: se mudou tela depois, volta para a revisão; se só mudou teste, doc ou lógica, segue.

**R4. Atualizar o branch só com conflito.** Trazer a integracao para o branch só quando o GitHub mostra conflito (`mergeable_state: dirty`), ou quando o PR depende de algo que acabou de entrar. Sem merge preventivo. Depois de um merge sem conflito em código, não rode o check local de novo: o CI roda.
Continuar no mesmo branch depois do merge do PR: `git fetch origin integracao && git merge --ff-only origin/integracao` (avanço simples, sem force push) e abrir PR novo. Ter "um branch só" não obriga a esperar o PR mesclar. Tarefa que não depende do PR aberto vai para outra thread na hora.

**R5. Uma tarefa por arquivo quente.** Arquivos quentes (onde dois PRs colidem): `src/apresentacao/fio/mockup/ajustes.css`, `Leitor.tsx`, `fio-base.css`, `AgoraDoFio.tsx` e os quatro registros do R1 (estes deixam de ser quentes com as entradas). O coordenador não abre duas threads que mexem no mesmo arquivo quente ao mesmo tempo; fatias do mesmo programa que tocam os mesmos arquivos vão em série, na mesma thread. O limite de 2 tarefas de código continua, e tela também conta para o arquivo quente.

**R6. Auto-merge ao ficar pronto; a Fila só na exceção.** O dono liga o auto-merge quando tira o PR do rascunho. PR de tela fica em rascunho até a revisão aprovar um SHA (o GitHub não deixa rascunho mesclar). Mensagem à Fila só para: segurar, ordenar PRs que tocam o mesmo arquivo, aplicar `aprovado-gabriel`, ou PR de tela com commit depois da revisão.

**R7. Modelo e esforço pela tarefa** (o coordenador escolhe ao abrir a thread):

| Tarefa | Modelo e esforço |
|---|---|
| Repasse, radar, conferir, renomear, consolidar entradas | Sonnet baixo |
| Código comum, tela | Sonnet médio |
| Revisão da Marca (folhas lado a lado) | Sonnet médio, com a lista fixa da skill `design-fidelity` |
| Risco alto (migração, sincronização, sanitização, auth), 11.7, 10.4, F3/F4, regras do fluxo | Opus alto, revisão independente em outra sessão |
| `/code-review` | médio; `max` só a pedido do Gabriel |

**R8. Memória curta, busca obrigatória.** O índice da memória do projeto tem uma linha por assunto, com palavras-chave (área, arquivos quentes, números de PR) e o link; o detalhe e as micro-lições ficam nos arquivos, sem corte. Para nenhuma lição de outra thread se perder, **antes de editar um arquivo que outra thread já mexeu**, rode:

    npm run licoes -- <arquivo> [<arquivo> ...]

Ele procura o nome do arquivo em `solucao-de-problemas.md`, `desvios.md`, `decisoes-design.md`, `docs/entradas/`, `.claude/rules/`, na memória do projeto (quando a sessão a tem) e nos últimos commits, e imprime só o título de cada seção que o cita. Leia as seções que importam. Sem argumento, ele olha os arquivos que o branch muda: rode de novo antes de tirar do rascunho. O briefing de cada thread nomeia os arquivos quentes da tarefa e manda rodar o comando.

**R9. Check uma vez, no fim.** Durante o trabalho, `wip:` salva sem check. O `npm run check` roda uma vez antes de tirar do rascunho (e de novo só se mudou código depois). Nas threads da nuvem, rode à mão: o hook pode não rodar.

**R10. Permissões.** Ficam: `aprovado-gabriel` nos caminhos protegidos, `main` só pelo caminho do fluxo diário, backup antes do main, sem force push, sem merge com CI vermelho. Não se acrescenta lista de permissões: as threads da nuvem já rodam sem pedir confirmação de comando, e o Orca tem a sua (`contratos-agentes.md` §7).

## Como medir (de novo em 12/11/2026)

Os mesmos números, de 06 a 12/11: merges de manutenção por PR mesclado (era 0,67), quantos com conflito e em que arquivo (`node scripts/medir-merges.mjs 2026-11-06`), commits de renumeração (eram 17), revisões sobre SHA velho (era 1) e o tamanho do índice da memória (era 12,7 KB).
