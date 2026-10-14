# F4-A — Contas, login e banco de dados (plano)

Plano de 14/10/2026 para o bloco F4-A do plano-mestre §7. Partição em pacotes: [`f4a-pacotes.md`](f4a-pacotes.md). Base lida: plano-mestre §6–§8, `revisoes/arquitetura-2026-10-14.md`, `referencia.md` (projeto Supabase), `supabase/migrations/*`, `config/seguranca.ts`, `core/persistencia/{banco,repositorio}.ts`. Nada foi criado fora do repositório: nenhuma conta, nenhum serviço, nenhum gasto. Tudo que muda dado real ou custa dinheiro fica atrás de "sim" do Gabriel (§11).

## 1. Objetivo e limites

**Meta:** qualquer pessoa convidada entra no Arretado, tem o seu espaço isolado, sai, exclui tudo e (opcional) guarda uma cópia cifrada na nuvem. Isso basta para a **V1** (3 a 5 pessoas, sem ajuda ao vivo; plano-mestre §6).

**Dentro da F4-A:** login, conta, perfil mínimo no servidor, consentimento, migração do uso local para a conta, sair, trocar de conta, excluir conta, exportar, convite para a V1, backup manual na nuvem (pacote A6, recomendado).

**Fora (F4-B/C):** sincronização automática entre aparelhos, poda do log, instalação offline. O §8 só desenha a F4-B para que a F4-A não feche portas.

**Regras que não mudam:** local-first (nenhuma tela de estudo depende de rede ou de login); "Usar sem conta" continua existindo; diagnóstico nunca é perguntado nem guardado; vocabulário obrigatório (Aparelho, Problema, Norma…); nada obrigatório além do mínimo; nenhum esquema Dexie novo (fica em v8).

## 2. Decisões já tomadas (não reabrir)

| Decisão | Origem |
|---|---|
| Remoto = Supabase, projeto `arretado`, `sa-east-1`, esquema `arretado` com RLS `usuario_id = auth.uid()` | D3, T12 |
| Login Google no adaptador; Apple só quando houver app nas lojas | D19, plano-mestre §7 |
| Um banco Dexie por conta (T26, aprovada em 14/10) | revisão de arquitetura |
| `montarCSP(origens)` pronto; abrir só origens https exatas | `config/seguranca.ts` |
| Log sem poda até existir sync (único rastro de desfazer/auditoria) | revisão de arquitetura |
| Direito (plano com/sem IA) vem do servidor, nunca do cliente | revisão de arquitetura |
| Um aparelho ativo por vez, conflito mostrado, nunca silencioso | D17 |

## 3. Modelo de conta

**Identidade.** `auth.users.id` (UUID do Supabase) = `usuarioId` de todo registro da conta, como o SQL inicial já prevê. Sem conta, `usuarioId` continua o UUID local de hoje.

**Três estados do aparelho** (um Dexie cada, nunca misturados):

| Estado | Banco | Quando |
|---|---|---|
| Sem conta | `arretado` (o de hoje) | padrão; quem nunca entrou |
| Conta ativa | `arretado-c-<uid>` | depois de entrar |
| Cópia anterior à conta | `arretado` com marca `migradoParaConta` | depois da migração; só leitura/exportação, nunca reaberto como espaço de estudo |

**Registro de contas** (`arretado-registro`, Dexie minúsculo, sem dado de estudo): lista `{ uid, nomeBanco, email, ultimoUso }` e a conta ativa. A abertura do app lê o registro e abre o banco certo **sem rede e sem esperar a sessão**: sessão expirada não tranca o estudo, só desliga o que precisa de servidor.

**Servidor guarda (e só isto):**

| Onde | O quê |
|---|---|
| `auth.users` (Supabase Auth) | e-mail, provedor, e o que o Google devolve em `raw_user_meta_data` (nome, foto) — não dá para impedir; vai dito na política |
| `arretado.perfis` (novo) | `usuario_id`, `termos_versao`, `termos_aceitos_em`, `direito_ia` (padrão falso), `beta` (acesso à V1), `criado_em` |
| `arretado.convites` (novo) | e-mail convidado, `criado_em`, `usado_em`. Sem acesso do cliente |
| Storage `backups/<uid>/…` (A6) | pacote `.arretado` **cifrado no aparelho** (a chave nunca sai dele) |
| `arretado.registros/alteracoes/posse_aparelho` | já existem e ficam **vazias** até a F4-B |

