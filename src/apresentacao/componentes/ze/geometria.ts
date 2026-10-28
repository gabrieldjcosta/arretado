// A geometria do Zé (D-D10): o cacto da marca como um tubo de néon de um traço só, aberto, do pé
// esquerdo ao pé direito, com uma flor que é o ponto de luz. Paramétrica: o componente porta a função
// `contornoZe`, não um `d` colado (contrato, §8). Só retas e arcos, como a escrita do nome.

/**
 * Os parâmetros do desenho, em unidades da caixa (`CAIXA_DO_ZE`). O tubo esquerdo tem 2·`bL` de
 * largura, o direito 2·`bR`; `gL` e `gR` são o vão entre cada braço e o tronco.
 */
export interface ParametrosDoZe {
  /** Eixo do tronco. */
  cx: number;
  /** Meia largura do tronco: o topo é um arco de raio `a`. */
  a: number;
  /** Topo do tronco (onde começa o arco) e pé (o chão, onde o traço começa e acaba). */
  yT: number;
  yB: number;
  /** Raio do tubo do braço esquerdo, vão até o tronco, altura da ponta e fundo do vão. */
  bL: number;
  gL: number;
  yLt: number;
  ySL: number;
  /** O mesmo, para o braço direito (mais baixo que o esquerdo, como na marca). */
  bR: number;
  gR: number;
  yRt: number;
  ySR: number;
  /** O olho: largura (a espessura do traço de ponta redonda), altura total e distância ao eixo. */
  ew: number;
  eh: number;
  ed: number;
}

export const PARAMETROS_DO_ZE: ParametrosDoZe = {
  cx: 120,
  a: 36,
  yT: 26,
  yB: 230,
  bL: 16,
  gL: 14,
  yLt: 84,
  ySL: 150,
  bR: 14,
  gR: 14,
  yRt: 112,
  ySR: 176,
  ew: 12.5,
  eh: 24,
  ed: 18,
};

/** A caixa da vista (`viewBox`): 196 por 240, com um respiro de 20 unidades sob os pés. */
export const CAIXA_DO_ZE = '22 10 196 240';
export const LARGURA_DA_CAIXA = 196;

/** Duas casas, como no kit da marca: o `d` não carrega ruído de ponto flutuante. */
export const arredondar = (valor: number) => Number(valor.toFixed(2));

type Segmento =
  | readonly ['M', number, number]
  | readonly ['V', number]
  | readonly ['A', number, number, number, number, number, number, number];

/**
 * O contorno: um traço aberto, do pé esquerdo ao pé direito, em 19 segmentos. Cada braço é um tubo
 * (duas retas e uma ponta redonda). Devolve o `d` e onde ficam as pontas dos braços (a direita leva
 * a flor).
 */
export function contornoZe(p: ParametrosDoZe) {
  const { a, cx } = p;
  const xTL = cx - a;
  const xTR = cx + a;
  const xLi = xTL - p.gL;
  const xLo = xLi - 2 * p.bL;
  const yEL = p.ySL + 2 * p.bL;
  const rIL = p.gL / 2;
  const rOL = rIL + 2 * p.bL;
  const xRi = xTR + p.gR;
  const xRo = xRi + 2 * p.bR;
  const yER = p.ySR + 2 * p.bR;
  const rIR = p.gR / 2;
  const rOR = rIR + 2 * p.bR;
  const segmentos: readonly Segmento[] = [
    ['M', xTL, p.yB],
    ['V', yEL + rIL],
    ['A', rIL, rIL, 0, 0, 0, xTL - rIL, yEL], // junção (côncava) sob o braço esquerdo
    ['A', rOL, rOL, 0, 0, 1, xLo, yEL - rOL], // cotovelo de fora (convexo)
    ['V', p.yLt + p.bL],
    ['A', p.bL, p.bL, 0, 0, 1, xLi, p.yLt + p.bL], // ponta do braço esquerdo
    ['V', p.ySL - rIL],
    ['A', rIL, rIL, 0, 0, 0, xLi + rIL, p.ySL], // fundo do vão, lado do braço
    ['A', rIL, rIL, 0, 0, 0, xTL, p.ySL - rIL], // fundo do vão, lado do tronco
    ['V', p.yT + a],
    ['A', a, a, 0, 0, 1, xTR, p.yT + a], // topo do tronco
    ['V', p.ySR - rIR],
    ['A', rIR, rIR, 0, 0, 0, xTR + rIR, p.ySR],
    ['A', rIR, rIR, 0, 0, 0, xRi, p.ySR - rIR],
    ['V', p.yRt + p.bR],
    ['A', p.bR, p.bR, 0, 0, 1, xRo, p.yRt + p.bR], // ponta do braço direito
    ['V', yER - rOR],
    ['A', rOR, rOR, 0, 0, 1, xRo - rOR, yER],
    ['A', rIR, rIR, 0, 0, 0, xTR, yER + rIR],
    ['V', p.yB],
  ];
  const d = segmentos
    .map(([comando, ...valores]) => `${comando}${valores.map(arredondar).join(' ')}`)
    .join('');
  return {
    d,
    pontaL: [xLo + p.bL, p.yLt] as const,
    pontaR: [xRo - p.bR, p.yRt] as const,
  };
}

