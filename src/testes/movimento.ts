import type { Movimento } from '../apresentacao/movimento';

/**
 * `window.matchMedia` de mentira (o jsdom não tem). O padrão dos testes é o movimento reduzido: nada
 * anda, nem relógio nem quadros. `simularMovimento` escolhe o que o app lê: `reduzido` liga
 * `prefers-reduced-motion: reduce`; `calmo` e `normal` o desligam, e só `calmo` põe o perfil
 * (`data-perfil`) em Calmo. `restaurarMovimento` devolve o padrão (o setup o chama depois de cada
 * teste).
 */
let reduzir = true;

export function instalarMatchMedia(): void {
  // Há testes que rodam sem janela (ambiente node).
  if (typeof window === 'undefined') return;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => ({
      matches: consulta.includes('prefers-reduced-motion: reduce') && reduzir,
      media: consulta,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

export function simularMovimento(movimento: Movimento): void {
  if (typeof document === 'undefined') return;
  reduzir = movimento === 'reduzido';
  if (movimento === 'calmo') document.documentElement.dataset.perfil = 'calmo';
  else delete document.documentElement.dataset.perfil;
}

export function restaurarMovimento(): void {
  simularMovimento('reduzido');
}
