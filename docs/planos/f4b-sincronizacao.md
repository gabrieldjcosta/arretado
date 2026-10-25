# F4-B Sincronização entre aparelhos: plano B0

Data: 20/10/2026 · Nível de risco: **A** em todos os pacotes · Autor: B0 (só documento; nenhum código, migração ou toque no Supabase real).
Pedido do Gabriel (20/10, 20:23Z): quem loga tem as mudanças salvas na conta e acha tudo igual em outro aparelho, sem ficar presa a um só.
**Decidido pelo Gabriel (20/10, 20:43Z):** dados de estudo ficam **legíveis só pelo dono, sob RLS, sem frase**. O A6 (cópia cifrada manual) segue como cópia extra opcional. **D17 não se reabre.**
Leitura de base: `f4a-contas.md` §8–§9, `f4a-fila-2026-10-18.md` §7, `especificacao-parte1.md` §19 (D1, D17, D18, D21), `decisoes-tecnicas.md` (T7, T8, T26–T28), `supabase/migrations/20260923000000_esquema_inicial.sql`, `src/core/persistencia/{banco,log,colecao}.ts`, `src/core/ids/index.ts`.

## 0. Resumo (o que muda e o que a pessoa vê)

- Entrou com a conta → o app envia sozinho cada alteração e puxa o que veio de outro aparelho. Sem frase, sem botão obrigatório. "Sincronizar agora" existe como atalho.
- Um aparelho edita por vez (posse). Quem só tem um aparelho nunca vê a palavra "posse".
- Duas versões do mesmo registro nunca se sobrepõem em silêncio: vão para **Conta › Conflitos**, lado a lado.
- Sem rede, tudo funciona como hoje (D1); o envio espera a rede.
- Três estados na tela (já exigidos no plano-mestre): **Salvo neste aparelho** → **Enviado à conta** → **Igual nos seus aparelhos**.
- Custo estrutural: política **v4** + novo aceite + termos de teste v2 + revisão jurídica antes de convidar desconhecidos; plano **Pro** do Supabase antes de ter quem sincroniza (§10).

## 1. `registros` × `alteracoes`: dois papéis, uma transação

O esquema inicial já tem as duas tabelas; o plano antigo só descrevia o log. Decisão:

| Tabela | Papel | Quem escreve | Quem lê |
|---|---|---|---|
| `alteracoes` | **Log**: verdade histórica, append-only, `seq` do servidor. Serve para o recebimento incremental e para auditar | só a função `enviar_lote` | o dono |
| `registros` | **Estado atual** de cada `(colecao, id)` com `ts_logico`. Serve para **aparelho novo começar** e para detectar divergência | só a função `enviar_lote` (o cliente perde `insert/update/delete` direto) | o dono |

**`enviar_lote(aparelho_id, versao_esquema, entradas[])`** (função SQL `security definer` com `search_path` vazio e dono sempre `auth.uid()`: o cliente perdeu a escrita direta, e a função exige a sessão e `perfis.sincronizacao_aceita_em`, coluna própria para não sobrescrever `termos_versao`; e `perfis.sincronizacao_liberada`, a trava por conta da Q2 que só o dono do serviço liga), numa transação:
1. Insere cada entrada em `alteracoes` com `on conflict do nothing` (índice único do §2). Entrada repetida = ignorada.
2. Para cada entrada nova, atualiza `registros`:
   - `gravar`/`atualizar`/`remover` carregam `base_ts` (o `tsLogico` do registro que o aparelho tinha ao editar; `null` se criou).
   - Se `registros.ts_logico` = `base_ts` (ou o registro não existe e `base_ts` é nulo): **avança** (`dados`, `ts_logico`, `atualizado_em`; `remover` grava `excluido_em` e mantém a última `dados` como lápide).
   - Se for diferente: **não avança**. A entrada fica no log marcada `divergente = true`. É a base da detecção de Conflito (§5). Conteúdo igual **também** diverge no servidor: `tsLogico` e `atualizadoEm` vão dentro do JSON de cada entrada, então dois lados nunca são byte a byte iguais. Dizer que duas versões são equivalentes (e adotar o maior carimbo) é do cliente, no B3.
