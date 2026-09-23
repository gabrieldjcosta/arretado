import type { EsquemaVersionado } from "@core/persistencia/db";

/**
 * Índices pensados para as duas consultas quentes do Recall: a fila do dia
 * (`[estado+proximaRevisao]`) e os erros por ponto (reincidência, F3).
 */
export const ESQUEMA_RECALL: EsquemaVersionado = {
  1: {
    erros: "id, usuarioId, pontoId, disciplinaId, status, dispositivoId, criadoEm, excluidoEm",
    cartoes: "id, usuarioId, erroId, pontoId, [estado+proximaRevisao], dispositivoId, excluidoEm",
    revisoes: "id, usuarioId, cartaoId, em",
  },
};
