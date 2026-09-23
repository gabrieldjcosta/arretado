# Arretado — Glossário de código

Vocabulário canônico da interface → identificadores realmente usados no código. Fontes de verdade, nesta ordem: o código (`src/`, `eslint/`, `supabase/migrations/`); depois [`decisoes-tecnicas.md`](decisoes-tecnicas.md), [`formato-pacote.md`](formato-pacote.md), Parte 1 §5, §6 e §19, Parte 2 §10.6 e [`planos/F2.md`](planos/F2.md). Conferido contra o código em 23/09/2026 (F0, F1, plano da F2 e atividade 7.1).

**Regra de manutenção:** criar entidade, campo comum, evento, pasta, operação ou termo novo exige atualizar este glossário no mesmo commit. Faz parte da definição de pronto de cada atividade (`planos/F2.md`, "Rotina de cada atividade").

**Situação:** *em uso* = lido ou gravado por código de produção (fora de testes); *só esquema* = esquema zod, coleção Dexie, pacote e remoto prontos, sem serviço nem tela; *planejado* = nomeado no plano ou na especificação, sem código; *proposto* = nome sugerido aqui pela regra de nomes, a confirmar na atividade indicada.

## 1. Regra de nomes

Nenhuma decisão T trata de nomes (o glossário antigo — commit `be90ca0`, de uma F0 alternativa nunca mesclada, preservada na tag `arquivo/f0-alternativa-biome` — atribuía a regra à T14, que lá era Nomenclatura e aqui é Datas). Vale a regra abaixo, que é a que o código segue. As decisões que fixam tipos-base: T5 (o esquema zod é a fonte do tipo), T6 (`id` UUIDv7), T7 (`tsLogico`), T14 (`Instante`, `DataCivil`). O vocabulário é o da D24 (§5 abaixo).

| Elemento | Forma | Exemplos reais |
|---|---|---|
| Qualquer identificador | PT-BR **sem acento e sem cedilha**; acento só em texto de interface e comentário | `Sessao`, `revisoes`, `acaoRecomendada` |
| Esquema zod e tipo inferido | `PascalCase`, singular, mesmo nome para os dois; composto com "De" | `Erro`, `VersaoDeNorma`, `TextoDeDispositivo`, `RelatoDeProblema` |
| Coleção (chave de `ENTIDADES` = tabela Dexie = `colecao` no Supabase) | `camelCase` no plural, **sem o "De"** | `versoesNorma`, `textosDispositivo`, `logsImportacao`, `eventosCalendario`; exceção: `relatos` (de `RelatoDeProblema`) |
| Campo, função, variável | `camelCase`; operação que grava começa por verbo; consulta pode ser substantivo (`filaDoDia`, `historicoRevisoes`) | `proximaRevisao`, `registrarErro`, `criarCartaoDeErro` |
| Referência a outro registro | `<entidade>Id`; lista `<entidade>Ids`; papel qualificado quando não é a entidade pura | `erroId`, `versaoId`, `pacoteId`, `paiId`, `alvoId`, `herdadaDeId`, `disciplinaIds` |
| Valor de enum; constante | enum em minúsculas, `snake_case` sem acento; constante em `UPPER_SNAKE_CASE` | `acertou_inseguro`, `com_cartao`, `a_confirmar`; `ENTIDADES`, `LIMITE_MAXIMO_PAGINA` |
| Classe de exceção | `PascalCase` pelo motivo, **sem "Erro"** (D24) | `RegistroInvalido`, `PacoteRecusado`, `ImportacaoInvalida`, `RelatoRecusado`, `CsvInvalido` |
| Evento | `entidade.acao`, entidade no singular, ação em `camelCase` | `erro.registrado`, `cartao.revisado`, `registro.lote` |
| Pasta, arquivo, rota | pasta em minúsculas; `.ts` em `kebab-case`; componente React `.tsx` em `PascalCase` (exceções: `componentes/estados.tsx`, que reúne vários, e a entrada `main.tsx`); teste `<nome>.test.ts` ao lado; rota em minúsculas | `json-canonico.ts`, `RegistrarErro.tsx`, `/recall/registrar` |
| Coluna no Supabase | `snake_case`; o JSON em `dados` mantém `camelCase` | `usuario_id`, `ts_logico`, `excluido_em` |

- `origem` sozinho, no nível do registro, é sempre o campo comum (dentro de sub-registro há `Ponto.logPrioridade[].origem`, do tipo `OrigemPrioridade`); origens específicas levam qualificador (`origemTipo`, `origemEntrada`, `origemDeteccao`, `OrigemPrioridade`). **Divergência:** `Estrela.tipoOrigem` inverte a ordem de `Cartao.origemTipo` (ver §13).
- `estado` em Cartão e Sessão (ciclo de uso); `status` nas demais entidades, como na especificação. Nunca os dois na mesma entidade.

## 2. Entidades

Esquemas em `src/core/modelo/`: **S** `sistema.ts`, **P** `plano.ts`, **R** `recall.ts`, **L** `legislacao.ts`, **B** `biblioteca.ts`. Registro único: `ENTIDADES` (`src/core/modelo/index.ts`) dirige o banco local, o pacote e a validação. No Supabase, toda coleção com módulo vai para `arretado.registros` (coluna `colecao` + JSON em `dados`); `catalogo` indica que a coleção também cabe em `arretado.catalogo` (F7); "—" = só local, nunca sai do aparelho.

