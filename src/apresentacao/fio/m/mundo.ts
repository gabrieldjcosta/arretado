// O mundo do Fio: noite ou dia, o `data-mundo` do mockup. Quem manda é o tema do app (`data-tema` em <html>,
// posto por `AplicarAparencia`); sem tema escolhido, o sistema decide, como no mockup.
import { useSyncExternalStore } from 'react';

export type Mundo = 'noite' | 'dia';

const CLARO = '(prefers-color-scheme: light)';

function consulta(): MediaQueryList | undefined {
  const janela: Partial<Pick<Window, 'matchMedia'>> = window;
  return janela.matchMedia?.(CLARO);
}

export function mundoAgora(): Mundo {
  const tema = document.documentElement.dataset.tema;
  if (tema === 'claro') return 'dia';
  if (tema === 'escuro') return 'noite';
  return consulta()?.matches === true ? 'dia' : 'noite';
}

function assinar(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-tema'],
  });
  const sistema = consulta();
  sistema?.addEventListener('change', avisar);
  return () => {
    observador.disconnect();
    sistema?.removeEventListener('change', avisar);
  };
}

/** O mundo de agora; muda na hora quando a pessoa troca o tema ou o sistema troca. */
export function useMundo(): Mundo {
  return useSyncExternalStore(assinar, mundoAgora, () => 'noite');
}
