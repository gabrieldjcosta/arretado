import type { EsquemaVersionado } from "@core/persistencia/db";

export const ESQUEMA_RELATAR: EsquemaVersionado = {
  1: { relatosDeProblema: "id, usuarioId, criadoEm, status" },
};
