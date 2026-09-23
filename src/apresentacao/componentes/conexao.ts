import { useSyncExternalStore } from 'react';

function assinarConexao(aviso: () => void) {
  window.addEventListener('online', aviso);
  window.addEventListener('offline', aviso);
  return () => {
    window.removeEventListener('online', aviso);
    window.removeEventListener('offline', aviso);
  };
}

export function useConectado(): boolean {
  return useSyncExternalStore(
    assinarConexao,
    () => navigator.onLine,
    () => true,
  );
}
