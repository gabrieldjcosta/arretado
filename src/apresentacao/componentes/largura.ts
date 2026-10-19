import { useCallback, useMemo, useSyncExternalStore } from 'react';

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
  const consulta = useMemo(() => consultar(px), [px]);
  const assinar = useCallback(
    (aviso: () => void) => {
      consulta?.addEventListener('change', aviso);
      return () => {
        consulta?.removeEventListener('change', aviso);
      };
    },
    [consulta],
  );
  const ler = useCallback(() => consulta?.matches ?? false, [consulta]);
  return useSyncExternalStore(assinar, ler, () => false);
}
