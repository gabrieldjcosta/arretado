// Mapa da norma (AP-04): a faixa de incidência de cada artigo, o quanto a pessoa já cobriu e o
// próximo trecho a ler. Contas puras sobre a árvore em ordem de leitura (`nos`) e o arquivo de
// incidência do recorte (banca × cargo), servido pelo app como o acervo (`public/incidencia/`); a
// tela só desenha o que sai daqui. O mapa é ordem de leitura, não previsão: quando uma questão
// cobre vários artigos, o peso se divide entre eles.
import { z } from 'zod';
import { MINUTOS_POR_ARTIGO } from './continuar';
import type { NoDaLeitura } from './leitor';
import { enderecoDoArtigo } from './pacote-de-incidencia';

/** As faixas por massa acumulada do recorte: altíssima até 40%, alta até 70%, média até 90%. */
export const FAIXAS = ['altissima', 'alta', 'media', 'baixa'] as const;
export type Faixa = (typeof FAIXAS)[number];
/** A classe do quadrado: a faixa, ou `sem` para o artigo sem questão medida no recorte. */
export type ClasseDoArtigo = Faixa | 'sem';
export const CLASSES: readonly ClasseDoArtigo[] = [...FAIXAS, 'sem'];

/** O nome de cada classe, como a legenda e o leitor de tela dizem. */
export const NOME_DA_CLASSE: Record<ClasseDoArtigo, string> = {
  altissima: 'cai muito',
  alta: 'cai',
  media: 'cai às vezes',
  baixa: 'raro',
  sem: 'sem questão',
};

const IdDoAcervo = z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/);
const NumeroDeArtigo = z.string().regex(/^\d{1,4}(-[A-Z]{1,3})?$/);

/** O arquivo de uma norma num recorte: `[número do artigo, peso, faixa]`, em ordem de leitura. */
export const MapaDeIncidencia = z.strictObject({
  versao: z.literal(1),
  recorte: IdDoAcervo,
  norma: IdDoAcervo,
  artigos: z.array(z.tuple([NumeroDeArtigo, z.number().min(0), z.enum(FAIXAS)])).max(20_000),
});
export type MapaDeIncidencia = z.infer<typeof MapaDeIncidencia>;

export const RecorteDeIncidencia = z.strictObject({
  id: IdDoAcervo,
  /** "FCC × Defensor Público (SP)". */
  titulo: z.string().min(1).max(200),
  /** Questões lidas no recorte, para dizer de onde o mapa vem. */
  questoes: z.int().min(1).optional(),
  periodo: z.string().min(1).max(40).optional(),
  /** Itens do acervo com arquivo neste recorte. */
  normas: z.array(IdDoAcervo).max(2_000),
});
export type RecorteDeIncidencia = z.infer<typeof RecorteDeIncidencia>;

/** `indice.json`: os recortes publicados e as normas de cada um. */
export const IndiceDeIncidencia = z.strictObject({
  versao: z.literal(1),
  recortes: z.array(RecorteDeIncidencia).max(100),
});
export type IndiceDeIncidencia = z.infer<typeof IndiceDeIncidencia>;

/** Um artigo no mapa: o quadrado. */
export interface QuadradoDoMapa {
  /** Índice do artigo em `nos`. */
  indice: number;
  /** Fim (exclusive, índice de nó) do que está dentro do artigo: parágrafos, incisos, a rubrica. */
  fim: number;
  id: string;
  endereco: string;
  /** "Art. 157". */
  rotulo: string;
  classe: ClasseDoArtigo;
  peso: number;
  /** Revogado, vetado ou sem eficácia: aparece no mapa, mas nunca é o próximo trecho. */
  foraDeVigor: boolean;
}

const FORA_DE_VIGOR = new Set(['revogado', 'eficacia_cessada', 'vetado']);

/**
 * Os artigos da norma, em ordem de leitura, com a classe que o arquivo dá a cada um (`sem` para o
 * artigo que o arquivo não cita, e para todos quando não há arquivo). O que está dentro do artigo
 * (nível maior, logo depois dele) conta como dele: uma marca num inciso é uma marca no artigo.
 */
