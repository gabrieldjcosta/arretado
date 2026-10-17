# Arretado — regras para qualquer agente

Vale para Claude Code, Gemini, Antigravity, OpenCode, DeepSeek Harness, Hermes e qualquer outro agente que rode neste repositório. O contexto do projeto está no [`CLAUDE.md`](CLAUDE.md): leia-o, mais `docs/proxima-sessao.md`, antes de editar. A tarefa vem sempre num contrato ([`docs/planos/contratos-agentes.md`](docs/planos/contratos-agentes.md)); sem contrato, pare e peça.

## Inegociável

1. Um agente, uma worktree, um branch `claude/<atividade>`. Nunca dois agentes no mesmo branch.
2. PR sempre para `integracao`, nunca para `main`. Nunca push no `main`, force push, nem excluir `main`/`integracao`.
3. Só edite os arquivos permitidos pelo contrato. Precisou sair do escopo: pare e relate.
4. Pare e peça decisão antes de: mexer em esquema/migração, sync, sanitização, segurança, CI, hooks, dependências, `AGENTS.md`/`CLAUDE.md`; apagar arquivo; escrever fora da worktree.
5. Não crie subagentes nem rodadas paralelas por conta própria.
6. Nunca leia nem envie `.env`, chaves, tokens, cookies ou dados de estudo do Gabriel. Segredo achado no código: pare e avise.
7. Pronto = `npm run check` verde (e E2E quando houver tela). "Parece certo" não é verificação: anexe o comando e a saída relevante.
8. Quem constrói não é o único revisor do próprio diff.
9. Mesma falha duas vezes: pare de editar, diagnostique e relate.

## Regras do produto (resumo; detalhe no `CLAUDE.md`)

- Local-first: nenhuma funcionalidade depende de rede; o remoto é espelho.
- Nunca renderizar HTML colado sem sanitizar.
- Vocabulário obrigatório: Aparelho, Problema, Erro, Dispositivo, Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- Diagnóstico clínico nunca é perguntado, guardado nem citado na interface.
- Não antecipar funcionalidade de fase posterior.

## Ligar os portões locais (uma vez por clone)

`npm run hooks:instalar` ativa `.githooks` (bloqueia commit em `main`/`integracao`, commit com check vermelho e push proibido). Mensagem iniciando por `wip:` pula o check, só para salvar progresso.

## Relatório final do worker

Resumo; arquivos alterados; comandos rodados e resultado; riscos restantes; SHA do commit; link do PR.
