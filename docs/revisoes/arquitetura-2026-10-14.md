# Revisão crítica de arquitetura — 14/10/2026

Base: `integracao` (a620cd9). Escopo: núcleo local (Dexie), camadas, Worker, espelho Supabase, backup, build, e o desenho de contas, backup remoto e IA. Só leitura do código e do build; nada de produto foi decidido aqui. Itens marcados **[Gabriel]** pedem decisão dele.

## O que está bom (manter)

- Camadas com regra de lint (`eslint/regra-camadas.js`), escrita sempre validada (zod), carimbada (`tsLogico`) e registrada no log na mesma transação (`Colecao`). O log já reconstrói o estado (`reconstruirDoLog`): base certa para sync.
- Pacote `.arretado` com cifra AES-GCM/PBKDF2, versão de formato e de esquema, teste de ida e volta.
- Worker mínimo, lista fechada de hosts, redirecionamento revalidado, limite de bytes e tempo.
- CSP estrita com Trusted Types, teste de deriva entre `ENTIDADES` e o SQL, RLS testada em Postgres local (PGlite).

## Riscos (por prioridade)

| # | Risco | Evidência | Ação |
|---|---|---|---|
| 1 | **Dado só no navegador sem pedido de armazenamento persistente.** O navegador pode apagar o IndexedDB sob pouco espaço; o Safari limpa após dias sem uso. Local-first até a F4. | Nenhum `navigator.storage.persist()` em `src/`. | **Feito** neste PR: `pedirArmazenamentoPersistente()` no `main.tsx`. Falta mostrar o estado e "último backup" (item 6). |
| 2 | **Tela em branco em erro de renderização.** Nenhum `ErrorBoundary`. | `grep ErrorBoundary src` vazio. | **Feito**: `LimiteDeErro` em volta das rotas, com texto "nada foi perdido / exporte". |
| 3 | **Pacote inicial grande.** 984 kB (306 kB gzip), o dobro dos ~160 kB gzip citados em `vite.config.ts`; passa do próprio limite de aviso (700). Todo o leitor, o importador e o código de backup baixam no primeiro acesso. | `npm run build`, sem `lazy`/`import()`. | **Feito**: Leitor, Importar e Dados em `React.lazy` → inicial 534 kB (169 kB gzip). Próximo: separar `estruturador` (2,2 mil linhas) do que o Hoje usa; revisar `contexto-*.js` (218 kB). |
| 4 | **Log de alterações sem teto.** Cada `gravar` guarda o registro inteiro; importar uma norma (milhares de dispositivos/textos) e a correção do texto (reescreve ~5 mil textos, já listado no plano) duplicam tudo no log, no IndexedDB e no pacote. Sem compactação nem ponto de corte. | `colecao.ts` (`criarLote`, `gravarLote`); sem poda. | Antes da F4-B: definir **checkpoint** (estado + `seq` enviado) e poda do log abaixo dele. Projetar junto do sync, não antes. |
| 5 | **Constraint de coleção refeita a cada migração remota.** Cada nova coleção reescreve o `check (colecao in (...))` inteiro (5 vezes até agora); fácil esquecer um nome. | `supabase/migrations/*colecao*`. | O teste de deriva cobre hoje. Na F4-A trocar o `check` por tabela de coleções (FK) ou remover (RLS + zod do cliente já validam). |
| 6 | **Backup 100% manual e invisível.** Exportar existe, mas nada lembra, nada mostra "último backup" nem "salvo neste aparelho × com backup". O plano da F4-B já exige esses três estados. | Sem registro de última exportação no código. | Pequeno e seguro antes da F4: guardar `ultimoBackupEm` em `meta` ao exportar e mostrar em Conta › Dados (**tela: combinar com a thread de design**). |
| 7 | **Componentes gigantes.** `Leitor.tsx` 2,6 mil linhas, `Importar.tsx` 784, `RevisaoDoRascunho.tsx` 696; `estruturador.ts` 2,2 mil. Difícil revisar e causa conflito entre PRs paralelos. | `wc -l`. | Dividir o Leitor em hooks (posição, marcações, modo foco) **só com PR dedicado e E2E verde**; não junto de feature. |
| 8 | **E2E intermitente do Leitor** (rolagem após recarregar) e testes de tempo sob carga. | `e2e/leitor.spec.ts` usa `scrollBy/scrollTo` e compara `scrollY` imediatamente. | Trocar comparações pontuais por `expect.poll` com tolerância; ver causa: restauração da posição acontece depois do layout das fontes/virtualização. Não corrigido aqui (arquivo de PRs em andamento do leitor). |
| 9 | **CSP vai bloquear a F4.** `connect-src 'self'` impede chamar Supabase/IA; `form-action 'none'` e redirecionamento OAuth também. | `config/seguranca.ts`. | Na F4-A, abrir só o domínio do projeto Supabase (e o do provedor OAuth), nada de `*`. Teste de CSP em `seguranca.test.ts` deve passar a esperar a lista. |
| 10 | **Worker aberto.** `/api/buscar-norma` não tem autenticação nem limite de uso. Hoje só repassa 4 hosts públicos: aceitável. Com contas e IA, vira alvo de abuso e custo. | `worker/index.ts`. | Rota de IA nunca no mesmo caminho sem JWT; limite por usuário e teto global (já previstos em §8 do plano-mestre). |

