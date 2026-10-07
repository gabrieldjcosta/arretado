# Plano do swarm de agentes (T19)

Aprovado pelo Gabriel em 07/10/2026. Andamento: **etapa 1 (travas) feita**; próxima: etapa 2 (camada de agentes).


## Contexto
Hoje o ciclo já é um "agente manual": Gabriel abre sessão → lê `docs/proxima-sessao.md` + `docs/prompt-proxima-sessao.md` → executa atividade do `docs/planos/F2.md` → rotina de pronto → PR → merge do Gabriel. Gargalos:
- Docs de estado viraram históricos enormes (proxima-sessao 80 KB, solucao-de-problemas 207 KB, F2 199 KB) — estouram a meta de ~200 mil tokens só para orientar a sessão.
- Disparo, revisão, verificação e atualização de docs dependem do Gabriel.
- Nenhuma trava técnica (hooks/permissões) impede push no `main`, leitura de arquivo grande ou edição de doc sem backup.

Objetivo: swarm que roda sozinho (Routine diária na nuvem), entrega **um PR por atividade**, para em bloqueio, nunca faz merge, e se aprimora via PR. Decisões do Gabriel: Routine agendada + PR (merge continua dele); docs completos continuam sendo gerados, com backup antes de cada modificação; nova camada enxuta, legível por máquina, para os agentes.

## Arquitetura

