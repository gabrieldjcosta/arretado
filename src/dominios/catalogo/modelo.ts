import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/**
 * Catálogo (F7): modelo existe desde a F0 para não travar multiusuário (D12); o serviço só vem
 * depois. Nada aqui tem interface antes da F7.
 */
export const EsquemaPacoteDeIncidencia = EsquemaEntidadeBase.extend({
  curadorId: z.string(),
  titulo: z.string(),
  carreira: z.string(),
  versao: z.number().int(),
  descricao: z.string().optional(),
  normaIds: z.array(z.string()),
  publicadoEm: z.string().nullable(),
});
export type PacoteDeIncidencia = z.infer<typeof EsquemaPacoteDeIncidencia>;

/** Adesão do usuário a um pacote ou a uma norma do catálogo; cancelar remove só o que veio dele. */
export const EsquemaAdesao = EsquemaEntidadeBase.extend({
  pacoteId: z.string().nullable(),
  normaId: z.string().nullable(),
  tipo: z.enum(["total", "parcial"]),
  normasEscolhidas: z.array(z.string()),
  versaoAderida: z.number().int(),
  receberAtualizacoes: z.boolean(),
  canceladaEm: z.string().nullable(),
});
export type Adesao = z.infer<typeof EsquemaAdesao>;
