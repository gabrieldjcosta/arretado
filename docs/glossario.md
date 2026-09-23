# Glossário — vocabulário canônico → identificadores de código

Regra (T14, D24): identificadores em PT-BR **sem acento e sem cedilha**, `PascalCase` para tipos e
esquemas, `camelCase` para campos, funções e variáveis, `kebab-case` para pastas e arquivos,
`entidade.acao` para eventos. Plural só em nomes de tabela.

## Entidades

| Vocabulário (interface) | Tipo / esquema | Tabela | Chave estrangeira |
|---|---|---|---|
| Usuário | `Usuario` | `usuarios` | `usuarioId` |
| Aparelho | `Aparelho` | `aparelhos` | `aparelhoId` |
| Concurso | `Concurso` | `concursos` | `concursoId` |
| Fase / Prazo | `FasePrazo` | `fasesPrazos` | `fasePrazoId` |
| Edital | `Edital` | `editais` | `editalId` |
| Disciplina | `Disciplina` | `disciplinas` | `disciplinaId` |
| Ponto | `Ponto` | `pontos` | `pontoId` |
| Dia | `Dia` | `dias` | `diaId` |
| Sessão | `Sessao` | `sessoes` | `sessaoId` |
| Erro | `Erro` | `erros` | `erroId` |
| Cartão | `Cartao` | `cartoes` | `cartaoId` |
| Revisão | `Revisao` | `revisoes` | `revisaoId` |
| Norma | `Norma` | `normas` | `normaId` |
| Versão (de norma) | `VersaoDeNorma` | `versoesDeNorma` | `versaoId` |
| Dispositivo | `Dispositivo` | `dispositivos` | `dispositivoId` |
| Marcação | `Marcacao` | `marcacoes` | `marcacaoId` |
| Estrela | `Estrela` | `estrelas` | `estrelaId` |
| Pacote de incidência | `PacoteDeIncidencia` | `pacotesDeIncidencia` | `pacoteId` |
| Adesão | `Adesao` | `adesoes` | `adesaoId` |
| Precedente | `Precedente` | `precedentes` | `precedenteId` |
| Nota | `Nota` | `notas` | `notaId` |
| Achado | `Achado` | `achados` | `achadoId` |
| Evento de calendário | `EventoDeCalendario` | `eventosDeCalendario` | `eventoId` |
| Fonte | `Fonte` | `fontes` | `fonteId` |
| Anexo | `Anexo` | `anexos` | `anexoId` |
| Tag | `Tag` | `tags` | `tagId` |
| Log de importação | `LogDeImportacao` | `logsDeImportacao` | — |
| Snapshot | `Snapshot` | `snapshots` | `snapshotId` |
| Relato de problema | `RelatoDeProblema` | `relatosDeProblema` | — |
| Alteração (entrada do log) | `Alteracao` | `alteracoes` | — |
| Preferência | `Preferencia` | `preferencias` | — |

## Campos comuns a toda entidade pessoal (§5.1)

`id` (UUIDv7) · `usuarioId` · `criadoEm` · `atualizadoEm` · `origem` · `excluidoEm` (exclusão lógica; `null` = ativo).

## Termos que não são entidade (não criar tipo nem tabela)

Fila de revisão (consulta), Lista passiva (consulta), Pendência (derivada), Hoje (visão),
Calendário (visão), Redação anterior (sub-registro de `Dispositivo`), Nota de vigência
(sub-registro de `Dispositivo`), Prioridade (campo de `Ponto` com log), Questão (agregado em `Sessao`).

## Palavras reservadas (D24)

| Usar | Nunca usar para isso |
|---|---|
| `Aparelho` (equipamento) | `Dispositivo`, `Device` |
| `Dispositivo` (unidade da norma) | `Artigo` como tipo genérico, `Node` |
| `Erro` (registro de estudo) | `Erro` para falha de software → usar `Problema` / `Falha` (`RelatoDeProblema`, `FalhaDeImportacao`) |
| `Problema` (falha da plataforma relatada) | `Erro`, `Bug` |
| `Frase correta` → `fraseCorreta` | `verso` (o verso do cartão é `Cartao.verso`, que **começa** igual à frase) |
| `Estrela` → `estrela`, `estrelas` | `favorito`, `star` |

## Eventos de domínio (formato `entidade.acao`, payload só com ids)

`erro.registrado` · `erro.atualizado` · `cartao.criado` · `cartao.revisado` · `sessao.iniciada` ·
`sessao.encerrada` · `dia.fechado` · `ponto.prioridadeAlterada` · `ponto.excluido` · `prazo.vencendo` ·
`versao.publicada` · `dispositivo.alterado` · `dispositivo.revogado` · `dispositivo.renumerado` ·
`marcacao.pendenteReancoragem` · `atualizacao.detectada` · `vinculo.criado` · `adesao.criada` ·
`adesao.cancelada` · `pacote.atualizado` · `achado.aceito` · `reincidencia.detectada` · `relato.criado`.

## Camadas e pastas

| Camada (§6) | Pasta |
|---|---|
| Core | `src/core/` |
| Domínios | `src/dominios/{plano,execucao,recall,legislacao,catalogo,precedentes,notas,inteligencia}/` |
| Integrações | `src/integracoes/{importadores,exportadores,verificador}/` |
| Apresentação | `src/apresentacao/{shell,componentes,areas}/` |
| Suporte ao usuário | `src/suporte/{orientacoes,relatar}/` |

## Operações de repositório

`listar` (sempre paginado) · `obter` · `salvar` (cria ou atualiza; grava `Alteracao` na mesma transação) ·
`excluir` (lógica: preenche `excluidoEm`) · `apagarFisicamente` (só exclusão de conta e restore integral).