export const CORPO = contornoZe(PARAMETROS_DO_ZE);

/**
 * A flor é o ponto de luz da marca: o mesmo ponto do braço direito do cacto do nome, numa haste curta.
 * (`x`, `y`) é o pé da haste; o ponto fica `sobe` acima; `r` é o raio do ponto e `disco` o do brilho.
 */
export const FLOR = {
  x: CORPO.pontaR[0],
  y: CORPO.pontaR[1] - 1,
  haste: 10,
  sobe: 17,
  r: 5.5,
  disco: 10,
} as const;

/** Onde o ponto da flor fica no desenho. */
export const PONTO_DA_FLOR = [FLOR.x, FLOR.y - FLOR.sobe] as const;

// O rosto não tem boca. Os olhos são cápsulas retas, de pé: um traço de ponta redonda; o humor muda
// o traço de reta (t = 0, a cápsula) para arco "^" (t = 1, o olho contente e a piscadela).
const { ew, eh, cx } = PARAMETROS_DO_ZE;
export const EIXOS_DOS_OLHOS = [cx - PARAMETROS_DO_ZE.ed, cx + PARAMETROS_DO_ZE.ed] as const;
/** A reta de dentro da cápsula; a ponta redonda é a espessura do traço. */
const METADE = (eh - ew) / 2;
/** Espessura do arco do olho contente. */
const ESPESSURA_DO_ARCO = 7;

const entre = (de: number, ate: number, t: number) => arredondar(de + (ate - de) * t);

/** O olho como traço de ponta redonda: `t` = 0 é a cápsula de pé; `t` = 1 é o arco "^". */
export function caminhoDoOlho(t: number): string {
  return `M${entre(0, -10, t)} ${entre(-METADE, 5, t)}Q0 ${entre(0, -12, t)} ${entre(0, 10, t)} ${entre(METADE, 5, t)}`;
}

/** A espessura do traço do olho: a cápsula é grossa, o arco é fino. */
export const espessuraDoOlho = (t: number) => entre(ew, ESPESSURA_DO_ARCO, t);

/** O halo do olho (só à noite) é maior que o olho por esta espessura. */
export const FOLGA_DO_HALO = 8;

/**
 * A opacidade do halo no olho em arco (`t` = 1). A cápsula (`t` = 0) não tem halo: o olho de pé fica nítido
 * sobre o rosto escuro, como no mockup aprovado, e o halo cresce com o quanto o olho é arco.
 */
export const FORCA_DO_HALO = 0.5;
export const opacidadeDoHalo = (t: number) => arredondar(FORCA_DO_HALO * t);

/** As bochechas: duas manchas ovais de cada lado, um pouco abaixo dos olhos. */
export const BOCHECHA = { dx: 20.5, y: 100, rx: 7.9, ry: 5 } as const;