Nenhum conteúdo de estudo, texto de lei, erro ou frase vai ao servidor na F4-A, exceto dentro do pacote cifrado do A6 e só quando a pessoa pedir.

**Direito.** O cliente lê `perfis.direito_ia` e guarda a cópia em `meta` com data (a tela usa a cópia offline; o servidor é quem decide de verdade quando existir a A2). O cliente não consegue alterar `direito_ia` nem `beta`: só `select` no perfil; o aceite de termos passa por função `aceitar_termos(versao)` (security definer).

## 4. Fluxo de login

1. **Métodos (padrão):** Google (principal) e **código de 6 dígitos por e-mail** (secundário; pode sair sem custo). Sem senha própria (menos superfície, nada a vazar). Apple fica para a M1.
2. **PKCE, não o fluxo implícito.** O roteamento é por hash (T3); o fluxo implícito devolve `#access_token`, que quebra o roteador. Com PKCE o retorno é `?code=…` na query (confirmado na documentação do Supabase), tratado em `main.tsx` **antes** de montar o roteador: troca o código, limpa a URL com `history.replaceState` e leva a `#/conta`. `redirectTo` = `https://arretado.gabrieldjcosta.workers.dev/` (e `http://localhost:5173/` em dev), as duas na lista de URLs permitidas do Supabase; nenhuma outra.
3. **CSP:** `ORIGENS_DE_CONEXAO = ['https://dgwoemewvpabbppascuw.supabase.co']`, nada de curinga; a ida ao Google é navegação de página (não depende de `connect-src`); `form-action 'none'` não atrapalha porque não há formulário enviado. O teste de CSP passa a esperar essa lista exata. Validar em E2E que o retorno do login funciona com Trusted Types.
4. **Camada:** `src/integracoes/conta/` com a interface `ServicoDeConta` (`sessao`, `entrarComGoogle`, `pedirCodigo`, `confirmarCodigo`, `sair`, `excluirConta`, `aoMudar`), implementação nula (app de hoje) e implementação Supabase. **Só um arquivo importa `@supabase/supabase-js`**, carregado por `import()` quando a pessoa abre "Entrar" (fora do pacote inicial, que a revisão já mediu em 169 kB gzip). Telas conhecem só a interface.
5. **Sessão:** `persistSession` e `autoRefreshToken` do supabase-js (localStorage). Risco: XSS leria o token. Mitigação: CSP estrita + Trusted Types + nenhum `dangerouslySetInnerHTML` (lint) já vigentes; JWT de 1 h; "Sair de todos os aparelhos" disponível.
6. **Acesso por convite na V1:** gancho **Before User Created** do Supabase (função SQL, documentada) rejeita e-mail que não esteja em `arretado.convites`; vale para Google e para código. Fora da V1, abre-se com um `update`/remoção do gancho. Sem convite a pessoa vê "Ainda não liberamos este e-mail" e continua usando sem conta.
7. **Vínculo de identidades:** um e-mail verificado = uma conta, mesmo se entrar por Google e por código. Conferir a opção "vincular automaticamente" no painel e aceitar só e-mail verificado.
8. **Consentimento:** primeira entrada mostra "o que sai do aparelho" em 5 linhas (e-mail e conta; o que o Google informa; nada de estudo, salvo cópia que você pedir) e registra `termos_versao` no servidor e em `Usuario.consentimentos` local. Recusar = continuar sem conta.

## 5. Migração do uso local para a conta (a parte de maior risco)

Regra: **a origem nunca é alterada; só se copia, verifica e, depois, se oferece guardar.**