3. Devolve `{ seq_max, divergentes: [{colecao, registro_id, ts_servidor}] }` para o aparelho avisar a pessoa.
- Regra de grão: **conflito é por registro** (não por campo). É mais conservador que o §9 antigo ("conflito de campo"), mas simples e nunca perde dado; com posse os casos são raros. Se a medição da V1/fumaça mostrar muito conflito falso, o refino por campo (usando `removidos`/chaves de `atualizar`) entra num pacote B3b.
- Colunas novas (migração aditiva em B1): `alteracoes.base_ts text`, `alteracoes.divergente boolean not null default false`, `alteracoes.versao_esquema smallint`, `registros.excluido_em` já existe.
- `acervo-adesao` (AL): `operacao` aceita o novo valor; `dados` = `ReferenciaDeAcervo` (id + versão + hash). **Não** vira linhas em `registros` (as árvores vêm do acervo estático). Ponto a verificar no B1: como o item aderido aparece em `adesoes`/`vinculos` (se há registro próprio, ele sobe normalmente; a referência é só para dispositivos e textos).

### Como um aparelho novo começa (e o que garante que não perde nada)

1. Lê `seq_corte = max(seq)` do usuário **antes** de tudo (RPC `instantaneo_inicio`).
2. Baixa `registros` por página (chave `(colecao, id)`, 500 por vez), valida cada um com o zod de `ENTIDADES`, grava no banco da conta (T26) **sem** gerar entradas de log de envio (marca `origem = servidor`) e chama `RelogioLogico.observar()` com o maior `ts_logico` visto.
3. Baixa as entradas `acervo-adesao` e reidrata dispositivos/textos pela fonte do acervo.
4. Puxa o log com `seq > seq_corte` (o que mudou durante a descida) e aplica pela regra do §5. Aplicar é **idempotente por `ts_logico`**: só substitui se o carimbo recebido for maior que o local; repetir ou sobrepor com a descida não estraga nada.
5. Só então grava `ultimoSeqRecebido` e libera a tela ("Pronto neste aparelho"). Interrompeu? Recomeça do passo 2 (a descida é retomável pelo cursor `(colecao, id)` salvo em `meta`).

Quando a pessoa já tem dados locais antes de logar (migração local→conta, A4): o banco da conta é quem sobe primeiro; o primeiro envio é o "carga inicial" em lotes (§2). Se a conta já tem dados na nuvem e o aparelho também tem os seus (mesmo uid, dois bancos), as três escolhas do A4 (§5.7 do `f4a-contas.md`) valem: ficar com a conta, ficar com o aparelho, ou **mesclar** (cada registro local sem par sobe; par diferente vira Conflito).

## 2. Envio idempotente

- **Índice único** em `alteracoes (usuario_id, aparelho_id, ts, registro_id)`. Tabelas estão com 0 linhas, então criar é seguro.
- **Cursor local** `ultimoSeqEnviado` em `meta` (por aparelho e conta). O cliente lê o log local com `seq > ultimoSeqEnviado`, em lotes de **≤ 200 entradas e ≤ 1 MB** (o RPC rejeita acima de 500 / 2 MB). Só avança o cursor depois da resposta `ok` do servidor.
- **Retomada:** queda no meio = o mesmo lote vai de novo; o servidor ignora o repetido. Backoff exponencial (2 s → 5 min), reinício ao voltar a rede ou a aba ficar visível. Nada de laço a cada gravação: o envio é agendado (≤ 5 s após a última gravação, junta o que veio no intervalo).
- **Carga inicial:** a mesma fila, em ordem de `seq`; barra "Enviando 1.240 de 8.300". Pode ser pausada fechando o app.
- **`acervo-adesao`** sobe como uma entrada de referência (já é uma entrada por item no log local). Conteúdo do acervo não sobe.
- **"Sincronizar agora":** envia, puxa, mostra o resultado e a hora; é o único botão de sync, no fim da tela Conta › Sincronização.
- **Falhas:** erro de rede = silencioso e repete; erro 4xx do servidor (dado recusado) = **Problema** (não Erro) com o motivo, e a entrada fica numa quarentena local, nunca é apagada nem reenviada em laço.
- **Limite por registro:** `check (pg_column_size(dados) < 1048576)` no servidor.

## 3. Checkpoint e poda

Dois logs crescem (local e remoto). Regras:

