// Os humores do Zé (D-D10). O rosto não tem boca: a expressão vem do formato dos olhos e da força das
// bochechas. Nunca triste, nunca cara de cobrança, nunca olho fechado parado (só no piscar, na
// piscadela e no olho contente).

export type Humor = 'neutro' | 'atento' | 'contente' | 'piscadela';

/**
 * `ey` é a altura dos olhos; `sx` e `sy`, a escala deles; `a` é quanto cada olho é arco "^" (0 a
 * cápsula, 1 o arco: o olho contente e a piscadela); `b` é a força das bochechas.
 */
export interface ValoresDoHumor {
  ey: number;
  sx: number;
  sy: number;
  a: readonly [number, number];
  b: number;
}

export const HUMORES: Record<Humor, ValoresDoHumor> = {
  neutro: { ey: 74, sx: 1, sy: 1, a: [0, 0], b: 0.65 },
  atento: { ey: 72, sx: 1.04, sy: 1.12, a: [0, 0], b: 0.5 },
  contente: { ey: 75, sx: 1.04, sy: 1, a: [1, 1], b: 1 },
  piscadela: { ey: 74, sx: 1, sy: 1, a: [0, 1], b: 0.85 },
};

/**
 * Os tamanhos do desenho, que mudam a espessura do traço e da faixa para a linha seguir com 1,5 a 2 px
 * na tela. Quem usa escolhe pelo tamanho que a tela dá ao Zé (o CSS da tela é quem o dimensiona):
 * `grande` (Boas-vindas e Começar, ao redor de 170 px), `medio` (os passos, 72 px), `pequeno` (48 px) e
 * `minimo` (32 e 24 px: a faixa afunda, para a silhueta manter o contraste, e as bochechas somem).
 */
export type TamanhoDoZe = 'grande' | 'medio' | 'pequeno' | 'minimo';

/** Atento, contente e piscadela só a partir de 72 px; abaixo disso a expressão não se lê e o rosto é neutro. */
export function humorNoTamanho(humor: Humor, tamanho: TamanhoDoZe): Humor {
  return tamanho === 'pequeno' || tamanho === 'minimo' ? 'neutro' : humor;
}