## Modernização priorizada

1. **Já feito neste PR:** persistência pedida, `LimiteDeErro`, lazy por rota.
2. Próximas, sem mexer em dado ou esquema: `chunkSizeWarningLimit` de volta ao padrão depois de separar o estruturador; `manualChunks` para `dexie`/`zod`/`react` (cache estável entre deploys); relatório de tamanho no CI (falha acima de um teto).
3. Testes: `expect.poll` no E2E de posição (risco 8); teste de contrato do `ServicoDeIA` real quando existir.
4. Dependências: `react-router` 8 e `vite`/rolldown são recentes; manter `npm audit` no `check` e fixar `@playwright/test` (já fixo).

## Arquitetura proposta

### Contas (F4-A)
- Identidade local hoje é `usuarioId` gerado no aparelho; a migração local → conta é a **troca de identidade** que o SQL inicial já prevê (`usuario_id = auth.uid()`). Fazer em transação única sobre todas as coleções + log, com prévia ("N registros serão enviados") e backup automático antes. Trocar de conta nunca mistura: um banco Dexie por `usuarioId` (`NOME_BANCO_PRINCIPAL` + sufixo); já existe `apagarBanco(nome)`.
- Camada nova `src/integracoes/conta/` com interface `ServicoDeConta` (`entrar`, `sair`, `sessao`, `excluir`), implementação Supabase isolada, e implementação nula (sem conta = app de hoje). Telas só conhecem a interface, como já é feito com `ServicoDeIA`.
- Direito/plano vem do servidor (claim ou tabela `Direito`), nunca do cliente.

### Backup (local e remoto)
- Camada 1 (já existe): pacote cifrado manual. Acrescentar `ultimoBackupEm` + lembrete, e **backup automático antes de qualquer subida de esquema** (hoje é o Gabriel que lembra; R10).
- Camada 2 (F4-B): espelho remoto = o log (`alteracoes`) + checkpoint. Backup remoto é o próprio espelho; restaurar = baixar checkpoint + replay, com verificação de hash como no pacote.
- Camada 3 (opcional): cópia do pacote cifrado para armazenamento de arquivos da pessoa (File System Access / compartilhar). A chave nunca sai do aparelho.

### Sincronização (F4-B, resumo)
- Cliente envia `alteracoes` com `seq` local ainda não enviado; servidor aplica por `tsLogico` (relógio lógico já existe), conflito por campo mostrado, nunca sobrescrito em silêncio (já no plano). Poda do log atrás do checkpoint (risco 4).