- **Aparelhos conhecidos:** tabela nova `aparelhos_sync (usuario_id, aparelho_id, ultimo_seq_recebido, versao_esquema, visto_em)`, atualizada a cada puxada.
- **Poda remota** (função agendada semanal, só migração aditiva + job): apaga de `alteracoes` as entradas com `seq ≤ min(ultimo_seq_recebido)` dos aparelhos vistos nos últimos 90 dias **e** com mais de 30 dias. Um aparelho parado há mais de 90 dias deixa de contar; ao voltar, faz **recarga completa** (§1) em vez de puxar o log. Lápides de `registros` (`excluido_em`) saem após os mesmos 90 dias.
- **Poda local:** entradas com `seq ≤ ultimoSeqEnviado` confirmado e mais de 30 dias saem do log local. Custo aceito: "Desfazer" só alcança o que está no log (hoje e nos últimos 30 dias de dados já enviados). Isso entra no texto da tela.
- **Teste de propriedade** (gerador com semente fixa, sem dependência nova; `fast-check` não está no projeto): para N logs aleatórios (gravar/atualizar/remover/acervo-adesao, vários aparelhos), `reconstruirDoLog(log completo) = reconstruirDoLog(checkpoint de estado + log podado)`, para qualquer ponto de corte válido; e repetir a poda não muda nada.
- Para a poda ser verdadeira, o **checkpoint é o estado em `registros`**, não um resumo novo: o servidor já tem o estado; o aparelho que recarrega usa `registros`. Não existe outra tabela de checkpoint (corta uma peça do rascunho antigo).

## 4. Posse de aparelho (D17, sem reabrir)

`posse_aparelho` já existe (`usuario_id` PK, `aparelho_id`, `ate`). A função `pedir_posse(aparelho_id)` é a única forma de mudar a linha.

- **Concessão automática** (sem pergunta) quando: não há dono; o `ate` do dono venceu; o dono **soltou** (fechou o app ou a aba ficou oculta por mais de 60 s, `soltar_posse` best-effort com `fetch keepalive`); ou o dono é o próprio aparelho.
- **Pergunta** ("Você está usando outro aparelho agora. Passar a editar aqui?") só se o dono renovou há menos de 60 s **e** a aba dele está visível. Resposta "sim" faz o dono perder a posse na próxima renovação (≤ 30 s), depois de **descarregar o que tem pendente**.
- **Renovação:** a cada 30 s com a aba visível e o app em uso; validade 2 min. Sem rede: o aparelho dono segue editando (a validade vencida não o bloqueia sozinha, ver abaixo).
- **Sem posse e com rede:** somente leitura, com o botão "Editar neste aparelho" (que cai na regra acima). Quem só tem um aparelho recebe posse sem ver nada.
- **Offline (pergunta ao Gabriel, §14, Q1):** local-first manda não bloquear estudo. Recomendação: **aparelho sem posse e sem rede edita mesmo assim**, com aviso discreto "Sem confirmar qual aparelho está ativo"; o `base_ts` e o §5 apanham qualquer divergência depois. Bloquear em somente leitura offline pode deixar a pessoa sem estudar no ônibus.
- **Posse não é segurança**, é redução de conflito. A defesa real é o RLS.
- Estado de posse aparece junto do §0 (tela: AGUARDA THREAD DE UI).

## 5. Recebimento e Conta › Conflitos

- **Puxada:** `seq > ultimoSeqRecebido`, em páginas; ignora as entradas do próprio aparelho; para cada entrada válida no zod:
  1. `RelogioLogico.observar(ts)` (nunca emitir carimbo menor que o visto).
  2. Registro local inexistente → aplica. Existente com `tsLogico` = `base_ts` da entrada → **avança** (aplica pela mesma `Colecao`, marcando `origem = servidor` para não reenviar).
  3. Existente com `tsLogico` ≥ `ts` da entrada → já tem (idempotente), ignora.
  4. Existente e diferente da base (houve edição local não vista) → **Conflito**.
- **Conflito:** item em tabela interna local `conflitos` (não é entidade, não sobe): `{ id, colecao, registroId, minha, deles, aparelhoDeles, em }`. O registro local **fica como está** até a pessoa decidir. Conta › Conflitos lista os itens; cada um mostra as duas versões lado a lado (campos diferentes destacados, rótulo do aparelho e hora) com **Ficar com a daqui / Ficar com a de lá / Escolher campo a campo**. A escolha gera uma entrada normal com carimbo novo e `base_ts` = o do servidor; ela avança no servidor e fecha o conflito nos outros aparelhos.
- **Remoção × edição:** remoção remota de registro editado localmente também é Conflito ("Foi apagado no outro aparelho; você mudou aqui").
- **Dado inválido recebido** (falha no zod ou coleção desconhecida): vai para quarentena + Problema, não é aplicado e **não trava o cursor** (avança, anotando `seq` pulado).
- **Gatilhos:** abrir o app, voltar o foco, a cada 60 s com a aba visível, após cada envio, e "Sincronizar agora". Sem Realtime na primeira versão (evita `wss://` na CSP e custo de conexões); decide-se depois da fumaça.
- **Atenção a registros "por aparelho":** `aparelhos` sincroniza (cada um escreve só o seu); `preferencias` sincroniza, **exceto** campos de aparelho (tema, movimento, tamanho de letra, `temporizadorPadraoMin`? a definir no B1 com a lista completa). Pergunta Q3.
- **Telas** (Conta › Sincronização, Conta › Conflitos, selo dos três estados): AGUARDA THREAD DE UI. A lógica entrega funções puras e marcação semântica; vocabulário: **Aparelho**, **Problema** (não "erro"), nada de "merge", "commit" ou "sync" na tela ("Sincronizar agora" é aceito, já usado na D17).

