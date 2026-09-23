import { z } from "zod";

/** Identifica o formato do pacote; um arquivo sem isto não é um pacote do Arretado (§12.4). */
export const FORMATO_DO_PACOTE = "arretado/pacote";
export const VERSAO_DO_FORMATO = 1;

/** Escopos de exportação (§12.1). */
export const EscopoDoPacote = z.enum(["integral", "modulo", "concurso", "periodo"]);
export type EscopoDoPacote = z.infer<typeof EscopoDoPacote>;

export const EsquemaArquivoDoPacote = z.object({
  caminho: z.string(),
  entidade: z.string(),
  registros: z.number().int().nonnegative(),
  /** SHA-256 do conteúdo do arquivo, em hexadecimal. */
  hash: z.string(),
});
export type ArquivoDoPacote = z.infer<typeof EsquemaArquivoDoPacote>;

/**
 * Manifesto do pacote (§12.1): diz o que há dentro, de onde veio e como verificar.
 * Um arquivo alterado fora do app não bate com os hashes e não é restaurável — é isto que o
 * rodapé de responsabilidade promete (D18).
 */
export const EsquemaManifesto = z.object({
  formato: z.literal(FORMATO_DO_PACOTE),
  versaoDoFormato: z.number().int(),
  versaoDoEsquema: z.number().int(),
  versaoDoApp: z.string(),
  geradoEm: z.string(),
  usuarioId: z.string(),
  aparelhoId: z.string(),
  escopo: EscopoDoPacote,
  /** Quando o escopo não é integral: o que foi filtrado (módulo, concurso ou intervalo). */
  filtro: z.record(z.string(), z.unknown()).nullable(),
  arquivos: z.array(EsquemaArquivoDoPacote),
  /** SHA-256 da concatenação dos hashes dos arquivos, na ordem em que aparecem. */
  hashDoConjunto: z.string(),
  incluiLog: z.boolean(),
  incluiAnexos: z.boolean(),
  cifrado: z.boolean(),
});
export type Manifesto = z.infer<typeof EsquemaManifesto>;

/** Cabeçalho em claro de um pacote cifrado: só o necessário para derivar a chave (§12.1). */
export const EsquemaCabecalhoCifrado = z.object({
  formato: z.literal(FORMATO_DO_PACOTE),
  versaoDoFormato: z.number().int(),
  versaoDoEsquema: z.number().int(),
  cifrado: z.literal(true),
  kdf: z.literal("PBKDF2-SHA-256"),
  iteracoes: z.number().int(),
  sal: z.string(),
  iv: z.string(),
});
export type CabecalhoCifrado = z.infer<typeof EsquemaCabecalhoCifrado>;
