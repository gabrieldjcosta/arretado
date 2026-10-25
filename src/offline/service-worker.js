// Service worker do Arretado (AP-00, "Abrir sem rede"; T31). Publicado como `/sw.js` pelo plugin
// `arretado-offline` de `vite.config.ts`, que troca os dois marcadores pelo nome do cache deste build e
// pela lista do que guardar (`config/offline.ts` decide a lista).
//
// Regras:
// - Instalação: guarda tudo da lista de uma vez; se um arquivo falhar, a versão nova não instala e a
//   antiga segue servindo (nunca metade de um build).
// - Ativação: apaga os caches de outros builds. A versão nova só ativa quando todas as abas fecham ou
//   quando a pessoa toca em "Atualizar" (mensagem `ativar`): nenhuma aba é recarregada por conta própria.
// - Navegação (abrir ou recarregar o app): responde com o `index.html` guardado; sem ele, vai à rede.
// - `assets/` (nomes com hash, imutáveis): do cache; se faltar, da rede, e guarda o que vier (blocos do
//   catálogo e telas que a pessoa abriu).
// - `api/`, `acervo/` e qualquer outra origem: o service worker não entra. Nada que leve dado pessoal
//   (Supabase, Worker) passa por aqui, e o acervo (dezenas de MB) fica na rede; a Norma que a pessoa
//   adicionou já mora no IndexedDB.

const CACHE = __CACHE__;
const PRECACHE = __PRECACHE__;
const PREFIXO = 'arretado-';

const escopo = new URL(self.registration.scope);

/** Caminho relativo ao escopo (`assets/x.js`), ou null fora dele. */
function relativo(url) {
  if (url.origin !== escopo.origin || !url.pathname.startsWith(escopo.pathname)) return null;
  return url.pathname.slice(escopo.pathname.length);
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `reload`: busca na rede de verdade, sem passar pelo cache HTTP (ícones e manifesto não têm hash).
      await cache.addAll(
        PRECACHE.map((caminho) => new Request(new URL(caminho, escopo).href, { cache: 'reload' })),
      );
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((nome) => nome.startsWith(PREFIXO) && nome !== CACHE)
          .map((nome) => caches.delete(nome)),
      );
      // Na primeira instalação, a aba que instalou já passa a ser servida daqui.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'ativar') void self.skipWaiting();
});

async function doCacheOuDaRede(pedido, guardar) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(pedido);
  if (guardado) return guardado;
  const resposta = await fetch(pedido);
  if (guardar && resposta.ok) void cache.put(pedido, resposta.clone());
  return resposta;
}

async function concha(pedido) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(new URL('index.html', escopo).href);
  return guardado ?? fetch(pedido);
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const caminho = relativo(new URL(pedido.url));
  if (caminho === null || caminho.startsWith('api/') || caminho.startsWith('acervo/')) return;
  if (pedido.mode === 'navigate') {
    evento.respondWith(concha(pedido));
    return;
  }
  if (caminho.startsWith('assets/') && !caminho.endsWith('.map')) {
    evento.respondWith(doCacheOuDaRede(pedido, true));
    return;
  }
  if (PRECACHE.includes(caminho)) evento.respondWith(doCacheOuDaRede(pedido, false));
});
