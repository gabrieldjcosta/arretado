import { z } from "zod";
import { EsquemaEntidadeBase } from "../persistencia/modelo";

/** Escopo de isolamento. No MVP existe um só, local; F4 vincula à conta Google (D19). */
export const EsquemaUsuario = EsquemaEntidadeBase.extend({
  nomeDeExibicao: z.string().optional(),
  email: z.string().optional(),
  provedor: z.string().optional(),
  consentimentos: z.array(z.object({ versaoPolitica: z.string(), em: z.string() })),
});
export type Usuario = z.infer<typeof EsquemaUsuario>;

/** Equipamento onde o app roda (D24: nunca "dispositivo"). Base da posse única em F4 (D17). */
export const EsquemaAparelho = EsquemaEntidadeBase.extend({
  nome: z.string(),
  plataforma: z.string(),
  versaoEsquemaLocal: z.number().int(),
  ultimaSincronizacaoEm: z.string().nullable(),
  posseAtivaAte: z.string().nullable(),
});
export type Aparelho = z.infer<typeof EsquemaAparelho>;

/** Quem está escrevendo: vai em toda `Alteracao`. */
export interface ContextoDeEscrita {
  usuarioId: string;
  aparelhoId: string;
}
