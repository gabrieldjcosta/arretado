import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import './ze.css';
import { criarControle, type ControleDoZe } from './controle';
import {
  arredondar,
  BOCHECHA,
  CAIXA_DO_ZE,
  caminhoDoOlho,
  CORPO,
  EIXOS_DOS_OLHOS,
  espessuraDoOlho,
  FLOR,
  FOLGA_DO_HALO,
  opacidadeDoHalo,
  PONTO_DA_FLOR,
  PARAMETROS_DO_ZE,
} from './geometria';
import { HUMORES, humorNoTamanho, type Humor, type TamanhoDoZe } from './humores';

interface PropsDoZe {
  /** Neutro, atento, contente ou piscadela; abaixo de 72 px (`pequeno`, `minimo`) o rosto é sempre neutro. */
  humor?: Humor;
  tamanho?: TamanhoDoZe;
  className?: string;
  /** O controle do que anda: o traço, os olhos, a flor (ver `controle.ts`). */
  ref?: Ref<ControleDoZe>;
}

/**
 * O Zé (D-D10): o cacto da marca como um tubo de néon de um traço só, com dois olhos retos, bochechas
 * e uma flor que é o ponto de luz. Sem boca. Decorativo (`aria-hidden`): tudo o que ele "diz" é texto
 * da tela. A linha é branca nos dois mundos, sobre uma faixa piscina (de dia mais funda nos tamanhos
 * pequenos), com o brilho do néon por cima; o ponto da flor é amarelo, igual de dia e de noite.
 *
 * O React desenha o <svg> uma vez, no humor do primeiro render. Depois, quem muda é o controle
 * (`ref`): o `humor` novo passa por ele, e a Abertura e o Passeio o usam para desenhar o traço e piscar.
 * O tamanho que a tela dá ao Zé é do CSS dela; aqui `tamanho` só escolhe a espessura do traço.
 */
export function Ze({ humor = 'neutro', tamanho = 'grande', className, ref }: PropsDoZe) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [{ controle, inicial }] = useState(() => {
    const primeiro = humorNoTamanho(humor, tamanho);
    return { inicial: HUMORES[primeiro], controle: criarControle(primeiro) };
  });

  useLayoutEffect(() => {
    controle.ligar(svg.current);
    return () => {
      controle.ligar(null);
    };
  }, [controle]);
  useEffect(() => {
    controle.humor(humorNoTamanho(humor, tamanho));
  }, [controle, humor, tamanho]);
  useImperativeHandle(ref, () => controle, [controle]);

  const ids = {
    miolo: `${id}-miolo`,
    halo: `${id}-halo`,
    olho: `${id}-olho`,
    noite: `${id}-noite`,
    bloom: `${id}-bloom`,
    bochecha: `${id}-bochecha`,
    dia: `${id}-dia`,
  };
  const [pontoX, pontoY] = PONTO_DA_FLOR;
  const { d } = CORPO;

  return (
    <svg
      ref={svg}
      className={className ? `ze ${className}` : 'ze'}
      data-tamanho={tamanho}
      viewBox={CAIXA_DO_ZE}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={ids.miolo} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="z-m0" />
          <stop offset=".55" className="z-m1" />
          <stop offset="1" className="z-m2" />
        </linearGradient>
        <filter id={ids.halo} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        {/* Região fixa em volta do olho: pela caixa do arco (fina), o desfoque era cortado numa faixa reta. */}
        <filter id={ids.olho} filterUnits="userSpaceOnUse" x="-40" y="-40" width="80" height="80">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={ids.noite} x="-30%" y="-25%" width="160%" height="150%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={ids.bloom} x="-45%" y="-40%" width="190%" height="180%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        <filter id={ids.bochecha} x="-60%" y="-120%" width="220%" height="340%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id={ids.dia} x="-30%" y="-25%" width="160%" height="150%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <path className="z-miolo" d={d} fill={`url(#${ids.miolo})`} />
      <g className="z-bochechas">
        <g className="z-bc" filter={`url(#${ids.bochecha})`} opacity={arredondar(inicial.b)}>
          {([-1, 1] as const).map((lado) => (
            <ellipse
              key={lado}
              cx={PARAMETROS_DO_ZE.cx + lado * BOCHECHA.dx}
              cy={BOCHECHA.y}
              rx={BOCHECHA.rx}
              ry={BOCHECHA.ry}
            />
          ))}
        </g>
      </g>
      <path className="z-tr z-bloom" d={d} filter={`url(#${ids.bloom})`} />
      <path className="z-tr z-banda z-d" d={d} filter={`url(#${ids.dia})`} />
      <path className="z-tr z-banda z-n" d={d} filter={`url(#${ids.noite})`} />
      <path className="z-tr z-linha" d={d} />
      <g className="z-olhos">
        {([0, 1] as const).map((i) => (
          <g
            key={i}
            className="z-olho"
            transform={`translate(${EIXOS_DOS_OLHOS[i]} ${arredondar(inicial.ey)}) scale(${arredondar(inicial.sx)} ${arredondar(inicial.sy)})`}
          >
            <path
              className="z-oh z-n"
              d={caminhoDoOlho(inicial.a[i])}
              strokeWidth={espessuraDoOlho(inicial.a[i]) + FOLGA_DO_HALO}
              opacity={opacidadeDoHalo(inicial.a[i])}
              filter={`url(#${ids.olho})`}
            />
            <path
              className="z-pupila"
              d={caminhoDoOlho(inicial.a[i])}
              strokeWidth={espessuraDoOlho(inicial.a[i])}
            />
          </g>
        ))}
      </g>
      <g className="z-flor">
        <path className="z-haste" d={`M${FLOR.x} ${FLOR.y}V${FLOR.y - FLOR.haste}`} />
        <g className="z-luz">
          <circle
            className="z-fh"
            cx={pontoX}
            cy={pontoY}
            r={FLOR.disco}
            filter={`url(#${ids.halo})`}
          />
          <circle className="z-fp" cx={pontoX} cy={pontoY} r={FLOR.r} />
        </g>
      </g>
      {/* A luz da caneta: o ponto que desenha o contorno antes de virar a flor (a Chegada da primeira vez a
          leva pelo traço). Fica de fora da flor, que o controle esconde e mostra à parte. */}
      <g className="z-pena" visibility="hidden">
        <circle className="z-fh" r={FLOR.disco} filter={`url(#${ids.halo})`} />
        <circle className="z-fp" r={FLOR.r} />
      </g>
    </svg>
  );
}
