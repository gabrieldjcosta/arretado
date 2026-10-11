// Adaptador de súmulas (Peça 4 do acervo): um arquivo curado por coleção (`acervo/fontes/*.json`),
// com o enunciado de cada súmula, a situação e a nota de origem. A coleta do portal de cada tribunal
// é trabalho do curador (o texto oficial é conferido na fonte); o pipeline só valida e gera o item.
import { z } from 'zod';
import type { NoDoItem } from '../../src/dominios/acervo/esquemas';
import { enderecoDeSumula, rotuloDeSumula } from '../../src/dominios/legislacao/sumulas';
import type { ItemDaCuradoria } from './curadoria';
import { arvoreValida, montar, type ResultadoDaConstrucao } from './construir';

export const SITUACOES_DE_SUMULA = ['vigente', 'cancelada', 'superada'] as const;

export const SumulaDaFonte = z.strictObject({
  numero: z.int().min(1).max(9_999),
  enunciado: z.string().trim().min(1).max(20_000),
  situacao: z.enum(SITUACOES_DE_SUMULA).default('vigente'),
  /** Origem curta: "DJ 12/03/1998", "Sessão de 10/12/2003". */
  origem: z.string().trim().max(200).optional(),
  /** Página oficial da súmula. */
  link: z.url({ protocol: /^https?$/ }).optional(),
});
export type SumulaDaFonte = z.infer<typeof SumulaDaFonte>;

export const FonteDeSumulas = z.strictObject({
  tribunal: z.string().trim().min(1).max(100),
  vinculante: z.boolean().default(false),
  sumulas: z.array(SumulaDaFonte).min(1).max(5_000),
});
export type FonteDeSumulas = z.infer<typeof FonteDeSumulas>;

const STATUS = {
  vigente: 'vigente',
  cancelada: 'revogado',
  superada: 'eficacia_cessada',
} as const;

const AVISO_DA_SITUACAO = { cancelada: 'Súmula cancelada.', superada: 'Súmula superada.' } as const;

export function nosDeSumulas(fonte: FonteDeSumulas): NoDoItem[] {
  return [...fonte.sumulas]
    .sort((a, b) => a.numero - b.numero)
    .map((s): NoDoItem => {
      const notas = [
        ...(s.situacao === 'vigente' ? [] : [{ texto: AVISO_DA_SITUACAO[s.situacao] }]),
        ...(s.origem === undefined
          ? []
          : [{ texto: s.origem, ...(s.link ? { link: s.link } : {}) }]),
      ];
      return {
        endereco: enderecoDeSumula(s.numero, fonte.vinculante),
        categoria: 'normativo',
        tipo: 'sumula',
        rotulo: rotuloDeSumula(s.numero, fonte.vinculante),
        status: STATUS[s.situacao],
        confianca: 'alta',
        trechos: [{ texto: s.enunciado }],
        ...(notas.length > 0 ? { notasVigencia: notas } : {}),
      };
    });
}

/** Item de coleção de súmulas: números únicos, árvore válida; o resto é do esquema. */
export function construirItemSumulas(
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
  let fonte: FonteDeSumulas;
  try {
    fonte = FonteDeSumulas.parse(JSON.parse(json));
  } catch (e) {
    return {
      ...resultado,
      bloqueios: [`fonte de súmulas inválida: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  const nos = nosDeSumulas(fonte);
  resultado.nos = nos.length;
  const numeros = new Set<number>();
  for (const s of fonte.sumulas) {
    if (numeros.has(s.numero)) resultado.bloqueios.push(`súmula repetida: ${String(s.numero)}`);
    numeros.add(s.numero);
  }
  const erro = arvoreValida(nos);
  if (erro) resultado.bloqueios.push(`árvore inválida: ${erro}`);
  if (resultado.bloqueios.length > 0) return resultado;
  return {
    ...resultado,
    item: montar(cur, nos, { tituloOficial: fonte.tribunal }, coletadoEm, urlOficial),
  };
}
