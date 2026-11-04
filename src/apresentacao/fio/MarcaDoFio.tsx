import { voltouDeLonge } from './volta';

/** As cinco pétalas, as mesmas das flores do pouso (em 12 por 12). */
const PETALAS = [
  [6, 2.6],
  [9.2, 4.9],
  [8, 9],
  [4, 9],
  [2.8, 4.9],
] as const;

/**
 * O nome com o cacto da marca (a forma simples do `geometria.ts`): o ponto do braço direito é o nó da
 * pessoa. No cabeçalho do Arretado novo ele abre a Conta; na Abertura é onde a luz pousa.
 */
export function CactoDoFio({
  className = 'fio-cacto',
  florido = false,
}: {
  className?: string;
  florido?: boolean;
}) {
  return (
    <svg className={className} viewBox="854 24 140 136" aria-hidden="true" focusable="false">
      <path d="M923 151V37M923 111H890A24 24 0 0 1 866 87V65M923 131H956A24 24 0 0 0 980 107V87" />
      <circle className="fio-cacto-ponto" cx="980" cy="87" r="13" />
      {florido && (
        <g transform="translate(913 24) scale(1.65)">
          <g className="fio-cacto-flor">
            {PETALAS.map(([cx, cy]) => (
              <circle key={cx} className="fio-cacto-petala" cx={cx} cy={cy} r="2.1" />
            ))}
            <circle className="fio-cacto-miolo" cx="6" cy="6" r="1.4" />
          </g>
        </g>
      )}
    </svg>
  );
}

export function MarcaDoFio() {
  return (
    <>
      <span>arretado</span>
      <CactoDoFio florido={voltouDeLonge()} />
    </>
  );
}
