export { CHAVE_ULTIMO_BACKUP, lerUltimoBackup, registrarBackup } from './backup';
export { pedirArmazenamentoPersistente, type EstadoDoArmazenamento } from './armazenamento';
export {
  AnexoAlterado,
  gravarAnexo,
  lerAnexo,
  prepararAnexo,
  removerAnexos,
  type ConteudoDeAnexo,
} from './anexos';
export {
  apagarBanco,
  bancoExiste,
  BancoArretado,
  NOME_BANCO_PRINCIPAL,
  esquemaDaVersao,
  VERSAO_ESQUEMA,
  type Alteracao,
  type Conflito,
  type MotivoFechamento,
} from './banco';
export {
  Colecao,
  RegistroInvalido,
  LIMITE_MAXIMO_PAGINA,
  type Alteracoes,
  type ConsultaPagina,
  type Dados,
  type Pagina,
} from './colecao';
export type { Contexto } from './contexto';
export { desfazerAlteracao, reconstruirDoLog, type Estado } from './log';
export {
  carimboDoLote,
  FonteDoLoteAusente,
  idDoLote,
  idsDoLote,
  montarRegistrosDoLote,
  OPERACAO_ADESAO,
  ReferenciaDeAcervo,
  referenciasNoLog,
  registrosDoLote,
  type ConteudoDoLote,
  type Reidratador,
} from './lote-acervo';
export { CHAVE_MIGRACAO_FRASES, migrarFrasesDosErros } from './migracao-frases';
export { PREFERENCIAS_PADRAO, Repositorio, type OpcoesRepositorio } from './repositorio';
export {
  abrirRepositorioAtivo,
  entrarNaConta,
  nomeBancoDaConta,
  nomeDoBancoAtivo,
  NOME_REGISTRO_DE_CONTAS,
  RegistroDeContas,
  type ContaDoAparelho,
  type OpcoesAbrirAtivo,
} from './registro-contas';
