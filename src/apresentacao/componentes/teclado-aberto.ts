import { useSyncExternalStore } from 'react';

/** Mais que isto de janela visual perdida, com um campo em foco, é o teclado na tela. */
const PERDA_DO_TECLADO = 120;

/**
 * Há um campo de texto em foco e o teclado na tela tomou parte da janela. Com zoom de pinça a janela
 * visual também encolhe, sem teclado: nesse caso a resposta é não. Sem `visualViewport` (jsdom,
 * navegadores antigos), nunca.
 */
function lerTecladoAberto(): boolean {
  const visual = window.visualViewport;
  if (!visual || visual.scale > 1.01) return false;
  const foco = document.activeElement;
  const digitando =
    foco instanceof HTMLElement &&
    foco.matches('input, textarea, [contenteditable]:not([contenteditable="false"])');
  return digitando && window.innerHeight - visual.height > PERDA_DO_TECLADO;
}

function assinarTeclado(aviso: () => void) {
  const visual = window.visualViewport;
  visual?.addEventListener('resize', aviso);
  document.addEventListener('focusin', aviso);
  document.addEventListener('focusout', aviso);
  return () => {
    visual?.removeEventListener('resize', aviso);
    document.removeEventListener('focusin', aviso);
    document.removeEventListener('focusout', aviso);
  };
}

/** As abas de baixo saem da frente enquanto o teclado está aberto: o campo ganha a tela (P2). */
export function useTecladoAberto(): boolean {
  return useSyncExternalStore(assinarTeclado, lerTecladoAberto, () => false);
}