1. **Prévia** (antes de qualquer cópia): "N registros em M coleções, X MB, serão copiados para a sua conta neste aparelho. Nada sai para a internet agora."
2. **Backup automático:** baixa o pacote `.arretado` completo (já existe `exportarPacote`; `registrarBackup` marca `ultimoBackupEm`). Se o download falhar, a migração não começa.
3. **Cópia:** cria `arretado-c-<uid>`; importa o pacote pelo caminho de **restauração integral com troca de identidade** (já existente: modo "integral", `espacos.ts`/`importar.ts`), trocando `usuarioId` em registros e log numa transação. Preserva `aparelhoId` e o relógio lógico.
4. **Verificação:** contagem por coleção igual; hash do conjunto igual depois de normalizar `usuarioId`; `reconstruirDoLog` do banco novo = estado do banco novo. Falhou: apaga o banco novo, mostra "nada foi alterado", registra Problema.
5. **Troca:** só com a verificação limpa o registro marca a conta como ativa. Interrompeu no meio (aba fechada)? Banco novo fica `migracao: em-andamento`, é ignorado e refeito do zero na próxima vez (idempotente porque a origem não mudou).
6. **Cópia anterior:** o banco `arretado` recebe `migradoParaConta: <uid>`, some do seletor de espaços e fica disponível em Conta › Dados como "Cópia de antes da conta (14/10)", com **Exportar** e **Apagar**. Nunca se apaga sozinha; sugere-se apagar depois de 30 dias com a conta ok.
7. **Conta que já tem cópia na nuvem** (A6): três escolhas explícitas, nenhuma automática — usar a cópia da nuvem (substitui o local, depois de um snapshot), manter o local (a nuvem só é trocada na próxima cópia que a pessoa pedir) ou **importar a da nuvem para um espaço separado e mesclar** (modo 7 existente). Mesclagem silenciosa só na F4-B.
8. **Trocar de conta nunca mistura:** cada conta tem o seu banco. Entrar numa segunda conta no mesmo aparelho cria outro banco; a pessoa só vê a conta ativa.

**Teste exigido:** migração com dados reais anonimizados do Gabriel (exportação de hoje), com 3 interrupções injetadas, e comparando contagens e hash.

## 6. Sair, excluir, exportar

- **Sair** pergunta uma vez: *Manter os meus dados neste aparelho* (padrão; o aparelho é pessoal) ou *Apagar daqui* (aparelho emprestado). "Apagar daqui" só fica liberado com cópia recente (`ultimoBackupEm`) ou depois de confirmar que a pessoa exportou; apaga o banco com `apagarBanco` e a sessão local.
- **Excluir conta** (Conta › Dados): exporta antes (oferecido, não obrigatório), confirmação digitada, Edge Function `excluir-conta` autenticada por JWT: apaga objetos do Storage da pessoa (o Supabase **impede apagar usuário dono de objetos**, confirmado na documentação), depois `auth.admin.deleteUser` com a chave de serviço **só dentro da função**; `on delete cascade` leva perfil, registros, log e posse. O cliente mostra estados: *pedido → apagando → concluído*, e o aparelho apaga o banco local no fim se a pessoa escolheu. Exclusão **imediata e definitiva** (sem "arrependimento"); isso vai dito antes.
- **Backups do provedor:** o plano gratuito do Supabase não faz cópia diária (conferir no painel); se Pro, as cópias do provedor expiram na janela dele. A política diz isso com a janela real.
- **Exportar** já existe (Conta › Dados); passa a aceitar a conta ativa. **Direitos do titular (LGPD)**: acesso/portabilidade = exportar; correção = editar no app; eliminação = excluir conta; revogar consentimento = sair e excluir.

## 7. Backup (as três camadas, só a 2ª nova nesta fase)

1. **Local (existe):** pacote cifrado manual + `ultimoBackupEm` + armazenamento persistente. A F4-A acrescenta **backup automático antes de subir esquema** e antes da migração.
2. **Nuvem manual (A6, recomendado antes da V1):** botão "Guardar cópia na nuvem". O pacote já sai cifrado (AES-256-GCM, PBKDF2) com uma frase que só a pessoa conhece; o servidor guarda bytes opacos em `backups/<uid>/AAAA-MM-DDTHH-MM-SS-<hash8>.arretado`. Mantém as 3 últimas. Restaurar = baixar, pedir a frase, **mostrar prévia**, snapshot local, aplicar. Perdeu a frase, perdeu a cópia (dito antes de cifrar). Três estados na tela: *salvo neste aparelho*, *com cópia na nuvem (data)*, *sincronizado* (só F4-B).
3. **Sincronização contínua (F4-B):** o log vira o backup remoto; o A6 deixa de ser o caminho principal, mas continua como cópia cifrada de segurança.

