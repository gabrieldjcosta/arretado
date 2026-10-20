const BOJO =
  'M82 110 V100 A31 31 0 0 0 51 69 H31 A31 31 0 0 0 0 100 V120 A31 31 0 0 0 31 151 H51 A31 31 0 0 0 82 120 Z';
const BRACO_DO_R = 'M0 112 C2 84 14 70 40 70';

/** Os 14 traços do nome na ordem da mão (a r r e t a d o): [caminho, deslocamento em x da letra]. */
const NOME: readonly (readonly [string, number])[] = [
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

/**
 * O lockup da marca (D-D9, Q2): "arretado" escrito num traço só, em minúsculas, com o cacto
 * simplificado e o ponto de luz ao lado. Parado: a escrita animada do nome é da Q6. Decorativo para o
 * leitor de tela, porque quem nomeia é o link que o envolve. O traço segue o `currentColor`; o ponto e
 * o halo, os tokens `--marca-ponto` e `--marca-disco` (o ponto de luz de cada mundo). Geometria do kit
 * da marca (`lockup-parado`), nas mesmas coordenadas.
 */
export function LockupParado() {
  return (
    <svg
      className="lockup"
      viewBox="-14 18 1015 154"
      fill="none"
      stroke="currentColor"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {NOME.map(([d, x]) => (
        <path key={`${String(x)}${d}`} d={d} transform={`translate(${String(x)} 0)`} />
      ))}
      <path d="M923 151V37" />
      <path d="M923 111H890A24 24 0 0 1 866 87V65" />
      <path d="M923 131H956A24 24 0 0 0 980 107V87" />
      <circle className="lockup-disco" cx="980" cy="87" r="20" stroke="none" />
      <circle className="lockup-ponto" cx="980" cy="87" r="11" stroke="none" />
    </svg>
  );
}
