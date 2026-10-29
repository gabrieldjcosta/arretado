import { useEffect, useId, useRef } from 'react';
import { criarCurva, movimentoAgora } from '../../movimento';

/** O ícone se desenha em 0,42 s, com a curva da tinta, e o néon acende junto e assenta ao fechar. */
const DESENHA_MS = 420;
const curvaDaTinta = criarCurva(0.4, 0, 0.3, 1);
/** Um tico além de 1: com o traço de pontas redondas, nada fica sobrando no começo antes de a linha andar. */
const ANTES_DO_TRACO = 1.02;

/**
 * O ícone do passo (D-D10): o mesmo de linha da aba do menu (`areas.ts`, 24 × 24), com 6 em de lado,
 * desenhado pela caneta cada vez que o passo aparece. O brilho piscina é uma cópia larga e desfocada do
 * traço, sob ele (o filtro tem região fixa: um traço reto tem caixa de largura zero). Só o movimento
 * normal desenha; no Calmo e no reduzido o ícone aparece pronto. Decorativo: o nome do menu é o título.
 */
export function IconeDoPasso({ d }: { d: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const filtro = `${useId()}-neon`;

  useEffect(() => {
    const raiz = svg.current;
    if (!raiz) return;
    const caminhos = [...raiz.querySelectorAll<SVGPathElement>('path')];
    const deslocar = (deslocamento: number) => {
      for (const caminho of caminhos) caminho.style.strokeDashoffset = String(deslocamento);
    };
    if (movimentoAgora() !== 'normal') {
      deslocar(0);
      return;
    }
    deslocar(ANTES_DO_TRACO);
    raiz.dataset.acesa = '';
    let quadro = 0;
    let inicio: number | undefined;
    const passo = (agora: number) => {
      inicio ??= agora;
      const progresso = Math.min(1, (agora - inicio) / DESENHA_MS);
      deslocar(ANTES_DO_TRACO * (1 - curvaDaTinta(progresso)));
      if (progresso < 1) quadro = requestAnimationFrame(passo);
      else {
        deslocar(0);
        delete raiz.dataset.acesa;
      }
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      deslocar(0);
      delete raiz.dataset.acesa;
    };
  }, [d]);

  return (
    <svg ref={svg} className="passo-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <filter id={filtro} filterUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>
      <path className="passo-neon neon-camada" pathLength="1" filter={`url(#${filtro})`} d={d} />
      <path pathLength="1" d={d} />
    </svg>
  );
}
