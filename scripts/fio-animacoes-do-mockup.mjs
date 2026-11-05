// As animações do mockup aprovado do Fio (docs/design/fio/mockup-aprovado.html), anotadas na jornada que o app também
// anda: puxar o fio, Ler, Lembrar, "Ache o erro" (só o mockup tem), o pouso e a volta ao Agora. Anota toda
// `Element.animate` (alvo, propriedades, duração, atraso, curva) e as transições e animações de CSS que começam.
//
// É daqui que sai a tabela `MOVIMENTO_DO_MOCKUP` de `e2e/fio-passos.spec.ts`: se um mockup novo for aprovado, rode
// este script de novo e atualize a tabela. Serve também para comparar com o app: `--app http://localhost:4173` anota a
// mesma jornada no app (`--estado` é um `storageState` do Playwright, com `indexedDB: true`, de um aparelho que já
// tem o edital, a lei e a prévia ligada; o E2E `fio-passos.spec.ts` monta isso do zero).
//
// Uso: node scripts/fio-animacoes-do-mockup.mjs [--app URL [--estado estado.json]] [--resposta 25%] [--calmo]
//          [--saida arquivo.json]
// `--calmo` anda a jornada com o sistema pedindo menos movimento (o modo calmo do mockup e do app).
// Sem `--saida`, imprime uma linha por animação diferente (contagem, alvo, propriedades, duração, atraso, curva).
/* global window, document, Element, getComputedStyle -- só dentro da página (roda no navegador) */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const RAIZ = path.join(import.meta.dirname, '..');
const MOCKUP = pathToFileURL(path.join(RAIZ, 'docs/design/fio/mockup-aprovado.html')).href;
const args = process.argv.slice(2);
const opt = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};
const APP = opt('app');
const RESPOSTA = opt('resposta', '25%');
const SAIDA = opt('saida');
const CALMO = args.includes('--calmo');
const ESTADO = opt('estado');

