# F4-A em pacotes

Partição de 14/10/2026 do [`f4a-contas.md`](f4a-contas.md), no formato de [`f3-pacotes.md`](f3-pacotes.md). Cada pacote vira **uma thread/sessão**. Modelo: **Opus 5.5** (CLAUDE.md: planejamento e execução da F4); revisão independente em outra sessão onde indicado.

## Regras de convivência

1. **No máximo 2 pacotes de código ao mesmo tempo**; subir a onda seguinte só com a anterior mergeada na `integracao`. Pacote só de documento não conta.
2. **Sem esquema Dexie novo.** A F4-A fica em v8. Se um pacote precisar de campo local novo, PR próprio de esquema (v9), nunca dentro do pacote.
3. **Tudo atrás de `VITE_CONTA`** (padrão `0`). Com `0` o app e a CSP são os de hoje.
4. **Dono de arquivo:** cada pacote só edita a pasta da tabela. Compartilhados (`glossario.md`, `proxima-sessao.md`, `solucao-de-problemas.md`, `decisoes-tecnicas.md`, `orientacoes/conteudo.ts`): só por acréscimo, relendo a `integracao` antes do commit.
5. **Camada visual é da thread de UI:** os pacotes usam tokens e classes existentes, CSS próprio (`estilos-conta.css`), componentes pequenos com `className` semântico, sem cor literal.
6. **Nada externo sem sim:** pacote que precisa de conta Google, migração no projeto real ou gasto para na etapa "Gabriel" e deixa o resto pronto (ver §12 e §11 do plano).
7. **Ponto de salvamento:** branch `backup/pre-f4a-<pacote>` (a partir da `integracao`; push de tag é recusado no ambiente) antes de abrir cada pacote; backup `.arretado` do Gabriel e revisão independente antes do merge do A4.
8. Regras do CLAUDE.md valem: local-first, vocabulário, sem diagnóstico, `npm run check` verde, E2E nas telas novas, axe nos 2 temas.

## Pacotes

| Onda | Pacote | Pasta que possui | Depende de | Observação |
|---|---|---|---|---|
| 0 | **A0 Decisões e medição** (só doc/script) | `docs/decisoes-tecnicas.md` (T26–T28), `scripts/medir-banco.mjs`, `docs/planos/f4a-contas.md` | — | registra T26 (banco por conta), T27 (PKCE + convite), T28 (backup cifrado); mede tamanho real do banco do Gabriel; checklist do Gabriel (§12); pergunta as decisões §11. Não conta no limite |
| 1 | **A1 Banco por conta, sem rede** | `src/core/persistencia/registro-contas.ts`, `src/integracoes/conta/{interface,nulo}.ts`, `main.tsx` | A0 | interface `ServicoDeConta` e implementação nula; registro de contas; `abrirRepositorioAtivo()`; nome `arretado-c-<uid>`; flag; testes de abertura sem rede e de isolamento entre dois bancos. Comportamento visível igual ao de hoje |
| 1 | **A2 Esquema remoto da F4-A** | `supabase/migrations/…f4a…`, `supabase/rollback/`, `supabase/rls.test.ts`, `supabase/verificacao-rls-remota.sql` | A0 | `perfis`, `convites`, gancho, bucket `backups` e políticas, `aceitar_termos`, `exclusoes`; testes PGlite; scripts de reversão. **Aplicar no projeto real só com o sim do Gabriel** (ele ou a sessão pelo conector, por escrito) |
| 2 | **AL Log de lote por referência** (**risco médio-alto**) | `src/core/persistencia/log.ts`, `src/dominios/acervo/adesao.ts`, `src/core/pacote/` (versão de formato) | A1 | entrada `acervo-adesao` (item, versão, hash) no lugar de uma entrada por registro; `reconstruirDoLog`/desfazer reidratam pela fonte; teste de propriedade (estado reconstruído = estado gravado, com e sem lote); pacote v-nova lê o antigo e o app antigo recusa o novo com mensagem clara; migração remota da `operacao`. Mede antes/depois (CF/88 e "Tudo do edital"). **Backup do Gabriel e revisão independente antes do merge.** Combinar com a thread #141 (que mediu e pode já ter parte do código) para não duplicar. Independe de conta: pode subir antes da A3 se o Gabriel quiser o ganho já |
| 2 | **A3 Login** | `src/integracoes/conta/supabase.ts`, `src/apresentacao/conta/entrar/`, `config/seguranca.ts`, `main.tsx` (trecho do retorno) | A1, A2 aplicado, passos 1–5 do Gabriel | supabase-js por `import()`; Google PKCE + código por e-mail; tratamento de `?code=`; CSP com a origem exata; tela Entrar/Conta, consentimento, "Usar sem conta"; `ServicoDeContaFalso` para E2E; trata erros ("e-mail sem convite", sem rede) |
| 3 | **A4 Migração local → conta** (**risco alto**) | `src/core/pacote/migrar-para-conta.ts`, `src/apresentacao/conta/migracao/` | A1, A3 | prévia, backup automático, cópia com troca de `usuarioId`, verificação por hash, marca da cópia anterior, retomada após interrupção; teste com a exportação real anonimizada e 3 interrupções injetadas. **Backup do Gabriel e revisão independente antes do merge; esforço alto** |
| 4 | **A5 Sair, trocar de conta, excluir, exportar** | `src/apresentacao/conta/sair/`, `supabase/functions/excluir-conta/` | A3 (e A4 para o texto de "cópia anterior") | "Sair e manter / apagar daqui", seletor de conta, exclusão em cascata com estados, exportar da conta ativa; Edge Function com chave de serviço só em segredo; E2E "entrar A, sair, entrar B" sem mistura |
| 4 | **A6 Backup manual na nuvem** (recomendado antes da V1) | `src/integracoes/conta/backup-nuvem.ts`, `src/apresentacao/conta/dados/NuvemBackup*.tsx` | A3, A5 (exclusão apaga os objetos) | cifrar no aparelho, enviar, listar, manter 3, restaurar com prévia e snapshot, três estados na tela, as três escolhas do §5.7; teste de ida e volta com frase errada |
| 5 | **A7 Privacidade e preparo da V1** (doc + pouco código) | `src/apresentacao/orientacoes/conteudo.ts` (acréscimo), `docs/politica/`, `docs/planos/v1-preparo.md` | A3 em diante | política v3 e termos de teste; texto de consentimento; "Apagar tudo e recomeçar"; comando de convite pronto; roteiro de segurança da V1; pedido de revisão jurídica; **consulta diária** (workflow do GitHub Actions) que mantém o projeto Supabase ativo no plano gratuito |
| 6 | **A8 Portão da F4-A** (documento + verificação) | `docs/portoes/F4A.md` | A1–A7 | critérios abaixo; revisão independente do conjunto; `verificacao-rls-remota.sql` no projeto real; fumaça manual com duas contas de teste |

