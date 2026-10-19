import './luz.css';

/**
 * O cachorro em um traço só: focinho, testa, orelha semiereta (a do caramelo), pescoço e o lenço em
 * V, que fecha no ponto onde começou. Olho e focinho são dois pontos.
 */
const TRACO_CACHORRO =
  'M62 96 L46 80 C 36 80, 26 78, 18 74 C 14 72, 10 70, 12 68 C 8 62, 12 54, 22 50 C 32 46, 40 38, 46 30 C 54 20, 66 16, 80 18 C 86 16, 92 11, 96 7 C 100 4, 105 8, 103 14 C 102 20, 104 26, 103 32 C 102 35, 99 36, 98 38 C 104 48, 106 60, 100 72 C 96 78, 90 82, 82 84 L 62 96';

/**
 * O traço do cachorro (D-D7, P3): o mascote, só no Resumo do Dia e no fim de rodada, nunca no Leitor
 * nem na Revisão. Caramelo pela cor (`--traco-cachorro`), nunca cor de interface. Com `desenha`, o
 * traço se desenha uma vez em 300 ms (linear) e o olho e o focinho aparecem ao fim; sem ele, ou com
 * movimento reduzido, já está pronto. Decorativo (`aria-hidden`).
 */
export function TracoDoCachorro({
  desenha = false,
  className,
}: {
  desenha?: boolean;
  className?: string;
}) {
  const classes = ['traco-do-cachorro', desenha ? 'desenha' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <svg className={classes} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <path className="traco-linha" d={TRACO_CACHORRO} pathLength={100} />
      <circle className="traco-ponto" cx="56" cy="46" r="3.4" />
      <circle className="traco-ponto" cx="15" cy="62" r="3.8" />
    </svg>
  );
}
