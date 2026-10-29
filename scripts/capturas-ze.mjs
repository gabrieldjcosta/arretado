// Capturas do Zé (D-D10) para a revisão visual: a primeira vez (o nome, a luz e o Zé se desenhando), o passeio da
// Chegada, a tela de carregamento, o traço de seleção e o quadro do cacto, no celular e no desktop, de dia e de noite.
// O `capturas-ui.mjs` não serve para isso: ele semeia a Chegada e a Abertura como vistas. Aqui cada cena abre um
// Aparelho novo (a Chegada e a Abertura só existem na primeira vez) e as que não são da primeira vez semeiam só isso.
// Aponta para qualquer build: o de agora (`npm run build`) e, para um "antes", o `dist` de um worktree mais velho.
// Só lei pública e dados inventados; nada sai da máquina. Saída em test-results/capturas-ze/ (fora do git).
//
// Uso: node scripts/capturas-ze.mjs [opções]
//   --saida <pasta>      padrão test-results/capturas-ze
//   --url <endereço>     servidor já em pé; sem isso, sobe `vite preview` na 4181 (rode `npm run build`)
//   --cenas <a,b>        primeira-vez | passeio | carregamento | traco | quadro (padrão: todas)
//   --aparelhos <a,b>    celular (390×844), desktop (1280×800)
//   --temas <a,b>        claro, escuro
//   --folhas             monta uma folha JPEG por cena (um aparelho e um tema por linha, um quadro por coluna)
/* global window, document -- só dentro de page.evaluate (roda no navegador) */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const RAIZ = path.join(import.meta.dirname, '..');
const APARELHOS = {
  celular: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
const CENAS = ['primeira-vez', 'passeio', 'carregamento', 'traco', 'quadro'];

/** Instantes (s desde o início da navegação) da primeira vez: o nome, a pausa, a luz, o contorno, a flor, o rosto. */
const INSTANTES_DA_PRIMEIRA_VEZ = [1.0, 2.0, 3.0, 3.6, 4.1, 4.6, 5.1, 5.6, 6.2, 8.0];
/** Instantes (s no relógio das animações CSS) da tela de carregamento: silêncio, contorno, Zé inteiro, rosto, 6 s e 25 s. */
const INSTANTES_DO_CARREGAMENTO = [0.5, 1.8, 2.5, 3.2, 6.6, 26];

// A Chegada e a Entrada do Dia são um <dialog> modal sobre o Hoje e a Abertura é o nome em tela cheia, por cima de
// tudo: as cenas que não são da primeira vez partem de um Aparelho que já viu as duas (igual ao `capturas-ui.mjs`).
const JA_VISTAS = {
  'arretado:chegada:v1': '{"vista":true}',
  'arretado:entrada-do-dia:v1': '{"dia":"9999-12-31"}',
  'arretado:escrita-do-nome:v1': '{"dia":"9999-12-31"}',
};

function opcoes(argv) {
  const o = {
    saida: path.join(RAIZ, 'test-results', 'capturas-ze'),
    cenas: CENAS,
    aparelhos: Object.keys(APARELHOS),
    temas: ['claro', 'escuro'],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => argv[++i];
    if (a === '--saida') o.saida = path.resolve(valor());
    else if (a === '--url') o.url = valor();
    else if (a === '--cenas') o.cenas = valor().split(',');
    else if (a === '--aparelhos') o.aparelhos = valor().split(',');
    else if (a === '--temas') o.temas = valor().split(',');
    else if (a === '--folhas') o.folhas = true;
    else throw new Error(`opção desconhecida: ${a}`);
  }
  return o;
}

/** Sobe `vite preview` (usa dist/) e espera responder. */
async function subirServidor(porta) {
  if (!existsSync(path.join(RAIZ, 'dist', 'index.html'))) {
    throw new Error('dist/ ausente: rode `npm run build` antes (ou passe --url).');
  }
  const filho = spawn('npx', ['vite', 'preview', '--port', String(porta), '--strictPort'], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${String(porta)}/`);
      if (r.ok) return { url: `http://localhost:${String(porta)}`, parar: () => filho.kill() };
    } catch {
      /* ainda subindo */
    }
    await esperar(500);
  }
  filho.kill();
  throw new Error('o servidor de pré-visualização não respondeu em 30 s');
}