Ondas com 2 pacotes de código: **1** A1+A2, **2** A3 + AL (A7 em paralelo só como texto), **3** A4 (sozinho), **4** A5+A6, **5** A7, **6** A8. A3 pode começar o código (contra o serviço falso) enquanto o Gabriel faz os passos 1–5; só a fumaça com o projeto real espera.

## Critérios do portão da F4-A (A8)

- RLS: duas contas de teste, nenhuma lê, grava, apaga nem lista dado da outra (perfil, backup, log); anônimo não lê nada pessoal; cliente não altera `direito_ia` nem `beta`.
- Convite: e-mail fora da lista não cria conta (Google e código); dentro, cria.
- Migração: dados do Gabriel entram completos (contagens e hash), origem intacta, interrupção retomável.
- Troca de conta: entrar A, sair, entrar B sem mistura; sair e apagar remove o banco local.
- Exclusão: cascata completa (perfil, registros, log, objetos), estados visíveis, nada sobra consultável.
- Offline: abrir o app sem rede e sem sessão válida continua estudando; recursos de conta mostram o estado sem erro feio.
- CSP: só a origem do projeto Supabase; retorno do login funciona com Trusted Types; teste de CSP espera a lista exata.
- Privacidade: política v3 publicada, consentimento registrado no servidor e no aparelho, nenhum conteúdo de estudo no servidor (verificado por consulta), nenhum campo de diagnóstico.
- Custo: nenhum serviço fora do plano combinado; plano do Supabase decidido para a V1.
- `npm run check` e E2E verdes; chave `VITE_CONTA=0` deixa o app idêntico ao de hoje.

## Entrada e saída de cada pacote

Entrada: a sessão lê `CLAUDE.md`, `docs/proxima-sessao.md`, o [plano](f4a-contas.md) (só as seções do pacote) e esta linha. Saída: PR para a `integracao`, passagem de bastão no PR, e aviso à thread da Fila de merges. O agente de verificação diário passa a incluir o roteiro de cada pacote quando ele mergeia.