Por que o A6 antes da V1: sem ele, quem testa no iPhone confia em IndexedDB que o Safari pode limpar, e a V1 não tem sync. O custo é pequeno (Storage, fluxo manual) e reaproveita o pacote.

## 8. Esquema remoto

**F4-A (aditivo; arquivos novos em `supabase/migrations/`, cada um com o `drop` equivalente em `supabase/rollback/`):**

- `perfis` (RLS: `select` do próprio; sem `insert/update/delete` pelo cliente; criado por *trigger* `after insert on auth.users`; `aceitar_termos` security definer).
- `convites` (RLS ligada, sem política: ninguém do cliente toca) e a função do gancho `before-user-created` (execução só para `supabase_auth_admin`).
- Bucket privado `backups` com política por pasta (`(storage.foldername(name))[1] = auth.uid()::text`), limite de tamanho por objeto e tipo.
- Função/Edge Function de exclusão; `exclusoes` (só data e contagem, sem e-mail) para a política e a auditoria.
- **Expor o esquema `arretado` na API** (Settings › API › Exposed schemas): passo do Gabriel, lembrete já em `referencia.md`.
- Testes: PGlite (`supabase/rls.test.ts`) ganha: B não lê o perfil de A; cliente não escreve `direito_ia`/`beta`; ninguém lê `convites`; pasta de A inacessível a B; gancho rejeita e-mail fora da lista e aceita dentro. `verificacao-rls-remota.sql` ganha as mesmas verificações e roda depois de cada migração no projeto real.

**F4-B (já desenhado, adiado):** trocar o `check (colecao in (...))` de `registros` por validação do cliente (zod) + RLS (risco 5 da revisão); índice único `(usuario_id, aparelho_id, ts, registro_id)` em `alteracoes` para envio repetido ser idempotente; tabela de checkpoint.

## 9. Sincronização e conflito (F4-B, resumo para não fechar portas)