const virgula = (segundos) => `${segundos.toFixed(1).replace('.', ',')} s`;

/** Um Aparelho novo: sem IndexedDB nem localStorage, com o tema e o movimento da cena. */
async function novoContexto(browser, aparelho, tema, { reduzido = false, jaVistas = false } = {}) {
  const ctx = await browser.newContext({
    ...APARELHOS[aparelho],
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: tema === 'claro' ? 'light' : 'dark',
    reducedMotion: reduzido ? 'reduce' : 'no-preference',
    serviceWorkers: 'block',
  });
  if (jaVistas) {
    await ctx.addInitScript((chaves) => {
      try {
        for (const [chave, valor] of Object.entries(chaves))
          window.localStorage.setItem(chave, valor);
      } catch {
        /* sem armazenamento */
      }
    }, JA_VISTAS);
  }
  return ctx;
}

/** Cada cena devolve os quadros que tirou: { arquivo, rotulo }; quem chama junta aparelho, tema e cena. */
async function tirar(page, o, cena, aparelho, tema, quadros, rotulo, opcoesDaFoto = {}) {
  const arquivo = `${cena}__${aparelho}__${tema}__${String(quadros.length + 1).padStart(2, '0')}.png`;
  await page.screenshot({ path: path.join(o.saida, arquivo), ...opcoesDaFoto });
  quadros.push({ arquivo, rotulo });
}

/**
 * Quando o pacote do app fica preso a página nunca termina de carregar e o `page.screenshot` espera as fontes para
 * sempre ("waiting for fonts to load"); o protocolo do navegador fotografa sem esperar.
 */
async function tirarPeloProtocolo(cdp, o, cena, aparelho, tema, quadros, rotulo) {
  const arquivo = `${cena}__${aparelho}__${tema}__${String(quadros.length + 1).padStart(2, '0')}.png`;
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(o.saida, arquivo), Buffer.from(data, 'base64'));
  quadros.push({ arquivo, rotulo });
}

/** A primeira vez, em tempo real: o que a pessoa vê de 1 s a 8 s depois de abrir o app num Aparelho novo. */
async function primeiraVez(browser, o, url, aparelho, tema) {
  const ctx = await novoContexto(browser, aparelho, tema);
  const page = await ctx.newPage();
  const quadros = [];
  await page.goto(`${url}/#/`, { waitUntil: 'domcontentloaded' });
  for (const alvo of INSTANTES_DA_PRIMEIRA_VEZ) {
    const falta = alvo * 1000 - (await page.evaluate(() => performance.now()));
    if (falta > 0) await esperar(falta);
    const quando = await page.evaluate(() => performance.now());
    await tirar(page, o, 'primeira-vez', aparelho, tema, quadros, virgula(quando / 1000));
  }
  await ctx.close();
  return quadros;
}

/**
 * O passeio da Chegada, com movimento reduzido (tudo pronto e parado, para o quadro não depender do relógio):
 * as Boas-vindas, os quatro passos e o Começar. Num build sem o passeio (a Chegada de antes do Zé: uma folha só,
 * sem "Vamos") tira só a folha.
 */
async function passeio(browser, o, url, aparelho, tema) {
  const ctx = await novoContexto(browser, aparelho, tema, { reduzido: true });
  const page = await ctx.newPage();
  const quadros = [];
  await page.goto(`${url}/#/`);
  await page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' }).waitFor();
  await esperar(700);
  await tirar(page, o, 'passeio', aparelho, tema, quadros, 'Boas-vindas');
  const vamos = page.getByRole('button', { name: 'Vamos' });
  if ((await vamos.count()) > 0) {
    await vamos.click();
    for (const [i, nome] of ['Hoje', 'Trilha', 'Fixar', 'Biblioteca'].entries()) {
      await page.getByRole('dialog', { name: `Passo ${String(i + 1)} de 4 ${nome}` }).waitFor();
      await esperar(900);
      await tirar(page, o, 'passeio', aparelho, tema, quadros, `Passo ${String(i + 1)}, ${nome}`);
      await page.getByRole('button', { name: 'Seguir' }).click();
    }
    await page.getByRole('dialog', { name: 'Vamo começar?' }).waitFor();
    await esperar(900);
    await tirar(page, o, 'passeio', aparelho, tema, quadros, 'Começar');
  }
  await ctx.close();
  return quadros;
}

