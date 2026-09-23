import type { EsquemaVersionado } from "@core/persistencia/db";

/** Tabelas do domínio Plano. A raiz de composição as junta às dos demais (§6). */
export const ESQUEMA_PLANO: EsquemaVersionado = {
  1: {
    concursos: "id, usuarioId, excluidoEm",
    fasesPrazos: "id, usuarioId, concursoId, data, excluidoEm",
    eventosDeCalendario: "id, usuarioId, concursoId, data, excluidoEm",
    editais: "id, usuarioId, concursoId, excluidoEm",
    disciplinas: "id, usuarioId, ordem, excluidoEm",
    pontos: "id, usuarioId, disciplinaId, faixa, [disciplinaId+ordem], excluidoEm",
  },
};
