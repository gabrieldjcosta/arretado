# Orquestração multiagente no Orca — desenho (15/10/2026)

## Objetivo
Gastar token Claude só em planejar, revisar e ordenar PRs; executar o resto nas outras assinaturas do Gabriel (Antigravity ×2, Gemini ×2, DeepSeek Harness, Hermes com API do Claude, OpenCode Zen) sob contratos e portões que valem para qualquer agente. Sucesso: uma atividade do plano vira um PR verde na `integracao` sem que o Gabriel precise supervisionar o agente, e nenhuma violação de escopo chega ao `main`.

## Decisões do Gabriel (15/10/2026)
- Claude Code coordena e não implementa. Hermes entra como ferramenta de trabalho completa (eficácia sobre economia). Sem Linear: o backlog segue em `plano-mestre.md` e `proxima-sessao.md`.
- Windows/PowerShell, um checkout. Despachante horário e rotinas que gastam token: suspensos.
- Portões de qualidade e segurança no padrão mais seguro.
- Implantação no mesmo dia (15/10/2026).

## Problema de segurança descoberto na exploração
1. O repositório está **público** (`private: false`), embora o `CLAUDE.md` diga "remoto privado". Nenhum segredo óbvio encontrado em `git grep`; `.env` ignorado. Decisão de visibilidade é do Gabriel.
2. `main` e `integracao` **não tinham proteção** (sem regra clássica nem ruleset) e o auto-merge do repositório estava desligado, ao contrário do que `fluxo-diario.md` supunha. A "exigência de CI verde" existia só no texto.
3. Os hooks de `.claude/` só barram o Claude Code; os outros agentes não passavam por nenhum portão local.

## Arquitetura de portões (defesa em camadas)
1. **Local, todos os agentes:** `.githooks` (`core.hooksPath`): sem commit em `main`/`integracao`, `npm run check` no commit (exceto `wip:`), sem push no `main`, force push ou exclusão.
2. **Claude Code:** `.claude/hooks` (já existiam).
3. **GitHub:** proteção de `main` e `integracao` (PR, `verificar` + `e2e` ×3 + `guarda`, sem force/exclusão, inclusive para administradores) e workflow `guarda-pr.yml` em `pull_request_target`: PR para `main` só da `integracao`; caminhos protegidos exigem o rótulo `aprovado-gabriel`.
4. **Orca:** permissões em modo Manual nas duas primeiras semanas.

## Fora de escopo agora
Linear; contas duplicadas em paralelo (teste na semana 2); Hermes aninhando subagentes dentro de Runs; modo autônomo global.

## Riscos e limites
- Agentes que usam o token do Gabriel podem aplicar o rótulo `aprovado-gabriel`: mitigado só por contrato e por revisão; uma conta de máquina separada para os agentes é o passo seguinte.
- Os hooks locais dependem de `npm run hooks:instalar` em cada clone; a camada do GitHub cobre o esquecimento.
- Fatos sobre o Orca (flags da CLI, contas múltiplas) vêm do plano do Perplexity e da documentação pública e não foram executados.
