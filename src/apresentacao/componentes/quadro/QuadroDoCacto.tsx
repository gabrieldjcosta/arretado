import { useId, useLayoutEffect, useRef, useState } from 'react';
import { esperar, movimentoAgora } from '../../movimento';
import { CanetaDefs, CanetaDesenho } from '../Caneta';
import { legendaDaParte, parteDoDia, REGIAO_DO_NEON, VIEWBOX } from './cena';
import { desenharParte, pintarAte, pintarParte, REPOUSO_DA_CANETA } from './desenhar';
import './quadro.css';

/**
 * O quadro do cacto (D-D7, "A caneta que desenha"): cada Dia fechado vira uma parte de um mesmo
 * desenho, e a caneta de vidro anda sobre o traço enquanto ele se faz. Só aparece depois de fechar o
 * Dia, no Resumo do Dia. `dias` é o total de Dias fechados (nunca uma sequência: faltar um Dia não
 * tira nada) e `desenha` pede que a parte de hoje se desenhe agora; sem ela, o quadro aparece pronto
 * (o Dia já abriu fechado). Com movimento reduzido, a parte já aparece pronta. O cacto leva o néon
 * suave (D-D10): um brilho sob o núcleo, que acende com a caneta e assenta. A cena é decorativa
 * (`aria-hidden`); a legenda, em `role="status"`, diz o que foi desenhado hoje, sem número nem meta.
 * Depois da 16ª parte, o Dia seguinte abre uma folha nova.
 */
export function QuadroDoCacto({ dias, desenha }: { dias: number; desenha: boolean }) {
  const { indice, parte } = parteDoDia(dias);
  const id = useId();
  const lavis = useRef<SVGGElement>(null);
  const neon = useRef<SVGGElement>(null);
  const tracos = useRef<SVGGElement>(null);
  const caneta = useRef<SVGGElement>(null);
  /** O total de Dias cuja parte já terminou de se desenhar nesta tela: só então a legenda é dita. */
  const [desenhado, setDesenhado] = useState(0);

  useLayoutEffect(() => {
    if (!lavis.current || !neon.current || !tracos.current || !caneta.current) return;
    const camadas = {
      lavis: lavis.current,
      neon: neon.current,
      tracos: tracos.current,
      caneta: caneta.current,
    };
    pintarAte(camadas, indice);
    if (!desenha) {
      pintarParte(camadas, parte, true);
      return;
    }
    const controle = new AbortController();
    const movimento = movimentoAgora();
    void desenharParte(camadas, parte, movimento, controle.signal).then(async (terminou) => {
      // O leitor de tela só diz o que muda numa região que já existia: com a parte pronta de uma
      // vez, a legenda espera um instante.
      if (terminou && movimento === 'reduzido') await esperar(300, controle.signal);
      if (terminou && !controle.signal.aborted) setDesenhado(dias);
    });
    return () => {
      controle.abort();
    };
  }, [dias, desenha, indice, parte]);

  const legenda = !desenha || desenhado === dias ? legendaDaParte(parte) : '';
  return (
    <div className="quadro-do-cacto">
      <div className="quadro">
        <svg viewBox={VIEWBOX} aria-hidden="true" focusable="false">
          <CanetaDefs id={id} />
          {/* A região do filtro é fixa, em volta do cacto: a caixa de um traço só tem largura zero. */}
          <defs>
            <filter
              id={`${id}-neon`}
              filterUnits="userSpaceOnUse"
              x={REGIAO_DO_NEON.x}
              y={REGIAO_DO_NEON.y}
              width={REGIAO_DO_NEON.largura}
              height={REGIAO_DO_NEON.altura}
            >
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <g ref={lavis} />
          <g ref={neon} className="quadro-neon neon-camada" filter={`url(#${id}-neon)`} />
          <g ref={tracos} />
          <g
            ref={caneta}
            className="quadro-caneta"
            data-pose="deitada"
            transform={REPOUSO_DA_CANETA}
          >
            <CanetaDesenho id={id} />
          </g>
        </svg>
      </div>
      <p className="quadro-legenda" role="status">
        {legenda}
      </p>
    </div>
  );
}
