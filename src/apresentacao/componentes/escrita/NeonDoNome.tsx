import { useId } from 'react';
import { CACTO, NOME } from './geometria';

interface Props {
  /** Na escrita: cada gêmeo leva a curva da sua letra e se escreve junto com ela. Parado, é só o repouso. */
  animado?: boolean;
}

/**
 * O néon suave do nome (D-D10, N1): uma cópia larga e borrada das 14 letras e do cacto, num grupo só, com
 * um filtro só, que vai antes do desenho para o brilho ficar por baixo das letras. É da escrita
 * (`EscritaDoNome`, `animado`: acende com cada letra e assenta quando o nome acaba) e do lockup parado
 * (`LockupParado`), que é o quadro final dela: o repouso de cada mundo (de dia o grupo nem entra no
 * desenho; à noite fica baixo) é o mesmo nos dois, senão o nome da primeira abertura do Dia não seria o das
 * outras (ver `escrita.css`). A região do filtro é fixa, em unidades do letreiro: a caixa do grupo muda a
 * cada letra que se escreve e, num traço reto, tem largura zero.
 */
export function NeonDoNome({ animado = false }: Props) {
  const filtro = `${useId()}-neon`;
  return (
    <>
      <defs>
        <filter id={filtro} filterUnits="userSpaceOnUse" x="-80" y="-40" width="1140" height="260">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g
        className={animado ? 'eb-neon a neon-camada' : 'eb-neon neon-camada'}
        filter={`url(#${filtro})`}
        style={animado ? { animationName: 'eb-neon' } : undefined}
      >
        {NOME.map(([d, x], i) => (
          <path
            key={`${String(x)}${d}`}
            className={animado ? 'tr tn a' : 'tn'}
            pathLength={animado ? '1' : undefined}
            d={d}
            transform={`translate(${String(x)} 0)`}
            style={animado ? { animationName: `eb-t${String(i)}` } : undefined}
          />
        ))}
        <g
          className={animado ? 'a' : undefined}
          style={animado ? { animationName: 'eb-cacto' } : undefined}
        >
          {CACTO.map((d) => (
            <path key={d} className="tn" d={d} />
          ))}
        </g>
      </g>
    </>
  );
}
