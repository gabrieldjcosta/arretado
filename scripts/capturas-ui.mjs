// Capturas de tela do app para a revisão visual (docs/design/sistema-visual.md › "Como conferir").
// Semeia o app pela própria interface (LEP compilada com "Lido até aqui", plano, 4 erros com cartão
// e 3 tarefas), guarda o estado (IndexedDB) e fotografa rotas × aparelhos × temas. Só dados
// inventados e lei pública; nada sai da máquina. Saída em test-results/capturas/ (fora do git).
//
// Uso: node scripts/capturas-ui.mjs [opções]
//   --saida <pasta>      padrão test-results/capturas
//   --url <endereço>     servidor já em pé; sem isso, sobe `vite preview` na 4180 (rode `npm run build`)
//   --semear             refaz o estado semeado (vazio, leitura, completo); automático se faltar
//   --estado <nome>      vazio | leitura | completo (padrão completo)
//   --rotas <a,b,c>      padrão: as principais; "todas" = as 27; ":norma" vira o id da LEP semeada
//   --medir              mede por DOM em cada tela (rolagem horizontal, alvos < 44 px, "+" sobre texto)
//                        e grava medidas.json; imprime o resumo
//   --aparelhos <a,b>    celular (390×844), tablet (768×1024), desktop (1440×900)
//   --temas <a,b>        claro, escuro
//   --agora <ISO>        relógio fixo da captura (padrão 2026-10-14T09:30:00-03:00)
//   --zoom <n>           2 = zoom de 200% (viewport pela metade, mesma tela)
//   --completa           captura a página inteira (com rolagem), não só a tela
//   --folhas             monta folhas de contato por rota em JPEG (aparelho × tema lado a lado)
/* global window, document, DataTransfer, ClipboardEvent -- só dentro de page.evaluate (roda no navegador) */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
  tablet: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1.5, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const ROTAS_PADRAO = [
  '/',
  '/plano',
  '/plano/pontos',
  '/plano/tarefas',
  '/sessao/iniciar',
  '/recall',
  '/recall/registrar',
  '/recall/revisar',
  '/recall/frases/revisar',
  '/biblioteca',
  '/biblioteca/acervo',
  '/biblioteca/normas/:norma',
  '/conta',
  '/conta/aparencia',
  '/conta/dados',
];

/** `--rotas todas`: toda tela navegável de App.tsx, mais a LEP semeada no Leitor. */
const ROTAS_TODAS = [
  '/',
  '/plano',
  '/plano/onboarding',
  '/plano/pontos',
  '/plano/tarefas',
  '/sessao/iniciar',
  '/recall',
  '/recall/frases',
  '/recall/cartoes',
  '/recall/historico',
  '/recall/registrar',
  '/recall/revisar',
  '/recall/frases/revisar',
  '/biblioteca',
  '/biblioteca/acervo',
  '/biblioteca/sumulas',
  '/biblioteca/teses',
  '/biblioteca/resumos',
  '/biblioteca/precedentes',
  '/biblioteca/importar',
  '/biblioteca/normas/:norma',
  '/conta',
  '/conta/aparencia',
  '/conta/perfis',
  '/conta/dados',
  '/conta/privacidade',
  '/orientacoes',
];

