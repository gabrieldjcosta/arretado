# A4 Migração do uso local para a conta (visão geral, dividida em 3 contratos)

Atividade: `f4a-pacotes.md`, onda 3 (sozinho) · Risco do conjunto: **A (mexe em dado)** · Plano: `f4a-contas.md` §5 (passos 1–6 e 8; o 7 é do A6) e §13.
Estado conferido em 15/10/2026 (`proxima-sessao.md` e `git log`): A0–A3 e A5 na `integracao`; esquema Dexie v8.
Divisão decidida pelo Gabriel em 15/10/2026 para gastar menos tokens: Claude fica com o núcleo (o que pode perder dado); tela e testes saem para Antigravity e DeepSeek, construindo sobre uma interface fixa.

| Contrato | Construtor | Nível | Branch | Base |
|---|---|---|---|---|
| [A4a Núcleo](2026-10-15-f4a-a4a-nucleo.md) | Claude (Opus 5.5, esforço alto) | A | `claude/f4a-a4-nucleo` | `integracao` |
| [A4b Tela](2026-10-15-f4a-a4b-tela.md) | Antigravity | B | `claude/f4a-a4-tela` | `claude/f4a-a4-nucleo` |
| [A4c Testes](2026-10-15-f4a-a4c-testes.md) | DeepSeek | C | `claude/f4a-a4-testes` | `claude/f4a-a4-nucleo` |

**Ordem:** o primeiro commit do `claude/f4a-a4-nucleo` já traz a interface abaixo como esqueleto (funções que lançam "não implementado"). A4b e A4c começam a partir dele, em paralelo. O A4a implementa até os testes do A4c passarem; depois o Claude junta os três num PR só para a `integracao`. Ponto de salvamento: `backup/pre-f4a-a4`.

## Interface fixa (`src/core/pacote/migrar-para-conta.ts`)
Não muda sem aviso aos três contratos. Está no esqueleto do branch do núcleo; a fonte é o arquivo.

- `preverMigracao(origem)` → `PreviaMigracao` (coleções, registros, bytes, por coleção). Não escreve nada.
- `migrarParaConta(origem, { uid, baixarBackup, aoAvancar?, interromperEm?, registro?, agora? })` → `ResultadoMigracao`: `{ tipo: 'concluida', uid, contagens, hash }` ou `{ tipo: 'falhou', etapa, motivo }`. Etapas: `backup` → `copia` → `verificacao` → `ativacao`. `baixarBackup` que rejeita = nada começa. `interromperEm` (só testes) lança `InterrupcaoSimulada` naquela etapa, como uma aba fechada.
- `estadoDaMigracao(uid, registro?)` → `'nenhuma' | 'em-andamento' | 'concluida'`.
- `copiaAnterior(registro?)` → `{ nomeBanco, uid, migradoEm } | null`; `apagarCopiaAnterior(registro?)`.

**Escolha (reversível):** a marca `migradoParaConta` do plano §5.6 fica no `meta` do registro de contas, não no banco de origem, para a origem ficar byte a byte igual (critério dos testes).

## Critérios do conjunto (o PR final)
- Prévia antes de qualquer cópia; backup automático; se o download falhar, nada começa.
- Cópia para `arretado-c-<uid>` com troca de `usuarioId` em registros e log numa transação; `aparelhoId` e relógio lógico preservados.
- Verificação: contagens iguais, hash igual depois de normalizar `usuarioId`, `reconstruirDoLog` = estado. Se falhar, apaga o banco novo, mostra "nada foi alterado" e registra um Problema.
- Conta ativada só com a verificação limpa; interrupção deixa `em-andamento`, e a próxima vez refaz do zero.
- "Cópia de antes da conta (data)" em Conta › Dados, com Exportar e Apagar, nunca apagada sozinha.
- 3 interrupções injetadas, com origem igual byte a byte depois de cada uma; fixture **sintética** (repositório público: nenhum dado real do Gabriel no git; a rodada com a exportação real é local e o PR relata só contagens e hashes).
- `VITE_CONTA=0`: app idêntico ao de hoje. E2E com `ServicoDeContaFalso`, axe nos 2 temas. Vocabulário obrigatório.
- Portão A: revisão independente em outra sessão, backup `.arretado` do Gabriel e rótulo `aprovado-gabriel` antes do merge. Nenhum construtor mescla nem aplica rótulo.

## Regras comuns aos três
Leia `AGENTS.md` primeiro. Máquina de 6 GB: localmente, só `npx vitest run --project unidade --maxWorkers=2 <arquivos>`, `npm run lint`, `npm run typecheck`, `npm run format:check`; check completo e E2E rodam no CI. Commits `wip:`. Não alterar: esquema Dexie de estudo (v8), versão do registro de contas, `supabase/`, `src/core/seguranca/`, `src/core/persistencia/migracao*`, `.github/`, `.githooks/`, `package.json`. Pare e pergunte se precisar sair dos arquivos permitidos, mudar a interface, ou se a mesma falha repetir duas vezes. Relatório final: resumo · arquivos · comandos e resultado · suposições · riscos · SHA.
