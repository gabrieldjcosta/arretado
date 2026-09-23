import { z } from "zod";

export const Tema = z.enum(["claro", "escuro", "sistema"]);
export type Tema = z.infer<typeof Tema>;

/** Preferência tipada, por usuário; entra no pacote de backup (T6). */
export const EsquemaPreferencia = z.object({
  chave: z.string(),
  usuarioId: z.string(),
  valor: z.unknown(),
  atualizadoEm: z.string(),
});
export type Preferencia = z.infer<typeof EsquemaPreferencia>;

/** Catálogo de preferências conhecidas, com o esquema do valor. Cresce por fase. */
export const Preferencias = {
  tema: Tema,
} as const;
export type ChaveDePreferencia = keyof typeof Preferencias;
export type ValorDePreferencia<C extends ChaveDePreferencia> = z.infer<(typeof Preferencias)[C]>;
