// Mede tempos de carregamento das telas da Biblioteca com o acervo real (dist/ servido por
// `vite preview`). Uso: npm run build && npx vite preview --port 4173 & node scripts/medir-carga.mjs [lento]
// "lento" aplica CPU 4x mais lenta (aparelho modesto). Imprime JSON com ms por cenário.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const lento = process.argv.includes('lento');
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'pt-BR', viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
if (lento) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
const out = {};
const t = async (nome, fn) => {
  const i = performance.now();
  await fn();
  out[nome] = Math.round(performance.now() - i);
};
const ver = (loc, ms = 120_000) => loc.first().waitFor({ state: 'visible', timeout: ms });

await t('hoje', async () => {
  await page.goto(`${BASE}/#/`);
  await ver(page.getByRole('heading').first());
});
await t('biblioteca_vazia', async () => {
  await page.goto(`${BASE}/#/biblioteca`);
  await ver(page.getByRole('heading', { name: 'Biblioteca' }));
});
await t('acervo_normas_lista', async () => {
  await page.goto(`${BASE}/#/biblioteca/acervo`);
  await ver(page.getByRole('heading', { name: 'Acervo: normas' }));
});
// adiciona uma norma grande (CF/88) e uma pequena
const adicionar = async (rotulo) => {
  const cx = page.getByRole('checkbox', { name: rotulo }).first();
  await cx.check();
  await page.getByRole('button', { name: /^Adicionar 1 / }).click();
  await ver(page.getByText(/1 adicionadas/));
};
await page.getByLabel('Buscar').fill('Constituição da República');
await t('adicionar_cf88', () => adicionar(/Constituição da República/));
await t('biblioteca_com_cf', async () => {
  await page.goto(`${BASE}/#/biblioteca`);
  await ver(page.getByRole('heading', { name: 'Biblioteca' }));
  await page.waitForLoadState('networkidle');
});
await page.getByPlaceholder('Título ou assunto').fill('Constituição');
const link = await page.locator('a[href*="/biblioteca/normas/"]').first().getAttribute('href');
await t('leitor_cf_abrir', async () => {
  await page.goto(`${BASE}/${link}`);
  await ver(page.locator('article, .leitor').first());
  await page.waitForLoadState('networkidle');
});
await t('leitor_cf_recarregar', async () => {
  await page.reload();
  await ver(page.locator('article, .leitor').first());
  await page.waitForLoadState('networkidle');
});
console.log(JSON.stringify({ lento, ...out }, null, 1));
await browser.close();
