import { useCallback, useSyncExternalStore } from 'react';

/** A consulta de mídia da largura mínima, ou nada onde não há `matchMedia` (jsdom). */
function consultar(px: number): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(`(min-width: ${String(px)}px)`)
    : undefined;
}

/**
 * A janela tem pelo menos `px` de largura (CSS px; os pontos de quebra da casca estão no CSS). Muda
 * com a janela, sem medir a cada quadro. Sem `matchMedia` (jsdom, navegadores muito antigos), não.
 */
export function useLarguraMinima(px: number): boolean {
  const assinar = useCallback(
    (aviso: () => void) => {
      const consulta = consultar(px);
      consulta?.addEventListener('change', aviso);
      return () => {
        consulta?.removeEventListener('change', aviso);
      };
    },
    [px],
  );
  const ler = useCallback(() => consultar(px)?.matches ?? false, [px]);
  return useSyncExternalStore(assinar, ler, () => false);
}