| Vocabulário | Esquema | Coleção Dexie | Supabase | Situação |
|---|---|---|---|---|
| Usuário | `Usuario` (S) | `usuarios` | registros | em uso (identidade local) |
| Aparelho | `Aparelho` (S) | `aparelhos` | registros (+ `posse_aparelho`, F4) | em uso |
| Preferências | `Preferencias` (S) | `preferencias` | registros | em uso |
| Fonte | `Fonte` (S) | `fontes` | registros | só esquema |
| Anexo (arquivo) | `Anexo` (S) | `anexos` + bytes em `anexosConteudo` | registros | só esquema (o pacote já leva o conteúdo; F2 9.2 guarda a fonte da norma) |
| Tag | `Tag` (S) | `tags` | registros | só esquema |
| Vínculo | `Vinculo` (S) | `vinculos` | registros | só esquema (F3) |
| Concurso | `Concurso` (P) | `concursos` | registros | só esquema (F4) |
| Fase / Prazo | `FasePrazo` (P) | `fasesPrazos` | registros | só esquema (F4) |
| Edital | `Edital` (P) | `editais` | registros | só esquema |
| Disciplina | `Disciplina` (P) | `disciplinas` | registros | em uso (importação de pontos, F1) |
| Ponto | `Ponto` (P) | `pontos` | registros | em uso (importação CSV; vínculo opcional no Erro) |
| Dia | `Dia` (P) | `dias` | registros | só esquema (F3) |
| Sessão | `Sessao` (P) | `sessoes` | registros | só esquema (F3) |
| Erro | `Erro` (R) | `erros` | registros | em uso |
| Cartão | `Cartao` (R) | `cartoes` | registros | em uso |
| Revisão | `Revisao` (R) | `revisoes` (append-only) | registros | em uso |
| Norma | `Norma` (L) | `normas` | registros, catalogo | só esquema (F2) |
| Versão de norma | `VersaoDeNorma` (L) | `versoesNorma` | registros, catalogo | só esquema (F2) |
| Dispositivo | `Dispositivo` (L) | `dispositivos` | registros, catalogo | só esquema (F2) |
| Texto de dispositivo | `TextoDeDispositivo` (L) | `textosDispositivo` | registros, catalogo | só esquema (F2) |
| Marcação | `Marcacao` (L) | `marcacoes` | registros | só esquema (F2, 11.4) |
| Estrela | `Estrela` (L) | `estrelas` | registros | só esquema (F2, 11.2) |
| Leitura ("lido até", posição) | `Leitura` (proposto) | `leituras` (planejado, 9.1) | registros (exige migração) | planejado (F2, 9.1) |
| Pacote de incidência | `PacoteDeIncidencia` (L) | `pacotesIncidencia` | registros, catalogo | só esquema (F7) |
| Adesão | `Adesao` (L) | `adesoes` | registros | só esquema (F7) |
| Precedente | `Precedente` (B) | `precedentes` | registros | só esquema (F5) |
| Nota | `Nota` (B) | `notas` | registros | só esquema (F5) |
| Achado | `Achado` (B) | `achados` | registros | só esquema (F7) |
| Evento de calendário | `EventoDeCalendario` (B) | `eventosCalendario` | registros | só esquema (F4) |
| Relato de problema | `RelatoDeProblema` (S) | `relatos` | registros | em uso (fila local até a F4) |
| Log de importação | `LogDeImportacao` (S) | `logsImportacao` | — | em uso |
| Snapshot ("Ponto de restauração" na interface) | `Snapshot` (S) | `snapshots` + bytes em `snapshotsConteudo` | — | em uso |
| Espaço separado | `Espaco` (S) | `espacos` | — | em uso |

- **Tabelas Dexie fora de `ENTIDADES`** (`src/core/persistencia/banco.ts`, `BancoArretado`, `VERSAO_ESQUEMA = 1`, banco `arretado`): `alteracoes` (log), `meta` (chave `identidade` = `{ usuarioId, aparelhoId }`), `anexosConteudo`, `snapshotsConteudo` (`Conteudo { id, bytes }`).
- **Demais tabelas remotas** (`arretado.*`, além de `registros`): `alteracoes` (espelho do log local), `posse_aparelho`, `curadores`, `catalogo`. O teste de deriva (`supabase/rls.test.ts`) exige que a lista `colecao in (...)` do `create table arretado.registros` seja igual às coleções com módulo.
- **Leitura (9.1):** como `esquemaV1()` é derivado de `ENTIDADES`, convém congelar a lista da v1 antes de declarar `version(2)` com `leituras`. No remoto, o teste de deriva falha assim que `leituras` entrar em `ENTIDADES` com módulo: é preciso migração nova alterando o `check` de `arretado.registros` e ajustar o teste, que hoje só lê o `create table`.

## 3. Campos comuns a toda entidade

Definidos em `camposComuns` (`src/core/modelo/comum.ts`) e controlados pela `Colecao`: `atualizar` recusa qualquer um deles (`NOMES_CAMPOS_COMUNS`).

