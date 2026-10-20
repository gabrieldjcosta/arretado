import { useId } from 'react';
import { CACTO, CAIXA_DO_LOCKUP, CAMINHO_DA_LUZ, NOME, PONTO } from './geometria';
import './escrita-b.css';
import './escrita.css';

// A caneta de vidro do kit (`pen.mjs` v5), de pé, com a ponta em (60, 262): tronco e dois braços que
// terminam num cone do mesmo vidro, com o furo de tinta à vista.
const TRONCO = 'M60 34 V184';
const BRACOS = 'M60 128 H42 A16 16 0 0 1 26 112 V82 M60 152 H78 A16 16 0 0 0 94 136 V108';
const FURO = 'M60 52 V186 M60 128 H42 A16 16 0 0 1 26 112 V92 M60 152 H78 A16 16 0 0 0 94 136 V118';
const CONE = 'M42 184 V186 C45 218 55 248 60 262 C65 248 75 218 78 186 V184 Z';
const CONE_CLARO = 'M48.48 184 V186 C50.4 218 56.8 248 60 262 C63.2 248 69.6 218 71.52 186 V184 Z';
const CONE_FURO = 'M54.6 186 V186 C55.5 218 58.5 248 60 258 C61.5 248 64.5 218 65.4 186 V186 Z';

/** O traço de luz sob o nome é de três janelas de comprimentos diferentes: a cauda. */
const JANELAS_DA_LUZ = [0.34, 0.22, 0.1] as const;

/** O tronco, os braços e o cone de uma camada de vidro; `larguras` são as do tronco e dos braços. */
function Tubo({ larguras, cone }: { larguras: readonly [number, number]; cone: string }) {
  return (
    <>
      <path d={TRONCO} fill="none" strokeWidth={larguras[0]} />
      <path d={BRACOS} fill="none" strokeWidth={larguras[1]} />
      <path d={cone} stroke="none" />
    </>
  );
}

interface Props {
  /** Modo curto: o nome já aparece escrito e a caneta chega junto do "o" (1,2 s em vez de 2,64 s). */
  curta?: boolean;
  /** Perfil Calmo: o desenho todo só esmaece (0,24 s), sem caneta nem traço. */
  calmo?: boolean;
  /** Pulou: vai direto ao quadro final (um toque, ou sem animação nenhuma). */
  pulou?: boolean;
}

/**
 * A escrita do nome (D-D9, Q6; final B do kit da marca): o "arretado" escrito letra a letra pela
 * caneta de vidro, que volta por baixo do nome deixando um traço de luz e vira o cacto. Mesma caixa e
 * mesmas coordenadas do `LockupParado`: o quadro final é o lockup. Decorativa (`aria-hidden`); quem
 * nomeia é o link do cabeçalho, e o app nunca espera a animação para ser usado. Os tempos e a
 * animação são do CSS gerado (`escrita-b.css`); sem `prefers-reduced-motion`, `pulou` ou `calmo` o
 * quadro final aparece na hora. Os 14 traços e os demais elementos levam o `animation-name` pelo
 * `style` do React (CSSOM), que a CSP `style-src 'self'` deixa passar, ao contrário do atributo
 * `style` escrito no HTML.
 */