function opcoes(argv) {
  const o = {
    saida: path.join(RAIZ, 'test-results', 'capturas'),
    estado: 'completo',
    aparelhos: Object.keys(APARELHOS),
    temas: ['claro', 'escuro'],
    agora: '2026-10-14T09:30:00-03:00',
    zoom: 1,
    rotas: ROTAS_PADRAO,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => argv[++i];
    if (a === '--saida') o.saida = path.resolve(valor());
    else if (a === '--url') o.url = valor();
    else if (a === '--estado') o.estado = valor();
    else if (a === '--rotas') {
      const v = valor();
      o.rotas = v === 'todas' ? ROTAS_TODAS : v.split(',');
    } else if (a === '--medir') o.medir = true;
    else if (a === '--aparelhos') o.aparelhos = valor().split(',');
    else if (a === '--temas') o.temas = valor().split(',');
    else if (a === '--agora') o.agora = valor();
    else if (a === '--zoom') o.zoom = Number(valor());
    else if (a === '--semear') o.semear = true;
    else if (a === '--completa') o.completa = true;
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

async function passo(nome, fn) {
  try {
    await fn();
    console.log(`ok     ${nome}`);
  } catch (e) {
    console.log(`FALHOU ${nome}: ${String(e instanceof Error ? e.message : e).split('\n')[0]}`);
  }
}

/** Cola o texto colado do corpus (como o navegador entrega) no campo de Importar. */
async function colar(page, id) {
  const pasta = path.join(RAIZ, 'corpus', 'normas');
  const [html, texto] = await Promise.all([
    readFile(path.join(pasta, `${id}.colado.html`), 'utf8'),
    readFile(path.join(pasta, `${id}.colado.txt`), 'utf8'),
  ]);
  const campo = page.getByLabel('Cole aqui a lei');
  await campo.focus();
  await campo.evaluate(
    (alvo, dados) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/html', dados.html);
      clipboardData.setData('text/plain', dados.texto);
      alvo.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
      );
    },
    { html, texto },
  );
}

const ERROS = [
  [
    'Livramento exige requisitos do art. 83 do CP.',
    'Confundi livramento condicional com progressão',
  ],
  [
    'A fração da progressão de regime é de 16% para réu primário em crime sem violência.',
    'Errei a fração',
  ],
  [
    'Súmula Vinculante 56: a falta de estabelecimento adequado não autoriza manter o condenado em regime mais gravoso.',
    'Não lembrei da SV 56',
  ],
  ['Prisão preventiva exige fumus comissi delicti e periculum libertatis.', 'Errei os requisitos'],
];
const TAREFAS = [
  'Ler arts. 112 a 117 da LEP',
  'Resolver 10 questões de execução penal',
  'Revisar o resumo de prisões cautelares',
];