| Campo | Tipo | Regra | Coluna no Supabase |
|---|---|---|---|
| `id` | `Id` (UUIDv7, T6) | gerado no cliente (`novoId`; na importação de pontos, `idDeterministico`, UUID v8); nunca reutilizado | `id` |
| `usuarioId` | `Id` | dono; isolamento por linha | `usuario_id` |
| `criadoEm` | `Instante` (ISO 8601 UTC, T14) | preenchido em `criar` | só em `dados` |
| `atualizadoEm` | `Instante` | toda escrita | `atualizado_em` |
| `tsLogico` | `TsLogico` (`mmmmmmmmmmmmm-cccccc-aaaaaaaa`, T7) | `RelogioLogico.tick()`; decide "mais recente" na importação | `ts_logico` |
| `origem` | `OrigemRegistro`: `manual`, `importacao`, `sistema` | padrão `manual` | só em `dados` |
| `excluidoEm` | `Instante` ou `null` | exclusão lógica; `null` = ativo | `excluido_em` |

Tipos-base do mesmo arquivo: `DataCivil` (`AAAA-MM-DD` no fuso `America/Sao_Paulo`), `TextoCurto` (1–500, aparado), `TextoLongo` (até 200 mil).

## 4. Termos que não são entidade

| Termo | O que é no código |
|---|---|
| Fila do dia / fila de revisão | consulta `filaDoDia(repo)` sobre `cartoes` (índice `[usuarioId+estado+proximaRevisao]`) |
| Lista passiva | consulta `listarFrases(repo)`: erros com `fraseCorreta`, exceto descartados |
| Completude, diagnóstico | derivada `completude(erro)`: `rapido` ou `completo`; diagnóstico = atributos do Erro (`causa`, `causaSugerida`, `acaoRecomendada`, `historicoCausa`) |
| Verso efetivo | `versoEfetivo(cartao, erro)`: `Cartao.verso` ou, se `null`, `Erro.fraseCorreta` |
| Prioridade | campos de `Ponto`: `faixa`, `prioridade` (desempate) e `logPrioridade[]` |
| Questão | agregado em `Sessao.questoesFeitas` / `questoesAcertadas`; individual só em Erro |
| Redação anterior, nota de vigência | sub-registros de `TextoDeDispositivo` (`redacoesAnteriores[]`, `notasVigencia[]`), não de `Dispositivo` |
| Âncora, pausa, consentimento, histórico de datas | `Marcacao.ancora { texto, inicio, fim }`, `Sessao.pausas[]`, `Usuario.consentimentos[]`, `FasePrazo.historicoDatas[]` |
| Alteração (entrada do log) | `Alteracao` na tabela Dexie `alteracoes`; não está em `ENTIDADES` |
| Módulo | `Modulo` / `MODULOS`: unidade do pacote e de `Preferencias.modulosDesabilitados` |
| Hoje, Biblioteca, Calendário, Pendência, Backup | telas provisórias `Hoje` e `Biblioteca` (`src/apresentacao/telas/Areas.tsx`); as visões e derivados são da F3/F4; backup é arquivo + `LogDeImportacao` |

## 5. Palavras reservadas (D24 e CLAUDE.md)

| Conceito | Usar | Nunca usar para isso |
|---|---|---|
| Equipamento | `Aparelho`, `aparelhos`, `aparelhoId` | `Dispositivo`, `device` |
| Unidade da norma (e nó estrutural) | `Dispositivo`, `dispositivos`, `dispositivoId` | `Artigo` como tipo genérico (artigo é um `tipo`), `Node` |
| Registro de estudo | `Erro`, `erros`, `erroId` | `Erro` / `erro` para falha de software |
| Falha da plataforma relatada | Problema → `RelatoDeProblema`, `relatos` | `Erro`, `Bug` |
| Falha técnica no código | exceção nomeada pelo motivo (`RegistroInvalido`, `EntradaGrandeDemais`); estado `falha` (como em `useDados`); valor capturado `catch (excecao)` | classe `Erro...`, `catch (erro)`, `erros` para falhas |
| Frase correta | `fraseCorreta` | `verso` como sinônimo (`verso` é do Cartão) |
| Estrela | `Estrela`, `estrelas` | `favorito`, `star`, tag favorita |
| Norma | `Norma` | `Lei` como tipo (lei é valor de `Norma.tipo`) |
| Ponto, Dia, Sessão, Revisão | `Ponto` (item do edital), `Dia` (dia de estudo materializado), `Sessao` (de estudo), `Revisao` (resposta a um cartão) | `ponto` para outra coisa; `data` é `DataCivil`, não Dia; `Sessao` para login (F4: proposto `login`); `revisao` para a conferência do rascunho (usar `confirmar`, §12) |
| Anexo | entidade `Anexo` = arquivo | entidade para anexo de norma: é `Dispositivo` com `tipo: 'anexo'` |
| Conflito | `Conflito` = conflito de importação do pacote | o mesmo tipo para anomalia do estruturador (§12) |
| Versão | `VersaoDeNorma`, referência `versaoId` | `versao` para apontar a versão da norma (é `versaoId`); outras versões levam qualificador (`versaoApp`, `versaoEsquema`, `versaoFormato`), salvo o número inteiro `Edital.versao` / `PacoteDeIncidencia.versao` |

Na interface, a lista vive em Orientações › "Palavras que o Arretado usa" (`src/apresentacao/orientacoes/conteudo.ts`, seção `vocabulario`).

## 6. Eventos de domínio

`Barramento` (`src/core/eventos/barramento.ts`): `emitir(nome, payload)`, `assinar(nome ou '*', assinante)`, que devolve a função de cancelamento; entrega em ordem; exceção de assinante isolada (`aoFalhar`). Os `registro.*` saem no `complete` da transação IndexedDB (`aposConfirmar`); os do Recall, depois do `await` da escrita. Único assinante hoje: `useDados` (`src/apresentacao/dados/contexto.ts`), que assina `*` para recarregar a tela.

