import { z } from "zod";

/** Campos comuns a toda entidade pessoal (§5.1): id estável, dono, carimbos, origem e exclusão lógica. */
export const EsquemaEntidadeBase = z.object({
  id: z.string(),
  usuarioId: z.string(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
  /** De onde o registro veio: "app", "importacao:<fonte>", "sync", "catalogo"… */
  origem: z.string(),
  /** Exclusão lógica; `null` = ativo. Remoção física só em exclusão de conta e restore integral. */
  excluidoEm: z.string().nullable(),
});
export type EntidadeBase = z.infer<typeof EsquemaEntidadeBase>;

/** Página de resultados: listas são sempre paginadas (§5.1). */
export interface Pagina<T> {
  itens: T[];
  /** Cursor para a próxima página; `null` quando acabou. */
  proximo: string | null;
}
