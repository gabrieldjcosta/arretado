import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** A consulta de mídia, ou nada onde não há `matchMedia` (jsdom). */
function consultar(texto: string): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(texto) : undefined;
}

function useConsulta(texto: string): boolean {
  const consulta = useMemo(() => consultar(texto), [texto]);
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

/**
 * A janela tem pelo menos `px` de largura (CSS px; os pontos de quebra da casca estão no CSS). Muda
 * com a janela, sem medir a cada quadro. Sem `matchMedia` (jsdom, navegadores muito antigos), não.
 */
export function useLarguraMinima(px: number): boolean {
  return useConsulta(`(min-width: ${String(px)}px)`);
}

/** A janela tem no máximo `px` de largura (o celular: o CSS diz `max-width: 699px`). Sem `matchMedia`, não. */
export function useLarguraMaxima(px: number): boolean {
  return useConsulta(`(max-width: ${String(px)}px)`);
}
