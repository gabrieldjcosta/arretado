# Contratos e operação dos agentes (Orca) — 15/10/2026

Substitui o Despachante horário (extinto em 15/10/2026). Fonte do desenho: `docs/superpowers/specs/2026-10-15-orquestracao-orca-design.md`. Regras curtas para qualquer agente: `AGENTS.md`. Fluxo de branches e merge: `fluxo-diario.md`.

## 1. Papéis
| Papel | Quem | Faz | Não faz |
|---|---|---|---|
| Coordenador | Claude Code (Sonnet 5.5; Opus 5.5 nos casos de escalada) | Lê o plano, escreve contratos, despacha, confere evidência, ordena a fila de PRs, recomenda merge/revisão/descarte | Implementar; aprovar o que ele mesmo escreveu |
| Construtor | Antigravity, Sonnet 5.5, Hermes, OpenCode, DeepSeek (ver §3) | Executa **um** contrato numa worktree própria | Sair do escopo; abrir PR para `main`; criar subagentes |
| Revisor | Agente diferente do construtor | Revisa o diff contra o contrato e o `AGENTS.md`; roda o check | Editar o branch revisado |
| Gabriel | — | Aprova risco alto, aplica o rótulo `aprovado-gabriel`, faz o merge `integracao`→`main` | — |

Escalada do coordenador para Opus 5.5 quando: toca esquema, sync, sanitização, auth, privacidade; mais de 3 subsistemas; critério ambíguo; dois construtores divergem; mesma falha duas vezes; diff final grande. **Hermes** pode ser construtor, revisor ou coordenador reserva (autorização do Gabriel, 15/10/2026: aqui vale eficácia sobre economia); só não aninha subagentes dentro de uma Run do Orca.

## 2. Níveis de risco (definem quem executa e quem revisa)
| Nível | Exemplos | Construtor | Revisão | Merge |
|---|---|---|---|---|
| **A — crítico** | esquema/migração, sync, sanitização, RLS, auth, CI, hooks, dependências, contratos | Claude (Opus planeja, Sonnet/Hermes executa) | outro agente + **Gabriel** | só com `aprovado-gabriel` e backup manual |
| **B — normal** | atividade de fase (F2/F3), UI, lógica de domínio | Antigravity, Sonnet ou Hermes | outro agente (Gemini ou Claude) | auto-merge com CI verde |
| **C — mecânico** | testes, E2E, lint, docs, glossário | OpenCode, DeepSeek, Gemini | CI + olhada no diff | auto-merge com CI verde |

Caminhos protegidos (o CI `guarda` exige `aprovado-gabriel`): `.github/`, `.claude/`, `.githooks/`, `AGENTS.md`, `CLAUDE.md`, este arquivo, `supabase/`, `worker/`, `wrangler.jsonc`, `package.json`, `package-lock.json`, `src/core/seguranca/`, `src/core/persistencia/migracao*`.

## 3. Roteamento
| Tarefa | 1ª escolha | Revisor | Escala quando |
|---|---|---|---|
| Esquema, sync, sanitização, segurança | Opus planeja; Sonnet executa | Hermes ou Gemini + Gabriel | qualquer suposição em aberto |
| Atividade de fase, multiarquivo | Sonnet ou Antigravity | Claude em modo revisão | teste falha 2× ou escopo cresce |
| UI e telas | Antigravity | Gemini (UX/acessibilidade) | muda o sistema de design |
| Mapear código, ler muito arquivo | Gemini (somente leitura) | coordenador confere no código | análise exige edição |
| Testes, fixtures, E2E | OpenCode Zen ou DeepSeek | quem construiu a funcionalidade | muda semântica do produto |
| Docs, glossário | Gemini ou OpenCode | coordenador | afirmação não verificável |
| Limpeza mecânica | OpenCode ou DeepSeek | CI | mais arquivos que o esperado |

## 4. Contas e rótulos no Orca
`claude-primary`, `antigravity-1`, `antigravity-2`, `gemini-1`, `gemini-2`, `opencode-zen`, `deepseek-harness`, `hermes-claude-api`. Regras: no máximo 3 workers por Run; **um worker por conta** ao mesmo tempo; contas de um mesmo provedor só rodam em paralelo depois do teste da semana 2 (medidores de uso conferidos); nunca girar conta só para contornar limite de provedor. Modelos grátis e rotas experimentais (OpenCode grátis, DeepSeek) só em worktree descartável e só com tarefa nível C.

