import type { EsquemaVersionado } from "@core/persistencia/db";

export const ESQUEMA_PRECEDENTES: EsquemaVersionado = {
  1: { precedentes: "id, usuarioId, escopo, disciplinaId, tipo, excluidoEm" },
};
