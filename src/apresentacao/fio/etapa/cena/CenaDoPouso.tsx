import { useEffect, useId, useRef } from 'react';
import type { ControleDoZe } from '../../../componentes/ze/controle';
import { Ze } from '../../../componentes/ze/Ze';
import { andar } from '../../../entrada/abertura/voo';
import { criarCurva, curva, movimentoAgora } from '../../../movimento';
import {
  ALTURA_DA_CENA,
  CHAO_DA_CENA,
  estrelasDoCeu,
  FLORES_DO_JARDIM,
  FOLGA_DA_CENA,
  LARGURA_DA_CENA,
  luaEm,
  SERRA,
  type PousoNaVereda,
} from './lugares';
import './fio-cena.css';

/** A curva da tinta (a mesma da entrada do Zé): o contorno arranca, corre e assenta. */
const curvaDaTinta = criarCurva(0.4, 0, 0.3, 1);
const ESCALA_INICIAL = 0.55;

/**
 * O Zé se desenha de pé a pé (1,1 s) com o néon aceso; depois o miolo, as bochechas, os olhos e a flor
 * surgem (0,35 s) e ele fica inteiro e parado. Só no movimento normal: nos outros ele já está pronto.
 */
async function desenharOZeDoPouso(ze: ControleDoZe, sinal: AbortSignal): Promise<void> {
  const total = movimentoAgora() === 'normal' ? ze.comprimento() : 0;
  if (!ze.corpo || total === 0) {
    ze.tudoVisivel();
    return;
  }
  // Uma função e não `sinal.aborted` direto: o TypeScript fixaria o valor da primeira checagem para as seguintes.
  const abortado = () => sinal.aborted;
  ze.ocultarTudo();
  ze.mostrar('corpo');
  ze.prepararTraco();
  ze.acender(true);
  await andar(
    1100,
    curvaDaTinta,
    (e) => {
      ze.tracar(e);
    },
    sinal,
  );
  if (abortado()) return;
  ze.tracoPronto();
  ze.acender(false);
  ze.florEscala(ESCALA_INICIAL);
  for (const parte of ['miolo', 'bochechas', 'olho0', 'olho1', 'flor'] as const) ze.mostrar(parte);
  await andar(
    350,
    curva,
    (e) => {
      ze.miolo(e);
      ze.bochechas(e);
      ze.florEscala(ESCALA_INICIAL + (1 - ESCALA_INICIAL) * e);
    },
    sinal,
  );
  if (abortado()) return;
  ze.tudoVisivel();
}

/** Uma flor do jardim: o pé no chão, cinco pétalas ao redor de um miolo, com um brilho fraco atrás. */
function Flor({ x, y, filtro, nova }: { x: number; y: number; filtro: string; nova: boolean }) {
  return (
    <g className={nova ? 'cena-flor nova' : 'cena-flor'}>
      <path
        className="cena-haste"
        d={`M${String(x)} ${String(y + 4)} Q${String(x - 2)} ${String(y + 10)} ${String(x)} ${String(CHAO_DA_CENA)}`}
      />
      <circle className="cena-flor-brilho" data-brilho="" cx={x} cy={y} r={9} filter={filtro} />
      {[0, 72, 144, 216, 288].map((graus) => {
        const r = ((graus - 90) * Math.PI) / 180;
        return (
          <circle
            key={graus}
            className="cena-petala"
            cx={Number((x + Math.cos(r) * 4.2).toFixed(1))}
            cy={Number((y + Math.sin(r) * 4.2).toFixed(1))}
            r={3.6}
          />
        );
      })}
      <circle className="cena-miolo" cx={x} cy={y} r={2.4} />
    </g>
  );
}

/**
 * A cena do pouso (D-D25, protótipo v16): o Zé diante de um lugar da vereda, sob a lua e a serra, com o
 * jardim dele (uma flor por pouso, a mais nova brota por último). Decorativa: tudo o que ela "diz" é o
 * título e os fatos da tela. A tela troca o `pouso` e remonta a cena com `key`, então a entrada recomeça.
 */
export function CenaDoPouso({ pouso }: { pouso: PousoNaVereda }) {
  const { lugar, flores, indice } = pouso;
  const idDoBrilho = useId();
  const filtro = `url(#${idDoBrilho})`;
  const ze = useRef<ControleDoZe>(null);
  const [luaX, luaY] = lugar.lua;
  const lua = luaEm(luaX, luaY);

  useEffect(() => {
    const controle = ze.current;
    if (!controle) return undefined;
    const tinta = new AbortController();
    void desenharOZeDoPouso(controle, tinta.signal);
    return () => {
      tinta.abort();
    };
  }, []);

  return (
    <div className="fio-cena" data-lugar={lugar.nome}>
      <svg
        className="fio-cena-desenho"
        viewBox={`0 0 ${String(LARGURA_DA_CENA)} ${String(ALTURA_DA_CENA)}`}
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id={idDoBrilho} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>
        {estrelasDoCeu(indice).map((e, i) => (
          <circle
            key={i}
            className="cena-estrela"
            cx={e.x}
            cy={e.y}
            r={e.r}
            opacity={e.opacidade}
          />
        ))}
        <path className="cena-lua-brilho" data-brilho="" d={lua} filter={filtro} />
        <path className="cena-lua" d={lua} />
        <path className="cena-serra" d={SERRA} />
        <path className="cena-lugar-brilho" data-brilho="" d={lugar.desenho} filter={filtro} />
        <path className="cena-lugar" d={lugar.desenho} />
        <path
          className="cena-chao"
          d={`M${String(-FOLGA_DA_CENA)} ${String(CHAO_DA_CENA)} H${String(LARGURA_DA_CENA + FOLGA_DA_CENA)}`}
        />
        {FLORES_DO_JARDIM.slice(0, flores).map(([x, y], i) => (
          <Flor key={i} x={x} y={y} filtro={filtro} nova={i === flores - 1} />
        ))}
      </svg>
      <Ze ref={ze} className="fio-cena-ze" tamanho="grande" humor="contente" />
    </div>
  );
}