- **Envio:** o cliente manda as entradas do log com `seq` local maior que `ultimoSeqEnviado`, em lotes; o servidor é idempotente pela chave única. Interrompeu? Repete o lote.
- **Posse (D17):** um aparelho ativo por vez, com validade curta (`posse_aparelho`); os outros ficam em leitura e pedem posse. Elimina a maioria dos conflitos.
- **Recebimento:** puxa por `seq` do servidor e aplica pelo `tsLogico` (T7). Conflito de campo (mesmo registro, aparelhos diferentes sem posse, ou cópia restaurada) vira item em Conta › Conflitos, com as duas versões lado a lado; nunca sobrescreve em silêncio.
- **Tamanho:** conteúdo vindo do acervo (`Norma.origemAcervo`) **não sobe**: o servidor guarda só a referência (id + hash) e o aparelho recompõe da fonte estática. Só sobe o que a pessoa criou ou importou. Isso é a resposta ao risco 4 (log sem teto) e à correção do texto que reescreve ~5 mil textos.
- **Log de lote por referência (pedido da thread "Transições e carregamento", #141, 14/10):** adicionar uma Norma do acervo grava cada registro e **o copia inteiro no log** (CF/88 ≈ 10 s; "Tudo do edital", 175 normas ≈ 3 min; o download é 130 ms). Proposta: o lote de adesão grava no log **uma entrada por item** (`acervo-adesao`: `itemId`, `versao`, `hash`) em vez de uma por registro; corta cerca de metade da escrita (medido pela thread #141; transações menores e `durability: relaxed` não ajudaram). Consequências a tratar no pacote **AL**: (a) `reconstruirDoLog` e o desfazer passam a reidratar o item pela fonte do acervo, então os arquivos do acervo ficam **imutáveis por hash** e a ausência da fonte vira Problema explícito, nunca estado inventado; (b) o sync (F4-B) envia a referência, o que já é a regra "conteúdo do acervo não sobe"; (c) é mudança de **formato do log e do pacote** (versão de formato do `.arretado`; app antigo recusa com "atualize o app") e a tabela remota `alteracoes` precisa aceitar a nova `operacao`; (d) edições posteriores no registro continuam entradas normais, com estado de partida vindo da referência. Entradas antigas não são reescritas.
- **Checkpoint e poda:** entradas com `seq` ≤ checkpoint confirmado pelo servidor e mais velhas que 30 dias saem; teste de propriedade "estado reconstruído antes × depois da poda é igual".
- **Limite honesto:** a F4-A não promete nada disso; só garante que o `usuarioId` e o `aparelhoId` já estão certos quando a F4-B chegar.

## 10. Segurança e privacidade (critério de aceite da fase, R11)

| Ameaça | Controle |
|---|---|
| Uma pessoa ler dado de outra | RLS por `usuario_id`, `force row level security`, testes PGlite + verificação no projeto real a cada migração; banco local por conta |
| Chave de serviço vazar | Fica só em segredo de Edge Function; o cliente leva só a chave pública (publishable), que por desenho é pública. Varredura de segredos no CI |
| XSS roubar a sessão | CSP estrita, Trusted Types, sanitização (DOMPurify), sem HTML cru; origem de conexão única e exata |
| Cadastro por qualquer um / abuso | Gancho de convite na V1; limite de envio de e-mail do Auth; sem rota aberta de custo (a rota de IA só existirá com JWT, A2) |
| Troca de conta misturar dados | Um banco por conta; teste E2E de entrar A, sair, entrar B |
| Migração perder dado | Origem intocada, backup automático, verificação por hash, cópia anterior mantida |
| Aparelho emprestado | "Sair e apagar daqui"; sem dado de estudo no localStorage |
| Frase de cifra perdida | Dito antes; sem recuperação possível (por desenho) |
| Texto do usuário/IA virar comando | Fora da F4-A; regra mantida para a A2 |

**LGPD.** Controlador: o Gabriel (confirmar se pessoa física ou empresa antes da V1 e indicar o contato do encarregado); operadores: Supabase (região São Paulo) e Cloudflare; Google como provedor de login. Bases: consentimento (login, backup na nuvem) e execução do serviço. Minimização: nenhum rastreio, nenhum conteúdo de estudo, nenhum campo de diagnóstico. A **política passa a v3** (texto atual diz que será atualizada antes de qualquer dado sair): e-mail e dados do Google, onde ficam, por quanto tempo, como excluir, o que o provedor guarda de backup, transferência internacional do e-mail enviado pelo provedor de login. **Revisão por pessoa habilitada antes de convidar terceiros** é recomendada; o padrão, se o Gabriel não responder, é convidar só pessoas conhecidas, com aviso "versão de teste" e sem cobrança, e exigir a revisão antes da C1.

## 11. Decisões para o Gabriel (com padrão seguro)

Se ele não responder, o trabalho sem custo e sem conta externa segue (pacotes A1, A2 só em arquivo/teste, A0). O que cria conta externa, aplica migração no projeto real ou gasta dinheiro **espera o sim**.

| # | Decisão | Padrão recomendado | Custo |
|---|---|---|---|
| 1 | Métodos de login | Google + código por e-mail; Apple só na M1 | US$ 0 |
| 2 | Cliente OAuth do Google (Google Cloud, tela de consentimento em produção, só e-mail e perfil básico) | Criar; passos em §12 | US$ 0 |
| 3 | V1 só por convite (gancho no Supabase) | Sim | US$ 0 |
| 4 | Incluir o backup manual cifrado na nuvem (A6) antes da V1 | Sim | Storage gratuito (conferir limite) |
| 5 | Plano do Supabase na V1: o gratuito **pausa após 7 dias de pouca atividade** (confirmado na documentação); o servidor da F4-A guarda pouco e o estudo é local, então pausar não perde estudo | **Decidido com o Gabriel (14/10): ficar no gratuito**, com consulta leve diária agendada (GitHub Actions, pacote A7) para evitar a pausa; reativar é um clique no painel. Pro (≈ US$ 25/mês, conferir) só se a V1 crescer ou antes da F4-B (cópia diária, remetente de e-mail próprio) | US$ 0 |
| 6 | Exclusão imediata e definitiva | Sim | — |
| 7 | Revisão da política por pessoa habilitada antes da V1 | Recomendada; sem resposta, só conhecidos + aviso de teste | variável |
| 8 | Domínio próprio (e-mail remetente confiável, endereço fixo) | Adiar; não é necessário para a V1 com poucos convidados | ≈ R$ 40–80/ano |
| 9 | Registrar T26 (banco por conta), T27 (login PKCE + convite), T28 (backup cifrado na nuvem) em `decisoes-tecnicas.md` | Registrar junto do PR de cada pacote | — |

## 12. O que só o Gabriel faz (lista, quando o respectivo pacote chegar)

1. Supabase › Settings › API: expor o esquema `arretado`.
2. Supabase › Auth › URL Configuration: Site URL e as duas URLs de retorno (§4.2).
3. Google Cloud: projeto, tela de consentimento (escopos `email` e `profile`, publicada em produção para não ficar limitada a usuários de teste), cliente OAuth tipo Web, com a URL de retorno do Supabase (`…/auth/v1/callback`); colar ID e segredo em Supabase › Auth › Providers › Google.
4. Supabase › Auth › Hooks: ligar o *Before User Created* na função indicada pelo pacote A2.
5. Supabase › Auth › Providers › Email: manter a confirmação ligada e o login só por código.
6. Inserir os e-mails dos convidados (o pacote entrega o comando SQL pronto).
7. Aplicar as migrações no projeto real e rodar `verificacao-rls-remota.sql` (ou autorizar, por escrito, que a sessão aplique pelo conector).

## 13. Estratégia de entrega, pontos de salvamento e reversão

- **Tudo atrás de uma chave:** `VITE_CONTA=0` no build é o padrão e deixa o app **idêntico ao de hoje** (serviço nulo, CSP sem origem nova, sem import do supabase-js). Liga-se na `integracao`, testa-se, só então vai ao `main`.
- **Ponto de salvamento antes de cada pacote:** branch `backup/pre-f4a-<pacote>` (a partir da `integracao`; push de tag é recusado no ambiente) e branch `backup/AAAA-MM-DD` já criado pelo hook; no remoto, nada destrutivo (só migrações aditivas com o `drop` pronto). Pacote que mexe em dado (A4) exige, além disso, backup `.arretado` do Gabriel e revisão independente em outra sessão antes do merge.
- **Reversão:** local = desligar a chave e reverter o merge (a cópia anterior da migração permanece e o banco da conta pode ser exportado); remoto = rodar o `rollback` do pacote. A migração A4 não tem "desfazer" porque a origem nunca é alterada.
- **Um merge por pacote, sem squash, nunca no `main` (fluxo diário); no máximo 2 pacotes de código ao mesmo tempo.**
- **Observação sobre PRs de código:** cada um ganha `npm run check` verde, E2E (com `ServicoDeContaFalso` no Playwright; o projeto real só em fumaça manual com a conta de teste do Gabriel), axe nos dois temas, glossário e `solucao-de-problemas.md` atualizados.

## 14. O que torna a V1 possível

- Convidado entra com Google em um toque, vê o app de hoje, sem passo obrigatório além do login (D25).
- Cada pessoa isolada; "Apagar tudo e recomeçar" (exclui o banco local e os objetos da nuvem, mantém a conta) é o **ambiente reiniciável** do plano-mestre §6.
- Roteiro e métricas da V1 não mudam; o pacote A7 só entrega o necessário de infraestrutura (convite, reinício, política, aviso de teste, canal de relato já existente).
- Sem sincronização na V1: avisar claramente "seus dados ficam neste aparelho; guarde uma cópia".

## 15. Riscos e perguntas em aberto

- **Tamanho real por conta** (norma grande × log): medir na exportação do Gabriel (pacote A0) antes de prometer limite; estimativa de cota do plano gratuito só depois da medição.
- **Autovínculo de identidades** e e-mail não verificado: conferir configuração no painel.
- **Google em modo "teste"** limita usuários e expira consentimento em 7 dias: publicar a tela de consentimento antes da V1.
- **Tela em branco ao voltar do login** (CSP/Trusted Types, hash): coberto por E2E do pacote A3.
- **Safari/iOS** e `localStorage` da sessão em modo privado: o app cai para "sem conta" com aviso, não quebra.
- **Escopo do A6:** se o prazo apertar, é o primeiro a sair da F4-A, mas então a V1 deve avisar quem usa iPhone.
