import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/**
 * Achado (F7): Inteligência **nunca** escreve em Ponto (§6). Um achado só propõe; aceitar é ação
 * explícita do usuário e gera a alteração com origem registrada.
 */
export const EsquemaAchado = EsquemaEntidadeBase.extend({
  tipo: z.enum(["incidencia", "novidadeNormativa", "comparacaoDeEditais", "outro"]),
  descricao: z.string().min(1),
  consequenciaSugerida: z.string().optional(),
  status: z.enum(["novo", "aceito", "aceitoSemAplicacao", "descartado"]),
  pontoId: z.string().nullable(),
  normaId: z.string().nullable(),
  url: z.string().optional(),
});
export type Achado = z.infer<typeof EsquemaAchado>;
