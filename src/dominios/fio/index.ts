export * from './tipos';
export {
  cota,
  DIAS_DA_RETA_FINAL,
  escolherMateria,
  ETAPAS_ATE_A_PORTEIRA,
  LIMIAR_DE_VENCIDOS,
  naRetaFinal,
  planejarEtapa,
  RAZAO_DE_CRESCIMENTO,
  tamanhoDaEtapa,
  TETO,
} from './gerador';
export {
  abrirPasso,
  concluirPasso,
  estadoInicial,
  lerEstadoDoFio,
  POUSOS_GUARDADOS,
  pousar,
  pularPasso,
  puxar,
  type ProximoDoFio,
} from './estado';
export { fatoDoPasso, fatosDoPouso } from './fatos';
