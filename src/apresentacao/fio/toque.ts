import { animate } from 'motion/mini';
import { movimentoAgora } from '../movimento';

/**
 * Resposta física curta (Motion, `motion/mini`, ~2,5 kB): o "tic" de uma resposta certa. A mola é a do
 * mockup (`--f-mola`). Com movimento reduzido nada anda; no Calmo só esmaece, sem escala.
 */
const MOLA: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export function tic(el: Element | null): void {
  if (!el) return;
  const mov = movimentoAgora();
  if (mov === 'reduzido') return;
  if (mov === 'calmo') {
    animate(el, { opacity: [0.5, 1] }, { duration: 0.3 });
    return;
  }
  animate(
    el,
    { transform: ['scale(1)', 'scale(1.07)', 'scale(1)'] },
    { duration: 0.32, ease: MOLA },
  );
}
