import { voltouDeLonge } from '../volta';

/** As cinco pétalas, as mesmas das flores do pouso (em 12 por 12). */
const PETALAS = [
  [6, 2.6],
  [9.2, 4.9],
  [8, 9],
  [4, 9],
  [2.8, 4.9],
] as const;

/** O cacto da marca ao lado do nome (o `<svg class="cacto-marca">` do mockup): o traço, o anel e o ponto. Com conta, o anel se fecha (`preso`). */
export function CactoMarca({ preso = false }: { preso?: boolean }) {
  const florido = voltouDeLonge();
  return (
    <svg className="m-cacto-marca" viewBox="854 24 140 136" aria-hidden="true">
      <path
        className="m-cm-l"
        d="M923 151V37M923 111H890A24 24 0 0 1 866 87V65M923 131H956A24 24 0 0 0 980 107V87"
      />
      <circle
        className={preso ? 'm-cm-anel m-preso' : 'm-cm-anel'}
        cx="980"
        cy="87"
        r="30"
        pathLength="1"
      />
      <circle className="m-cm-p" cx="980" cy="87" r="13" />
      {florido && (
        <g transform="translate(913 24) scale(1.65)">
          <g className="m-cm-flor">
            {PETALAS.map(([cx, cy]) => (
              <circle key={cx} className="m-cm-petala" cx={cx} cy={cy} r="2.1" />
            ))}
            <circle className="m-cm-miolo" cx="6" cy="6" r="1.4" />
          </g>
        </g>
      )}
    </svg>
  );
}
