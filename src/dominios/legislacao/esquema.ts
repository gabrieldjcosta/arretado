import type { EsquemaVersionado } from "@core/persistencia/db";

/**
 * O texto fica em `textosDeDispositivo`, com chave `[versaoId+dispositivoId]`: é o que permite ao
 * leitor carregar por dispositivo, sob demanda, sem trazer a norma inteira (§10.6, desempenho).
 */
export const ESQUEMA_LEGISLACAO: EsquemaVersionado = {
  1: {
    normas: "id, usuarioId, escopo, tituloCurto, excluidoEm",
    versoesDeNorma: "id, usuarioId, normaId, [normaId+status], excluidoEm",
    dispositivos: "id, usuarioId, normaId, [normaId+endereco], paiId, [normaId+ordem], excluidoEm",
    textosDeDispositivo: "[versaoId+dispositivoId], versaoId, normaId",
    marcacoes: "id, usuarioId, dispositivoId, versaoId, status, excluidoEm",
    estrelas: "id, usuarioId, normaId, alvoId, [alvoId+propagacao], excluidoEm",
  },
};