**Existentes** (conferidos por `grep emitir(`):

| Evento | Emitido por | Payload |
|---|---|---|
| `registro.criado`, `registro.atualizado`, `registro.excluido` | `Colecao.criar`; `atualizar` e `restaurar`; `excluir` | `{ colecao, id }` |
| `registro.lote` | `Colecao.gravarLote`, `Colecao.removerFisico` | `{ colecao, quantidade }` |
| `erro.registrado` | `registrarErro` | `{ erroId, pontoId, sessaoId }` |
| `erro.atualizado` | `completarErro` | `{ erroId, pontoId }` |
| `erro.excluido` | `excluirErro` | `{ erroId }` |
| `cartao.criado` | `criarCartaoDeErro`, `criarCartaoManual` | `{ cartaoId, erroId }` (`erroId` só quando vem de erro) |
| `cartao.atualizado`, `cartao.suspenso`, `cartao.arquivado`, `cartao.reativado` | `editarCartao`, `suspenderCartao`, `arquivarCartao`, `reativarCartao` | `{ cartaoId }` |
| `cartao.revisado` | `revisar` | `{ cartaoId, revisaoId, pontoId }` |

**Previstos** (sem código; nomes da Parte 1 §6 e da Parte 2 §8.2; a fase vem do plano da F2 ou, fora dele, da fase do módulo na Parte 1 §15):

| Evento | Quando |
|---|---|
| `versao.publicada` | F2, 9.3 |
| `dispositivo.alterado`, `marcacao.pendenteReancoragem` | F2, 11.7 (correção manual); F6 |
| `dispositivo.revogado`, `dispositivo.renumerado`, `atualizacao.detectada` | F6 |
| `vinculo.criado`, `sessao.*` (ex.: `sessao.encerrada`), `dia.fechado`, `conteudo.acessado`, `ponto.prioridadeAlterada`, `ponto.excluido`, `reincidencia.detectada`; `prazo.vencendo` (F4) | F3 |
| `adesao.criada`, `adesao.cancelada`, `pacote.atualizado`, `achado.aceito` | F7 |
| `relato.criado` | previsto na Parte 1 §6, mas `registrarRelato` hoje só gera `registro.criado`; decidir ao ligar o envio (F4) |

## 7. Camadas e pastas

| Camada (Parte 1 §6) | Pastas reais | Pode importar (regra `arretado/camadas`) |
|---|---|---|
| Core | `src/core/`: `datas`, `eventos`, `ids`, `modelo`, `pacote`, `persistencia`, `preferencias`, `seguranca`, `util`, `versao.ts` | só `src/core` |
| Domínios | `src/dominios/recall/`; `src/dominios/legislacao/` (planejado, F2) | `src/core` e o próprio módulo; nunca outro domínio |
| Suporte | `src/suporte/relatos.ts` | `src/core` e `src/suporte` |
| Integrações | `src/integracoes/pontos/`; `src/integracoes/normas/` (planejado, 12.1–12.3) | `src/core`, `src/integracoes` e qualquer domínio |
| Apresentação | `src/apresentacao/`: `App.tsx`, `Shell.tsx`, `Aparencia.tsx`, `componentes/`, `conta/` (+ `dados/`), `dados/`, `orientacoes/`, `plano/`, `recall/`, `suporte/`, `telas/`; `biblioteca/` (planejado, F2) | tudo |
| Utilitários de teste | `src/testes/` (`repositorioDeTeste`, `gerarCarga`, `setup`) | tudo; core, domínios, suporte e integrações só os importam em `*.test.ts(x)` (a regra não impede a apresentação de importá-los fora de teste) |
| Fora de `src/` | `eslint/`, `supabase/`, `scripts/`, `corpus/`, `e2e/`, `config/`; `worker/` (planejado, 12.1) | não verificado pela regra |

- Pacotes restritos (mesma regra; testes isentos): `dexie` e `dexie-react-hooks` só em `src/core/persistencia` (T4); `dompurify` só em `src/core/seguranca` (T9).
- `no-restricted-syntax` proíbe `dangerouslySetInnerHTML`, `innerHTML` e `outerHTML` (T9; isentos testes, `src/testes/` e `e2e/`).
- Orientações e o "?" ficam em `src/apresentacao/orientacoes/`, não em `src/suporte/`. A composição entre domínios (ex.: registrar erro a partir do leitor, 11.5) fica na apresentação.

## 8. Operações do repositório e das coleções

**Repositório** (`src/core/persistencia/repositorio.ts`): `Repositorio.abrir(OpcoesRepositorio)` (`nomeBanco`, `agora`, `novoId`, `eventos`, `nomeAparelho`; na primeira abertura cria Usuário, Aparelho e `PREFERENCIAS_PADRAO`) · `colecao(nome)` · `transacao(fn)` · `comUsuario(usuarioId)` · `adotarIdentidade(usuarioId)` · `fechar()` · `ctx` (`Contexto`: `db`, `usuarioId`, `aparelhoId`, `relogio`, `eventos`, `agora`, `novoId`).