## 5. Contrato de tarefa (modelo)
```markdown
# Tarefa: <título>
Atividade (plano-mestre §9): · Nível de risco: A/B/C · Construtor: · Revisor:
Branch: claude/<atividade> · Base: integracao

## Objetivo
## Escopo
Arquivos permitidos:
Não alterar:
## Critérios de aceite
- [ ] resultado observável 1
- [ ] comportamento existente preservado
- [ ] vocabulário obrigatório respeitado
## Verificação (comandos que devem rodar)
npm run check  ·  E2E: <se houver tela>  ·  evidência esperada:
## Pare e pergunte se
- precisar de esquema, dependência, sync, sanitização, segurança, CI, hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes
## Relatório final
resumo · arquivos · comandos e resultado · riscos · SHA · link do PR
```

## 6. Instrução do coordenador (cole na sessão do Claude)
Você é o coordenador desta Run: não edita código de produto. Leia `AGENTS.md`, `CLAUDE.md`, `docs/proxima-sessao.md` e este arquivo. Para a atividade pedida: reafirme objetivo, restrições e critérios; classifique o risco (§2); crie no máximo 3 contratos com escopos sem sobreposição; escolha o agente pela tabela §3; exija relatório com ID da tarefa, arquivos, comandos e resultado; "parece bom" não é verificação; construtor não revisa a si mesmo; pare nos portões do nível A; ao fim recomende merge, revisão ou descarte e ordene a fila de PRs por dependência (empilhados primeiro o de baixo). Gabriel decide.

**Antes de despachar qualquer contrato** (regra de 15/10/2026, depois do P0 despachado já feito): ler `docs/proxima-sessao.md` inteiro e conferir `git log origin/integracao --oneline -30` e `gh pr list`. Se a atividade aparecer como feita ou mesclada, não despachar. O `plano-mestre.md` §9 e os arquivos `*-pacotes.md` dizem a ordem, não o estado; quando divergirem do `proxima-sessao.md`, vale o estado do código, e a divergência deve ser registrada.

**Orca:** o texto enviado ao terminal de um worker só é recebido depois de um Enter. Depois de colar ou enviar um comando, mande o Enter (ou confira na tela que a linha saiu do campo de entrada) antes de dar o despacho por feito.

## 7. Configuração do Orca (checklist; manual, na interface)
1. Settings → Agents → Agent Permissions: **Manual** (o padrão do Orca pula permissões). Desligar confiança automática de pastas.
2. Settings → Agents: habilitar só Claude Code, Antigravity, Gemini, OpenCode, DeepSeek Harness e Hermes.
3. Autenticar cada CLI direto com a própria assinatura antes de abrir pelo Orca; conferir `git --version`, `gh auth status`, `node -v` no terminal que o Orca abre (Windows, PowerShell; um único checkout).
4. Por repositório/worktree, comando de setup: `npm ci && npm run hooks:instalar`.
5. Orca CLI e skills: seguir `orca skills get orchestration --full` da versão instalada (não inventar flags). Habilitar Orchestration só depois de `orca status --json` responder.
6. Após 10 tarefas sem violação de escopo, liberar modo autônomo só para o worker estável, nunca global.

## 8. Portões (resumo do que é mecânico)
Camada 1, local, qualquer agente: `.githooks` (sem commit em `main`/`integracao`, `npm run check` no commit, sem push no `main`/force/exclusão). Camada 2, Claude Code: `.claude/hooks`. Camada 3, GitHub: proteção de `main` e `integracao` (PR obrigatório, CI `verificar` + `e2e` ×3 + `guarda`, sem force push nem exclusão, aplicada também a administradores) e o job `guarda` (PR para `main` só da `integracao`; caminhos protegidos exigem `aprovado-gabriel`). Limite conhecido: quem usa o token do Gabriel poderia aplicar o rótulo; por isso o contrato proíbe e o rótulo é só dele.

## 9. Métricas semanais
Aceite na primeira passada · verificação com evidência · violação de escopo · defeitos achados na revisão · retries · minutos de atenção do Gabriel · pressão de cota por conta · descartes.

## 10. Implantação
Dia 0 (15/10): portões, contratos, rotinas de nuvem suspensas, proteção de branch. Semana 1: Claude + 1 construtor, tarefa só de leitura e uma tarefa nível C. Semana 2: Antigravity, Gemini, OpenCode; corrida de 2 candidatos; teste das contas duplicadas. Semana 3: DeepSeek; revisão cruzada obrigatória. Semana 4: Hermes como coordenador de teste numa Run só de leitura.
