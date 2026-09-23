import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/** Dia: materializado só quando o usuário age (§5.3). `data` no formato AAAA-MM-DD. */
export const EsquemaDia = EsquemaEntidadeBase.extend({
  data: z.string(),
  fechadoEm: z.string().nullable(),
  observacao: z.string().optional(),
});
export type Dia = z.infer<typeof EsquemaDia>;

/**
 * Sessão de estudo, com bloco de questões agregado — questão individual não é entidade (D22);
 * o registro individual só existe quando vira Erro.
 */
export const EsquemaSessao = EsquemaEntidadeBase.extend({
  diaId: z.string().nullable(),
  pontoId: z.string().nullable(),
  iniciadaEm: z.string(),
  encerradaEm: z.string().nullable(),
  tipo: z.enum(["leitura", "questoes", "revisao", "mista"]),
  questoes: z.number().int().nullable(),
  acertos: z.number().int().nullable(),
  observacao: z.string().optional(),
});
export type Sessao = z.infer<typeof EsquemaSessao>;
