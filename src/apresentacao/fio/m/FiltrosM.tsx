import type { Mundo } from './mundo';

/** Um halo do neon do fio: quanto ele espalha, o desvio-padrão do desfoque, a opacidade e a cor. */
interface Halo {
  espalha: number;
  desfoque: number;
  alfa: number;
  cor: string;
}

/**
 * O neon amarelo do fio que se puxa (desvio 20 de `ajustes.css`), nos três estados do `data-puxe`. Os valores são os
 * da prancha da Marca, onde o fio é uma linha de 2,4 px com `box-shadow` (espalhamento, raio e cor): em cada estado, o
 * halo de perto e o de longe. O `drop-shadow()` do CSS não espalha, e sem o espalhamento um halo num fio fino fica
 * um quarto do que a prancha mostra; por isso o halo é feito aqui, com `feMorphology` (o espalhamento) e
 * `feGaussianBlur` (o raio do `box-shadow` é o dobro do desvio-padrão). Do mais de perto para o mais de longe.
 */
const NEON: Record<'solto' | 'puxando' | 'passou', [Halo, Halo]> = {
  solto: [
    { espalha: 1, desfoque: 2, alfa: 0.55, cor: '#ffc53d' },
    { espalha: 2, desfoque: 7, alfa: 0.32, cor: '#ffc53d' },
  ],
  puxando: [
    { espalha: 1, desfoque: 2.5, alfa: 0.7, cor: '#ffc53d' },
    { espalha: 4, desfoque: 10, alfa: 0.42, cor: '#ffc53d' },
  ],
  passou: [
    { espalha: 2, desfoque: 3, alfa: 0.95, cor: '#ffd66e' },
    { espalha: 8, desfoque: 14, alfa: 0.6, cor: '#ffc53d' },
  ],
};

/**
 * A região do neon, em px do desenho do fio (o `<svg>` da área de puxar não tem `viewBox`: uma unidade é um px). O fio
 * é quase vertical e, em repouso, uma reta sem largura: uma região relativa ao traço seria vazia e o fio sumiria. A
 * caixa cobre o fio (de -40 a uns 330 de altura, no meio de um quadro de até 400 px de largura) e o halo que passa dela.
 */
const REGIAO = { x: -40, y: -100, largura: 380, altura: 560 };

/**
 * O grão do papel do mapa do Destino (`#envelhece` do mockup): ruído fino pintado na cor do mundo (areia clara à noite,
 * marrom de dia) e recortado pelos estados. O mockup o refaz toda vez que o mundo muda; aqui ele é refeito junto com a raiz.
 */
const GRAO = {
  noite: '.96  0 0 0 0 .9  0 0 0 0 .78',
  dia: '.42  0 0 0 0 .33  0 0 0 0 .18',
} as const;

/**
 * O que os desenhos do quadro pedem emprestado por `url(#…)`: o desfoque que dá o brilho dos fios (o
 * `<filter id="desfoque">` do mockup; o id leva o prefixo `m-`), o neon do fio e as duas peças do mapa do Destino (a
 * máscara que apaga o resto do Brasil com a distância e o grão do papel). Ficam aqui, fora do desenho do mapa, porque a
 * cópia que esmaece quando a tela sai (`m/transicao.ts`) perde os ids e, sem a definição, o grão pintaria um véu branco.
 */
export function FiltrosM({ mundo = 'noite' }: { mundo?: Mundo }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="m-desfoque" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <radialGradient id="m-ne-some" gradientUnits="userSpaceOnUse" cx="720" cy="900" r="1050">
          <stop offset=".5" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask
          id="m-ne-longe"
          maskUnits="userSpaceOnUse"
          x="-3000"
          y="-3000"
          width="8000"
          height="8000"
        >
          <rect x="-3000" y="-3000" width="8000" height="8000" fill="url(#m-ne-some)" />
        </mask>
        <filter id="m-envelhece" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="g" />
          <feColorMatrix in="g" type="matrix" values={`0 0 0 0 ${GRAO[mundo]}  0 0 0 1.4 -.45`} />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        {(Object.keys(NEON) as Array<keyof typeof NEON>).map((estado) => {
          const [perto, longe] = NEON[estado];
          return (
            <filter
              key={estado}
              id={`m-neon-${estado}`}
              filterUnits="userSpaceOnUse"
              x={REGIAO.x}
              y={REGIAO.y}
              width={REGIAO.largura}
              height={REGIAO.altura}
              colorInterpolationFilters="sRGB"
            >
              {/* Só primitivas dentro do `<filter>`: um `<g>` aqui apagaria o halo. O de longe vai primeiro, para
                  ficar por baixo do de perto, e o fio por cima dos dois. */}
              {[longe, perto].flatMap((h, i) => {
                const n = String(i);
                return [
                  <feMorphology
                    key={`espalha${n}`}
                    in="SourceAlpha"
                    operator="dilate"
                    radius={h.espalha}
                    result={`espalhado${n}`}
                  />,
                  <feGaussianBlur
                    key={`borra${n}`}
                    in={`espalhado${n}`}
                    stdDeviation={h.desfoque}
                    result={`borrado${n}`}
                  />,
                  <feFlood
                    key={`cor${n}`}
                    floodColor={h.cor}
                    floodOpacity={h.alfa}
                    result={`cor${n}`}
                  />,
                  <feComposite
                    key={`halo${n}`}
                    in={`cor${n}`}
                    in2={`borrado${n}`}
                    operator="in"
                    result={`halo${n}`}
                  />,
                ];
              })}
              <feMerge>
                <feMergeNode in="halo0" />
                <feMergeNode in="halo1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          );
        })}
      </defs>
    </svg>
  );
}