## 6. Anexos binários

- **Entram**, mas **depois** dos registros (pacote B2b, depois do B3): o registro `anexos` (nome, tipo, tamanho, `hash`) sobe como qualquer outro; o conteúdo (`anexosConteudo`) vai para o Storage em bucket privado `anexos`, caminho `<uid>/<hash>` (endereçado pelo conteúdo: sobe uma vez, mesmo que dois registros apontem).
- Política de pasta igual à do bucket `backups` (`(storage.foldername(name))[1] = auth.uid()::text`), limite por objeto **10 MB** (confirmar o limite que o app já aplica ao colar print e usar o menor dos dois) e tipos permitidos (imagens e PDF).
- Baixa **sob demanda** (ao abrir o anexo) ou em segundo plano só no Wi-Fi quando o aparelho disser; sem conteúdo, o registro mostra "Imagem ainda não baixada neste Aparelho".
- `snapshotsConteudo` (pontos de restauração) **não sobe**: é do aparelho.
- Cota de anexos por conta, a medir (plano gratuito: 1 GB de Storage no total). Excluir a conta apaga os objetos (a função `excluir-conta` já limpa `backups/<uid>`; B2b estende).

## 7. Compatibilidade entre versões do app e mudanças de esquema depois da sync

- Cada entrada leva `versao_esquema` (hoje 9, `VERSAO_ESQUEMA`). `aparelhos_sync` guarda a versão de cada aparelho.
- **Aparelho com app mais antigo** que a entrada: **para de aplicar** naquele `seq` (não avança o cursor além), continua usando e **enviando** normalmente (o app novo sabe ler o antigo), e mostra "Atualize o Arretado para continuar recebendo". Nada é descartado; ao atualizar, retoma.
- **Aparelho mais novo recebendo entrada antiga:** aplica normalmente (campos novos são opcionais).
- **Regras para toda mudança de esquema depois da sync (acrescentam-se ao `banco.ts`):**
  1. Só **aditiva**: coleção nova, campo opcional, índice novo local. Sem renomear nem remover campo.
  2. **Nenhuma transformação de registro no `upgrade` do Dexie.** Se for inevitável, a migração roda *depois de abrir*, pelas `Colecao` (como `migrarFrasesDosErros`), para gerar entradas de log que sincronizam.
  3. Coleção nova **não exige** migração no servidor (o §8 remove o `check`).
  4. Subir `VERSAO_ESQUEMA` continua pedindo backup do Gabriel antes do merge no `main`; acrescenta: aparelho com a aba antiga recarrega pelo `versionchange` já existente.
- O app antigo ainda instalado em outro aparelho **não é desligado**; só deixa de receber.

## 8. Servidor sem `check (colecao in (...))`

- Migração aditiva (B1): remove o `check` de `registros` e a lista fixa; no lugar, `check (colecao ~ '^[A-Za-z]{2,40}$')`. Hoje faltam `ciclos` e o conjunto da migração `20261019000000` não foi aplicada no real; o B1 não depende dela.
- A **verdade** sobre o que é uma coleção válida passa a ser o `ENTIDADES` do cliente + zod, aplicado ao enviar **e** ao receber (o servidor não confia no cliente; o RLS protege o dono, e a validação protege os outros aparelhos dele).
- O teste de deriva `ENTIDADES × SQL` vira teste de propriedade: **toda** coleção de `ENTIDADES` com módulo passa por `enviar_lote` no PGlite e volta íntegra.
- Rollback do B1 em `supabase/rollback/` (volta o `check` antigo com a lista atual e remove as colunas novas; seguro enquanto as tabelas estão vazias).

## 9. Política v4 e termos de teste v2 (rascunho do que muda)

