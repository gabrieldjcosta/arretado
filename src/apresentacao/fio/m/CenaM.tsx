import { useEffect, useRef } from 'react';
import { CHAO_DA_CENA, estrelasDoCeu, FLORES_DO_JARDIM, luaEm, SERRA } from '../pouso/lugares';
import type { PousoNaVereda } from '../pouso/lugares';
import { CONTORNO_DO_ZE } from '../pouso/ze-do-pouso';
import { animar, modoAgora, MOLA } from './anima';

/** O girassol da flor-luz do Zé: doze pétalas, o miolo e o brilho do miolo (o `girassol()` do mockup). */
function Girassol({ x, y }: { x: number; y: number }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse
          key={i}
          className="m-girassol-p"
          cx={x}
          cy={y - 10}
          rx={3.6}
          ry={7}
          transform={`rotate(${String(i * 30)} ${String(x)} ${String(y)})`}
        />
      ))}
      <circle className="m-girassol-m" cx={x} cy={y} r={6.5} />
      <circle className="m-girassol-mb" cx={x - 1.6} cy={y - 1.6} r={2} />
    </>
  );
}

/** Uma flor do jardim: a haste até o chão, o brilho, cinco pétalas e o miolo (o `flor()` do mockup). */
function Flor({ x, y, i }: { x: number; y: number; i: number }) {
  return (
    <g className="m-flor" data-i={i}>
      <path
        className="m-haste-flor"
        d={`M${String(x)} ${String(y + 4)} Q${String(x - 2)} ${String(y + 10)} ${String(x)} ${String(CHAO_DA_CENA)}`}
      />
      <circle className="m-petala-b m-brilho" cx={x} cy={y} r={9} />
      {[0, 72, 144, 216, 288].map((a) => {
        const r = ((a - 90) * Math.PI) / 180;
        return (
          <circle
            key={a}
            className="m-petala"
            cx={(x + Math.cos(r) * 4.2).toFixed(1)}
            cy={(y + Math.sin(r) * 4.2).toFixed(1)}
            r={3.6}
          />
        );
      })}
      <circle className="m-miolo" cx={x} cy={y} r={2.4} />
    </g>
  );
}

/**
 * A cena do pouso, o `cena()` do mockup aprovado: o Zé de pé diante de um lugar da vereda, sob a lua e a serra,
 * com o jardim dele (uma flor por pouso, a mais nova brota por último). O desenho do Zé se traça, o rosto e a
 * flor-luz surgem, o jardim brota; depois ele respira. Quem troca o pouso troca a `key`, e a entrada recomeça.
 */
export function CenaM({ pouso }: { pouso: PousoNaVereda }) {
  const { lugar, flores, indice } = pouso;
  const svg = useRef<SVGSVGElement>(null);
  const [luaX, luaY] = lugar.lua;
  const lua = luaEm(luaX, luaY);

  useEffect(() => {
    const raiz = svg.current;
    if (!raiz) return;
    const um = (q: string) => raiz.querySelector<SVGElement>(q);
    const calmo = modoAgora() === 'calmo';
    const linha = um('.m-ze-linha');
    const aura = um('.m-ze-aura');
    [linha, aura].forEach((p) => {
      if (p) p.style.strokeDasharray = '1';
    });
    void animar(linha, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: calmo ? 1000 : 1400,
      easing: 'cubic-bezier(.4,0,.3,1)',
    });
    void animar(
      aura,
      [
        { strokeDashoffset: 1, opacity: 0.7 },
        { strokeDashoffset: 0, opacity: 0.7, offset: 0.75 },
        { strokeDashoffset: 0, opacity: 0.45 },
      ],
      { duration: calmo ? 1300 : 2000, easing: 'cubic-bezier(.4,0,.3,1)' },
    );
    void animar(um('.m-lugar'), [{ opacity: 0 }, { opacity: 0.6 }], { duration: 900, delay: 400 });
    void animar(um('.m-ze-rosto'), [{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      delay: calmo ? 900 : 1300,
    });
    void animar(um('.m-ze-haste'), [{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      delay: calmo ? 1000 : 1450,
    });
    void animar(
      um('.m-ze-flor-luz'),
      calmo
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { transform: 'scale(0)' },
            { transform: 'scale(1.4)', offset: 0.6 },
            { transform: 'scale(1)' },
          ],
      { duration: 520, delay: calmo ? 1050 : 1550, easing: MOLA },
    );
    // Depois de pronto, o Zé respira (quatro vezes, devagar). Só no modo normal.
    const respira = calmo
      ? undefined
      : window.setTimeout(() => {
          void animar(
            um('.m-respira'),
            [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.018)' }],
            {
              duration: 2600,
              iterations: 4,
              direction: 'alternate',
              easing: 'ease-in-out',
            },
          );
        }, 2000);
    raiz.querySelectorAll<SVGElement>('.m-flor').forEach((g, i) => {
      const nova = i === flores - 1;
      void animar(
        g,
        calmo
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
        {
          duration: calmo ? 300 : nova ? 800 : 360,
          delay: calmo ? 600 : nova ? 1900 : 1100 + i * 90,
          easing: MOLA,
        },
      );
    });
    return () => {
      window.clearTimeout(respira);
    };
    // A cena nasce com o pouso (a `key` a remonta): o efeito roda uma vez por pouso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg
      ref={svg}
      className="m-cena"
      viewBox="0 0 320 236"
      aria-hidden="true"
      focusable="false"
      data-lugar={lugar.nome}
    >
      {estrelasDoCeu(indice).map((e, i) => (
        <circle key={i} className="m-estrela" cx={e.x} cy={e.y} r={e.r} opacity={e.opacidade} />
      ))}
      <path className="m-lua-b m-brilho" d={lua} />
      <path className="m-lua" d={lua} />
      <path className="m-serra" d={SERRA} />
      <path className="m-lugar-b m-brilho" d={lugar.desenho} />
      <path className="m-lugar" d={lugar.desenho} />
      <path className="m-chao" d={`M0 ${String(CHAO_DA_CENA)} H320`} />
      <g transform="translate(30 92) scale(.56)">
        <g className="m-respira">
          <path className="m-ze-miolo" d={CONTORNO_DO_ZE} />
          <path className="m-ze-aura m-brilho" d={CONTORNO_DO_ZE} pathLength={1} />
          <path className="m-ze-linha" d={CONTORNO_DO_ZE} pathLength={1} />
          <g className="m-ze-rosto">
            <ellipse className="m-ze-bochecha m-brilho" cx={99.5} cy={100} rx={8} ry={5} />
            <ellipse className="m-ze-bochecha m-brilho" cx={140.5} cy={100} rx={8} ry={5} />
            <path className="m-ze-olho" d="M94 76 Q102 82 110 76 M130 76 Q138 82 146 76" />
          </g>
          <path className="m-ze-haste" d="M184 111V101" />
          <g className="m-ze-flor-luz">
            <circle className="m-ze-luz-b m-brilho" cx={184} cy={94} r={16} />
            <Girassol x={184} y={94} />
          </g>
        </g>
      </g>
      {FLORES_DO_JARDIM.slice(0, flores).map(([x, y], i) => (
        <Flor key={i} x={x} y={y} i={i} />
      ))}
    </svg>
  );
}