| Operação | Método de `Colecao<N>` | Regra |
|---|---|---|
| Criar | `criar(dados, { id?, origem? })` | preenche os campos comuns; log `gravar` |
| Atualizar | `atualizar(id, alteracoes)` | recusa campo comum; valor `undefined` remove o campo; log `atualizar` |
| Excluir, restaurar | `excluir(id)`, `restaurar(id)` | exclusão lógica: preenche ou limpa `excluidoEm` |
| Obter | `obter(id, { incluirExcluidos? })` | só registros do usuário atual |
| Listar | `listarPagina(ConsultaPagina)` → `Pagina { itens, proximoCursor }` | única forma de listar; `indice` declarado em `ENTIDADES`; `limite` até `LIMITE_MAXIMO_PAGINA` (200) |
| Contar | `contar({ indice, de, ate, filtro })` | percorre em páginas |
| Só core | `gravarLote(registros)`, `removerFisico(ids)`, `todosDoUsuario()` | importação, restauração, retenção de snapshots, apagar |

- Não existem `salvar`, `listar` nem `apagarFisicamente` (nomes do glossário antigo). Em coleção append-only (`revisoes`; `eAppendOnly`), `atualizar`, `excluir` e `restaurar` lançam. Esquema violado → `RegistroInvalido`.
- Tipos: `Dados<N>` (campos sem os comuns), `Alteracoes<N>`, `RegistroDe<N>`, `NomeColecao`, `NOMES_COLECOES`, `colecoesDoModulo`.
- Log: `Alteracao { seq, ts, aparelhoId, usuarioId, colecao, registroId, operacao, dados, removidos }` com `operacao` = `gravar`, `atualizar` ou `remover`; `reconstruirDoLog`.
- Utilitários: `novoId`, `RelogioLogico` (`tick`, `observar`), `lerCarimbo`; `dataCivil`, `horaCivil`, `somarDias`, `diferencaEmDias`, `FUSO_PADRAO`; `jsonCanonico`, `iguais`; `obterPreferencias`, `alterarPreferencias`; `VERSAO_APP`; `camposMinimos` (registros mínimos para testes e carga).

## 9. Pacote `.arretado` e backup

Código em `src/core/pacote/`; contrato em [`formato-pacote.md`](formato-pacote.md).

| Termo | Identificadores |
|---|---|
| Arquivo | ZIP com extensão `.arretado` (`EXTENSAO`); `FORMATO = 'arretado-pacote'`, `VERSAO_FORMATO = 1`; `dados/<colecao>.json` (`PASTA_DADOS`), `log.json` (`ARQUIVO_LOG`), `anexos/<id>` (`PASTA_ANEXOS`) |
| Manifesto | `Manifesto` em `manifesto.json`: `formato`, `versaoFormato`, `versaoEsquema`, `versaoApp`, `criadoEm`, `usuarioId`, `aparelhoId`, `escopo` (`Escopo`: `{ tipo: 'integral' }` ou `{ tipo: 'modulos', modulos }`; não confundir com `EscopoNorma`), `modulos`, `incluiLog`, `incluiAnexos`, `contagens`, `arquivos { sha256, bytes }`, `hashConjunto` |
| Cifra | `ManifestoCifrado.cifra { algoritmo: 'AES-256-GCM', kdf: 'PBKDF2-SHA-256', iteracoes, sal, iv }` + `conteudo.cifrado` (`ARQUIVO_CIFRADO`); `cifrar`, `decifrar`, `ITERACOES_PADRAO = 600_000` (T8) |
| Exportar | `exportarPacote(repo, OpcoesExportacao { escopo, incluirLog, incluirAnexos, senha })` → `PacoteGerado { bytes, manifesto, nomeArquivo }` |
| Ler | `lerPacote(bytes, { senha, limiteDescompactado })` → `PacoteLido { manifesto, registros, log, anexos, hashArquivo, cifrado }`; `LIMITE_DESCOMPACTADO` (512 MB) |
| Recusa | `PacoteRecusado(motivo)` com `MotivoRecusa`: `nao_e_pacote`, `formato_desconhecido`, `senha_necessaria`, `senha_ou_arquivo_invalido`, `versao_posterior`, `arquivo_alterado`; `ImportacaoInvalida` para prévia defasada, pacote de outro usuário fora do modo 6, espaço ou snapshot inexistente |
| Modos | `ModoImportacao` 1–7 (no log); `ModoEscrita` 2–6 (`planejar`/`aplicar`); modo 1 = `planejar` sem `aplicar`; modo 7 = `importarParaEspaco`; nomes de tela em `MODOS` (`src/apresentacao/conta/dados/rotulos.ts`; não confundir com `MODULOS`) |
| Prévia | `planejar(repo, pacote, OpcoesPlanejamento { modo, modulos, ignorarColecoes, exigirIntegral })` → `Previa` (`porColecao` com `ResumoColecao { criar, atualizar, ignorar, conflitos, excluir, duplicatasProvaveis }`, `conflitos: Conflito[]`, `avisos`, `escreve`, `substituiIdentidade`, `seqBase`) |
| Aplicar | `aplicar(repo, pacote, previa, resolucoes, { snapshot, descricao })` → `ResultadoImportacao { repo, log, identidadeMudou }`; resolução por conflito: `local` ou `pacote` |
| Snapshot e rollback | `criarSnapshot(repo, motivo)` (`importacao`, `migracao`, `manual`, `rollback`), `podarSnapshots` (`Preferencias.retencaoSnapshots`, mínimo 5), `restaurarSnapshot`, `desfazerImportacao(repo, logId)` (`LogDeImportacao.resultado`: `concluida` → `desfeita`) |
| Espaço separado | `importarParaEspaco`, `planejarMesclagem(repo, espacoId, modo)`, `mesclarEspaco`, `removerEspaco`; banco `arretado-espaco-<id>`; `COLECOES_IDENTIDADE` fica fora da mescla |
| Apagar tudo | `apagarTudo(repo)`: banco principal e espaços |

