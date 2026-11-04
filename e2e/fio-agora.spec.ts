import type { Page } from '@playwright/test';
import { coresNosPixels, expect, semViolacoesNoFio, test } from './apoio';

// O Arretado novo (prévia do Fio, D-D25): o Agora do mockup aprovado (docs/design/fio/mockup-aprovado.html) com o
// fio que se puxa, o passo, o Destino e o Varal. O jsdom não tem layout, ponteiro nem animação de verdade; aqui o
// navegador confere o arrasto, que a nav não cobre o que a tela mostra, que há movimento (a tela que sai deixa
// um fantasma, o ponto cai) e que as telas passam no axe em tema claro e escuro.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/** Traz uma matéria pelo edital (a Trilha é igual nas duas interfaces) e liga a prévia. */
async function comMateriaNaPrevia(page: Page) {
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
}

const puxador = (page: Page) => page.getByRole('button', { name: /Puxar o fio/ });

/** Nada pode rolar de lado nem passar da largura da tela. */
const semRolagemLateral = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('o Agora mostra a marca, o fio, o que vem na ponta e os três lugares embaixo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);

  const ponta = page.getByRole('group', { name: 'Na ponta do fio' });
  await expect(puxador(page)).toBeVisible();
  await expect(ponta).toContainText('Adicionar a lei de Execução Penal');
  await expect(page.getByRole('button', { name: 'arretado: sua conta e ajustes' })).toBeVisible();
  await expect(page.getByText('da prova é seu')).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Lugares' });
  await expect(nav.getByRole('button')).toHaveText(['Agora', 'Destino', 'Varal']);
  await expect(nav.getByRole('button', { name: 'Agora' })).toHaveAttribute('aria-current', 'page');

  // A nav não cobre o cartão da ponta do fio, nem a página ganha rolagem lateral.
  const [caixaNav, caixaPonta] = await Promise.all([nav.boundingBox(), ponta.boundingBox()]);
  if (!caixaNav || !caixaPonta) throw new Error('sem caixa');
  expect(caixaPonta.y + caixaPonta.height).toBeLessThanOrEqual(caixaNav.y);
  expect(await semRolagemLateral(page)).toBe(true);
  // O ponto que se puxa é um alvo de toque de verdade.
  const caixaNo = await puxador(page).boundingBox();
  expect(caixaNo?.width).toBeGreaterThanOrEqual(44);
  expect(caixaNo?.height).toBeGreaterThanOrEqual(44);

  await semViolacoesNoFio(page);
});

test('o ponto repousa onde o mockup o põe, também quando o app abre já no Agora', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);
  // A primeira carga: a leitura ainda não está na memória do app, então o cartão de baixo chega depois do ponto.
  await page.reload();
  await expect(puxador(page)).toBeVisible();

  // O ponto repousa a 55% da altura da área (no máximo 230 px), medida com o cartão de baixo já cheio, como no
  // mockup. Medir antes de a leitura chegar o deixava 22 px abaixo (a área ainda era mais alta).
  await expect
    .poll(() =>
      page.evaluate(() => {
        const area = document.querySelector('.m-puxar-area');
        const ponto = document.querySelector('.m-puxador');
        if (!area || !ponto) return false;
        const a = area.getBoundingClientRect();
        const p = ponto.getBoundingClientRect();
        const base = Math.min(a.height * 0.55, 230);
        return Math.abs(p.top - a.top - (base - 42)) <= 1;
      }),
    )
    .toBe(true);
});

test('com zoom de 200% (195 px de layout), a nav cabe sem rolar de lado', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 400 });
  await comMateriaNaPrevia(page);

  const nav = page.getByRole('navigation', { name: 'Lugares' });
  await expect(nav).toBeVisible();
  const caixa = await nav.boundingBox();
  if (!caixa) throw new Error('sem caixa');
  expect(caixa.x).toBeGreaterThanOrEqual(0);
  expect(caixa.x + caixa.width).toBeLessThanOrEqual(195);
  expect(await semRolagemLateral(page)).toBe(true);
  await semViolacoesNoFio(page);
});

