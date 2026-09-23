import type { EsquemaVersionado } from "@core/persistencia/db";

export const ESQUEMA_INTELIGENCIA: EsquemaVersionado = {
  1: { achados: "id, usuarioId, status, pontoId, normaId, excluidoEm" },
};
