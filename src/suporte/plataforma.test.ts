import {
  emCasca,
  jaInstalado,
  sistemaDe,
  usaServiceWorker,
  type AmbienteDePlataforma,
} from './plataforma';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/126';

describe('sistemaDe', () => {
  it.each<[string, AmbienteDePlataforma, string]>([
    ['iPhone', { userAgent: IPHONE }, 'ios'],
    ['iPad que se diz Mac', { userAgent: MAC, toquesMaximos: 5 }, 'ios'],
    ['Mac de verdade', { userAgent: MAC, toquesMaximos: 0 }, 'outro'],
    ['Android', { userAgent: ANDROID }, 'android'],
    ['Windows', { userAgent: WINDOWS }, 'windows'],
    ['vazio', { userAgent: '' }, 'outro'],
  ])('%s', (_nome, ambiente, esperado) => {
    expect(sistemaDe(ambiente)).toBe(esperado);
  });
});

describe('casca, instalação e service worker', () => {
  it('a web comum usa service worker e não está instalada', () => {
    const web = { userAgent: WINDOWS, protocolo: 'https:' };
    expect(emCasca(web)).toBe(false);
    expect(usaServiceWorker(web)).toBe(true);
    expect(jaInstalado(web)).toBe(false);
  });

  it.each<AmbienteDePlataforma>([
    { userAgent: ANDROID, capacitorNativo: true },
    { userAgent: WINDOWS, tauri: true },
    { userAgent: IPHONE, protocolo: 'capacitor:' },
  ])('numa casca nativa não usa service worker e conta como instalado', (casca) => {
    expect(emCasca(casca)).toBe(true);
    expect(usaServiceWorker(casca)).toBe(false);
    expect(jaInstalado(casca)).toBe(true);
  });

  it('a PWA instalada (modo app ou standalone do iOS) conta como instalada, mas segue com service worker', () => {
    expect(jaInstalado({ userAgent: ANDROID, modoApp: true })).toBe(true);
    expect(jaInstalado({ userAgent: IPHONE, standaloneIos: true })).toBe(true);
    expect(usaServiceWorker({ userAgent: ANDROID, modoApp: true })).toBe(true);
  });
});
