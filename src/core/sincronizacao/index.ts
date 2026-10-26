export { criarAgendador, type Agendador, type OpcoesDoAgendador } from './agendador';
export {
  camposDiferentes,
  conflitoAberto,
  contarConflitos,
  equivalentes,
  listarConflitos,
} from './conflitos';
export { registrarDivergencias } from './divergencias';
export {
  ROTULO_DO_ESTADO,
  estadoDaSincronizacao,
  type EstadoDaSincronizacao,
  type SinaisDeSincronizacao,
} from './estado';
export {
  CHAVE_QUARENTENA,
  CHAVE_SEQ_ENVIADO,
  MAX_BYTES_POR_LOTE,
  MAX_ENTRADAS_POR_LOTE,
  contarPendentes,
  enviarPendentes,
  montarLotes,
  type ContextoDeEnvio,
  type EntradaEmQuarentena,
  type ResultadoDoEnvio,
} from './envio';
export {
  iniciarSincronizacao,
  rodadaDeSincronizacao,
  type OpcoesDeSincronizacao,
  type ResultadoDaRodada,
  type Sincronizacao,
} from './iniciar';
export { CAMPOS_DO_APARELHO, COLECOES_SO_LOCAIS, ehSoLocal, sincroniza } from './politica';
export {
  CHAVE_PODA_LOCAL,
  DIAS_DE_GUARDA_DO_LOG,
  compactarLog,
  podarLogLocal,
  type CorteDaPoda,
} from './poda-local';
export { criarPosse, type EstadoDePosse, type OpcoesDePosse, type Posse } from './posse';
export {
  CHAVE_PARADA_POR_VERSAO,
  CHAVE_QUARENTENA_RECEBIDOS,
  CHAVE_RECARGA_NECESSARIA,
  CHAVE_SEQ_RECEBIDO,
  TAMANHO_DA_PAGINA,
  lerQuarentenaDeRecebidos,
  lerSeqRecebido,
  receberNovidades,
  type ContextoDeRecepcao,
  type EntradaRecebidaEmQuarentena,
  type ResultadoDaRecepcao,
} from './receber';
export {
  CHAVE_RECARGA,
  primeiraRecepcao,
  recargaEmAndamento,
  recargaNecessaria,
  recarregarDaConta,
} from './recarga';
export {
  ConflitoInexistente,
  ResolucaoPendenteDeEnvio,
  resolverConflito,
  type Escolha,
} from './resolver';
export {
  FalhaDeSincronizacao,
  type ChaveDeRegistro,
  type DivergenciaNoServidor,
  type EntradaDeEnvio,
  type EntradaRecebida,
  type RegistroRemoto,
  type RespostaDeEnvio,
  type RespostaDePosse,
  type ServidorDeSincronizacao,
} from './tipos';
