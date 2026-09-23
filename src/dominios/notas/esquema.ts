import type { EsquemaVersionado } from "@core/persistencia/db";

export const ESQUEMA_NOTAS: EsquemaVersionado = {
  1: { notas: "id, usuarioId, tipo, disciplinaId, excluidoEm" },
};