export function quadradosDoMapa(
  nos: readonly NoDaLeitura[],
  mapa: MapaDeIncidencia | undefined,
): QuadradoDoMapa[] {
  const porEndereco = new Map<string, { peso: number; faixa: Faixa }>();
  for (const [numero, peso, faixa] of mapa?.artigos ?? []) {
    porEndereco.set(enderecoDoArtigo(numero), { peso, faixa });
  }
  const quadrados: QuadradoDoMapa[] = [];
  nos.forEach((no, indice) => {
    const { dispositivo } = no;
    if (dispositivo.tipo !== 'artigo') return;
    let fim = indice + 1;
    while (fim < nos.length && (nos[fim]?.nivel ?? 0) > no.nivel) fim++;
    const dado = porEndereco.get(dispositivo.endereco);
    quadrados.push({
      indice,
      fim,
      id: dispositivo.id,
      endereco: dispositivo.endereco,
      rotulo: dispositivo.rotulo ?? dispositivo.endereco,
      classe: dado?.faixa ?? 'sem',
      peso: dado?.peso ?? 0,
      foraDeVigor: FORA_DE_VIGOR.has(dispositivo.status),
    });
  });
  return quadrados;
}

export interface Cobertura {
  /** Por quadrado (mesma ordem), se já foi coberto. */
  cobertos: readonly boolean[];
  /** Artigos cobertos e o total em vigor. */
  artigos: number;
  total: number;
  /** A massa de incidência coberta e a total (soma dos pesos). */
  massa: number;
  massaTotal: number;
}

/**
 * O que a pessoa já cobriu: tudo até o "lido até" (índice de nó, inclusive) e cada artigo com uma
 * marca sua dentro dele (`marcados`: índices de nós com grifo, nota, Estrela ou Erro). O artigo
 * fora de vigor não entra na conta do total nem da massa. Só ganho: a tela diz "você cobriu 32%",
 * nunca o que falta.
 */
export function cobertura(
  quadrados: readonly QuadradoDoMapa[],
  lidoAte: number | undefined,
  marcados: ReadonlySet<number> = new Set(),
): Cobertura {
  const ordenados = [...marcados].sort((a, b) => a - b);
  let proximaMarca = 0;
  let artigos = 0;
  let total = 0;
  let massa = 0;
  let massaTotal = 0;
  const cobertos = quadrados.map((q) => {
    while (proximaMarca < ordenados.length && (ordenados[proximaMarca] ?? 0) < q.indice) {
      proximaMarca++;
    }
    const marca = ordenados[proximaMarca];
    const coberto =
      (lidoAte !== undefined && q.indice <= lidoAte) || (marca !== undefined && marca < q.fim);
    if (!q.foraDeVigor) {
      total++;
      massaTotal += q.peso;
      if (coberto) {
        artigos++;
        massa += q.peso;
      }
    }
    return coberto;
  });
  return { cobertos, artigos, total, massa, massaTotal };
}

/** A parte coberta (0 a 1): pela massa quando há arquivo, pelos artigos quando não há. */
export function parteCoberta(c: Cobertura): number {
  if (c.massaTotal > 0) return c.massa / c.massaTotal;
  return c.total > 0 ? c.artigos / c.total : 0;
}

export interface Concentracao {
  /** Artigos que caem muito ou caem (as duas faixas de cima) e o total em vigor. */
  artigos: number;
  total: number;
  /** A parte da massa que esses artigos concentram (0 a 1). */
  parcela: number;
  /** A massa dos artigos em vigor (soma dos pesos): quase o número de questões que caíram na norma. */
  massaTotal: number;
}

/** "81 dos 432 artigos concentram 70% do que a banca cobrou desta norma." */
export function concentracao(quadrados: readonly QuadradoDoMapa[]): Concentracao {
  let artigos = 0;
  let total = 0;
  let massa = 0;
  let massaTotal = 0;
  for (const q of quadrados) {
    if (q.foraDeVigor) continue;
    total++;
    massaTotal += q.peso;
    if (q.classe === 'altissima' || q.classe === 'alta') {
      artigos++;
      massa += q.peso;
    }
  }
  return { artigos, total, parcela: massaTotal > 0 ? massa / massaTotal : 0, massaTotal };
}

