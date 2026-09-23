import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/**
 * Precedente único, com escopo nacional ou internacional (D22): a diferença é de formulário,
 * não de conceito. Captura curta: só `tituloTese` é obrigatório (§10.7).
 */
export const EsquemaPrecedente = EsquemaEntidadeBase.extend({
  tituloTese: z.string().min(1),
  escopo: z.enum(["nacional", "internacional"]),
  tribunal: z.string().optional(),
  disciplinaId: z.string().nullable(),
  /** Súmula e tese de repetitivo têm tipo próprio: a FCC as cobra literalmente (§10.7). */
  tipo: z
    .enum(["acordao", "sumula", "sumulaVinculante", "repercussaoGeral", "repetitivo", "outro"])
    .optional(),
  numero: z.string().optional(),
  data: z.string().optional(),
  relator: z.string().optional(),
  fonteId: z.string().nullable(),
  fatos: z.string().optional(),
  questaoJuridica: z.string().optional(),
  fundamentos: z.string().optional(),
  conclusao: z.string().optional(),
  textoOriginal: z.string().optional(),
  traducao: z.string().optional(),
  resumo: z.string().optional(),
  statusDeLeitura: z.enum(["naoLido", "lido", "paraRevisar"]),
  relevanteParaRevisao: z.boolean(),
});
export type Precedente = z.infer<typeof EsquemaPrecedente>;