/** Semeia pela interface, no relógio de "ontem à noite", e grava um estado por marco. */
async function semear(browser, o, url) {
  const pastaEstado = path.join(o.saida, 'estado');
  await mkdir(pastaEstado, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-13T21:40:00-03:00'));
  const gravar = async (nome) => {
    await ctx.storageState({ path: path.join(pastaEstado, `${nome}.json`), indexedDB: true });
    console.log(`estado  ${nome}`);
  };
  const info = { norma: '' };

  await page.goto(`${url}/#/`);
  await page.waitForSelector('h1');
  await gravar('vazio');

  await passo('importar a LEP compilada', async () => {
    await page.goto(`${url}/#/biblioteca/importar`);
    await colar(page, 'lep-compilado');
    await page.getByRole('region', { name: 'Estrutura encontrada' }).waitFor({ timeout: 90_000 });
    await page.getByRole('textbox', { name: 'Título curto' }).fill('LEP');
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'LEP publicada.' }).waitFor();
  });

  await passo('abrir a LEP e marcar "Lido até aqui" no art. 112', async () => {
    const todas = page.getByRole('button', { name: 'Todas as normas' });
    await todas.waitFor();
    if ((await todas.getAttribute('aria-pressed')) !== 'true') await todas.click();
    await page
      .getByRole('region', { name: 'Normas' })
      .getByRole('link', { name: /LEP/ })
      .first()
      .click();
    await page.getByRole('heading', { level: 1, name: 'LEP' }).waitFor();
    info.norma = page.url().split('/normas/')[1]?.split(/[?#]/)[0] ?? '';
    const alvo = page.locator('[data-endereco="art112"]').first();
    for (let i = 0; i < 200 && !(await alvo.isVisible()); i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.9);
      });
      await esperar(60);
    }
    for (let i = 0; i < 20; i++) {
      const dy = await alvo.evaluate((el) => el.getBoundingClientRect().top - 140);
      if (Math.abs(dy) < 2) break;
      await page.evaluate((d) => {
        window.scrollBy(0, d);
      }, dy);
      await esperar(150);
    }
    await page.getByRole('button', { name: 'Lido até aqui' }).click();
    await esperar(800);
  });
  await writeFile(path.join(pastaEstado, 'info.json'), JSON.stringify(info));
  await gravar('leitura');

  await passo('plano pelo onboarding', async () => {
    await page.goto(`${url}/#/plano/onboarding`);
    await page.getByRole('heading', { name: 'Para qual carreira você estuda?' }).waitFor();
    const defensoria = page.getByRole('radio', { name: /Defensoria/ });
    if ((await defensoria.count()) > 0) await defensoria.first().check();
    else await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('heading', { name: 'Quais matérias entram no plano?' }).waitFor();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Criar meu plano' }).click();
    await page.getByText(/Comece por aqui:/).waitFor();
  });

  for (const [i, [frase, oQueFoi]] of ERROS.entries()) {
    await passo(`erro ${String(i + 1)} com cartão`, async () => {
      // Sair da tela de registro antes: a mesma rota por hash não recarrega o formulário.
      await page.goto(`${url}/#/`);
      await page.waitForSelector('h1');
      await page.goto(`${url}/#/recall/registrar`);
      await page.getByLabel('Frase correta').fill(frase);
      const disciplina = page.getByLabel('Disciplina (opcional)');
      const n = (await disciplina.count()) > 0 ? await disciplina.locator('option').count() : 0;
      if (n > 1) await disciplina.selectOption({ index: 1 + (i % (n - 1)) });
      await page.getByText('Mais detalhes (opcional)').click();
      await page.getByLabel('O que foi').fill(oQueFoi);
      await page.getByRole('button', { name: 'Salvar' }).click();
      await page.getByText('Frase registrada.').waitFor();
      await page.getByRole('button', { name: 'Sim' }).click();
      await page.getByText(/Cartão criado/).waitFor();
    });
  }

  await passo('3 tarefas', async () => {
    await page.goto(`${url}/#/plano/tarefas`);
    for (const t of TAREFAS) {
      await page.getByLabel('O que fazer?').fill(t);
      await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
      await page.getByText(t).first().waitFor();
    }
  });
  await gravar('completo');
  await ctx.close();
  return info;
}

/**
 * Medidas por DOM da tela montada. Roda no navegador (page.evaluate): não usa nada de fora.
 * Rolagem horizontal (no celular o navegador alarga a janela, então compara com a largura do
 * aparelho), alvos de toque abaixo de 44 px e o "+" flutuante sobre texto (no começo e no fim da página).
 */
