# Tarefa: F4-A — A4 Migração do uso local para a conta

Atividade: `f4a-pacotes.md`, onda 3 (sozinho) · Risco: **A (crítico, mexe em dado)** · Construtor: Claude (Opus 5.5, esforço alto) · Revisor: sessão independente (outro agente ou outra sessão Claude) + Gabriel
Branch: `claude/f4a-a4` · Base: `integracao` · Ponto de salvamento: branch `backup/pre-f4a-a4` a partir da `integracao`, criado antes do primeiro commit

Estado conferido em 15/10/2026 (`proxima-sessao.md` e `git log`): A0, A1, A2 (aplicada), A3 e A5 já estão na `integracao`; esquema Dexie v8. `src/core/pacote/migrar-para-conta.ts` e `src/apresentacao/conta/migracao/` ainda não existem.

## Objetivo
Quem já estuda sem conta entra numa conta e leva todos os dados para o banco dela (`arretado-c-<uid>`), **sem nunca alterar a origem**: copiar, verificar e só então ativar. Plano: `f4a-contas.md` §5 (passos 1 a 6 e 8; o passo 7 é do A6) e §13.

## Ler antes (só o necessário)
`AGENTS.md`; `docs/planos/f4a-contas.md` §5 e §13; linha do A4 em `f4a-pacotes.md`; `src/core/persistencia/registro-contas.ts`; `src/core/pacote/{exportar,importar,espacos,formato}.ts` (modo integral e troca de identidade); `src/core/persistencia/log.ts` (`reconstruirDoLog`); `src/apresentacao/conta/entrar/` e `sair/` (onde a migração é oferecida); `docs/solucao-de-problemas.md`, seção "Contas (F4-A)".

## Escopo
Pode criar ou editar: `src/core/pacote/migrar-para-conta.ts` (+ teste), `src/apresentacao/conta/migracao/` (tela, CSS próprio sem cor literal), `src/core/persistencia/registro-contas.ts` (só campos opcionais em `ContaDoAparelho` ou chaves em `meta`, sem nova versão do registro), uma linha em `Entrar.tsx` ou `ContextoConta.tsx` para oferecer a migração depois do primeiro login, a seção "Cópia de antes da conta" em `src/apresentacao/conta/dados/` (Exportar e Apagar), E2E novo em `e2e/`, e, só por acréscimo, `docs/glossario.md`, `docs/solucao-de-problemas.md` e `docs/proxima-sessao.md`.
Não alterar: esquema Dexie de estudo (fica em v8), `supabase/`, `src/core/seguranca/`, `src/core/persistencia/migracao*`, `.github/`, `.githooks/`, `package.json`, pastas de A6/AL.

## Critérios de aceite
- [ ] Prévia antes de qualquer cópia: "N registros em M coleções, X MB… Nada sai para a internet agora."
- [ ] Backup automático (`exportarPacote` + `registrarBackup`); se o download falhar, a migração não começa.
- [ ] Cópia para `arretado-c-<uid>` pelo caminho integral com troca de `usuarioId` em registros e log numa transação; `aparelhoId` e relógio lógico preservados.
- [ ] Verificação: contagem por coleção igual; hash do conjunto igual depois de normalizar `usuarioId`; `reconstruirDoLog` do banco novo = estado do banco novo. Se falhar, apaga o banco novo, mostra "nada foi alterado" e registra um Problema.
- [ ] Conta ativada só com a verificação limpa. Interrupção deixa `migracao: em-andamento`; o banco é ignorado e refeito do zero na próxima vez.
- [ ] A origem recebe `migradoParaConta: <uid>` e aparece em Conta › Dados como "Cópia de antes da conta (data)", com Exportar e Apagar, e nunca é apagada sozinha.
- [ ] Teste unitário com **3 interrupções injetadas** (antes da cópia, no meio da transação e entre a verificação e a ativação), comparando contagens e hash, com origem byte a byte igual depois de cada uma.
- [ ] Teste com uma fixture **sintética** no formato da exportação real (todas as coleções v8, log com lote do acervo). **Nenhum dado real do Gabriel entra no repositório (é público).** A rodada com a exportação real anonimizada é feita localmente, fora do git, e relatada no PR.
- [ ] `VITE_CONTA=0`: app idêntico ao de hoje, migração inacessível.
- [ ] E2E com `ServicoDeContaFalso`: estudar sem conta, entrar, migrar, ver os dados na conta e a cópia anterior em Dados; axe nos 2 temas.
- [ ] Vocabulário obrigatório; texto sem culpa nem pressa; nada obrigatório além de confirmar.

## Verificação
Máquina de 6 GB: localmente, `npx vitest run --project unidade --maxWorkers=2 <arquivos afetados>`, `npm run lint`, `npm run typecheck`, `npm run format:check`. O check completo e o E2E nos 3 aparelhos rodam no CI do PR. Commits de salvamento com `wip:`. Evidência no PR: saída dos testes de interrupção e o relato da rodada local com a exportação real (só contagens e hashes, sem conteúdo).

## Pare e pergunte se
- precisar subir o esquema Dexie (v9) ou mudar a versão do registro;
- o caminho integral existente não preservar `aparelhoId` ou o relógio lógico;
- a verificação por hash divergir em dado real por motivo que não seja `usuarioId`;
- precisar sair dos arquivos permitidos, ou a mesma falha repetir duas vezes.

## Portão do nível A (não é do construtor)
Não mesclar e não aplicar rótulo. Antes do merge: revisão independente em outra sessão, backup `.arretado` do Gabriel e rótulo `aprovado-gabriel`.

## Relatório final
Resumo · arquivos · comandos e resultado · suposições · riscos · SHA · link do PR · passagem de bastão no formato do `CLAUDE.md`.