### IA (A2)
- Fluxo: tela → `ServicoDeIA` (interface atual) → implementação HTTP → **Worker/Edge Function** com JWT → fornecedor. Chave só no servidor; envio mínimo; cota por usuário e teto global; `AbortSignal` (já na interface); resposta sempre `Proposta` aceita/editada/descartada, gravada com `origem: 'ia'`.
- Texto da fonte tratado como **não confiável** (injeção de prompt): a saída da IA nunca vira HTML nem comando; passa pelo sanitizador/zod antes de virar `Proposta`.
- Registrar a decisão como T23/T25+ **[Gabriel]** antes de qualquer função.

## Decisões que ficam para o Gabriel

- Tela de "último backup / salvo neste aparelho" (risco 6): onde aparece (afeta design).
- Um banco Dexie por conta × um banco com `usuarioId` (afeta migração da F4-A).
- Quando atacar a divisão do Leitor (risco 7): entre pacotes, não dentro de um.

## O que este PR muda (sem esquema, sem produto)

`App.tsx` (lazy + `LimiteDeErro`), `componentes/LimiteDeErro.tsx`, `core/persistencia/armazenamento.ts`, `main.tsx` (1 linha), este documento. Rotas, textos e visual iguais.

## Contratos de dados para a UI (pedido da revisão de design)

Entregues só como dados; texto e lugar na tela são da UI: `lerUltimoBackup` / `registrarBackup` (`core/persistencia/backup.ts`, gravado em `meta` ao exportar "Tudo"), hooks `useUltimoBackup()` → `{ dataUltimoBackup }` e `useEstadoDeArmazenamento()` → `'persistente' | 'temporario' | 'indisponivel'` (`apresentacao/dados/useSaude.ts`). Enum de sync e resultado tipado de IA (`ok | indisponivel | limite`) entram com a F4-B e a A2.

## Dívida registrada

Lógica de "próxima ação" duplicada entre `RecallInicio` e `hoje/proxima-acao.ts`; unificar junto da mudança "Começar direto ao alvo" da revisão de design.

## Decisões de dados/infra tomadas (padrão mais seguro; reversíveis até a F4-A)

- **CSP pronta para a F4, sem abrir nada hoje.** `config/seguranca.ts` ganhou `montarCSP(origens)` e `ORIGENS_DE_CONEXAO = []`: só amplia o `connect-src`, aceita apenas origem `https` exata (sem curinga, sem caminho; testado). Conteúdo publicado inalterado. Abrir uma origem (Supabase, login, IA) é uma linha nessa lista, com decisão registrada.
- **Banco local por conta (um Dexie por `usuarioId`), não um banco com filtro.** Motivo: trocar de conta nunca mistura dado (regra da F4-A), apagar/sair vira `apagarBanco(nome)`, e a RLS remota (`usuario_id = auth.uid()`) espelha o mesmo isolamento. Custo: nome do banco derivado da identidade e migração local → conta como cópia + troca de `usuarioId` em transação. Fica registrada como proposta de T26 **[Gabriel confirma]**; nenhum código muda agora.
- **Log com checkpoint e poda: não implementado de propósito.** Podar o log sem sync pronto apaga a única trilha de auditoria/desfazer sem benefício. Desenho para a F4-B: checkpoint = (`seq` confirmado pelo servidor, hash do estado); só entradas com `seq` ≤ checkpoint e mais antigas que 30 dias saem; `reconstruirDoLog` passa a partir do checkpoint. Teste de propriedade: estado reconstruído antes × depois da poda é igual.
- **E2E intermitente do Leitor: causa não reproduzida** (passa isolado; sem log do CI com a falha). Registrar o trace do próximo CI vermelho antes de mexer em `leitor.spec.ts`; trocar comparações por `expect.poll` só com evidência.