test('arrastar o ponto para baixo e soltar puxa o fio e abre o passo', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);

  const caixa = await puxador(page).boundingBox();
  if (!caixa) throw new Error('sem caixa');
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;

  // Soltar antes do limite devolve o ponto ao lugar (balançando) e não puxa nada.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 30, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('group', { name: 'Na ponta do fio' })).toBeVisible();
  expect(page.url()).not.toContain('/fio/passo');

  // Além de 70 px, puxa.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 110, { steps: 8 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#\/fio\/passo$/);
  const cartao = page.locator('.m-tela:not(.m-saindo) .m-cartao[data-cartao="ler"]');
  await expect(cartao.getByRole('heading', { level: 2 })).toHaveText(
    'Adicionar a lei de Execução Penal',
  );
  await expect(cartao.getByRole('link', { name: 'Escolher a lei' })).toBeVisible();
  await semViolacoesNoFio(page);

  // Pular não custa nada: a etapa fecha sem fato e o pouso deixa a pessoa descansar.
  await cartao.getByRole('button', { name: 'Pular este passo' }).click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(page.getByRole('heading', { level: 2, name: /Pode descansar\.$/ })).toBeVisible();
  await semViolacoesNoFio(page);
  await page.getByRole('button', { name: /Puxar o fio: seguir/ }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('a tela que sai deixa um fantasma que esmaece, como na troca de telas do mockup', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);
  await page.evaluate(() => {
    const w = window as unknown as { __viuFantasma: boolean };
    w.__viuFantasma = false;
    new MutationObserver((registros) => {
      for (const r of registros) {
        r.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList.contains('m-saindo')) w.__viuFantasma = true;
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
  });

  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);
  expect(
    await page.evaluate(() => (window as unknown as { __viuFantasma: boolean }).__viuFantasma),
  ).toBe(true);
  // O fantasma não fica: passada a troca, só a tela nova está no quadro.
  await expect(page.locator('.m-saindo')).toHaveCount(0);
  await expect(page.locator('.m-tela')).toHaveCount(1);
});

test('o teclado também puxa o fio, e Destino e Varal passam no axe', async ({ page }) => {
  await comMateriaNaPrevia(page);
  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);

  await page.goto('/#/');
  await page
    .getByRole('navigation', { name: 'Lugares' })
    .getByRole('button', { name: 'Destino' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'O caminho começa aqui' }),
  ).toBeVisible();
  await semViolacoesNoFio(page);

  await page
    .getByRole('navigation', { name: 'Lugares' })
    .getByRole('link', { name: 'Varal' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /pendurado no fio/ })).toBeVisible();
  await expect(page.getByRole('group', { name: 'O que você estuda' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'O que você guarda' })).toBeVisible();
  await semViolacoesNoFio(page);
});

test('sem ligar a prévia, a casca de sempre continua igual', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toHaveCount(0);
  await page.goto('/#/destino');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});