**Estes textos são rascunho de trabalho; a revisão jurídica e o preenchimento dos `[A DEFINIR]` são do Gabriel.** A v3 diz "nada do seu estudo vai para o servidor". A v4 muda o resumo e as seções abaixo; o resto da v3 (operadores, direitos, exclusão) fica.

> **Resumo (v4).**
> - Sem conta, nada muda: seus dados ficam neste Aparelho.
> - Com conta, o que você estuda **é guardado na sua conta no servidor** e aparece em todos os seus Aparelhos: Erros, Cartões, Normas, grifos, notas, Revisões, Sessões, Dias e preferências.
> - Esses dados ficam **legíveis só por você** (regras de acesso no banco impedem que outra conta os veja). Por não serem cifrados com uma frase sua, **a equipe que administra o serviço consegue tecnicamente lê-los**; só acessamos para manter o serviço e quando você pedir ajuda. [A DEFINIR PELO GABRIEL: quem administra, em que situações acessa, como fica registrado.]
> - Não pedimos nem guardamos diagnóstico. **Não escreva dados de saúde nas suas notas**: elas vão para o servidor.
> - Você escolhe: sem conta, nada sai. Pode sair a qualquer momento e excluir a conta; a exclusão apaga na hora, de forma definitiva, tudo o que está na conta.

Seções a reescrever:
1. **"O que sai do Aparelho"**: a lista passa a incluir os dados de estudo e os anexos; deixa claro que **conteúdo do acervo (leis, súmulas) não sobe**, só a referência.
2. **"Onde cada dado fica"**: linha nova para `registros`, `alteracoes`, `posse_aparelho`, `aparelhos_sync`, bucket `anexos`; quem lê (o dono); tempo de guarda do **log** (30 dias após confirmado por todos os Aparelhos) e dos registros (enquanto a conta existir).
3. **Cópia cifrada (A6)**: passa a "cópia extra opcional, só com a frase"; avisar que ela **não é necessária** para sincronizar.
4. **Cópias do provedor**: o plano Pro faz cópia diária; ao excluir a conta, o dado some do banco na hora e das cópias do provedor em até [CONFERIR: janela de retenção do Supabase Pro, hoje 7 dias].
5. **Bases legais**: consentimento para a sincronização (novo aceite, específico, separado do aceite do login), execução do serviço.
6. **Aparelho emprestado**: "Sair e apagar daqui" apaga o banco local; os dados continuam na conta.
7. **Sem rastreio, sem venda, sem treino de IA com seus dados**, texto mantido e reforçado (não existe IA no servidor hoje).

**Aceite novo:** `v4:sincronizar`, gravado no Aparelho (`Usuario.consentimentos`) e, no servidor, na RPC `aceitar_sincronizacao(versao)` (grava `perfis.sincronizacao_versao` e `sincronizacao_aceita_em`, colunas próprias para não sobrescrever `termos_versao`; decisão D2 do `f4a-fila`, que agora **deixa de ser adiável**: sem aceite no servidor, o servidor não aceita `enviar_lote`). Quem não aceita continua com a conta como hoje (só login e cópia cifrada).
**Termos de teste v2:** troca a linha "Seus dados de estudo ficam no seu Aparelho. Não há sincronização" por "os dados ficam no Aparelho **e** na sua conta quando a sincronização estiver ligada; é uma função de teste, pode falhar; guarde uma cópia mesmo assim"; mantém "sem garantia".
**Não confundir:** o aceite do login continua v3 para quem não ativa a sincronização; a sincronização é um **interruptor próprio** (Conta › Sincronização, desligado por padrão no início; ligado por padrão só depois do portão da F4-B).
**Condição de convite:** com sincronização ligada, **só pessoas conhecidas** até a revisão jurídica.

## 10. Custo e plano Pro do Supabase

- Gratuito (hoje): pausa após 7 dias sem atividade, **sem cópia diária**, limites de banco e Storage pequenos para um log que guarda registros inteiros. Sincronizar passa a ser a única cópia fora do aparelho; sem backup do provedor, uma falha do servidor perde estudo.
- **Quando passar ao Pro (≈ US$ 25/mês, a conferir na página de preços no dia da decisão): antes de alguém além do Gabriel ligar a sincronização.** Antes disso, só o Gabriel e com o `.arretado` exportado como rede de segurança.
- **A medir no B2** (antes de prometer limite): tamanho do log e de `registros` com a carga inicial real do Gabriel (A0 mediu a exportação; B2 mede o que sobe) e crescimento por Dia de uso. A poda do §3 e o `acervo-adesao` por referência existem justamente para segurar isso.
- Egress: puxada incremental é pequena; a recarga completa de aparelho novo é a pior; medir.
- Custo adicional possível e **não decidido**: remetente de e-mail próprio, domínio, Realtime.
- Decisão do Gabriel (Q2): sim/não ao Pro e quando.

