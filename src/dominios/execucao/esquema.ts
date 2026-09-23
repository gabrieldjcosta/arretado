import type { EsquemaVersionado } from "@core/persistencia/db";

export const ESQUEMA_EXECUCAO: EsquemaVersionado = {
  1: {
    dias: "id, usuarioId, data, excluidoEm",
    sessoes: "id, usuarioId, diaId, pontoId, iniciadaEm, excluidoEm",
  },
};
