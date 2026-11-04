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

/** O desfoque que dá o brilho dos fios (o `<filter id="desfoque">` do mockup; o id leva o prefixo `m-`), e o neon do fio. */
export function FiltrosM() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="m-desfoque" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
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
