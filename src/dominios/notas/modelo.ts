import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/** Resumo é um tipo de Nota, não um módulo separado (D22, §10.8). Sem favoritos; estrela não se aplica. */
export const EsquemaNota = EsquemaEntidadeBase.extend({
  titulo: z.string(),
  conteudo: z.string(),
  tipo: z.enum(["resumo", "esquema", "anotacao"]),
  disciplinaId: z.string().nullable(),
  tema: z.string().optional(),
  fonteId: z.string().nullable(),
});
export type Nota = z.infer<typeof EsquemaNota>;
