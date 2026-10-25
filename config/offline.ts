// Fonte única do que o service worker guarda no aparelho (AP-00, "Abrir sem rede"; T31).

/**
 * Blocos do catálogo de concursos (um por carreira, baixados só quando a pessoa escolhe a carreira),
 * o cliente do Supabase (só com conta) e os mapas de código ficam fora do pré-cache: entram no cache
 * só se e quando o app os pedir. Tudo o mais em `dist/` (o app, as telas `lazy`, CSS, fontes, ícones,
 * manifesto e o próprio `index.html`) é guardado na instalação, para o app abrir inteiro sem rede.
 */
export function entraNoPrecache(caminho: string, slugsDoCatalogo: readonly string[]): boolean {
  if (caminho === '_headers' || caminho === 'sw.js') return false;
  if (caminho.startsWith('acervo/')) return false;
  if (caminho.endsWith('.map')) return false;
  const nome = caminho.startsWith('assets/') ? caminho.slice('assets/'.length) : null;
  if (nome !== null) {
    if (nome.startsWith('supabase-')) return false;
    if (slugsDoCatalogo.some((slug) => nome.startsWith(`${slug}-`))) return false;
  }
  return true;
}

/** Nome do cache deste build: muda a cada build, e o service worker apaga os outros ao ativar. */
export function nomeDoCache(versao: string, marca: string): string {
  return `arretado-${versao}-${marca}`;
}

/** O service worker pronto para publicar: a lista e a versão entram no lugar dos marcadores. */
export function montarServiceWorker(
  fonte: string,
  opcoes: { cache: string; precache: readonly string[] },
): string {
  if (!fonte.includes('__PRECACHE__') || !fonte.includes('__CACHE__')) {
    throw new Error('A fonte do service worker precisa dos marcadores __PRECACHE__ e __CACHE__.');
  }
  return fonte
    .replace('__PRECACHE__', JSON.stringify([...opcoes.precache].sort()))
    .replace('__CACHE__', JSON.stringify(opcoes.cache));
}