function medirTela(larguraDoAparelho) {
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = window.getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
  };
  const rotulo = (el) => {
    const texto = (el.getAttribute('aria-label') ?? el.textContent ?? '')
      .trim()
      .replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${texto ? ` "${texto.slice(0, 28)}"` : ''}`;
  };
  const emRolagem = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(window.getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };

  const raiz = document.documentElement;
  const largura = Math.max(raiz.scrollWidth, document.body.scrollWidth, window.innerWidth);
  const alem = new Set(
    Array.from(document.body.querySelectorAll('*')).filter(
      (el) =>
        visivel(el) && el.getBoundingClientRect().right > larguraDoAparelho + 1 && !emRolagem(el),
    ),
  );
  const largos = Array.from(alem)
    .filter((el) => !Array.from(el.querySelectorAll('*')).some((filho) => alem.has(filho)))
    .slice(0, 4)
    .map((el) => `${rotulo(el)} ${String(Math.round(el.getBoundingClientRect().width))}px`);

  const alvos = Array.from(
    document.body.querySelectorAll(
      'a[href], button, summary, select, textarea, input:not([type="hidden"]), [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"]',
    ),
  )
    .filter(visivel)
    .map((el) => {
      const caixaDeMarcar = el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type);
      const dono = (caixaDeMarcar ? el.closest('label') : null) ?? el;
      const r = dono.getBoundingClientRect();
      return {
        el,
        r,
        emTexto: window.getComputedStyle(el).display === 'inline',
      };
    })
    .filter(({ r }) => r.width > 2 && r.height > 2 && r.right > 0 && r.bottom > 0)
    .filter(({ r }) => r.width < 44 || r.height < 44)
    .sort((a, b) => Math.min(a.r.width, a.r.height) - Math.min(b.r.width, b.r.height));

  const fab = document.querySelector('a.flutuante');
  const textoSob = () => {
    if (!fab || !visivel(fab)) return [];
    const f = fab.getBoundingClientRect();
    const achados = new Set();
    // 4 = NodeFilter.SHOW_TEXT
    const passeio = document.createTreeWalker(document.body, 4);
    for (let no = passeio.nextNode(); no; no = passeio.nextNode()) {
      const texto = (no.textContent ?? '').trim();
      if (!texto || fab.contains(no) || !no.parentElement || !visivel(no.parentElement)) continue;
      const faixa = document.createRange();
      faixa.selectNodeContents(no);
      for (const c of faixa.getClientRects()) {
        const dentro =
          c.width > 1 &&
          c.left < f.right &&
          c.right > f.left &&
          c.top < f.bottom &&
          c.bottom > f.top;
        if (dentro) achados.add(texto.replace(/\s+/g, ' ').slice(0, 28));
      }
    }
    return Array.from(achados).slice(0, 3);
  };
  window.scrollTo(0, 0);
  const noInicio = textoSob();
  window.scrollTo(0, raiz.scrollHeight);
  const noFim = textoSob();
  window.scrollTo(0, 0);

  return {
    rolagemH: Math.max(0, largura - larguraDoAparelho),
    largos,
    alvosPequenos: alvos.length,
    alvosPequenosEmTexto: alvos.filter((a) => a.emTexto).length,
    amostraDeAlvos: alvos
      .slice(0, 6)
      .map(
        ({ el, r }) =>
          `${rotulo(el)} ${String(Math.round(r.width))}×${String(Math.round(r.height))}`,
      ),
    maisSobreTexto: { inicio: noInicio, fim: noFim },
  };
}

/** Resumo legível das medidas: o que estoura a largura, o que o "+" cobre e os alvos pequenos. */
function resumirMedidas(medidas) {
  const quem = (m) => `${m.aparelho}/${m.tema} ${m.rota}`;
  const secao = (titulo, linhas) =>
    `\n${titulo} (${String(linhas.length)})\n${linhas.length > 0 ? linhas.join('\n') : '  nenhum'}`;
  const rolagem = medidas
    .filter((m) => m.rolagemH > 0)
    .map((m) => `  +${String(m.rolagemH)}px  ${quem(m)}  ${m.largos.join('; ')}`);
  const mais = medidas
    .filter((m) => m.maisSobreTexto.fim.length > 0 || m.maisSobreTexto.inicio.length > 0)
    .map(
      (m) =>
        `  ${quem(m)}  início: ${m.maisSobreTexto.inicio.join(' | ') || '-'}  fim: ${m.maisSobreTexto.fim.join(' | ') || '-'}`,
    );
  const alvos = medidas
    .filter((m) => m.alvosPequenos > 0)
    .map(
      (m) =>
        `  ${String(m.alvosPequenos).padStart(3)} (${String(m.alvosPequenosEmTexto)} em texto)  ${quem(m)}  ${m.amostraDeAlvos.slice(0, 3).join('; ')}`,
    );
  return [
    secao('Rolagem horizontal', rolagem),
    secao('"+" sobre texto', mais),
    secao('Telas com alvos < 44 px', alvos),
  ].join('\n');
}

const nomeDoArquivo = (rota, aparelho, tema) =>
  `${rota === '/' ? 'hoje' : rota.replace(/^\//, '').replace(/[/:?=&]/g, '-')}__${aparelho}__${tema}.png`;

async function capturar(browser, o, url, info) {
  const { zoom } = o;
  const feitas = [];
  const medidas = [];
  for (const aparelho of o.aparelhos) {
    const base = APARELHOS[aparelho];
    for (const tema of o.temas) {
      const ctx = await browser.newContext({
        ...base,
        viewport: {
          width: Math.round(base.viewport.width / zoom),
          height: Math.round(base.viewport.height / zoom),
        },
        deviceScaleFactor: base.deviceScaleFactor * zoom,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        colorScheme: tema === 'claro' ? 'light' : 'dark',
        reducedMotion: 'reduce',
        storageState: path.join(o.saida, 'estado', `${o.estado}.json`),
      });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(o.agora));
      for (const rota of o.rotas) {
        const arquivo = nomeDoArquivo(rota, aparelho, tema);
        try {
          // Passa pelo Hoje antes: a rota é por hash e o app precisa estar montado.
          await page.goto(`${url}/#/`);
          await page.waitForSelector('h1');
          await page.goto(`${url}/#${rota.replace(':norma', info.norma)}`);
          await page.waitForSelector('h1');
          await page.evaluate(() => document.fonts.ready);
          await esperar(600);
          await page.screenshot({
            path: path.join(o.saida, arquivo),
            fullPage: Boolean(o.completa),
          });
          feitas.push({ rota, aparelho, tema, arquivo });
          if (o.medir) {
            const medida = await page.evaluate(medirTela, Math.round(base.viewport.width / zoom));
            medidas.push({ rota, aparelho, tema, ...medida });
          }
        } catch (e) {
          console.log(
            `FALHOU ${arquivo}: ${String(e instanceof Error ? e.message : e).split('\n')[0]}`,
          );
        }
      }
      await ctx.close();
    }
  }
  return { feitas, medidas };
}

/** Uma folha JPEG por rota: aparelhos × temas lado a lado, na mesma altura. */
async function folhas(browser, o, feitas) {
  const porRota = Map.groupBy(feitas, (f) => f.rota);
  const pagina = await browser.newPage({ viewport: { width: 400, height: 400 } });
  for (const [rota, itens] of porRota) {
    const altura = 560;
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#777;font:12px sans-serif;color:#fff"><div style="display:flex;gap:10px;padding:10px;align-items:flex-start">${itens
      .map(
        (f) =>
          `<figure style="margin:0"><img src="${pathToFileURL(path.join(o.saida, f.arquivo)).href}" style="height:${String(altura)}px;display:block"><figcaption>${f.aparelho} · ${f.tema}</figcaption></figure>`,
      )
      .join('')}</div>`;
    const arquivoHtml = path.join(o.saida, 'folha.html');
    await writeFile(arquivoHtml, html);
    await pagina.goto(pathToFileURL(arquivoHtml).href);
    await esperar(400);
    const nome = `folha-${rota === '/' ? 'hoje' : rota.replace(/^\//, '').replace(/[/:?=&]/g, '-')}.jpg`;
    await pagina.screenshot({
      path: path.join(o.saida, nome),
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
  const servidor = o.url ? undefined : await subirServidor(4180);
  const url = o.url ?? servidor.url;
  const browser = await chromium.launch();
  try {
    const arquivoInfo = path.join(o.saida, 'estado', 'info.json');
    const precisaSemear = o.semear || !existsSync(path.join(o.saida, 'estado', `${o.estado}.json`));
    const info = precisaSemear
      ? await semear(browser, o, url)
      : JSON.parse(await readFile(arquivoInfo, 'utf8'));
    const { feitas, medidas } = await capturar(browser, o, url, info);
    if (o.folhas) await folhas(browser, o, feitas);
    if (o.medir) {
      await writeFile(path.join(o.saida, 'medidas.json'), JSON.stringify(medidas, null, 1));
      console.log(resumirMedidas(medidas));
    }
    console.log(`${String(feitas.length)} captura(s) em ${o.saida}`);
  } finally {
    await browser.close();
    servidor?.parar();
  }
}

await principal();
