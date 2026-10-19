/**
 * `window.visualViewport` de mentira (o jsdom não tem): altura e escala controláveis e um `avisar()`
 * que dispara o "resize" dos ouvintes. `restaurar()` devolve a janela ao que era.
 */
export function simularJanelaVisual(altura: number, escala = 1) {
  const ouvintes = new Set<() => void>();
  const visual = {
    height: altura,
    scale: escala,
    addEventListener: (_tipo: string, ouvinte: () => void) => {
      ouvintes.add(ouvinte);
    },
    removeEventListener: (_tipo: string, ouvinte: () => void) => {
      ouvintes.delete(ouvinte);
    },
  };
  Object.defineProperty(window, 'visualViewport', { value: visual, configurable: true });
  return {
    visual,
    avisar: () => {
      ouvintes.forEach((ouvinte) => {
        ouvinte();
      });
    },
    restaurar: () => {
      Reflect.deleteProperty(window, 'visualViewport');
    },
  };
}