/** Salta no relógio das animações CSS (o `page.clock` não as move), como o E2E `carregamento.spec.ts`. */
const saltar = (tempo) => {
  document.getAnimations().forEach((a) => {
    a.pause();
    a.currentTime = tempo;
  });
};

/** A tela de carregamento: o pacote do app fica preso e só o que o `index.html` traz aparece, parado em cada instante. */
async function carregamento(browser, o, url, aparelho, tema) {
  const ctx = await novoContexto(browser, aparelho, tema);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const quadros = [];
  await page.route('**/assets/index-*.js', () => undefined);
  await page.goto(`${url}/`, { waitUntil: 'commit' });
  // Um build sem a tela (antes do L1) fica em branco até o app abrir: um quadro só, com o fundo.
  const tem = await page
    .locator('#carregamento')
    .waitFor({ timeout: 3000 })
    .then(
      () => true,
      () => false,
    );
  if (!tem) {
    await tirarPeloProtocolo(
      cdp,
      o,
      'carregamento',
      aparelho,
      tema,
      quadros,
      'Sem tela de carregamento',
    );
  } else {
    for (const alvo of INSTANTES_DO_CARREGAMENTO) {
      await page.evaluate(saltar, alvo * 1000);
      await esperar(200);
      await tirarPeloProtocolo(cdp, o, 'carregamento', aparelho, tema, quadros, virgula(alvo));
    }
  }
  await ctx.close();
  return quadros;
}