test('o fio acende em neon amarelo: solto, puxando e além dos 70 px, de noite e de dia, e parado no Calmo', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await comMateriaNaPrevia(page);

  const area = page.locator('.m-puxar-area');
  const fio = page.locator('.m-puxar-area .m-fio-pendurado');
  const filtroDoFio = () => fio.evaluate((el) => getComputedStyle(el).filter);
  const brilhoDoPonto = () => puxador(page).evaluate((el) => getComputedStyle(el).boxShadow);
  /**
   * Quanto amarelo há ao lado do fio: vermelho menos azul do pixel 4 px à esquerda dele, a 45% do caminho (acima do
   * ponto e fora do texto), onde o halo cai. O fundo é azul, de noite e de dia, e dá negativo (-31 a -12); o halo
   * amarelo sobe isso: 24 a 31 solto, 50 a 57 puxando e 83 a 89 além dos 70 px.
   */
  const amareloAoLado = async () => {
    const lugar = await fio.evaluate((el: Element) => {
      const linha = el as SVGPathElement;
      const caixa = linha.ownerSVGElement?.getBoundingClientRect();
      if (!caixa) throw new Error('sem o desenho do fio');
      const ponto = linha.getPointAtLength(linha.getTotalLength() * 0.45);
      return [caixa.left + ponto.x - 4, caixa.top + ponto.y] as [number, number];
    });
    const [cor] = await coresNosPixels(page, [lugar]);
    if (!cor) throw new Error('sem pixel');
    return cor[0] - cor[2];
  };

  /**
   * Soltar o ponto antes do limite o devolve ao lugar com uma mola de 420 ms (`PuxarM.soltar`, a do mockup): quem
   * pega o ponto de novo no meio dela vê a mola vencer o dedo, e o fio não acende. Esperar o fim dela é o que a pessoa
   * faz sem pensar.
   */
  const esperarAMola = () => page.waitForTimeout(500);

  const SOLTO = 'url("#m-neon-solto")';
  const PUXANDO = 'url("#m-neon-puxando")';
  const PASSOU = 'url("#m-neon-passou")';

  // A faixa ciano e desfocada do mockup (`.m-fio-pendurado-b`) sai: o neon é amarelo (desvio 20).
  await expect(page.locator('.m-fio-pendurado-b')).toBeHidden();

  for (const esquema of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: esquema, reducedMotion: 'no-preference' });
    await expect(page.locator('.m-fio')).toHaveAttribute('data-movimento', 'vivo');
    await expect(area).toHaveAttribute('data-puxe', 'solto');
    await expect.poll(filtroDoFio).toBe(SOLTO);
    const solto = await amareloAoLado();
    // O halo de repouso já se vê: o fundo, sem ele, dá negativo.
    expect(solto).toBeGreaterThan(10);

    const caixa = await puxador(page).boundingBox();
    if (!caixa) throw new Error('sem caixa');
    const x = caixa.x + caixa.width / 2;
    const y = caixa.y + caixa.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    try {
      // Puxando (de 4 a 70 px): o halo sobe.
      await page.mouse.move(x, y + 40, { steps: 5 });
      await expect(area).toHaveAttribute('data-puxe', 'puxando');
      await expect.poll(filtroDoFio).toBe(PUXANDO);
      const puxando = await amareloAoLado();
      expect(puxando).toBeGreaterThanOrEqual(solto + 15);
      // Além dos 70 px: o fio estoura e o ponto ganha o brilho dele.
      await page.mouse.move(x, y + 100, { steps: 5 });
      await expect(area).toHaveAttribute('data-puxe', 'passou');
      await expect.poll(filtroDoFio).toBe(PASSOU);
      await expect.poll(brilhoDoPonto).toContain('rgba(255, 197, 61, 0.8) 0px 0px 46px 6px');
      const passou = await amareloAoLado();
      expect(passou).toBeGreaterThanOrEqual(puxando + 15);
      expect(passou).toBeGreaterThanOrEqual(70);
    } finally {
      // Volta antes de soltar: soltar além do limite puxaria o fio de vez.
      await page.mouse.move(x, y, { steps: 5 });
      await page.mouse.up();
      await esperarAMola();
    }
    await expect(area).toHaveAttribute('data-puxe', 'solto');
    await expect.poll(filtroDoFio).toBe(SOLTO);
  }

  // Calmo: o halo fica parado no valor de repouso, mesmo puxando.
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await expect(page.locator('.m-fio')).toHaveAttribute('data-movimento', 'calmo');
  const parado = await amareloAoLado();
  const caixa = await puxador(page).boundingBox();
  if (!caixa) throw new Error('sem caixa');
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await page.mouse.move(x, y + 100, { steps: 5 });
    await expect(area).toHaveAttribute('data-puxe', 'passou');
    await expect.poll(filtroDoFio).toBe(SOLTO);
    expect(await amareloAoLado()).toBeLessThanOrEqual(parado + 12);
  } finally {
    await page.mouse.move(x, y, { steps: 5 });
    await page.mouse.up();
    await esperarAMola();
  }
});

test('em aparelho leve o fio não leva o halo, nem puxado além dos 70 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  // A mesma conta do mockup: dois núcleos ou menos é aparelho leve (`m/leve.ts`).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2, configurable: true });
  });
  await comMateriaNaPrevia(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.m-fio')).toHaveClass(/\bm-leve\b/);

  const area = page.locator('.m-puxar-area');
  const filtroDoFio = () =>
    page.locator('.m-puxar-area .m-fio-pendurado').evaluate((el) => getComputedStyle(el).filter);
  await expect(area).toHaveAttribute('data-puxe', 'solto');
  expect(await filtroDoFio()).toBe('none');

  const caixa = await puxador(page).boundingBox();
  if (!caixa) throw new Error('sem caixa');
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await page.mouse.move(x, y + 100, { steps: 5 });
    await expect(area).toHaveAttribute('data-puxe', 'passou');
    expect(await filtroDoFio()).toBe('none');
  } finally {
    await page.mouse.move(x, y, { steps: 5 });
    await page.mouse.up();
  }
});
