import type { ServidorDeSincronizacao } from '../core/sincronizacao';

/** Recepção de um servidor sem nada a oferecer; testes só de envio espalham isto no seu servidor falso. */
export const RECEPCAO_VAZIA: Omit<ServidorDeSincronizacao, 'enviarLote'> = {
  puxarLog: () => Promise.resolve([]),
  lerRegistro: () => Promise.resolve(null),
  instantaneoInicio: () => Promise.resolve(0),
  puxarRegistros: () => Promise.resolve([]),
  registrarSincronia: () => Promise.resolve(),
  pedirPosse: (aparelhoId) => Promise.resolve({ concedida: true, aparelho_id: aparelhoId }),
  soltarPosse: () => Promise.resolve(),
};
