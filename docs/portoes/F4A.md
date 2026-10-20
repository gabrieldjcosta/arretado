# Portão da F4-A — Contas (A8)

Estado conforme o despacho de 19/10/2026. **Portão aberto:** só se fecha depois da revisão T6 e da fumaça real do Gabriel. Não aplicar migração, publicar segredo, usar conta real de estudo nem preencher `[A DEFINIR PELO GABRIEL]` como parte deste documento.

## Entregas

Os SHAs abaixo foram conferidos em `git log origin/integracao`.

| Pacote | Estado | PR · SHA em `origin/integracao` |
|---|---|---|
| A0 + A1 — decisões, banco por conta e serviço nulo | Feito | #144 · `0282ef1` |
| A2 — esquema remoto, RLS, convites e verificações | Feito; migração aplicada e verificada no projeto real em 14/10; exposição do esquema e configuração do Auth ainda ficam com Gabriel | #147 · `f35f746`; #148 · `fd99971` |
| A3 — login | Feito em código; E2E com conta ligada e fumaça real pendentes | #149 · `a5bf9d6` |
| A4a + A4b — migração | Feito em código; exportação real anonimizada e E2E pendentes | #168 · `802597a` |
| A5 — sair, trocar e excluir | Feito em código; deploy da função exige autorização do Gabriel | #152 · `8531f30` |
| AL — log de lote por referência | Feito | #179 · `1968a56` |
| A6 — cópia cifrada na nuvem | Implementação mesclada; ajustes do T3 em andamento | #183 · `5c76b8d` |
| A7 — política e preparo da V1 | Docs e código mesclados; o PR #184 entrou na `integracao` pelo #188 | #182 · `fd62e9b`; #188 · `3640f9b`; #185 · `47524fc` |
| T2 — consentimento local | Feito | #193 · `b30c02b` |
| T3 — ajustes do A6 e gatilho §5.7 | **Em andamento**, não mesclado na base deste portão | — |
| T4 — E2E de conta com serviço falso e axe | **Pendente**, não iniciado conforme despacho | — |
| T5 — este documento | Em andamento; aguarda PR | — |
| T6 — revisão independente do conjunto | Pendente | — |
| Fumaça real e passos externos | Pendente; responsabilidade do Gabriel | — |

