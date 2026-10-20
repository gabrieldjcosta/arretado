// A geometria da marca (D-D9; kit da marca v2, `escrita-contrato.md`): o nome "arretado" escrito num
// traço só e o cacto simplificado ao lado, em unidades do letreiro (base y = 151, traço 18, pontas
// redondas). A escrita animada e o lockup parado desenham as mesmas coordenadas.

const BOJO =
  'M82 110 V100 A31 31 0 0 0 51 69 H31 A31 31 0 0 0 0 100 V120 A31 31 0 0 0 31 151 H51 A31 31 0 0 0 82 120 Z';
const BRACO_DO_R = 'M0 112 C2 84 14 70 40 70';

/** Os 14 traços do nome na ordem da mão (a r r e t a d o): [caminho, deslocamento em x da letra]. */
export const NOME: readonly (readonly [string, number])[] = [
  [BOJO, 0],
  ['M82 69 V151', 0],
  ['M0 69 V151', 120],
  [BRACO_DO_R, 120],
  ['M0 69 V151', 188],
  [BRACO_DO_R, 188],
  ['M0 110 H82 V100 A31 31 0 0 0 51 69 H31 A31 31 0 0 0 0 100 V120 A31 31 0 0 0 31 151 H55', 258],
  ['M0 40 V119 A31 31 0 0 0 31 150 H44', 402],
  ['M-28 70 H34', 402],
  [BOJO, 478],
  ['M82 69 V151', 478],
  [BOJO, 598],
  ['M82 30 V151', 598],
  [BOJO, 718],
];

/** O cacto: o tronco e os braços em L (o esquerdo mais alto); a ponta do direito guarda o ponto de luz. */
export const CACTO = [
  'M923 151V37',
  'M923 111H890A24 24 0 0 1 866 87V65',
  'M923 131H956A24 24 0 0 0 980 107V87',
] as const;

/** O ponto de luz ("onde parei"), na ponta do braço direito, e o disco de marca-texto atrás dele. */
export const PONTO = { x: 980, y: 87, raio: 11, disco: 20 } as const;

/** Por onde a luz sobe: da base do tronco à ponta do braço direito, onde ela pousa. */
export const CAMINHO_DA_LUZ = 'M923 151 V131 H956 A24 24 0 0 0 980 107 V87';

/**
 * A caixa do lockup. A escrita usa a mesma caixa do lockup parado e deixa a caneta e o traço de luz
 * passarem por fora (`overflow: visible`): o nome fica no mesmo lugar e no mesmo tamanho nos dois.
 */
export const CAIXA_DO_LOCKUP = '-14 18 1015 154';
