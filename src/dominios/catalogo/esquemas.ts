// Contrato dos arquivos do catálogo de concursos (B0: docs/planos/catalogo-formato.md). Dado versionado
// no app, mas tratado como externo: passa pelos esquemas antes de chegar à interface.
import { z } from 'zod';

export const FaixaDoCatalogo = z.enum(['Altíssima', 'Alta', 'Média', 'Baixa']);
export type FaixaDoCatalogo = z.infer<typeof FaixaDoCatalogo>;

const Texto = z.string().min(1).max(2_000);
const Url = z.string().max(2_000).nullable();

export const EntradaDaCarreira = z.discriminatedUnion('disponivel', [
  z.strictObject({
    nome: Texto,
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    disponivel: z.literal(true),
    arquivo: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}\.json$/),
    editais: z.number().int().nonnegative(),
    orgaosSemEdital: z.number().int().nonnegative(),
    itens: z.number().int().nonnegative(),
  }),
  z.strictObject({
    nome: Texto,
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    disponivel: z.literal(false),
  }),
]);
export type EntradaDaCarreira = z.infer<typeof EntradaDaCarreira>;

export const IndiceDoCatalogo = z.strictObject({
  versao: z.literal(1),
  carreiras: z.array(EntradaDaCarreira).max(100),
});
export type IndiceDoCatalogo = z.infer<typeof IndiceDoCatalogo>;

export const ItemDoEdital = z.strictObject({
  numero: z.string().max(40).nullable(),
  assunto: z.string().min(1).max(20_000),
  faixa: FaixaDoCatalogo.nullable(),
  obsFaixa: z.string().max(2_000).nullable(),
  recorrencia: z.string().max(20).nullable(),
  fonteUrl: Url,
});
export type ItemDoEdital = z.infer<typeof ItemDoEdital>;

export const DisciplinaDoEdital = z.strictObject({
  /** Nome consolidado entre editais, quando o catálogo o tem. */
  nome: Texto.optional(),
  nomeNoEdital: Texto,
  ordem: z.number().int().positive(),
  itens: z.array(ItemDoEdital).max(5_000),
});
export type DisciplinaDoEdital = z.infer<typeof DisciplinaDoEdital>;

export const EditalDoCatalogo = z.strictObject({
  id: z.string().min(1).max(200),
  orgao: Texto,
  uf: z.string().max(2).nullable(),
  banca: z.string().max(200).nullable(),
  ano: z.number().int().nullable(),
  cargo: z.string().max(500).nullable(),
  fase: z.string().max(40).nullable(),
  situacao: z.enum(['completo', 'parcial', 'NÃO LOCALIZADO']),
  fonteUrl: Url,
  /** "baseado no edital <órgão> de <ano>": o rótulo honesto de origem. Nulo = não oferecido. */
  rotulo: z.string().max(300).nullable(),
  disciplinas: z.array(DisciplinaDoEdital).max(200),
});
export type EditalDoCatalogo = z.infer<typeof EditalDoCatalogo>;

export const DisciplinaConsolidada = z.strictObject({
  nome: Texto,
  variantes: z.array(z.string().max(500)).max(100),
  presenteEm: z.number().int().nonnegative(),
  totalEditais: z.number().int().nonnegative(),
  faixaSugerida: FaixaDoCatalogo.nullable(),
  /** `edital` = veio do Perplexity; `derivada` = calculada pela presença nos editais da amostra. */
  faixaOrigem: z.enum(['edital', 'derivada']).nullable(),
  faixaBase: z.string().max(300).nullable(),
});
export type DisciplinaConsolidada = z.infer<typeof DisciplinaConsolidada>;

export const CarreiraDoCatalogo = z.strictObject({
  versao: z.literal(1),
  carreira: Texto,
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  editais: z.array(EditalDoCatalogo).max(500),
  disciplinas: z.array(DisciplinaConsolidada).max(500),
});
export type CarreiraDoCatalogo = z.infer<typeof CarreiraDoCatalogo>;
