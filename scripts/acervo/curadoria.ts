// Curadoria do acervo (spec §8): o que entra, com id estável, grupo, vínculos, avisos e a fonte.
// Arquivo versionado (`acervo/curadoria.json`), escrito pelo Gabriel e pelo Claude; o pipeline só lê.
import { z } from 'zod';
import { Norma, TextoCurto } from '../../src/core/modelo';
import { IdDoAcervo, VinculoSugerido } from '../../src/dominios/acervo/esquemas';
import { TIPOS_DE_ANOMALIA } from '../../src/dominios/legislacao/validacao';

export const FonteDaCuradoria = z.discriminatedUnion('adaptador', [
  /** Página do Planalto (HTML, geralmente windows-1252). */
  z.strictObject({ adaptador: z.literal('planalto'), url: z.url({ protocol: /^https?$/ }) }),
  /** Markdown convertido de PDF: `~~tachado~~` vira texto tachado. `arquivo` é relativo a `acervo/fontes/`. */
  z.strictObject({
    adaptador: z.literal('markdown'),
    arquivo: z.string().regex(/^[A-Za-z0-9._-]{1,120}$/),
    urlOficial: z.url({ protocol: /^https?$/ }).optional(),
  }),
  /** Coleção de súmulas curada em JSON (`scripts/acervo/sumulas.ts`); `arquivo` é relativo a `acervo/fontes/`. */
  z.strictObject({
    adaptador: z.literal('sumulas'),
    arquivo: z.string().regex(/^[A-Za-z0-9._-]{1,120}$/),
    urlOficial: z.url({ protocol: /^https?$/ }).optional(),
  }),
  /** Coleção de teses curada em JSON (`scripts/acervo/teses.ts`); `arquivo` é relativo a `acervo/fontes/`. */
  z.strictObject({
    adaptador: z.literal('teses'),
    arquivo: z.string().regex(/^[A-Za-z0-9._-]{1,120}$/),
    urlOficial: z.url({ protocol: /^https?$/ }).optional(),
  }),
]);
export type FonteDaCuradoria = z.infer<typeof FonteDaCuradoria>;

export const ItemDaCuradoria = z.strictObject({
  id: IdDoAcervo,
  titulo: TextoCurto,
  grupo: TextoCurto,
  /** Título curto da norma no app; padrão: `titulo`. */
  tituloCurto: TextoCurto.optional(),
  tipo: Norma.shape.tipo,
  esfera: Norma.shape.esfera,
  especie: Norma.shape.especie,
  vinculos: z.array(VinculoSugerido).max(20).default([]),
  avisos: z.array(z.string().max(500)).max(10).default([]),
  fonte: FonteDaCuradoria,
  /** Sobe quando o curador publica uma revisão do item (o app compara com a versão aderida). */
  versao: z.int().min(1).default(1),
  /**
   * Documento técnico sem artigos (PNAS, SINASE, Orientações Técnicas, Tipificação): o texto vira
   * um Anexo com blocos pelos títulos do Markdown, sem passar pelo estruturador (regra de 10/10/2026).
   */
  semArtigos: z.boolean().default(false),
  /** Avisos de leitura que o curador viu e aceitou para este item (tipos de `TIPOS_DE_ANOMALIA`). */
  anomaliasAceitas: z.array(z.enum(TIPOS_DE_ANOMALIA as [string, ...string[]])).default([]),
});
export type ItemDaCuradoria = z.infer<typeof ItemDaCuradoria>;

export const Curadoria = z
  .strictObject({
    versao: z.literal(1),
    itens: z.array(ItemDaCuradoria).max(2_000),
  })
  .superRefine((c, ctx) => {
    const vistos = new Set<string>();
    c.itens.forEach((item, i) => {
      if (vistos.has(item.id))
        ctx.addIssue({ code: 'custom', path: ['itens', i, 'id'], message: 'id repetido' });
      vistos.add(item.id);
    });
  });
export type Curadoria = z.infer<typeof Curadoria>;
