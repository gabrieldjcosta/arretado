// Fidelidade visual: fotografa o mockup aprovado (docs/design/mockups/fio-v16.html) e a tela
// equivalente do app no mesmo tamanho, monta o par lado a lado + diferença e imprime a razão de
// pixels diferentes. É medidor, não portão: o mockup é um quadro (sem barra do Aparelho), então
// a conferência final continua sendo olhar o par. Saída em test-results/fidelidade/ (fora do git).
//
// Uso: node scripts/fidelidade-fio.mjs [--url http://localhost:4173] [--telas agora,passo,pouso]
//        [--tema noite|dia] [--largura 390] [--altura 844] [--limite 0.08]
// Sem --url sobe `vite preview` na 4182 (rode `npm run build` antes). Com --limite, sai com 1 se
// alguma tela passar da razão (para o agente tratar como falha).
/* global document -- só dentro de page.evaluate (roda no navegador) */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';

const { PNG } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle');
const RAIZ = path.join(import.meta.dirname, '..');
const MOCKUP = pathToFileURL(path.join(RAIZ, 'docs/design/mockups/fio-v16.html')).href;
const args = process.argv.slice(2);
const opt = (n, p) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : p;
};
const L = Number(opt('largura', 390));
const A = Number(opt('altura', 844));
const TEMA = opt('tema', 'noite');
const LIMITE = opt('limite') === undefined ? null : Number(opt('limite'));
const SAIDA = path.join(RAIZ, opt('saida', 'test-results/fidelidade'));

// tela do mockup (data-tela) → rota do app depois de ligar a prévia
const TELAS = {
  agora: { mockup: 'inicio', rota: '/' },
  destino: { mockup: 'mapa', rota: '/fio/destino' },
  varal: { mockup: 'varal', rota: '/fio/varal' },
  passo: { mockup: 'ler', rota: '/fio/passo' },
  pouso: { mockup: 'pouso', rota: '/fio/pouso' },
};
const pedidas = opt('telas', 'agora,passo,pouso').split(',');

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

async function servidor() {
  const url = opt('url');
  if (url) return { url, parar: () => {} };
  const p = spawn('npx', ['vite', 'preview', '--port', '4182', '--strictPort'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
  await esperar(2500);
  return { url: 'http://localhost:4182', parar: () => p.kill() };
}

async function fotoMockup(browser, tela) {
  const ctx = await browser.newContext({
    viewport: { width: L, height: A },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'pt-BR',
  });
  const page = await ctx.newPage();
  await page.goto(MOCKUP);
  await page.evaluate(
    ([nome, tema]) => {
      document.querySelector(`[data-mundo-btn="${tema === 'dia' ? 'dia' : 'noite'}"]`)?.click();
      document.querySelectorAll('.tela').forEach((t) => {
        t.hidden = t.dataset.tela !== nome;
      });
      const nav = document.querySelector('#nav');
      if (nav) nav.hidden = !['inicio', 'mapa', 'varal', 'folheto'].includes(nome);
    },
    [tela.mockup, TEMA],
  );
  // Tira a moldura do quadro (barra de controles, nota de rodapé, borda): o app não tem nada disso.
  await page.addStyleTag({
    content:
      '.controles,.app~*{display:none!important}body{padding:0!important;margin:0!important}.app{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}',
  });
  await page.waitForTimeout(400);
  const png = await page.screenshot({ animations: 'disabled' });
  await ctx.close();
  return png;
}

async function fotoApp(browser, base, tela) {
  const ctx = await browser.newContext({
    viewport: { width: L, height: A },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: TEMA === 'dia' ? 'light' : 'dark',
    locale: 'pt-BR',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/#/plano`);
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page
    .getByLabel('Arquivo CSV')
    .setInputFiles({ name: 'ciclo.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf8') });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await page.getByRole('heading', { level: 2, name: 'Execução Penal' }).waitFor();
  await page.goto(`${base}/#/fio/ligar`);
  await page.getByRole('navigation', { name: 'Lugares' }).waitFor();
  if (tela.rota !== '/') await page.goto(`${base}/#${tela.rota}`);
  await page.waitForTimeout(900);
  const png = await page.screenshot({ animations: 'disabled' });
  await ctx.close();
  return png;
}

function comparar(a, b) {
  const A_ = PNG.sync.read(a);
  const B_ = PNG.sync.read(b);
  const w = A_.width;
  const h = A_.height;
  const lado = new PNG({ width: w * 3, height: h });
  let dif = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const ib = (y * B_.width + x) * 4;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A_.data[i + c] - B_.data[ib + c]));
      const bate = d <= 24;
      if (!bate) dif++;
      const set = (ox, r, g, bl) => {
        const o = (y * w * 3 + ox * w + x) * 4;
        lado.data[o] = r;
        lado.data[o + 1] = g;
        lado.data[o + 2] = bl;
        lado.data[o + 3] = 255;
      };
      set(0, A_.data[i], A_.data[i + 1], A_.data[i + 2]);
      set(1, B_.data[ib], B_.data[ib + 1], B_.data[ib + 2]);
      if (bate) set(2, 20, 20, 20);
      else set(2, 255, 60, 90);
    }
  }
  return { razao: dif / (w * h), png: PNG.sync.write(lado) };
}

await mkdir(SAIDA, { recursive: true });
const srv = await servidor();
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH, args: ['--font-render-hinting=full'] }
    : {},
);
let falhou = false;
try {
  for (const nome of pedidas) {
    const tela = TELAS[nome];
    if (!tela) throw new Error(`tela desconhecida: ${nome} (${Object.keys(TELAS).join(', ')})`);
    const [m, a] = await Promise.all([fotoMockup(browser, tela), fotoApp(browser, srv.url, tela)]);
    const { razao, png } = comparar(m, a);
    const arq = path.join(SAIDA, `${nome}-${TEMA}-${String(L)}.png`);
    await writeFile(arq, png);
    console.log(
      `${nome}: ${(razao * 100).toFixed(1)}% dos pixels diferem (mockup | app | diferença) → ${arq}`,
    );
    if (LIMITE !== null && razao > LIMITE) falhou = true;
  }
} finally {
  await browser.close();
  srv.parar();
}
if (falhou) process.exit(1);
