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
  BancoArretado,
  NOME_BANCO_PRINCIPAL,
  esquemaDaVersao,
  VERSAO_ESQUEMA,
  type Alteracao,
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
export { reconstruirDoLog } from './log';
export { CHAVE_MIGRACAO_FRASES, migrarFrasesDosErros } from './migracao-frases';
export { PREFERENCIAS_PADRAO, Repositorio, type OpcoesRepositorio } from './repositorio';
