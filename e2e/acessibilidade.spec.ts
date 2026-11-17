import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './apoio';

const ROTAS = [
  '/',
  '/plano',
  '/plano/pontos',
  '/plano/tarefas',
  '/recall',
  '/recall/registrar',
  '/recall/frases',
  '/recall/erros',
  '/recall/cartoes',
  '/recall/historico',
  '/recall/revisar',
  '/recall/frases/revisar',
  '/recall/cartoes/novo',
  '/biblioteca',
  '/biblioteca/importar',
  '/biblioteca/acervo',
  '/conta',
  '/conta/aparencia',
  '/conta/perfis',
  '/conta/dados',
  '/conta/privacidade',
  '/orientacoes',
  '/sessao/atual',
  '/sessao/iniciar',
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

// Botões, links de botão, `summary` de botão, linhas de lista, navegação e seletor de arquivo: 44 px nas
// duas medidas, em todas as rotas principais (o link no meio de frase é a única exceção e não entra
// aqui). Os projetos mudam a navegação (barra de baixo, barra de cima), então a conferência roda nos
// três.
for (const rota of ROTAS) {
  test(`${rota}: alvos de toque têm pelo menos 44 px`, async ({ page }) => {
    await page.goto(`/#${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const pequenos = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          'button, a.botao, summary.botao, a.linha-lista, input[type="file"]',
        ),
      )
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
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
  expect(page.url()).not.toContain('conteudo');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
});

test('as fontes embutidas carregam (T19)', async ({ page }) => {
  await page.goto('/#/recall');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // `document.fonts.check` só vale depois de a fonte ter sido pedida: força o pedido das cinco.
  // Os títulos têm uma letra por mundo (D-D9): a Schibsted Grotesk do Dia (800) e a Familjen
  // Grotesk da Noite (700), ambas variáveis (um arquivo serve de 400 ao peso máximo).
  const carregadas = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load("400 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.load("700 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.load("400 16px 'Literata'"),
      document.fonts.load("800 16px 'Schibsted Grotesk'"),
      document.fonts.load("700 16px 'Familjen Grotesk'"),
    ]);
    // Uma família sem face declarada também passa no `check`: confere que a face de cada letra
    // dos títulos existe e carregou.
    const facesCarregadas = new Set<string>();
    document.fonts.forEach((f) => {
      if (f.status === 'loaded') facesCarregadas.add(f.family.replace(/["']/g, ''));
    });
    return [
      document.fonts.check("400 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.check("700 16px 'Atkinson Hyperlegible Next'"),
      document.fonts.check("400 16px 'Literata'"),
      document.fonts.check("800 16px 'Schibsted Grotesk'"),
      document.fonts.check("700 16px 'Familjen Grotesk'"),
      facesCarregadas.has('Schibsted Grotesk'),
      facesCarregadas.has('Familjen Grotesk'),
      facesCarregadas.has('Gabarito'),
    ];
  });
  // A Gabarito (D-D7) saiu: nenhuma face dela fica declarada.
  expect(carregadas).toEqual([true, true, true, true, true, true, true, false]);
});

test('casca do Fio: pílula dos lugares por teclado, "+" no canto do cabeçalho, sem Registrar erro repetido e atalho E (P2, D-D23)', async ({
  page,
}) => {
  // Numa tela que ainda mora na casca de antes do quadro (o Fixar): o cabeçalho leva o Menu, a marca, a Ajuda e o "+".
  await page.goto('/#/recall');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const lugares = page.getByRole('navigation', { name: 'Lugares' });
  await expect(lugares.getByRole('link')).toHaveText(['Agora', 'Destino', 'Varal']);

  // O "+" (D-D23) fica no canto do cabeçalho, à direita do Menu, em qualquer largura; o cabeçalho não repete o
  // "Registrar erro" (ele mora no painel do "+" e na tecla E); Menu e Ajuda em qualquer largura.
  const topo = page.getByRole('banner');
  const mais = page.getByRole('button', { name: 'Novo registro' });
  await expect(mais).toBeVisible();
  // Com o menu lateral (a partir de 768 px) o ☰ do cabeçalho não existe: o Menu mora na lateral.
  const menu = topo.getByRole('link', { name: 'Menu: sua conta e ajustes' });
  const comLateral = page.viewportSize()!.width >= 768;
  await (comLateral ? expect(menu).toBeHidden() : expect(menu).toBeVisible());
  await expect(topo.getByRole('button', { name: 'Ajuda', exact: true })).toBeVisible();
  const m = await mais.boundingBox();
  if (!m) throw new Error('sem caixa do +');
  if (!comLateral) {
    const c = await menu.boundingBox();
    if (!c) throw new Error('sem caixa do Menu');
    expect(m.x).toBeGreaterThanOrEqual(c.x + c.width);
  }
  await expect(topo.getByRole('link', { name: 'Registrar erro' })).toHaveCount(0);

  // Foco visível nos lugares.
  await lugares.getByRole('link', { name: 'Varal' }).focus();
  await expect(lugares.getByRole('link', { name: 'Varal' })).toBeFocused();

  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
});

// A pílula dos lugares nunca cobre texto no fim da página: a rolagem reserva a altura dela.
for (const rota of ['/', '/plano', '/recall', '/biblioteca', '/conta/dados', '/orientacoes']) {
  test(`${rota}: a pílula dos lugares não cobre texto no fim da página`, async ({ page }) => {
    await page.goto(`/#${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // A tela de carregamento sai no quadro em que a casca aparece, mas esmaece 200 ms ainda na árvore: o texto
    // dela ("Tentar de novo") contaria como coberto.
    await expect(page.locator('#carregamento')).toHaveCount(0);
    const cobertos = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const abas = document.querySelector('nav[aria-label="Lugares"]');
      if (!abas) return ['(sem pílula)'];
      const a = abas.getBoundingClientRect();
      // O conteúdo de um `<details>` fechado não é desenhado (só o `<summary>` dele), mas ainda tem
      // caixa; vale para cada `<details>` fechado em volta (o prompt da IA, na Trilha vazia).
      const fechado = (el: Element) => {
        for (
          let d = el.closest('details:not([open])');
          d;
          d = d.parentElement?.closest('details:not([open])') ?? null
        ) {
          if (el.closest('summary')?.parentElement !== d) return true;
        }
        return false;
      };
      const achados = new Set<string>();
      // 4 = NodeFilter.SHOW_TEXT
      const passeio = document.createTreeWalker(document.body, 4);
      for (let no = passeio.nextNode(); no; no = passeio.nextNode()) {
        const texto = (no.textContent ?? '').trim();
        const pai = no.parentElement;
        if (!texto || abas.contains(no) || !pai || pai.closest('.visualmente-oculto')) continue;
        if (fechado(pai)) continue;
        const faixa = document.createRange();
        faixa.selectNodeContents(no);
        for (const c of faixa.getClientRects()) {
          if (
            c.width > 1 &&
            c.left < a.right &&
            c.right > a.left &&
            c.top < a.bottom &&
            c.bottom > a.top
          )
            achados.add(texto.replace(/\s+/g, ' ').slice(0, 28));
        }
      }
      return Array.from(achados);
    });
    expect(cobertos).toEqual([]);
  });
}
