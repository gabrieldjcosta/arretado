import { useId } from 'react';
import './luz.css';

/**
 * As duas poses desenhadas da caneta (D-D7, P3). "Largada" ao fim do traço do cachorro usa a deitada,
 * posta pelo lugar onde a tela a coloca.
 */
export type PoseDaCaneta = 'encostada' | 'deitada';

/** Giro em torno da ponta (32, 200), deslocamento e caixa da vista de cada pose. */
const POSES: Record<PoseDaCaneta, { giro: number; deslocar: string; caixa: string }> = {
  encostada: { giro: 35, deslocar: '-18 -4', caixa: '0 0 150 205' },
  deitada: { giro: 65, deslocar: '-20 -106', caixa: '0 0 190 106' },
};

const CORPO = 'M19 166 L21 28 A11 11 0 0 1 43 28 L45 166 L32 200 Z';

/**
 * A caneta-cacto de vidro: o ponteiro da retomada. Coluna com dois braços, do ciano ao verde, brilho
 * de borda, três pontos de luz nas pontas dos membros e a ponta cônica com o ponto de luz. É o único
 * objeto com volume e o único gradiente do app: nunca é botão, painel nem fundo de texto, e só há uma
 * por tela. Decorativa (`aria-hidden`); muda de lugar por salto, nunca gira nem desliza.
 *
 * Desenhada em pé, com a ponta em (32, 200), e girada: 35° encostada (na folha do Agora, no Cartão
 * atual) e 65° deitada (ao fim de "Lido até aqui" e, largada, ao fim do traço do cachorro). As cores
 * vêm dos tokens `--caneta-*`: o tema troca o vidro, o brilho e o halo da ponta (só o halo cresce à
 * noite, e por isso o desenho leva os dois, com a opacidade de um deles em zero).
 */
export function Caneta({ pose, className }: { pose: PoseDaCaneta; className?: string }) {
  const id = useId();
  const vidro = `${id}-vidro`;
  const haloDia = `${id}-halo-dia`;
  const haloNoite = `${id}-halo-noite`;
  const { giro, deslocar, caixa } = POSES[pose];
  const gradiente = `url(#${vidro})`;
  return (
    <svg
      className={className === undefined ? 'caneta' : `caneta ${className}`}
      data-pose={pose}
      viewBox={caixa}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={vidro} gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="200">
          <stop offset="0" className="caneta-vidro-0" />
          <stop offset="0.28" className="caneta-vidro-1" />
          <stop offset="0.55" className="caneta-vidro-2" />
          <stop offset="0.8" className="caneta-vidro-3" />
          <stop offset="1" className="caneta-vidro-4" />
        </linearGradient>
        <filter id={haloDia} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={haloNoite} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g transform={`translate(${deslocar}) rotate(${String(giro)} 32 200)`}>
        <path d={CORPO} fill={gradiente} />
        <path
          d="M27 112 H12 V76"
          fill="none"
          stroke={gradiente}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M37 132 H52 V100"
          fill="none"
          stroke={gradiente}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path className="caneta-miolo" d="M35 126 L39 166 L32 198 L31 166 Z" />
        <path className="caneta-borda" d={CORPO} />
        <path className="caneta-brilho" d="M27 36 V138" />
        <path className="caneta-brilho caneta-brilho-braco" d="M9 82 V112 M49 106 V128" />
        <circle className="caneta-ponto" cx="30" cy="25" r="2.4" />
        <circle className="caneta-ponto" cx="10" cy="76" r="2" />
        <circle className="caneta-ponto" cx="50" cy="100" r="2" />
        <circle className="caneta-halo-dia" cx="32" cy="200" r="7" filter={`url(#${haloDia})`} />
        <circle
          className="caneta-halo-noite"
          cx="32"
          cy="200"
          r="11"
          filter={`url(#${haloNoite})`}
        />
        <circle className="caneta-ponto" cx="32" cy="200" r="3" />
      </g>
    </svg>
  );
}