**Conferência de fila:** a fila de 18/10 colocava T5 depois de T2 e T3. A base atual confirma T2 (#193), mas não T3; o despacho informa que T3 está em andamento e T4 pendente. T5 segue como trabalho documental, sem tratar T3 ou T4 como concluídos. D2 continua aberta: o consentimento v3 fica no Aparelho; a porta do aceite v3 no servidor é nula até decisão do Gabriel.

## Critérios do portão

Teste citado significa cobertura automatizada local; não substitui a fumaça contra o Supabase real. Onde há lacuna, o responsável e o que falta estão explícitos.

| Critério | Medida (arquivo e teste) | Estado / responsável pelo que falta |
|---|---|---|
| RLS: duas contas não leem, gravam, apagam nem listam dados da outra (perfil, cópia e log); anônimo não lê dado pessoal; cliente não altera `direito_ia` nem `beta` | `supabase/contas.test.ts`: `A lê só o próprio perfil`, `anônimo não lê perfil`, `o cliente não altera direito, beta nem cria ou apaga perfil`, `cada conta enxerga e apaga só a própria pasta`; `supabase/rls.test.ts`: `usuário A só vê os próprios registros`, `A não grava registro em nome de B`, `A não altera nem apaga registro de B`, `log de alterações é append-only e por dono` | Testes locais existentes. **Não medido no projeto real:** Gabriel roda os dois SQLs abaixo (ou autoriza por escrito a sessão pelo conector); T6 confere os resultados. |
| Convite: e-mail fora da lista não cria conta (Google e código); e-mail convidado cria | `supabase/contas.test.ts`: `cada conta nasce com perfil; e-mail convidado liga beta e marca o convite como usado`, `o gancho aceita e-mail convidado (sem diferenciar maiúsculas) e recusa o resto`; `src/apresentacao/conta/entrar/Entrar.test.tsx`: `e-mail sem convite mostra o aviso e deixa seguir sem conta` | Testes de gancho e tela existentes. **Não medido com provedores reais:** T4 e fumaça do Gabriel. |
| Migração: dados completos por contagens e hash, origem intacta, interrupção retomável | `src/core/pacote/migrar-para-conta.test.ts`: `cobre todas as coleções da v8, com exclusão lógica, lote de adesão e só locais`, `copia tudo para arretado-c-<uid> com usuarioId = uid, aparelhoId e relógio preservados`, `verificação que falha: apaga o banco novo, origem intacta, conta não ativada`, `interrompida em %s: origem igual, em-andamento, conta não ativada; a próxima vez refaz do zero`; `e2e/conta-migracao.spec.ts`: `estudar sem conta, entrar, migrar, ver a cópia em Dados e axe nos 2 temas` (`test.fixme()`) | Fixture sintética medida nos testes. **Não medido:** exportação real anonimizada (Gabriel). E2E com serviço falso está pendente do T4. |
| Troca de conta: entrar A, sair, entrar B sem mistura; sair e apagar remove o banco local | `src/apresentacao/conta/sair/ContaDoAparelho.test.tsx`: `lista a outra conta e troca para ela sem rede`, `sair mantendo os dados: conta deixa de ser ativa e o banco fica`, `com cópia recente "apagar daqui" já está liberado e remove a conta do aparelho`; `src/apresentacao/conta/entrar/Entrar.test.tsx`: testes `destino depois de entrar` | Testes de componente existentes. **Não medido em E2E real:** T4; fluxo com duas contas e dados sintéticos na fumaça do Gabriel. |
| Exclusão: cascata completa (perfil, registros, log, objetos), estados visíveis, nada sobra consultável | `supabase/rls.test.ts`: `excluir a conta apaga em cascata todos os dados pessoais`; `supabase/contas.test.ts`: `excluir a conta apaga o perfil em cascata`; `supabase/functions/excluir-conta/handler.test.ts`: `apaga objetos, registra a contagem e só então apaga o usuário`, `falha ao apagar objetos: 500 e o usuário NÃO é apagado (dá para repetir)`; `src/apresentacao/conta/sair/ContaDoAparelho.test.tsx`: `excluir conta exige digitar, chama o servidor e só então apaga o aparelho` | Testes locais existentes. **Não medido no deploy real:** Gabriel, usando apenas conta descartável de teste; não excluir conta real. |
| Offline: estudar sem rede e sem sessão válida; recursos de conta mostram estado compreensível | `e2e/dados.spec.ts`: `funciona sem rede depois de carregado`; `src/apresentacao/conta/entrar/Entrar.test.tsx`: `sem rede avisa sem travar`; `src/apresentacao/conta/dados/NuvemBackup.test.tsx`: `sem rede: mostra o estado sem erro`; `src/integracoes/conta/backup-nuvem.test.ts`: `sem rede: listar recusa como sem-rede, sem tocar no local`; `src/integracoes/conta/conta.test.ts`: `sem sessão, sair é inofensivo e entrar recusa como indisponível` | Testes locais existentes. **Não medido nos dois aparelhos de teste sem rede:** Gabriel, na fumaça. |
| CSP: só origem do Supabase; retorno do login funciona com Trusted Types; teste espera lista exata | `config/seguranca.test.ts`: `com a chave ligada o connect-src ganha só a origem exata do projeto Supabase`, `cabeçalhos aceitam a CSP do build`; `e2e/seguranca.spec.ts`: `está presente e o app carrega sem violação nem falha no console`; `src/integracoes/conta/retorno.test.ts`: `com ?code= limpa a URL antes de trocar, ativa a conta e leva a #/conta` | Testes de unidade medem origem exata e Trusted Types. **Não medido:** CSP no E2E do build `VITE_CONTA=1` e retorno real; T4 e T6. |
| Privacidade: política v3 publicada, consentimento no Aparelho e no servidor, nenhum conteúdo de estudo no servidor, nenhum campo de diagnóstico | `src/core/preferencias/consentimento.test.ts`: `grava versão, escopo e data em Usuario.consentimentos`, `a porta do servidor é nula: não faz nada e não usa rede`; `src/integracoes/conta/backup-nuvem.test.ts`: `bytes enviados não contêm texto claro do estudo nem a frase`; `src/apresentacao/conta/Privacidade.test.tsx`: `mostra a política v3 e mantém os marcadores a definir visíveis`, `não usa rótulo clínico` | Consentimento local e cifra têm testes; o teste de interface não mede ausência de campo. **Divergência D2, não decidida:** v3 não é gravada no servidor; a RPC existe, mas a chamada é nula. Gabriel decide antes de convidar; T6 confere a lacuna de campo. A ausência de conteúdo em `registros`/`alteracoes` é **não medida:** Gabriel executa a consulta da fumaça e T6 confere. Não preencher os marcadores da política. |
| Custo: nenhum serviço fora do plano combinado; plano Supabase escolhido para a V1 | Decisão registrada em `docs/planos/f4a-contas.md` §11: ficar no plano gratuito com consulta diária; testar limites de Storage antes de prometer cota | **Não há teste automatizado de cobrança:** Gabriel confere no painel o plano e os custos reais; T6 confere a decisão registrada. |
| `npm run check` e E2E verdes; `VITE_CONTA=0` deixa o app igual ao de hoje | `src/integracoes/conta/conta.test.ts`: `chave de build: só "1" liga`; `config/seguranca.test.ts`: `com a chave desligada a CSP é a de hoje`; `src/apresentacao/conta/dados/NuvemBackup.test.tsx`: `com VITE_CONTA=0 nada aparece`; E2E atual com flag desligada roda no `npm run check` | Check local será registrado no relatório T5. **Não medido:** E2E de conta com flag ligada e axe nos dois temas (T4; `e2e/conta-migracao.spec.ts` está em `test.fixme`). Equivalência integral com chave desligada fica para T6 revisar; fumaça offline fica com Gabriel. |

## Roteiro da fumaça real

Gabriel executa no projeto e no app publicados depois dos passos de painel de [`../planos/v1-preparo.md`](../planos/v1-preparo.md) §2. Em alternativa, a sessão só usa o conector se houver autorização escrita do Gabriel. **Não usar credenciais, conteúdo de estudo ou conta pessoal real.** Criar duas contas descartáveis A e B e usar apenas dados sintéticos; nunca anotar e-mails, códigos, tokens, UUIDs, frases ou texto de estudo.

| Passo | Ação | O que conferir | Onde anotar |
|---|---|---|---|
| 1. Preparar | Convidar A e B. Tentar o endereço de teste não convidado nos dois caminhos. Entrar em A por Google e em B por código (ou inverter). | A e B entram; endereço fora da lista não cria conta por Google nem por código; `Usar sem conta` continua disponível. | Seção “Registro da fumaça” abaixo: data, rótulos A/B e resultado, sem endereços. |
| 2. RLS remoto | No projeto Supabase real, executar inteiros `supabase/verificacao-rls-remota.sql` e `supabase/verificacao-f4a-remota.sql`, após migração e configuração do gancho. Ambos são scripts de verificação com transação desfeita; não são migrações. | Resultados coincidem com os comentários de cada SQL; registrar apenas aprovado/reprovado e número do teste, nunca linhas com dados pessoais. | Registro da fumaça, itens 2a e 2b. |
| 3. Migração | No aparelho de teste A, criar poucos registros sintéticos, migrar e comparar prévia, contagens e hash; conferir que a origem local continua intacta. | Cópia concluída; contagens/hash iguais; origem não alterada. Interrupções são cobertas pela unidade; não provocar interrupção em dado real. | Registro da fumaça, item 3. |
| 4. Cópia cifrada | Em A e B, guardar e listar uma cópia; tentar restaurar com frase errada e depois com a correta usando só dados sintéticos. | Frase errada não aplica; prévia antes de restaurar; cópias válidas restauram; cópias no Storage são esperadas e cifradas. | Registro da fumaça, item 4. |
| 5. Sem mistura e offline | Sair de A e entrar em B; comparar somente os marcadores sintéticos. Em seguida, desligar a rede e abrir/usar o estudo local; conferir o estado das ações de conta. | B não vê dados de A; estudo local segue disponível sem rede; sem erro feio nas ações de conta. | Registro da fumaça, item 5. |
| 6. Nenhum conteúdo de estudo no servidor | Antes de excluir B, no SQL Editor, substituir os dois e-mails de teste no CTE pela identificação local das contas A/B e executar a consulta abaixo. Ela devolve só contagens; não abrir nem copiar conteúdo. | `contas_encontradas = 2`, `registros_de_estudo = 0` e `alteracoes_de_estudo = 0`. Os objetos de backup cifrado no Storage são esperados e não são texto claro. Se uma contagem de estudo for maior que zero, parar e avisar o Gabriel sem inspecionar os registros. | Registro da fumaça, item 6; somente as três contagens. |
| 7. Exclusão | Só em conta descartável B, digitar a confirmação e excluir; depois conferir contagens do perfil, registros, log e objetos. | Estados visíveis; exclusão concluída; nada consultável permanece; banco local removido se essa opção foi escolhida. Não excluir A antes de terminar os passos. | Registro da fumaça, item 7; apenas contagens e resultado. |

```sql
with contas_teste as (
  -- Trocar pelos e-mails descartáveis de A e B; não registrar os valores no relatório.
  select id from auth.users
  where email in ('<EMAIL_TESTE_A>', '<EMAIL_TESTE_B>')
)
select
  (select count(*) from contas_teste) as contas_encontradas,
  (select count(*) from arretado.registros
   where usuario_id in (select id from contas_teste)) as registros_de_estudo,
  (select count(*) from arretado.alteracoes
   where usuario_id in (select id from contas_teste)) as alteracoes_de_estudo;
```

### Registro da fumaça (preencher pelo Gabriel; vazio até a execução)

| Item | Data | Resultado (aprovado/reprovado/não executado) | Evidência sem dado pessoal |
|---|---|---|---|
| 1. Convites e login | — | — | — |
| 2a. `verificacao-rls-remota.sql` | — | — | — |
| 2b. `verificacao-f4a-remota.sql` | — | — | — |
| 3. Migração sintética | — | — | — |
| 4. Cópia cifrada | — | — | — |
| 5. Troca A/B e offline | — | — | — |
| 6. Consulta sem conteúdo de estudo | — | — | — |
| 7. Exclusão descartável | — | — | — |

## Como fechar

1. Resolver a decisão D2 e demais `[A DEFINIR PELO GABRIEL]` somente com o Gabriel; não convidar terceiros antes das decisões e dos pré-requisitos de `v1-preparo.md`.
2. Concluir T3 e T4; T6 faz a revisão independente dos PRs e deste portão, conferindo testes e SHAs.
3. Gabriel executa e registra a fumaça dos dois SQLs e dos fluxos com A/B. Anotar resultados sem dados pessoais e atualizar a passagem de bastão em `docs/proxima-sessao.md`.
4. Corrigir qualquer falha; só declarar fechado quando a revisão T6 e a fumaça estiverem aprovadas e as decisões do Gabriel resolvidas.