export function EscritaDoNome({ curta = false, calmo = false, pulou = false }: Props) {
  const id = useId();
  // Duas escritas na mesma tela não podem repetir id: gradiente, filtro e máscara levam o `useId`.
  const [tinta, halo, aro] = [`${id}-tinta`, `${id}-halo`, `${id}-aro`];
  const classe = ['lockup', 'eb', curta && 'curta', calmo && 'calmo', pulou && 'pulou']
    .filter(Boolean)
    .join(' ');
  const luz = `path('${CAMINHO_DA_LUZ}')`;
  return (
    <svg
      className={classe}
      viewBox={CAIXA_DO_LOCKUP}
      fill="none"
      stroke="currentColor"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={tinta} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="190">
          <stop offset="0" className="pen-tinta-0" />
          <stop offset="1" className="pen-tinta-1" />
        </linearGradient>
        <filter id={halo} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        {/* O aro é o que o vidro deixa de fora: branco do tamanho do vidro mais o aro, preto por cima. */}
        <mask id={aro} maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="290">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={TRONCO} stroke="#fff" strokeWidth="42" />
            <path d={BRACOS} stroke="#fff" strokeWidth="30" />
            <path d={CONE} fill="#fff" stroke="#fff" strokeWidth="6" />
            <path d={TRONCO} stroke="#000" strokeWidth="36" />
            <path d={BRACOS} stroke="#000" strokeWidth="24" />
            <path d={CONE} fill="#000" stroke="none" />
          </g>
        </mask>
      </defs>
      {NOME.map(([d, x], i) => (
        <path
          key={`${String(x)}${d}`}
          className="tr a"
          pathLength="1"
          d={d}
          transform={`translate(${String(x)} 0)`}
          style={{ animationName: `eb-t${String(i)}` }}
        />
      ))}
      {JANELAS_DA_LUZ.map((janela, i) => (
        <path
          key={janela}
          className="eb-lz a"
          pathLength="1"
          d="M-2 182 H812"
          style={{
            animationName: `eb-lz${String(i)}`,
            strokeDasharray: `${String(janela)} 3`,
            strokeDashoffset: -1,
          }}
        />
      ))}
      <g className="eb-pen a" style={{ animationName: 'eb-pen' }}>
        <g className="eb-vidro a" style={{ animationName: 'eb-vidro' }}>
          <g className="pen-corpo" strokeLinecap="round" strokeLinejoin="round">
            <g className="pen-vidro">
              <Tubo larguras={[36, 24]} cone={CONE} />
            </g>
            <g className="pen-vidro2">
              <Tubo larguras={[23.04, 14.4]} cone={CONE_CLARO} />
            </g>
          </g>
          <rect
            className="pen-aro"
            x="-10"
            y="-10"
            width="140"
            height="290"
            mask={`url(#${aro})`}
          />
          <path d={FURO} strokeWidth="10.8" stroke={`url(#${tinta})`} />
          <g className="pen-brilho" strokeLinecap="round">
            <path d="M47.04 46 V186 C47.94 208 52.5 230 56 244" strokeWidth="2.4" />
            <path d="M18.8 86 V106 M86.8 112 V130" strokeWidth="2.1" />
          </g>
          <circle className="pen-faisca" cx="60" cy="23" r="2.5" />
          <circle className="pen-faisca" cx="26" cy="73" r="2.2" />
          <circle className="pen-faisca" cx="94" cy="99" r="2.2" />
        </g>
        <g className="eb-bico a" style={{ animationName: 'eb-bico' }}>
          <path d={CONE_FURO} fill={`url(#${tinta})`} stroke="none" />
        </g>
        <g className="eb-bola a" style={{ animationName: 'eb-bola' }}>
          <circle className="pen-halo" cx="60" cy="262" r="9" filter={`url(#${halo})`} />
          <circle className="pen-esfera" cx="60" cy="262" r="3.1" />
        </g>
        <g className="eb-tinta a" style={{ animationName: 'eb-tinta' }}>
          <path className="eb-nt a" d={CACTO[0]} style={{ animationName: 'eb-nt' }} />
          <path className="eb-ne a" d={CACTO[1]} style={{ animationName: 'eb-ne' }} />
          <path className="eb-nd a" d={CACTO[2]} style={{ animationName: 'eb-nd' }} />
        </g>
      </g>
      <g className="eb-cacto a" style={{ animationName: 'eb-cacto' }}>
        {CACTO.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle
        className="eb-disco a"
        cx={PONTO.x}
        cy={PONTO.y}
        r={PONTO.disco}
        style={{ animationName: 'eb-disco' }}
      />
      <circle
        className="eb-halo a"
        cx="0"
        cy="0"
        r="15"
        filter={`url(#${halo})`}
        style={{ animationName: 'eb-halo', offsetPath: luz }}
      />
      <circle
        className="eb-luz a"
        cx="0"
        cy="0"
        r={PONTO.raio}
        style={{ animationName: 'eb-luz', offsetPath: luz }}
      />
      <circle
        className="eb-luzfb a"
        cx={PONTO.x}
        cy={PONTO.y}
        r={PONTO.raio}
        style={{ animationName: 'eb-luzfb' }}
      />
    </svg>
  );
}