### 1. Duas camadas de documentação
- **Camada humana (fonte da verdade, mantida):** `proxima-sessao.md`, `solucao-de-problemas.md`, `planos/F2.md`, `glossario.md` — continuam sendo escritos por extenso.
- **Camada de agentes (`docs/agentes/`, derivada + estado):**
  - `estado.json` — fase, atividade em execução, fila ordenada ("Ordem das férias"), PRs abertos, bloqueios (perguntas ao Gabriel), flags por atividade (`sobeEsquema`, `esforco`, `dependeDoGabriel`). Validado por esquema zod em teste.
  - `atividades/<id>.md` — cartão por atividade: objetivo, critérios, "ler antes" com âncoras exatas (arquivo#seção), fatos relevantes. Formato fixo com frontmatter YAML.
  - `indice-problemas.md` — 1 linha por entrada: sintoma → âncora em `solucao-de-problemas.md`.
  - `indice-glossario.json` — termo → identificador.
- Linguagem: frontmatter YAML + Markdown com cabeçalhos fixos para instruções; JSON com esquema para estado; frases imperativas curtas; âncoras em vez de cópia de conteúdo.
- `scripts/agentes/gerar-indices.mjs` gera os índices a partir dos docs humanos; teste `docs-agentes.test.ts` falha se estiverem dessincronizados (entra no `npm run check` e no CI).
- **Backup antes de modificar:** `scripts/agentes/backup-doc.mjs` grava cópia gzip (zlib do Node) em `docs/_backups/AAAA-MM-DD/<arquivo>-<hora>.md.gz`, retenção das últimas 30 por arquivo; disparado por hook PreToolUse em Edit/Write dos docs grandes e versionado no commit.

### 2. Subagentes (`.claude/agents/*.md`)
| Agente | Papel | Ferramentas |
|---|---|---|
| `pesquisador` | lê só as âncoras do cartão; devolve resumo ≤ 2 mil tokens | só leitura |
| `implementador` | código + testes da atividade, em worktree | edição, Bash restrito |
| `verificador` | `npm run check`, `carga`, E2E; saída em arquivo, devolve só falhas | Bash |
| `revisor` | revisão adversarial: vocabulário obrigatório, sanitização de HTML, local-first, LGPD, regra de camadas, T1–T18 | só leitura |
| `documentador` | atualiza docs humanos (com backup) e regenera camada de agentes; glossário e solução de problemas | edição em `docs/` |
| `curador` | autoaperfeiçoamento (ver §4) | leitura, WebSearch, edição em `.claude/` |

Orquestração na sessão principal pela skill `/proxima` (`.claude/skills/proxima/SKILL.md`): ler `estado.json` → escolher atividade → pesquisador → implementador → verificador (loop até verde, máx. 3 voltas) → revisor → implementador corrige → documentador → commit/PR → assinar PR e dirigir CI até verde. Também `.claude/skills/steward/SKILL.md` (postura de PR do repositório) e `rotina-pronto` (a rotina do F2.md em checklist).

### 3. Segurança (travas técnicas, não só instruções)
- `.claude/settings.json`:
  - deny: `git push * main`, `git push --force*`, `gh pr merge*`, `rm -rf*`, Read de `corpus/normas/*.html`, `*.colado.*`, `*.gabarito.json`, `package-lock.json`.
  - allow: `npm run check|test|lint|typecheck|carga|test:e2e|build`, `git status|diff|log|add|commit|switch`, `node scripts/agentes/*`.
- Hooks:
  - `SessionStart` (skill `session-start-hook`): `npm ci` se preciso + imprime resumo de `estado.json`.
  - `PreToolUse` Bash → `scripts/agentes/guarda-bash.mjs`: bloqueia push no `main`, merge, force-push, `migration` no Supabase, comandos fora do repositório.
  - `PreToolUse` Edit/Write em docs grandes → `backup-doc.mjs`.
- Regras de parada (no `/proxima`): atividade com `sobeEsquema: true` ou `dependeDoGabriel` → não implementa; grava pergunta em `estado.json.bloqueios` e abre PR rascunho só com a pergunta. Orçamento ~200 mil tokens: parar no verde e registrar onde parou. Nunca reabre D1–D24 nem T1–T18; escolha técnica nova vira bloqueio.
- 1 PR de agente aberto por vez: se existe PR do swarm sem merge, a Routine só dirige esse PR (CI, revisões), não começa outra atividade.
- GitHub (Gabriel, no painel): proteção do `main` exigindo CI verde e PR.

### 4. Autoatualização (curador)
Routine semanal separada que: lê entradas novas de `solucao-de-problemas.md` e achados do revisor → propõe ajuste em skills/agentes/`CLAUDE.md`; pesquisa novidades do Claude Code (changelog) relevantes; roda `npm outdated`/`npm audit` e propõe atualização de dependências compatível com T1–T18. Sempre via PR próprio (`claude/curador-*`), nunca direto.

### 5. Routines (`create_trigger`)
- `arretado-proxima`: diária, `CRON_TZ=America/Sao_Paulo`, ~05h47, sessão nova por disparo, prompt `/proxima`, push no celular.
- `arretado-curador`: semanal (domingo), prompt do curador.
- Gabriel pode disparar sob demanda (`fire_trigger`) ou abrir sessão com `/proxima`.

### 6. Escolha automática de modelo e esforço (economia no plano Pro)
O que dá e o que não dá:
- **Dá:** cada subagente tem `model` e `effort` próprios no frontmatter (`.claude/agents/*.md`), e o orquestrador pode sobrescrever por chamada (Agent tool `model`/`effort`) quando uma skill manda — então a skill `/proxima` pode decidir por tarefa.
- **Dá:** a Routine pode abrir a sessão com modelo escolhido (`create_trigger`/`create_session` aceitam `model`).
- **Não dá:** a sessão principal trocar o próprio modelo no meio (só `/model` pelo Gabriel). Por isso a sessão principal é barata e delega o pesado.
- "ultracode" = workflow com dezenas de agentes em Opus: era a causa do gasto; o swarm nunca usa isso por padrão.

Regra de roteamento (na skill `/proxima`, aplicada à ficha da atividade):
| Trabalho | Modelo · esforço |
|---|---|
| Orquestrador (sessão da Routine) | Sonnet 5.5 · médio |
| `pesquisador`, `verificador` (grep, rodar check, filtrar saída), regenerar índices | Haiku 4.5 · baixo |
| `implementador` em ficha P, tela, texto, testes, docs humanos | Sonnet 5.5 · médio |
| `implementador` em ficha M/G, domínio central (estruturador, publicação, banco/esquema, sanitizador) | Opus 5.5 · médio |
| `revisor` | Opus 5.5 · médio (alto se a ficha tocar segurança/LGPD/esquema) |
| Planejar etapa nova, diagnóstico após 2 voltas falhas | Opus 5.5 · alto (escalonamento, nunca padrão) |

- **Escalonamento:** começa no nível da tabela; 2 voltas do verificador sem verde → sobe um degrau (Haiku→Sonnet→Opus médio→Opus alto) e registra o motivo em `estado.json.historico`.
- Ficha tem campos `modelo`/`esforco` calculados pelo gerador a partir de `esforco` + `tags` (`dominio-central`, `seguranca`, `esquema`); Gabriel pode fixar à mão.
- `curador` mede: tokens e voltas por atividade (do `historico`) → propõe ajustar a tabela via PR.
- Para sessões manuais: `/model opusplan` (Opus no plano, Sonnet na execução) ou Sonnet médio por padrão; Opus alto só para decisão de arquitetura.

## Arquivos a criar/alterar
- `.claude/settings.json`, `.claude/agents/{pesquisador,implementador,verificador,revisor,documentador,curador}.md`
- `.claude/skills/{proxima,rotina-pronto,steward}/SKILL.md`
- `scripts/agentes/{gerar-indices,backup-doc,guarda-bash,estado}.mjs` (Node, sem Python)
- `docs/agentes/{estado.json,indice-problemas.md,indice-glossario.json,atividades/*.md,LEIA.md}`
- `src/…` ou `scripts/agentes/docs-agentes.test.ts` (esquema zod de `estado.json` + sincronia) — reaproveita `zod` já dependência
- `.github/workflows/ci.yml`: nada novo além do teste (já roda `npm run check`)
- `docs/decisoes-tecnicas.md`: **T19 — desenvolvimento por swarm de agentes** (decisão a registrar)
- `docs/glossario.md`: Swarm, Orquestrador, Cartão de atividade (atenção: "Cartão" já é vocabulário do produto → usar "Ficha de atividade"), Bloqueio
- `CLAUDE.md`: apontar para `docs/agentes/LEIA.md` e `/proxima`; leitura sempre passa a ser `estado.json` + ficha, não `proxima-sessao.md` inteiro
- `.gitignore`: nada (backups são versionados)

## Ordem de execução (uma sessão cada, PR cada)
1. Travas: `settings.json`, hooks, `guarda-bash`, `backup-doc` + testes dos scripts.
2. Camada de agentes: `estado.json` + esquema, gerador de índices, fichas das atividades restantes da F2 (11.3, 11.5, 11.8, 11.9, 10.x, 11.7, 13), teste de sincronia.
3. Subagentes + skills `/proxima`, `rotina-pronto`, `steward`; T19 e glossário.
4. Ensaio: `/proxima` manual na 11.3 com o Gabriel acompanhando; ajustar.
5. Routines diária e semanal; aviso para proteção do `main`.

## Verificação
- `npm run check` verde, incluindo testes de `guarda-bash` (push no main bloqueado, push em `claude/*` liberado), `backup-doc` (gera .gz e respeita retenção) e sincronia da camada de agentes.
- Teste do hook: tentar `git push origin main` numa sessão → bloqueado; editar `solucao-de-problemas.md` → backup criado.
- Ensaio da etapa 4: sessão termina com PR da 11.3, CI verde, `estado.json` atualizado, contexto < 200 mil tokens.
- `fire_trigger` da Routine uma vez antes de deixar no agendamento; conferir sessão criada e PR.

## Suposições
- Backups versionados em `docs/_backups/` (comprimidos, retenção 30) — container é efêmero, então backup fora do git se perderia.
- "Ficha de atividade" em vez de "cartão" para não colidir com o vocabulário do produto.
- Merge e subida de esquema continuam exclusivos do Gabriel.
