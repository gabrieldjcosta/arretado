import { useEffect, useRef } from 'react';
import { andamentoDaRolagem } from './andamento-da-rolagem';
import { useMovimentoDoFio } from '../fio/m/movimento';

/**
 * "Rolagem que desenha o caminho" (Biblioteca visual, aprovada pelo Gabriel em 05/11): um fio fino
 * no alto do Leitor que se desenha conforme a pessoa desce o texto. Responde "onde estou" sem texto
 * e sem número: é só enfeite de orientação (o "Lido até" continua sendo a verdade), então fica fora
 * da árvore de acessibilidade. No Calmo e com movimento reduzido o comprimento acompanha a rolagem
 * sem suavização nem brilho. Mede a rolagem da janela e escreve `--p` direto no elemento, sem
 * re-renderizar o Leitor a cada quadro.
 */
export function FioDaRolagem() {
  const fio = useRef<HTMLDivElement | null>(null);
  const movimento = useMovimentoDoFio();

  useEffect(() => {
    const elemento = fio.current;
    if (!elemento) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const raiz = document.documentElement;
      const p = andamentoDaRolagem(window.scrollY, raiz.scrollHeight, window.innerHeight);
      elemento.style.setProperty('--p', p.toFixed(4));
      elemento.dataset.comeco = p === 0 ? 'sim' : 'nao';
    };
    const agendar = () => {
      if (quadro === 0) quadro = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(agendar);
    observador?.observe(document.body);
    return () => {
      if (quadro !== 0) cancelAnimationFrame(quadro);
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', agendar);
      observador?.disconnect();
    };
  }, []);

  return (
    <div ref={fio} className="fio-da-rolagem" data-movimento={movimento} aria-hidden="true">
      <span className="fio-da-rolagem-traco" />
    </div>
  );
}