/** O traço de seleção: ao escolher uma área, a linha se desenha em volta da aba; uma rajada de quadros logo depois do toque. */
async function traco(browser, o, url, aparelho, tema) {
  const ctx = await novoContexto(browser, aparelho, tema, { jaVistas: true });
  const page = await ctx.newPage();
  const quadros = [];
  await page.goto(`${url}/#/`);
  await page.getByRole('heading', { level: 1, name: 'Hoje' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await esperar(800);
  const areas = page.getByRole('navigation', { name: 'Áreas' });
  const area = areas.getByRole('link', { name: 'Fixar' });
  await area.click();
  const comeco = Date.now();
  // O recorte inclui a barra das áreas (embaixo no celular, no cabeçalho no desktop) e o que está em volta.
  const caixa = await areas.boundingBox();
  if (!caixa) throw new Error('a barra das áreas não tem caixa');
  const folga = 24;
  const recorte = {
    x: Math.max(0, caixa.x - folga),
    y: Math.max(0, caixa.y - folga),
    width: Math.min(APARELHOS[aparelho].viewport.width, caixa.width + 2 * folga),
    height: caixa.height + 2 * folga,
  };
  for (let i = 0; i < 4; i++) {
    await tirar(page, o, 'traco', aparelho, tema, quadros, `+${String(Date.now() - comeco)} ms`, {
      clip: recorte,
    });
    await esperar(60);
  }
  await ctx.close();
  return quadros;
}

/** Fecha um Dia (uma Sessão curta e o "Fechar o Dia" do Hoje) e devolve o bloco do Resumo, como o E2E `caneta.spec.ts`. */
async function fecharODia(page, url) {
  await page.goto(`${url}/#/sessao/iniciar`);
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await page.getByRole('heading', { name: 'Sessão encerrada' }).waitFor();
  await page.goto(`${url}/#/`);
  const bloco = page.getByRole('region', { name: 'Fechar o Dia' });
  await bloco.getByRole('button', { name: 'Fechar o Dia' }).click();
  await bloco.getByRole('heading', { name: 'Dia fechado' }).waitFor();
  return bloco;
}

/**
 * O quadro do cacto: fecha três Dias (o chão, o tronco e um braço, em 24 h de relógio da página cada um) e fotografa o
 * quarto, em que a caneta desenha o outro braço com o resto já feito, e a legenda no fim.
 */
async function quadro(browser, o, url, aparelho, tema) {
  const ctx = await novoContexto(browser, aparelho, tema, { jaVistas: true });
  const page = await ctx.newPage();
  const quadros = [];
  const dia = 86_400_000;
  const inicio = new Date('2026-10-14T09:30:00-03:00').getTime();
  for (let n = 0; n < 3; n++) {
    await page.clock.setFixedTime(new Date(inicio + n * dia));
    await fecharODia(page, url);
  }
  await page.clock.setFixedTime(new Date(inicio + 3 * dia));
  const bloco = await fecharODia(page, url);
  await bloco.scrollIntoViewIfNeeded();
  const clip = await bloco.boundingBox();
  if (!clip) throw new Error('o Resumo do Dia não tem caixa');
  const comeco = Date.now();
  for (const espera of [400, 900, 1500]) {
    await esperar(Math.max(0, espera - (Date.now() - comeco)));
    await tirar(page, o, 'quadro', aparelho, tema, quadros, `+${String(Date.now() - comeco)} ms`, {
      clip,
    });
  }
  await bloco.locator('.quadro-legenda').filter({ hasText: 'Hoje a caneta desenhou' }).waitFor();
  await esperar(900);
  await tirar(page, o, 'quadro', aparelho, tema, quadros, 'Pronto', { clip });
  await ctx.close();
  return quadros;
}

const FEITORES = { 'primeira-vez': primeiraVez, passeio, carregamento, traco, quadro };

/** Uma folha JPEG por cena: um aparelho e um tema por linha, um quadro por coluna, cada um com o rótulo embaixo. */
async function folhas(browser, o, feitos) {
  const pagina = await browser.newPage({ viewport: { width: 400, height: 400 } });
  for (const cena of o.cenas) {
    const linhas = feitos.filter((f) => f.cena === cena && f.quadros.length > 0);
    if (linhas.length === 0) continue;
    const altura = 420;
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#777;font:12px sans-serif;color:#fff">${linhas
      .map(
        (l) =>
          `<div style="display:flex;gap:8px;padding:8px;align-items:flex-start"><div style="width:90px">${l.aparelho}<br>${l.tema}</div>${l.quadros
            .map(
              (q) =>
                `<figure style="margin:0"><img src="${pathToFileURL(path.join(o.saida, q.arquivo)).href}" style="height:${String(altura)}px;display:block"><figcaption>${q.rotulo}</figcaption></figure>`,
            )
            .join('')}</div>`,
      )
      .join('')}`;
    const arquivoHtml = path.join(o.saida, `folha-${cena}.html`);
    await writeFile(arquivoHtml, html);
    await pagina.goto(pathToFileURL(arquivoHtml).href);
    await esperar(400);
    await pagina.screenshot({
      path: path.join(o.saida, `folha-${cena}.jpg`),
      fullPage: true,
      type: 'jpeg',
      quality: 72,
    });
  }
  await pagina.close();
}

async function principal() {
  const o = opcoes(process.argv.slice(2));
  await mkdir(o.saida, { recursive: true });
  const servidor = o.url ? undefined : await subirServidor(4181);
  const url = o.url ?? servidor.url;
  const browser = await chromium.launch();
  try {
    const feitos = [];
    for (const cena of o.cenas) {
      const feitor = FEITORES[cena];
      if (!feitor) throw new Error(`cena desconhecida: ${cena}`);
      for (const aparelho of o.aparelhos) {
        for (const tema of o.temas) {
          try {
            const quadros = await feitor(browser, o, url, aparelho, tema);
            feitos.push({ cena, aparelho, tema, quadros });
            console.log(`ok     ${cena} ${aparelho}/${tema}: ${String(quadros.length)} quadro(s)`);
          } catch (e) {
            console.log(
              `FALHOU ${cena} ${aparelho}/${tema}: ${String(e instanceof Error ? e.message : e).split('\n')[0]}`,
            );
          }
        }
      }
    }
    await writeFile(path.join(o.saida, 'quadros.json'), JSON.stringify(feitos, null, 1));
    if (o.folhas) await folhas(browser, o, feitos);
    console.log(`${String(feitos.length)} cena(s) em ${o.saida}`);
  } finally {
    await browser.close();
    servidor?.parar();
  }
}

await principal();
