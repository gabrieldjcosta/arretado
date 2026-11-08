// Checagem de plataforma (Fase 0 do plano de apps): onde o Arretado está rodando.
// Uma casca nativa (Capacitor, Tauri) já traz os arquivos no aparelho: nada de service worker nem
// de convite de instalação ali. Funções puras recebem o ambiente, para testar sem navegador.

export type Sistema = 'ios' | 'android' | 'windows' | 'outro';

export interface AmbienteDePlataforma {
  userAgent: string;
  /** `navigator.maxTouchPoints`: iPadOS 13+ se apresenta como Mac. */
  toquesMaximos?: number;
  protocolo?: string;
  /** `window.Capacitor?.isNativePlatform?.()`. */
  capacitorNativo?: boolean;
  /** Presença de `window.__TAURI_INTERNALS__`. */
  tauri?: boolean;
  /** `matchMedia('(display-mode: standalone)')`. */
  modoApp?: boolean;
  /** `navigator.standalone` (Safari do iOS). */
  standaloneIos?: boolean;
}

export function sistemaDe(a: AmbienteDePlataforma): Sistema {
  const ua = a.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && (a.toquesMaximos ?? 0) > 1) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  return 'outro';
}

export function emCasca(a: AmbienteDePlataforma): boolean {
  return (
    a.capacitorNativo === true ||
    a.tauri === true ||
    a.protocolo === 'capacitor:' ||
    a.protocolo === 'tauri:'
  );
}

/** Já aberto como app (instalado pela PWA ou dentro de uma casca)? */
export function jaInstalado(a: AmbienteDePlataforma): boolean {
  return emCasca(a) || a.modoApp === true || a.standaloneIos === true;
}

/** Service worker só na web: na casca os arquivos já estão no aparelho. */
export function usaServiceWorker(a: AmbienteDePlataforma): boolean {
  return !emCasca(a);
}

type ComCasca = { Capacitor?: { isNativePlatform?: () => boolean } } & {
  __TAURI_INTERNALS__?: unknown;
};

/** Lê o ambiente real; seguro fora do navegador. */
export function ambienteAtual(): AmbienteDePlataforma {
  if (typeof window === 'undefined') return { userAgent: '' };
  const w = window as unknown as ComCasca;
  return {
    userAgent: navigator.userAgent,
    toquesMaximos: navigator.maxTouchPoints,
    protocolo: window.location.protocol,
    capacitorNativo: w.Capacitor?.isNativePlatform?.() === true,
    tauri: w.__TAURI_INTERNALS__ !== undefined,
    modoApp: window.matchMedia('(display-mode: standalone)').matches,
    standaloneIos: (navigator as unknown as { standalone?: boolean }).standalone === true,
  };
}