export interface TrechoDoMapa {
  /** Posições em `quadrados` do primeiro e do último artigo do trecho. */
  de: number;
  ate: number;
  artigos: number;
  classe: Faixa;
  minutos: number;
}

/** Quantos artigos seguidos o trecho junta, no máximo (uns 6 minutos de leitura). */
export const ARTIGOS_POR_TRECHO = 6;

const ORDEM_DA_CLASSE: Record<ClasseDoArtigo, number> = {
  altissima: 0,
  alta: 1,
  media: 2,
  baixa: 3,
  sem: 4,
};

/**
 * O próximo trecho a ler: da melhor faixa que ainda tem artigo em vigor não coberto, o primeiro
 * deles na ordem da norma, e os seguintes enquanto forem vizinhos, não cobertos, em vigor e de faixa
 * igual ou melhor, até `maximo`. Sem arquivo (todos `sem`) ou tudo coberto, nada.
 */
export function proximoTrecho(
  quadrados: readonly QuadradoDoMapa[],
  cobertos: readonly boolean[],
  maximo = ARTIGOS_POR_TRECHO,
): TrechoDoMapa | undefined {
  const livre = (i: number) => {
    const q = quadrados[i];
    return q !== undefined && !q.foraDeVigor && !cobertos[i] && q.classe !== 'sem';
  };
  let melhor: number | undefined;
  for (let i = 0; i < quadrados.length; i++) {
    if (!livre(i)) continue;
    const ordem = ORDEM_DA_CLASSE[quadrados[i]?.classe ?? 'sem'];
    if (melhor === undefined || ordem < ORDEM_DA_CLASSE[quadrados[melhor]?.classe ?? 'sem']) {
      melhor = i;
      if (ordem === 0) break;
    }
  }
  if (melhor === undefined) return undefined;
  const classe = quadrados[melhor]?.classe;
  if (classe === undefined || classe === 'sem') return undefined;
  let ate = melhor;
  while (
    ate + 1 < quadrados.length &&
    ate - melhor + 1 < maximo &&
    livre(ate + 1) &&
    ORDEM_DA_CLASSE[quadrados[ate + 1]?.classe ?? 'sem'] <= ORDEM_DA_CLASSE[classe]
  ) {
    ate++;
  }
  const artigos = ate - melhor + 1;
  return {
    de: melhor,
    ate,
    artigos,
    classe,
    minutos: Math.max(1, Math.ceil(artigos * MINUTOS_POR_ARTIGO)),
  };
}

/** "art. 157" ou "arts. 59 a 62", para o meio da frase ("Ler arts. 59 a 62"), como se cita. */
export function rotuloDoTrecho(quadrados: readonly QuadradoDoMapa[], trecho: TrechoDoMapa): string {
  const de = quadrados[trecho.de]?.rotulo ?? '';
  const ate = quadrados[trecho.ate]?.rotulo ?? '';
  const numero = (rotulo: string) => rotulo.replace(/^Art\.\s*/i, '');
  if (trecho.de === trecho.ate) return `art. ${numero(de)}`;
  return `arts. ${numero(de)} a ${numero(ate)}`;
}

/**
 * O roteiro de "ler seguindo o mapa": os próximos trechos em ordem, cada um escolhido como se os
 * anteriores já estivessem cobertos. Termina quando não resta artigo com faixa por cobrir.
 */
export function roteiroDoMapa(
  quadrados: readonly QuadradoDoMapa[],
  cobertos: readonly boolean[],
): TrechoDoMapa[] {
  const feitos = [...cobertos];
  const trechos: TrechoDoMapa[] = [];
  for (let t = proximoTrecho(quadrados, feitos); t; t = proximoTrecho(quadrados, feitos)) {
    trechos.push(t);
    feitos.fill(true, t.de, t.ate + 1);
  }
  return trechos;
}
