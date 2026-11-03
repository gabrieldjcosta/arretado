// A caneta de vidro (D-D9, Q4), só como desenho dentro do quadro do cacto (A caneta que desenha). Ela deixou o
// Hoje, o "Retomar em", o "Lido até aqui" e a Revisão (D-D12): fora do quadro é só o ícone do app.
import './luz.css';

/** A largura do aro de vidro, em unidades do desenho (120 × 270): 1,5 a 2 px nos tamanhos do app. */
const ARO = 5;

// A caneta de pé (kit da marca, `pen.mjs` v5, D-D9), ponta em (60, 262): um tubo de vidro de tronco e
// dois braços que termina num cone do mesmo vidro, com o furo de tinta à vista.
const TRONCO = 'M60 34 V184';
const BRACOS = 'M60 128 H42 A16 16 0 0 1 26 112 V82 M60 152 H78 A16 16 0 0 0 94 136 V108';
const FURO = 'M60 52 V186 M60 128 H42 A16 16 0 0 1 26 112 V92 M60 152 H78 A16 16 0 0 0 94 136 V118';
// O cone, do tronco à ponta, estreitado em torno do eixo: cheio (vidro), a 64% (vidro claro), a 30% (o
// miolo de tinta, que para na bola) e a 78% (a sombra).
const CONE = 'M42 184 V186 C45 218 55 248 60 262 C65 248 75 218 78 186 V184 Z';
const CONE_CLARO = 'M48.48 184 V186 C50.4 218 56.8 248 60 262 C63.2 248 69.6 218 71.52 186 V184 Z';
const CONE_FURO = 'M54.6 186 V186 C55.5 218 58.5 248 60 258 C61.5 248 64.5 218 65.4 186 V186 Z';
const CONE_SOMBRA = 'M45.96 184 V186 C48.3 218 56.1 248 60 258 C63.9 248 71.7 218 74.04 186 V184 Z';

/** Os ids do furo de tinta, do halo, da sombra e do aro de uma caneta, a partir de um id único. */
const idsDe = (id: string) => ({
  tinta: `${id}-tinta`,
  halo: `${id}-halo`,
  sombra: `${id}-sombra`,
  aro: `${id}-aro`,
});

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

/**
 * O furo de tinta, os dois filtros e a máscara do aro, em `<defs>`. Cada caneta leva ids próprios
 * (`id` vem de `useId`): duas na mesma tela não podem repetir id.
 */
export function CanetaDefs({ id }: { id: string }) {
  const ids = idsDe(id);
  return (
    <defs>
      <linearGradient id={ids.tinta} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="190">
        <stop offset="0" className="caneta-tinta-0" />
        <stop offset="1" className="caneta-tinta-1" />
      </linearGradient>
      <filter id={ids.halo} x="-300%" y="-300%" width="700%" height="700%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id={ids.sombra} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      {/* O aro é o que o vidro deixa de fora: branco do tamanho do vidro mais o aro, preto por cima. */}
      <mask id={ids.aro} maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="290">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={TRONCO} stroke="#fff" strokeWidth={36 + ARO} />
          <path d={BRACOS} stroke="#fff" strokeWidth={24 + ARO} />
          <path d={CONE} fill="#fff" stroke="#fff" strokeWidth={ARO} />
          <path d={TRONCO} stroke="#000" strokeWidth="36" />
          <path d={BRACOS} stroke="#000" strokeWidth="24" />
          <path d={CONE} fill="#000" stroke="none" />
        </g>
      </mask>
    </defs>
  );
}

/**
 * O desenho da caneta de pé, com a ponta em (60, 262): a sombra, o vidro (tronco, braços e cone, com o
 * aro), o furo de tinta que vai do tronco à ponta, o brilho, o halo da ponta e três faíscas. Quem usa
 * põe o `transform` (a pose) e os `<defs>` de `CanetaDefs` com o mesmo `id`.
 */
export function CanetaDesenho({ id }: { id: string }) {
  const ids = idsDe(id);
  return (
    <>
      <g
        className="caneta-sombra"
        filter={`url(#${ids.sombra})`}
        transform="translate(4 5)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Tubo larguras={[28, 28]} cone={CONE_SOMBRA} />
      </g>
      <g className="caneta-corpo" strokeLinecap="round" strokeLinejoin="round">
        <g className="caneta-vidro">
          <Tubo larguras={[36, 24]} cone={CONE} />
        </g>
        <g className="caneta-vidro-claro">
          <Tubo larguras={[23.04, 14.4]} cone={CONE_CLARO} />
        </g>
      </g>
      <rect
        className="caneta-aro"
        x="-10"
        y="-10"
        width="140"
        height="290"
        mask={`url(#${ids.aro})`}
      />
      <path
        d={FURO}
        fill="none"
        stroke={`url(#${ids.tinta})`}
        strokeWidth="10.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="caneta-brilho" fill="none" strokeLinecap="round">
        <path d="M47.04 46 V186 C47.94 208 52.5 230 56 244" strokeWidth="2.4" />
        <path d="M18.8 86 V106 M86.8 112 V130" strokeWidth="2.1" />
      </g>
      <path d={CONE_FURO} fill={`url(#${ids.tinta})`} stroke="none" />
      <circle className="caneta-halo" cx="60" cy="262" r="9" filter={`url(#${ids.halo})`} />
      <circle className="caneta-esfera" cx="60" cy="262" r="3.1" />
      <circle className="caneta-faisca" cx="60" cy="23" r="2.5" />
      <circle className="caneta-faisca" cx="26" cy="73" r="2.2" />
      <circle className="caneta-faisca" cx="94" cy="99" r="2.2" />
    </>
  );
}
