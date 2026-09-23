import type { EsquemaVersionado } from "@core/persistencia/db";

/** Modelo desde a F0, serviço só na F7 (D12): as tabelas existem e ficam vazias. */
export const ESQUEMA_CATALOGO: EsquemaVersionado = {
  1: {
    pacotesDeIncidencia: "id, usuarioId, carreira, excluidoEm",
    adesoes: "id, usuarioId, pacoteId, normaId, excluidoEm",
  },
};
