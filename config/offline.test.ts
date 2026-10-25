import { entraNoPrecache, montarServiceWorker, nomeDoCache } from './offline';

const CATALOGO = ['defensoria-publica', 'magistratura'];

describe('entraNoPrecache', () => {
  it.each([
    'index.html',
    'manifest.webmanifest',
    'icone-192.png',
    'assets/index-abc.js',
    'assets/Leitor-abc.js',
    'assets/index-abc.css',
    'assets/literata-latin-wght-normal-abc.woff2',
    'assets/vendor-react-abc.js',
    'assets/conteudo-de-partida-abc.js',
  ])('guarda %s na instalação', (caminho) => {
    expect(entraNoPrecache(caminho, CATALOGO)).toBe(true);
  });

  it.each([
    'sw.js',
    '_headers',
    'assets/index-abc.js.map',
    'assets/defensoria-publica-abc.js',
    'assets/magistratura-abc.js',
    'assets/supabase-abc.js',
    'acervo/indice.json',
    'acervo/constituicao-1988.json',
  ])('deixa %s fora do pré-cache', (caminho) => {
    expect(entraNoPrecache(caminho, CATALOGO)).toBe(false);
  });

  it('não confunde o prefixo de uma carreira com outro nome', () => {
    expect(entraNoPrecache('assets/magistral-abc.js', CATALOGO)).toBe(true);
  });
});

describe('montarServiceWorker', () => {
  it('põe a lista ordenada e o nome do cache no lugar dos marcadores', () => {
    const sw = montarServiceWorker('const C = __CACHE__; const P = __PRECACHE__;', {
      cache: nomeDoCache('0.1.0', 'abc'),
      precache: ['index.html', 'assets/a.js'],
    });
    expect(sw).toBe('const C = "arretado-0.1.0-abc"; const P = ["assets/a.js","index.html"];');
  });

  it('recusa fonte sem os marcadores', () => {
    expect(() => montarServiceWorker('nada', { cache: 'x', precache: [] })).toThrow();
  });
});