## 10. Recall

Serviço em `src/dominios/recall/` (`servico.ts`, `agendamento.ts`, `causa.ts`); telas em `src/apresentacao/recall/`.

| Termo | Identificadores |
|---|---|
| Os 2 obrigatórios (D9) | `Erro.resultado` (`ResultadoErro`: `errou`, `acertou_inseguro`) + `Erro.oQueFoi`; entrada `EntradaErro` |
| Registrar, completar depois | `registrarErro`, `completarErro`, `excluirErro`, `listarErros(repo, FiltroErros)`; `StatusErro`: `aberto`, `com_cartao`, `resolvido`, `descartado` |
| Frase correta | `Erro.fraseCorreta`: verso padrão do cartão e item da lista passiva |
| Causa | `CausaErro`: `lacuna`, `leitura`, `confusao`, `literalidade`; rótulos em `NOME_CAUSA`; `ACAO_RECOMENDADA[causa]` → `Erro.acaoRecomendada` |
| Causa sugerida | `sugerirCausa(erro)` → `Erro.causaSugerida`, recalculada quando mudam `oQueFoi`, `resultado`, `justificativa` ou `conviccao`; escolha em `historicoCausa[] { em, sugerida, confirmada }` |
| Cartão | `criarCartaoDeErro` (idempotente), `criarCartaoManual`, `editarCartao`, `listarCartoes(repo, estado)`; `origemTipo`: `erro`, `dispositivo`, `nota`, `precedente`, `manual`; `textoBaseAlterado` (F6) |
| Estado do cartão | `EstadoCartao`: `ativo`, `suspenso`, `arquivado`; `suspenderCartao(repo, id, motivo)`, `arquivarCartao`, `reativarCartao` (mantém a caixa) |
| Caixa | `Caixa` (1–6); `INTERVALOS = [1, 3, 7, 15, 30, 60]` dias; `CAIXA_MAXIMA`; `intervaloDaCaixa` |
| Agendamento | `agendar(estado, resposta, hoje)` → `Agendamento { caixaDepois, proximaDepois, atrasoDias }`; `Cartao.proximaRevisao`; `RespostaRevisao`: `errei` (caixa 1), `dificil` (mantém), `facil` (+1) |
| Revisão | `revisar(repo, cartaoId, resposta, { duracaoMs })`: grava `Revisao` e reagenda na mesma transação; `historicoRevisoes` |
| Fila e contadores | `filaDoDia`, `contarVencidos`, `vencemAmanha`, `maiorFilaProjetada` com `LIMITE_FILA_DIARIA = 40`; `hoje(repo)` |
| Drill, lista passiva | telas `Drill.tsx` (`/recall/revisar`) e `ListaFrases.tsx` (`/recall/frases`) |

## 11. Plano, pontos e suporte

| Termo | Identificadores |
|---|---|
| Pontos do edital (CSV do Ciclo Obrigatório) | `src/integracoes/pontos/`: `decodificarCsv` (UTF-8, senão windows-1252), `lerCsvPontos(texto)` → `LeituraCsv { linhas: LinhaPonto[], avisos }`; `CsvInvalido`; `LIMITE_CSV` |
| Importar pontos | `prepararPontos(repo, linhas, textoOriginal)` → `PontosPreparados { pacote, previa, disciplinas, pontos }`, aplicado pelo `aplicar` do pacote (modo 2); `idDeterministico` (UUID v8 de SHA-256: reimportar não duplica) |
| Faixa, prioridade, adiado | `Faixa`: `altissima`, `alta`, `media`, `extra`; `Ponto.prioridade`; `Ponto.logPrioridade[]` com `OrigemPrioridade`: `manual`, `achado`, `adesao`, `importacao`; importado = `Ponto.somenteLeitura`; `Ponto.adiadoAte` (único status manual, F3) |
| Relatar problema ("!") | `src/suporte/relatos.ts`: `registrarRelato(repo, { descricao, tela })`, `podeRelatarHoje`, `relatosAguardando`, `RelatoRecusado`, `LIMITE_DESCRICAO`; `status`: `aguardando_envio`, `enviado`, `respondido`; tela `RelatarProblema.tsx` |
| Orientações ("?") | `src/apresentacao/orientacoes/conteudo.ts`; `secaoDeAjuda(caminho)` |

## 12. Legislação (F2)

Situação: **existe** (no código), **plano** (nomeado em `planos/F2.md` ou na Parte 2 §10.6), **proposto** (sugerido aqui; confirmar na atividade).