## 11. Estratégia de teste

| Camada | Como | O que prova |
|---|---|---|
| Servidor | **PGlite** (já no projeto) com o SQL real das migrações e `rls.test.ts` ampliado | RLS (B não lê nem escreve em A, inclusive por `enviar_lote`); idempotência (mesmo lote 2×); `base_ts` divergente não avança `registros`; `remover` deixa lápide; limites de tamanho; toda coleção de `ENTIDADES` passa |
| Cliente | **Dois bancos Dexie** com `fake-indexeddb` (já no projeto) e um "servidor" em memória que chama o mesmo PGlite; relógios injetáveis | convergência: aparelhos A e B com sequências aleatórias de operações, com posse alternando, terminam iguais; sem posse e edição cruzada gera Conflito, nunca perda; queda no meio do lote; aparelho novo durante edições (passo 4 do §1) |
| Propriedade | gerador com semente fixa (falha reprodutível) | poda não muda o estado (§3); aplicar a mesma puxada 2× é igual a 1×; ordem de chegada de lotes não muda o resultado quando respeita `seq` |
| Compatibilidade | log com `versao_esquema` maior que a do app | para sem perder, retoma depois da atualização |
| E2E (Playwright, 3 aparelhos) | serviço de sync falso no mesmo padrão do T30 (build de teste, fora da produção); dois contextos de navegador = dois Aparelhos | fluxo ligar, editar, ver no outro, Conflito lado a lado, sair e entrar; axe nos 2 temas |
| Fumaça real | Gabriel com **2 aparelhos reais** (PC e celular), uma conta de teste e o projeto real; roteiro no pacote B6 | rede real, Safari/iOS, RLS no real (`verificacao-rls-remota.sql` ganha as verificações novas) |
| Mutação | cada critério de aceite com uma mutação que o derruba (padrão da T2) | testes não são decorativos |

## 12. Pacotes (contratos resumidos; viram arquivos em `docs/planos/tarefas/` ao despachar)

Ordem: B1 → B2 → B3 → B4 (+B2b) → B5 → B6. Máximo 2 tarefas de código em paralelo. **Opus 5.5 planeja e revisa todos; construtor sugerido: Sonnet 5.5 médio, exceto B3 (Opus, esforço alto).** Backup manual do Gabriel + revisão independente (sessão nova) antes de cada merge na `integracao` que toque persistência ou servidor. Aplicar migração no projeto real só com o **sim do Gabriel por escrito**.

| Pacote | O quê | Risco | Portão (aceite) | Quem decide |
|---|---|---|---|---|
| **B1 Esquema remoto** | Migração aditiva + rollback: `enviar_lote`, `instantaneo_inicio`, `pedir_posse`, `soltar_posse`, `aparelhos_sync`; colunas `base_ts`, `divergente`, `versao_esquema`; índice único; remover `check` de coleção; cliente perde escrita direta em `registros`; `acervo-adesao` na `operacao`; `aceitar_sincronizacao('v4:sincronizar')` | A | testes PGlite do §11 verdes; `verificacao-rls-remota.sql` ampliado; rollback testado | Gabriel (aplicar no real) |
| **B2 Envio** | Serviço de sync em `src/integracoes/conta/sync/` (porta + implementação Supabase + falsa); fila, lotes, cursor, backoff, carga inicial, quarentena; interruptor de sincronização e aceite `v4:sincronizar` | A | dois bancos locais enviam e o PGlite recebe idêntico; lote repetido 2× = 1×; queda no meio retoma; sem rede nada quebra; `npm run check` e teto do pacote JS (**import() separado; o teto 428 kB é medido no PR**) | Gabriel (teto, se estourar) |
| **B2b Anexos** | Bucket `anexos`, envio por hash, download sob demanda, cota e limite | A | anexo sobe uma vez; outro aparelho baixa ao abrir; exclusão de conta apaga os objetos | Gabriel (limite/cota) |
| **B3 Recebimento e Conflitos** | Puxada, aplicação por `tsLogico`/`base_ts`, `observar`, recarga completa de aparelho novo, tabela interna `conflitos`, lógica de resolução (funções puras), quarentena de dado inválido, parada por versão mais nova | A, **o maior** | propriedade de convergência; Conflito nunca perde dado; aparelho novo durante edições; sem conflito falso nos casos de posse | Gabriel (textos de Conflito com a thread de UI) |
| **B4 Posse e estados** | `pedir_posse`/`soltar_posse` no cliente, renovação, somente leitura sem posse, três estados "Salvo / Enviado / Igual", Conta › Sincronização e Conta › Conflitos (UI) | A + UI | passagem automática quando o outro está parado; pergunta só com o outro em uso; E2E 3 aparelhos + axe | Gabriel (Q1) + thread de UI |
| **B5 Poda** | Função agendada de poda remota, poda local, `aparelhos_sync`, recarga ao voltar depois de 90 dias | A | teste de propriedade do §3 | Gabriel (retenções) |
| **B6 Portão F4-B** | Roteiro de fumaça com 2 aparelhos reais, `verificacao-rls-remota.sql`, medição de tamanho e egress, relatório, política v4 publicada | A | critérios do plano-mestre (linha da F4-B): um aparelho ativo; offline e reconexão; envio interrompido e repetido; conflito mostrado, nunca sobrescrito; "salvo" ≠ "enviado" ≠ "igual"; restaurar de backup verificado; isolamento RLS testado | Gabriel |

