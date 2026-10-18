import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './apoio';

const ROTAS = [
  '/',
  '/plano',
  '/recall',
  '/recall/registrar',
  '/recall/frases',
  '/recall/cartoes',
  '/recall/historico',
  '/recall/revisar',
  '/recall/frases/revisar',
  '/recall/cartoes/novo',
  '/biblioteca',
  '/biblioteca/importar',
  '/conta',
  '/conta/aparencia',
  '/conta/perfis',
  '/conta/dados',
  '/conta/privacidade',
  '/orientacoes',
];

for (const esquema of ['light', 'dark'] as const) {
  test.describe(`acessibilidade — tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });
    for (const rota of ROTAS) {
      test(`${rota} sem violações do axe (WCAG AA)`, async ({ page }) => {
        await page.goto(`/#${rota}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const r = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(
          r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        ).toEqual([]);
      });
    }

    test('menu Ajuda aberto sem violações do axe e fecha com Esc (fatia 6)', async ({ page }) => {
      await page.goto('/#/recall');
      const botao = page.getByRole('button', { name: 'Ajuda', exact: true });
      await botao.click();
      await expect(page.getByRole('link', { name: 'Ajuda sobre esta tela' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Relatar problema' })).toBeVisible();
      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(r.violations.map((v) => v.id)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(botao).toHaveAttribute('aria-expanded', 'false');
    });
  });
}

// Botões, links de botão, navegação e seletor de arquivo: 44 px nas duas medidas, em todas as rotas
// principais (o link no meio de frase é a única exceção e não entra aqui). Os projetos mudam a
// navegação (barra de baixo, barra de cima), então a conferência roda nos três.
for (const rota of ROTAS) {
  test(`${rota}: alvos de toque têm pelo menos 44 px`, async ({ page }) => {
    await page.goto(`/#${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const pequenos = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, a.botao, .areas a, input[type="file"]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { texto: el.textContent.trim(), h: r.height, w: r.width };
        })
        .filter((x) => x.h > 0 && (x.h < 44 || x.w < 44))
        .map(
          (x) =>
            `${x.texto || '(sem texto)'} ${String(Math.round(x.w))}×${String(Math.round(x.h))}`,
        ),
    );
    expect(pequenos).toEqual([]);
  });
}

// Nenhuma tela rola na horizontal, nem na largura de um celular pequeno (V-21): o texto quebra
// qualquer palavra longa e a grade usa `minmax(0, 1fr)`. Uma vez por rota, no projeto do celular.
for (const rota of ROTAS) {
  test(`${rota}: sem rolagem horizontal a 320 px`, async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'a largura é fixada no teste; basta um projeto');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`/#${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra).toBeLessThanOrEqual(0);
  });
}

test('navegação por teclado: foco visível e pular para o conteúdo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
  expect(page.url()).not.toContain('conteudo');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
});

test('as fontes embutidas carregam (T19)', async ({ page }) => {
  await page.goto('/#/recall');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // `document.fonts.check` só vale depois de a fonte ter sido pedida: força o pedido das três
  // (a Gabarito dos títulos, D-D7, é variável: um arquivo serve de 400 a 900).
  const carregadas = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load("400 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.load("700 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.load("400 16px 'Literata'"),
      document.fonts.load("800 16px 'Gabarito'"),
    ]);
    // Uma família sem face declarada também passa no `check`: confere que a face da Gabarito
    // existe e carregou.
    let gabaritoCarregada = false;
    document.fonts.forEach((f) => {
      if (f.family.replace(/["']/g, '') === 'Gabarito' && f.status === 'loaded')
        gabaritoCarregada = true;
    });
    return [
      document.fonts.check("400 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.check("700 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.check("400 16px 'Literata'"),
      document.fonts.check("800 16px 'Gabarito'"),
      gabaritoCarregada,
    ];
  });
  expect(carregadas).toEqual([true, true, true, true, true]);
});

test('casca: barra de áreas por teclado, + flutuante só no celular e atalho E (fatia 2)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  const largura = page.viewportSize()?.width ?? 1280;
  const areas = page.getByRole('navigation', { name: 'Áreas' });
  await expect(areas.getByRole('link')).toHaveText(['Hoje', 'Plano', 'Recall', 'Biblioteca']);

  const caixa = await areas.boundingBox();
  const altura = page.viewportSize()?.height ?? 0;
  if (largura < 900) {
    // Barra inferior (celular e tablet).
    expect(caixa?.y ?? 0).toBeGreaterThan(altura / 2);
  } else {
    expect(caixa?.y ?? 0).toBeLessThan(altura / 2);
  }

  const mais = page.getByRole('link', { name: 'Novo registro de erro' });
  if (largura < 700) {
    await expect(mais).toBeVisible();
    const m = await mais.boundingBox();
    // Sem colidir com a barra de baixo.
    expect((m?.y ?? 0) + (m?.height ?? 0)).toBeLessThanOrEqual(caixa?.y ?? 0);
  } else {
    await expect(mais).toBeHidden();
  }

  // Foco visível na barra: Tab até o primeiro link das áreas.
  await areas.getByRole('link', { name: 'Recall' }).focus();
  await expect(areas.getByRole('link', { name: 'Recall' })).toBeFocused();

  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
});