| Termo | O que é | Identificador | Situação | Ativ. |
|---|---|---|---|---|
| Corpus | páginas oficiais byte a byte, para teste | `corpus/normas/<id>.html` + `manifesto.json` (`id`, `papel`: `portao`, `apoio`, `estresse`; `variante`: `todas-as-redacoes`, `compilado`; `charset`, `sha256`, `sha256Conteudo`, `obtidoEm`); `npm run corpus` (`scripts/corpus-normas.mjs`, lista em `scripts/corpus/normas.mjs`) | existe | 7.1 |
| Colado (página colada) | `text/html` que o Chromium põe na área de transferência ao selecionar tudo e copiar a página, capturado sem rede | `corpus/normas/<id>.colado.html` (UTF-8) + `colados.json` (`id`, `arquivo`, `origemSha256Conteudo`, `navegador`, `bytes`, `sha256`, `capturadoEm`); `npm run corpus:colar` (`scripts/corpus-colar.mjs`); `conferirColado`, `atualizarColado`, `lerColados` em `scripts/corpus/normas.mjs` | existe | 7.2 |
| Derivado (do corpus) | arquivo gerado a partir de uma página e amarrado a ela: colado e gabarito | sufixos `SUFIXO_COLADO` (`.colado.html`) e `SUFIXO_GABARITO` (`.gabarito.json`); `classificarArquivo(nome)` → `pagina`, `colado`, `gabarito`, `manifesto`, `colados`, `desconhecido`; `podarDerivados` (tira os de norma fora do catálogo) | existe | 7.2 |
| Gabarito | contagens por tipo, revogados, redações anteriores e amostra conferida pelo Gabriel | `corpus/normas/<id>.gabarito.json` | plano | 7.3 |
| Entrada sanitizada | saída do sanitizador | `sanitizarHtml` → `ResultadoSanitizacao { blocos, linksDescartados }`; `textoParaBlocos`; `Bloco { trechos }`; `LIMITE_PADRAO` | existe | 8.x |
| Normalização | regra 1 (º/o/°/ª, aspas, travessões, U+00AD, entidades, fim de linha) | `normalizar(texto)` | proposto | 8.1 |
| Estruturador | blocos → árvore (`fatiarLei` na Parte 2) | `estruturar(blocos)` em `src/dominios/legislacao/` | proposto | 8.1–8.8 |
| Rascunho | árvore do estruturador antes de gravar; depois, versão não publicada | `Rascunho { nos, anomalias }` (proposto); gravado: `VersaoDeNorma.status = 'rascunho'` (existe) | proposto / existe | 8.1, 9.2 |
| Nó | elemento da árvore; gravado como Dispositivo (D11) | `NoRascunho` (proposto); `Dispositivo` com `categoria`: `estrutural` ou `normativo`, `paiId` | proposto / existe | 8.1–8.4 |
| Tipo do nó | parte a anexo (16 valores) | `TipoDispositivo` (`parte`, `livro`, `titulo`, `capitulo`, `secao`, `subsecao`, `nome`, `preambulo`, `ementa`, `artigo`, `caput`, `paragrafo`, `inciso`, `alinea`, `item`, `anexo`) | existe | 8.2–8.7 |
| Endereço canônico | chave estável do dispositivo na norma | `Dispositivo.endereco`, índice `[normaId+endereco]`; ex.: `tit2.cap1.sec1`, `art9A`, `art5.par2.incIII.alB` (prefixos `tit`, `cap`, `sec`, `art`, `par`, `inc`, `al`); para os demais tipos: `parte`, `liv`, `subsec`, `it`, `caput`, `nome`, `preambulo`, `ementa`, `anexo`, `parUnico` (proposto) | existe / proposto | 8.4 |
| Ordem, rótulo | posição com sufixo (9 < 9-A < 10); texto de exibição ("Art. 9º-A", "Parágrafo único") | `Dispositivo.ordem` (número; 9.1 para `art9A` é só o exemplo da fábrica de teste; a regra de `ordem` com sufixo se decide na 8.3–8.4, lembrando que 9.1 colidiria com 9-J = 9.10), índice `[normaId+ordem]`; `Dispositivo.rotulo` | existe | 8.3–8.4 |
| Nome (rubrica) | nome do nó ou do artigo | Dispositivo com `tipo: 'nome'`, filho do nó ou do artigo | existe | 8.2–8.3 |
| Trecho, tachado | texto com tachado, ênfase e link | `TextoDeDispositivo.trechos[]` (`Trecho` zod, local a `legislacao.ts`); o sanitizador tem o seu `Trecho` (`tachado?: true`) e a marca interna `data-arretado-tachado` | existe | 8.6, 9.2 |
| Texto do dispositivo | texto numa versão, carregado sob demanda | `TextoDeDispositivo` (`versaoId`, `dispositivoId`, `normaId`), índice `[versaoId+dispositivoId]` | existe | 9.2, 9.4 |
| Nota de vigência | "(Redação dada pela Lei…)" fora do texto | `TextoDeDispositivo.notasVigencia[] { texto, lei, ano, link }`; `VersaoDeNorma.notaVigenciaMaisRecente { lei, ano }` | existe | 8.5 |
| Redação anterior | texto substituído (tachado ou heurística) | `TextoDeDispositivo.redacoesAnteriores[] { trechos, nota, origemDeteccao: tachado ou heuristica, confirmada }`; exibição: `Preferencias.mostrarRedacoesAnteriores` | existe | 8.6, 8.8, 9.6 |
| Revogação, renumeração | sem texto vigente; "Renumerado do art. X" | `Dispositivo.status`: `revogado` (também `eficacia_cessada`), `renumerado` + `renumeradoDe` (endereço antigo) | existe | 8.6 |
| VETADO | dispositivo vetado | sem valor no enum `status`; `'vetado'` (proposto; muda o esquema) | proposto | 8.6 |
| Anexo da norma | bloco após "ANEXO", texto bruto | Dispositivo com `tipo: 'anexo'` (não é a entidade `Anexo`) | existe | 8.7 |
| Confiança | por dispositivo | `Dispositivo.confianca`: `alta`, `media`, `a_confirmar` (≠ `Achado.confianca`: `baixa`, `media`, `alta`) | existe | 8.7 |
| "A confirmar", conferência | valor `a_confirmar`; aviso acima de 20%; etapa 10 ("revisão do rascunho") | `LIMITE_A_CONFIRMAR = 0.2`; `confirmarEmLote` e demais `confirmar...` (nunca `revisao`, §5) | proposto | 8.7, 8.8, 10.1 |
| Anomalia, métrica | validação estrutural; regressão contra o gabarito | `Anomalia { tipo, endereco, gravidade: conflito ou aviso }`, `validarEstrutura(rascunho)` (não reutilizar `Conflito` do pacote); `compararComGabarito` | proposto | 8.7, 8.9 |
| Norma | identidade e metadados | `Norma` (obrigatórios `tituloCurto` e `escopo`: `pessoal` ou `catalogo`; na tela, só o título curto; `urlOficial`, `fonteConsultadaEm`, `versaoVigenteId`) | existe | 9.2, 9.5 |
| Versão de norma | texto capturado numa data | `VersaoDeNorma` (`status`: `rascunho`, `vigente`, `arquivada`; `origemEntrada`: `html`, `url`, `arquivo`, `texto`, `edicao_manual`; `hash` sobre o conteúdo sanitizado; `capturadaEm`, `versaoAdaptador`; fonte guardada para reprocessar: `anexoFonteId` → `Anexo`) | existe | 9.2, 11.7 |
| Descartar, retomar, publicar | ciclo do rascunho | `descartarRascunho`, `retomarRascunho`, `publicarVersao` (proposto); evento `versao.publicada` (plano) | proposto / plano | 9.2, 9.3 |
| Lido até, posição | por usuário × norma | coleção `leituras` (`lidoAteId`, `posicaoId`, `ultimaLeituraEm`) (plano); tipo `Leitura` (proposto) | plano | 9.1, 9.7 |
| Colar, leitor | evento `paste` (`text/html`, `text/plain` de reserva) na tela "Importar norma"; leitor virtualizado (T16, `@tanstack/react-virtual`) | telas em `src/apresentacao/biblioteca/` (plano); `LeitorNorma.tsx` (proposto) | plano | 9.5, 9.6 |
| Modo foco, filtros | leitura limpa; tudo, estrelados, selecionados, com marcações, com erros | `modoFoco`; `FiltroLeitor`: `tudo`, `estrelados`, `selecionados`, `com_marcacoes`, `com_erros` | proposto | 11.1, 11.3 |
| Estrela | favorito estrutural (D15) | `Estrela` (`alvoId`, `tipoOrigem`: `direta`, `herdada`, `pacote`, `excecao`; `herdadaDeId`, `pacoteId`); só `direta`, `excecao` e, na F7, `pacote` são gravadas; `herdada` fica reservado e a herança é calculada (`estrelaEfetiva`, proposto) | existe / proposto | 11.2 |
| Marcação, reancoragem | grifo (3 cores) ou nota; reancoragem exata → aproximada → pendente | `Marcacao` (`tipo`: `grifo`, `nota`; `cor` 1–3; `ancora`; `versaoId`; `status`: `valida`, `reancorada`, `pendente`); `reancorar` (proposto); evento `marcacao.pendenteReancoragem` (plano) | existe / proposto | 11.4, 11.7 |
| Ações por dispositivo | referência, busca por endereço | `referenciaDe(dispositivo, norma)` ("art. 9º-A, LEP"); `analisarEndereco(texto)` ("§ 2º do 112") | proposto | 11.5, 11.6 |
| Editor | converter, juntar, dividir; correção por bloco e integral | `converterLinha`, `juntarComAnterior`, `dividirAqui` | proposto | 10.2–10.4 |
| Importação por URL | função no mesmo endereço do app (T17) | `worker/index.ts` (`fetch` do Worker; regras em `worker/regras.ts`) em `/api/buscar-norma`; cliente em `src/integracoes/normas/`; regras puras fora de `functions/` | plano | 12.1–12.3 |