Cada contrato, ao ser despachado, segue o formato de `docs/planos/tarefas/` (Objetivo · Escopo e arquivos permitidos · Regras · Critérios · Verificação · Pare e pergunte se · Relatório final). Todos incluem: glossário e `solucao-de-problemas.md` atualizados; item de segurança/LGPD; sem rótulo clínico; vocabulário obrigatório.

**Dependências com o que já corre:** a fumaça A8 e a V1 seguem em paralelo (não há código de sync neste plano). A F4-B pode começar o B1 depois do **sim** do Gabriel e de mesclar a T4 (#241). O plano-mestre punha a F4-B depois da V1: com o pedido do Gabriel, **a política v4 e o Pro entram antes de qualquer convidado novo**, e o código (B1–B6) pode andar em paralelo à V1 de contas **desde que a sincronização fique atrás do interruptor desligado por padrão**.

## 13. Segurança e LGPD (item da fase, D18/R11)

- **RLS é a defesa:** `enviar_lote` é `security definer` com `search_path` vazio e dono sempre `auth.uid()`; `registros` e `alteracoes` só por ela; testes PGlite de B não toca A (inclusive tentando `usuario_id` de A no JSON).
- **Sanitização:** nada do que vem do servidor vira HTML; valida pelo zod antes de gravar; o texto que a pessoa colou continua passando pelo sanitizador no uso.
- **Privacidade:** dados legíveis pelo operador (dito na v4); minimização: acervo e snapshots não sobem; sem diagnóstico; aviso de notas.
- **Exclusão:** `on delete cascade` já cobre `registros`, `alteracoes`, `posse_aparelho`; a função de exclusão estende ao bucket `anexos`. Teste: criar dados, excluir a conta, verificar zero linhas e zero objetos.
- **Aparelho perdido:** futuro "Sair em todos os Aparelhos" (revogar sessão); fora do escopo, registrar.
- **Abuso:** limite de lote e tamanho por registro; limite de chamadas por usuário no Auth/PostgREST do Supabase (conferir configuração antes do portão); sem rota de custo.
- **CSP:** nenhuma origem nova (o Supabase já está permitido); sem `wss://` na primeira versão.
- **Trocar de conta no mesmo aparelho:** um banco por conta (T26) continua; a sincronização nunca lê nem grava o banco de outra conta (teste E2E existente estendido).

## 13b. Decisões do Gabriel (25/10/2026, cartões; valem sobre o texto acima)

| # | Escolha | Efeito no plano |
|---|---|---|
| Q1 | Sem posse e sem rede **edita, com aviso** | Como recomendado no §4 |
| Q2 | **Gratuito só com o Gabriel** (25/10: trava `perfis.sincronizacao_liberada`, ligada só nas 2 contas existentes) | Como o padrão: sem Pro agora; ninguém além do Gabriel sincroniza até contratar o Pro |
| Q3 | **Aparência e movimento locais** | Tema, movimento e tamanho de letra ficam por aparelho; metas e perfil sincronizam (§5) |
| Q4 | **Ligada ao entrar** (muda o plano) | Não há interruptor desligado por padrão. A sincronização liga para quem aceitar `v4:sincronizar` no login. **Tensão com Q2/Q7:** sem Pro e sem revisão jurídica, o convite precisa continuar limitado a conhecidos (gancho de convite ligado) e a v4 publicada **antes** do B2 ir ao `main`. No `integracao`/teste, o B2 pode ligar por interruptor de build até lá |
| Q5 | **Log 30 dias, aparelho parado 90** | Como o §3 |
| Q6 | **10 MB por anexo** | Como o §6 |
| Q7 | **Só conhecidos, aviso de teste** | Como o padrão; revisão jurídica não bloqueia |
| Q8 | **Esquema v10 antes, num PR só do esquema** (muda o plano) | Novo pacote **B2s** antes do B3: sobe `VERSAO_ESQUEMA` para 10 com a tabela interna `conflitos` (sem mexer em registro), com backup manual do Gabriel e revisão independente; B3 passa a depender do B2s |

Itens a ajustar nos pacotes quando forem despachados: B4 troca "interruptor desligado" por "liga após o aceite"; B6 mede também o efeito de ligar por padrão; riscos 7 do §15 passa a "v4 publicada antes de qualquer `main` com envio ligado".

## 14. Perguntas ao Gabriel (cada uma com padrão seguro)

Respondidas em 25/10: ver §13b.

| # | Pergunta | Padrão se não houver resposta |
|---|---|---|
| Q1 | Aparelho **sem posse e sem rede**: pode editar (com aviso) ou fica só em leitura (D17 estrito)? | **Edita com aviso**; conflitos cobrem. Não bloqueia estudo |
| Q2 | **Supabase Pro** (≈ US$ 25/mês, conferir): sim, e a partir de quando? | Só o Gabriel liga a sincronização no gratuito, com exportação em dia; ninguém mais até o Pro |
| Q3 | Quais preferências ficam **só do aparelho** (tema, movimento, tamanho de letra...)? | Tudo o que for aparência/movimento fica local; metas e perfil de estudo sincronizam |
| Q4 | Sincronização **desligada** por padrão até o portão da B6? | Sim |
| Q5 | Retenções: log 30 dias, aparelho parado 90 dias, lápides 90 dias | Como no §3 |
| Q6 | Limite de anexo (10 MB) e cota por conta | 10 MB; cota a medir no B2b |
| Q7 | Revisão jurídica da v4 e os `[A DEFINIR]` (controlador, encarregado, quem administra e em que situações acessa, canal) | Só conhecidos, aviso de teste, sem cobrança |
| Q8 | Quando mesclar `integracao`→`main` com o esquema local v10 (tabela interna `conflitos`)? | Junto com B3, com backup manual do Gabriel |

Registrar T31 (sincronização: `registros` como estado, `enviar_lote`, conflito por registro, posse, regras de esquema) em `decisoes-tecnicas.md` **no PR do B1**, quando o Gabriel aprovar este plano.

## 15. Riscos principais

1. **Perder dado na recarga/mesclagem** → origem nunca alterada; log local não é podado antes do envio confirmado; propriedade do §3 e convergência do §11.
2. **Conflito demais** → posse + conflito por registro (conservador); medir na fumaça antes de refinar por campo.
3. **Log e Storage estourarem a cota** → `acervo-adesao` por referência, poda, medição no B2, Pro.
4. **iOS Safari** (`fetch keepalive`, aba suspensa) → posse expira sozinha pela validade; envio retoma ao reabrir.
5. **Relógio do aparelho errado** → T7 já ordena por carimbo híbrido; `observar()` na recepção.
6. **Cadastro aberto agora** (gancho de convite desligado): antes de ligar a sincronização, o gancho tem de estar ligado (item para o Gabriel; estado em 20/10).
7. **Política atual contradiz o produto** → v4 antes de ligar qualquer envio; o B2 só entrega com o interruptor desligado.

## Passagem de bastão

Tarefa: B0 Sincronização · Branch: `claude/project-thread-ry4w4b` · Feito: este plano (somente leitura de código e docs; nada executado contra o Supabase) · Verificado: lido o esquema inicial, `log.ts`, `banco.ts`, `ids/index.ts`, política v3, termos v1, `f4a-contas.md` e `f4a-fila`; **não verificado**: como `adesoes` representa o item aderido (checar no B1), limite atual de anexo no app, preços e retenção do Supabase Pro (conferir no dia) · Próxima ação: Gabriel responde Q1–Q8 (ou aceita os padrões) e libera o B1 · Decisões que não se reabrem: D17, dados legíveis só pelo dono sem frase (20/10), local-first (D1).
