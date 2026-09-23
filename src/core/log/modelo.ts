import { z } from "zod";

/** Operações registradas no log de alterações (T5). `apagar` = remoção física (conta, restore integral). */
export const Operacao = z.enum(["criar", "atualizar", "excluir", "apagar"]);
export type Operacao = z.infer<typeof Operacao>;

/**
 * Entrada do log de alterações: append-only, gravada na mesma transação da entidade.
 * `seq` é local e monotônico (chave auto-incrementada); `tsLogico` ordena entre aparelhos (F4).
 */
export const EsquemaAlteracao = z.object({
  seq: z.number().int().positive().optional(),
  tsLogico: z.string(),
  usuarioId: z.string(),
  aparelhoId: z.string(),
  entidade: z.string(),
  entidadeId: z.string(),
  operacao: Operacao,
  /** Só os campos alterados (na criação, todos). Em "atualizar" nunca vai o registro inteiro. */
  campos: z.record(z.string(), z.unknown()),
});
export type Alteracao = z.infer<typeof EsquemaAlteracao>;