## 13. Divergências conhecidas (entre o glossário antigo, a documentação e o código)

- Corrigido em 23/09/2026 (D24): `ErroEntradaGrande` virou `EntradaGrandeDemais`; `catch (erro)`, `mensagemDe(erro)`, `{ tipo: 'falha'; erro }` e o parâmetro de `aoFalhar` viraram `excecao`; `permitirErrosConsole` virou `permitirFalhasConsole`. Conferência ao fim de cada etapa: `git grep -n -E "Erros?[A-Z]|catch \(erro\)" -- src e2e scripts` não acha nada.
- `Estrela.tipoOrigem` × `Cartao.origemTipo`: como `estrelas` ainda não tem dado, alinhar para `origemTipo` antes da 11.2 sai barato.
- Colisões de nome: `Dados<N>` (campos sem os comuns, persistência) × `Dados<T>` (retorno de `useDados`, apresentação) × componente `Dados` (tela Conta › Dados, `conta/dados/Dados.tsx`); na interface, Snapshot aparece como "Ponto de restauração", e "Ponto" sozinho continua reservado ao item do edital.
- As camadas são impostas pela regra própria `arretado/camadas` (`eslint/regra-camadas.js`), não por `no-restricted-imports` (nome errado corrigido em `decisoes-tecnicas.md` em 23/09/2026).
- Valores do manifesto do corpus (`variante: 'todas-as-redacoes'`, `origemCharset: 'padrao-windows-1252'`) usam hífen, fora da regra de enum da §1; ficam fora de `src/` e não entram no modelo.
