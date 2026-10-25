import type { Page } from '@playwright/test';
import { expect, importarEPublicar, test } from './apoio';

/**
 * Abrir sem rede (AP-00): o service worker guarda o app na primeira abertura com internet; depois, o
 * app abre e funciona sem rede. Só esta suíte liga o service worker (a configuração o bloqueia nas
 * demais, porque ele responderia do cache e passaria por cima de `page.route`).
 */
test.use({ serviceWorkers: 'allow' });

// Sem rede, o que o app pede fora do cache (o índice do acervo, por exemplo) falha e o navegador
// registra isso no console; o que não pode haver é erro da página.
test.use({ permitirFalhasConsole: true });

/** Espera o service worker instalar, ativar e assumir esta aba (primeira abertura com rede). */
async function esperarServiceWorker(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), {
      timeout: 15_000,
    })
    .toBe(true);
}

/** O que está no cache deste build: nomes e bytes (medida do relatório). */
async function conteudoDoCache(page: Page) {
  return page.evaluate(async () => {
    const nomes = (await caches.keys()).filter((n) => n.startsWith('arretado-'));
    let bytes = 0;
    const caminhos: string[] = [];
    for (const nome of nomes) {
      const cache = await caches.open(nome);
      for (const pedido of await cache.keys()) {
        caminhos.push(new URL(pedido.url).pathname);
        const resposta = await cache.match(pedido);
        if (resposta) bytes += (await resposta.arrayBuffer()).byteLength;
      }
    }
    return { nomes, caminhos, bytes };
  });
}

function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  return erros;
}

test('depois da primeira abertura, Hoje e Fixar abrem sem rede', async ({ page, context }) => {
  const erros = vigiarErros(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await esperarServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  // A página veio do service worker, não do cache HTTP do navegador.
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: 'Sem conexão' })).toBeVisible();

  await page.goto('/#/recall');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixar' })).toBeVisible();

  // Registrar um erro sem rede: o dado fica no aparelho.
  await page.goto('/#/recall/registrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
  expect(erros).toEqual([]);
});

test('uma Norma já aberta antes abre sem rede, e o Leitor vem do cache', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const erros = vigiarErros(page);
  await importarEPublicar(page, 'eca', 'ECA');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /ECA/ }).click();
  await expect(page).toHaveURL(/#\/biblioteca\/normas\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'ECA' })).toBeVisible();
  const endereco = page.url();
  await esperarServiceWorker(page);

  await context.setOffline(true);
  await page.goto(endereco);
  await expect(page.getByRole('heading', { level: 1, name: 'ECA' })).toBeVisible();
  await expect(page.locator('.dispositivo').first()).toBeVisible();
  expect(erros).toEqual([]);
});

test('o cache guarda o app inteiro e nada que leve dado pessoal ou pese demais', async ({
  page,
}) => {
  await page.goto('/');
  await esperarServiceWorker(page);
  const { nomes, caminhos, bytes } = await conteudoDoCache(page);
  test.info().annotations.push({
    type: 'cache',
    description: `${String(caminhos.length)} arquivos, ${(bytes / 1024 / 1024).toFixed(2)} MB`,
  });

  expect(nomes).toHaveLength(1);
  expect(caminhos).toContain('/index.html');
  expect(caminhos).toContain('/manifest.webmanifest');
  expect(caminhos.some((c) => /^\/assets\/index-.*\.js$/.test(c))).toBe(true);
  expect(caminhos.some((c) => /^\/assets\/Leitor-.*\.js$/.test(c))).toBe(true);
  expect(caminhos.some((c) => c.endsWith('.woff2'))).toBe(true);
  // Fora: acervo, Supabase, blocos do catálogo, mapas de código e a API do Worker.
  expect(caminhos.filter((c) => c.startsWith('/acervo/') || c.startsWith('/api/'))).toEqual([]);
  expect(caminhos.filter((c) => /supabase|defensoria-publica|magistratura|\.map$/.test(c))).toEqual(
    [],
  );
  // Limite documentado em docs/solucao-de-problemas.md: o pré-cache cabe em 3 MB.
  expect(bytes).toBeLessThan(3 * 1024 * 1024);
});
