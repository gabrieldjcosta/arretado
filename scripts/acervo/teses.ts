// Adaptador de teses institucionais (Peça 5 do acervo): um arquivo curado em `acervo/fontes/*.json`
// com as teses da Defensoria agrupadas por área. A coleta da página (34 páginas, PDF por tese) é
// trabalho do curador; o pipeline só valida e gera o item.
import { z } from 'zod';
import type { NoDoItem } from '../../src/dominios/acervo/esquemas';
import { enderecoDeTese, rotuloDeTese } from '../../src/dominios/legislacao/sumulas';
import type { ItemDaCuradoria } from './curadoria';
import { arvoreValida, montar, type ResultadoDaConstrucao } from './construir';

const SITUACOES = ['vigente', 'revogada'] as const;

export const TeseDaFonte = z.strictObject({
  numero: z.int().min(1).max(9_999),
  texto: z.string().trim().min(1).max(20_000),
  situacao: z.enum(SITUACOES).default('vigente'),
  /** Origem curta: "II Encontro Estadual, 2008". */
  origem: z.string().trim().min(1).max(200).optional(),
  /** PDF da tese. */
  link: z.url({ protocol: /^https?$/ }).optional(),
});
export type TeseDaFonte = z.infer<typeof TeseDaFonte>;

export const AreaDeTeses = z.strictObject({
  nome: z.string().trim().min(1).max(100),
  teses: z.array(TeseDaFonte).min(1).max(2_000),
});

export const FonteDeTeses = z.strictObject({
  titulo: z.string().trim().min(1).max(200),
  areas: z.array(AreaDeTeses).min(1).max(50),
});
export type FonteDeTeses = z.infer<typeof FonteDeTeses>;

/** "Execução Criminal" → `areaexecucaocriminal` (endereço só com letras e dígitos). */
export const enderecoDaArea = (nome: string): string =>
  `area${nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/gu, '')}`;

export function nosDeTeses(fonte: FonteDeTeses): NoDoItem[] {
  const nos: NoDoItem[] = [];
  for (const area of fonte.areas) {
    const pai = enderecoDaArea(area.nome);
    nos.push({
      endereco: pai,
      categoria: 'estrutural',
      tipo: 'capitulo',
      rotulo: area.nome,
      status: 'vigente',
      confianca: 'alta',
      trechos: [{ texto: area.nome }],
    });
    for (const t of [...area.teses].sort((a, b) => a.numero - b.numero)) {
      nos.push({
        endereco: enderecoDeTese(t.numero),
        categoria: 'normativo',
        tipo: 'tese',
        rotulo: rotuloDeTese(t.numero),
        status: t.situacao === 'vigente' ? 'vigente' : 'revogado',
        confianca: 'alta',
        pai,
        trechos: [{ texto: t.texto }],
        ...(t.situacao === 'vigente' ? {} : { notasVigencia: [{ texto: 'Tese revogada.' }] }),
        ...(t.origem === undefined
          ? {}
          : { procedencia: { rotulo: t.origem, ...(t.link ? { link: t.link } : {}) } }),
      });
    }
  }
  return nos;
}

/** Item de coleção de teses: números e áreas únicos, árvore válida; o resto é do esquema. */
export function construirItemTeses(
  cur: ItemDaCuradoria,
  json: string,
  coletadoEm: string,
  urlOficial: string | undefined,
): ResultadoDaConstrucao {
  const resultado: ResultadoDaConstrucao = {
    id: cur.id,
    bloqueios: [],
    anomalias: {},
    nos: 0,
    aConfirmar: 0,
  };
  let fonte: FonteDeTeses;
  try {
    fonte = FonteDeTeses.parse(JSON.parse(json));
  } catch (e) {
    return {
      ...resultado,
      bloqueios: [`fonte de teses inválida: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  const nos = nosDeTeses(fonte);
  resultado.nos = nos.length;
  const numeros = new Set<number>();
  for (const t of fonte.areas.flatMap((a) => a.teses)) {
    if (numeros.has(t.numero)) resultado.bloqueios.push(`tese repetida: ${String(t.numero)}`);
    numeros.add(t.numero);
  }
  const erro = arvoreValida(nos);
  if (erro && !erro.startsWith('endereço repetido: t'))
    resultado.bloqueios.push(`árvore inválida: ${erro}`);
  if (resultado.bloqueios.length > 0) return resultado;
  return {
    ...resultado,
    item: montar(cur, nos, { tituloOficial: fonte.titulo }, coletadoEm, urlOficial),
  };
}
