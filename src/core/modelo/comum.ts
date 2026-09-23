import { z } from 'zod';

/** Identificador estável gerado no cliente (UUIDv7, T6). */
export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/** Instante em ISO 8601 UTC (T14). */
export const Instante = z.iso.datetime();
export type Instante = z.infer<typeof Instante>;

/** Data civil `AAAA-MM-DD` no fuso do usuário (T14). */
export const DataCivil = z.iso.date();
export type DataCivil = z.infer<typeof DataCivil>;

/** Carimbo do relógio lógico híbrido (T7). */
export const TsLogico = z.string().regex(/^\d{13}-\d{6}-[0-9a-f]{8}$/);
export type TsLogico = z.infer<typeof TsLogico>;

/** Como o registro nasceu. */
export const OrigemRegistro = z.enum(['manual', 'importacao', 'sistema']);
export type OrigemRegistro = z.infer<typeof OrigemRegistro>;

/** Texto curto de uma linha (títulos, rótulos). */
export const TextoCurto = z.string().trim().min(1).max(500);

/** Texto longo opcional (justificativas, notas). */
export const TextoLongo = z.string().max(200_000);

/**
 * Campos comuns a toda entidade (Parte 1 §5.1): id estável, dono, carimbos,
 * origem e exclusão lógica.
 */
export const camposComuns = {
  id: Id,
  usuarioId: Id,
  criadoEm: Instante,
  atualizadoEm: Instante,
  tsLogico: TsLogico,
  origem: OrigemRegistro,
  excluidoEm: Instante.nullable(),
} as const;

export type CamposComuns = {
  id: Id;
  usuarioId: Id;
  criadoEm: Instante;
  atualizadoEm: Instante;
  tsLogico: TsLogico;
  origem: OrigemRegistro;
  excluidoEm: Instante | null;
};

/** Nomes dos campos comuns, que a camada de coleções controla. */
export const NOMES_CAMPOS_COMUNS = Object.keys(camposComuns) as (keyof CamposComuns)[];