/** Roda na página, antes de tudo: anota o que o navegador recebe para animar. */
function anotar() {
  const vistas = [];
  window.__animacoes = vistas;
  window.__fase = 'abertura';
  const nome = (el) => {
    const classes = [...el.classList]
      .map((c) => c.replace(/^m-/, ''))
      .sort()
      .join('.');
    return el.tagName.toLowerCase() + (classes ? `.${classes}` : '');
  };
  const original = Element.prototype.animate;
  Element.prototype.animate = function (quadros, opcoes) {
    const o = typeof opcoes === 'number' ? { duration: opcoes } : (opcoes ?? {});
    const props = new Set();
    if (Array.isArray(quadros))
      for (const q of quadros) Object.keys(q).forEach((k) => props.add(k));
    vistas.push({
      fase: window.__fase,
      alvo: nome(this),
      props: [...props].sort().join(','),
      duracao: o.duration ?? null,
      atraso: o.delay ?? 0,
      easing: o.easing ?? 'linear',
      fill: o.fill ?? 'none',
    });
    return original.call(this, quadros, opcoes);
  };
  const css = (tipo) => (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    const cs = getComputedStyle(el);
    if (tipo === 'transicao') {
      const propriedades = cs.transitionProperty.split(',').map((x) => x.trim());
      const i = Math.max(0, propriedades.indexOf(e.propertyName));
      const dessa = (valor) => {
        const lista = valor.split(/,(?![^(]*\))/).map((x) => x.trim());
        return lista[i % lista.length];
      };
      vistas.push({
        fase: window.__fase,
        alvo: nome(el),
        props: `css:${e.propertyName}`,
        duracao: dessa(cs.transitionDuration),
        atraso: dessa(cs.transitionDelay),
        easing: dessa(cs.transitionTimingFunction),
        fill: '-',
      });
    } else {
      vistas.push({
        fase: window.__fase,
        alvo: nome(el),
        props: `css:${e.animationName}`,
        duracao: cs.animationDuration,
        atraso: cs.animationDelay,
        easing: cs.animationTimingFunction,
        fill: cs.animationFillMode,
      });
    }
  };
  document.addEventListener('transitionrun', css('transicao'), true);
  document.addEventListener('animationstart', css('animacao'), true);
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const contexto = await browser.newContext({
  viewport: { width: 400, height: 830 },
  colorScheme: 'dark',
  reducedMotion: CALMO ? 'reduce' : 'no-preference',
  ...(ESTADO ? { storageState: ESTADO } : {}),
});
await contexto.addInitScript(anotar);
const page = await contexto.newPage();
const fase = (nome) =>
  page.evaluate((n) => {
    window.__fase = n;
  }, nome);
const esperar = (ms) => page.waitForTimeout(ms);

if (APP) {
  await page.goto(`${APP}/#/`);
  await page.getByRole('button', { name: /Puxar o fio/ }).waitFor();
  await fase('agora');
  await esperar(3500);
  await fase('puxar');
  await page.getByRole('button', { name: /Puxar o fio/ }).focus();
  await page.keyboard.press('Enter');
  await page.locator('.m-cartao[data-cartao="ler"]').waitFor();
  await esperar(5500);
  await fase('ler>lembrar');
  await page.getByRole('button', { name: 'Pronto, li' }).click();
  await esperar(2500);
  await fase('responder');
  const grupo = page.getByRole('group', {
    name: /Escolha o que a lei diz|Esta frase está como na lei\?/,
  });
  await grupo.getByRole('button').first().click();
  await esperar(3500);
  await fase('lembrar>pouso');
  await page.getByRole('button', { name: /^(Seguir|Guardar e seguir)$/ }).click();
  await page.waitForURL(/fio\/pouso/);
  await esperar(5000);
  await fase('pouso>agora');
  await page.getByRole('button', { name: /Puxar o fio: seguir/ }).focus();
  await page.keyboard.press('Enter');
  await esperar(3000);
} else {
  await page.goto(MOCKUP);
  await page.waitForSelector('[data-tela="abertura"]', { state: 'visible' });
  await esperar(3500);
  await fase('abertura>prova');
  await page.click('[data-tela="abertura"]', { position: { x: 200, y: 400 } });
  await esperar(2500);
  await fase('prova>agora');
  await page.locator('.conta').first().click();
  await esperar(3500);
  await fase('puxar');
  await page.locator('#puxador').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-tela="ler"]:not([hidden])');
  await esperar(5500);
  await fase('ler>lembrar');
  await page.locator('[data-tela="ler"] [data-seguir]').click();
  await esperar(2500);
  await fase('responder');
  await page.locator(`.bolinha[data-op="${RESPOSTA}"]`).click();
  await esperar(3500);
  await fase('lembrar>achar (só no mockup)');
  await page.locator('[data-tela="lembrar"] [data-seguir]').click();
  await page.waitForSelector('[data-tela="achar"]:not([hidden])');
  await esperar(3500);
  // O "Ache o erro" se passa para a esquerda (pular); o título do cartão não é botão nem palavra.
  await fase('achar>pouso');
  const titulo = await page.locator('[data-tela="achar"] h2').boundingBox();
  const x = titulo.x + titulo.width / 2;
  const y = titulo.y + titulo.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y, { steps: 4 });
  await page.mouse.move(x - 180, y, { steps: 4 });
  await page.mouse.up();
  await page.waitForSelector('[data-tela="pouso"]:not([hidden])');
  await esperar(5000);
  await fase('pouso>agora');
  await page.locator('#seguir-pouso').focus();
  await page.keyboard.press('Enter');
  await esperar(3000);
}

const vistas = await page.evaluate(() => window.__animacoes);
await browser.close();

if (SAIDA) {
  await writeFile(SAIDA, JSON.stringify({ origem: APP ?? 'mockup', vistas }, null, 1));
  console.log(`${String(vistas.length)} animações em ${SAIDA}`);
} else {
  const contagem = new Map();
  for (const v of vistas) {
    const chave = `${v.alvo} | ${v.props} | ${String(v.duracao)} +${String(v.atraso)} | ${v.easing}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  for (const [chave, n] of [...contagem.entries()].sort()) console.log(`${String(n)}x ${chave}`);
}
