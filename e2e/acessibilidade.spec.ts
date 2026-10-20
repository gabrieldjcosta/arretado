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
          'button, a.botao, summary.botao, a.linha-lista, .areas a, input[type="file"]',
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

test('casca: abas por teclado, "+" no título, Registrar erro a partir de 900 px e atalho E (P2)', async ({
  page,
}) => {
  await page.goto('/');
  const titulo = page.getByRole('heading', { level: 1, name: 'Hoje' });
  await expect(titulo).toBeVisible();
  const largura = page.viewportSize()?.width ?? 1280;
  const altura = page.viewportSize()?.height ?? 0;
  const areas = page.getByRole('navigation', { name: 'Áreas' });
  await expect(areas.getByRole('link')).toHaveText(['Hoje', 'Trilha', 'Fixar', 'Biblioteca']);

  const caixa = await areas.boundingBox();
  if (largura < 900) {
    // Abas embaixo (celular e tablet em pé), presas à borda, com os 80 px da prancha (D-D9, Q2).
    expect(caixa?.y ?? 0).toBeGreaterThan(altura / 2);
    expect(Math.round((caixa?.y ?? 0) + (caixa?.height ?? 0))).toBe(altura);
    expect(Math.round(caixa?.height ?? 0)).toBe(80);
  } else {
    expect(caixa?.y ?? 0).toBeLessThan(altura / 2);
  }

  // O "+" fica na linha do título, à direita dele, em qualquer largura.
  const mais = page.getByRole('link', { name: 'Novo registro de erro' });
  await expect(mais).toBeVisible();
  const t = await titulo.boundingBox();
  const m = await mais.boundingBox();
  if (!t || !m) throw new Error('sem caixa do título ou do +');
  expect(Math.abs(t.y + t.height / 2 - (m.y + m.height / 2))).toBeLessThan(12);
  expect(m.x).toBeGreaterThan(t.x + t.width);

  // "Registrar erro" no cabeçalho só a partir de 900 px; Conta e Ajuda em qualquer largura.
  const topo = page.getByRole('banner');
  const noCabecalho = topo.getByRole('link', { name: 'Registrar erro' });
  if (largura < 900) await expect(noCabecalho).toBeHidden();
  else await expect(noCabecalho).toBeVisible();
  await expect(topo.getByRole('link', { name: 'Conta e ajustes' })).toBeVisible();
  await expect(topo.getByRole('button', { name: 'Ajuda', exact: true })).toBeVisible();

  // Foco visível nas abas.
  await areas.getByRole('link', { name: 'Fixar' }).focus();
  await expect(areas.getByRole('link', { name: 'Fixar' })).toBeFocused();

  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { level: 1, name: 'Registrar erro' })).toBeVisible();
});

// Casca da D-D9 (Q2): o lockup parado no cabeçalho (144 px), o "+" de 48 px e o traço de caneta embaixo da
// aba atual. O traço é só CSS (máscara colorida pelo token `--luz` do mundo): vive na aba da rota atual,
// na cor da tinta de dia e da luz de noite, e muda de aba junto com a rota.
for (const [esquema, cor] of [
  ['light', 'rgb(15, 28, 58)'],
  ['dark', 'rgb(242, 246, 255)'],
] as const) {
  test.describe(`casca da D-D9 (Q2) — tema ${esquema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: esquema });
    test('lockup, "+" de 48 px e traço da aba atual', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();

      const lockup = await page
        .getByRole('banner')
        .getByRole('link', { name: 'Arretado, início' })
        .locator('svg.lockup')
        .boundingBox();
      expect(Math.round(lockup?.width ?? 0)).toBe(144);
      const mais = await page.getByRole('link', { name: 'Novo registro de erro' }).boundingBox();
      expect([Math.round(mais?.width ?? 0), Math.round(mais?.height ?? 0)]).toEqual([48, 48]);

      const areas = page.getByRole('navigation', { name: 'Áreas' });
      const traco = (aba: string) =>
        areas.getByRole('link', { name: aba }).evaluate((a) => {
          const c = getComputedStyle(a, '::after');
          return {
            conteudo: c.content,
            largura: c.width,
            altura: c.height,
            cor: c.backgroundColor,
            mascara: c.maskImage,
          };
        });
      const atual = await traco('Hoje');
      expect(atual).toMatchObject({ conteudo: '""', largura: '30px', altura: '6px', cor });
      expect(atual.mascara).toContain('data:image/svg+xml');
      for (const outra of ['Trilha', 'Fixar', 'Biblioteca']) {
        expect(['none', 'normal']).toContain((await traco(outra)).conteudo);
      }

      await areas.getByRole('link', { name: 'Trilha' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Trilha' })).toBeVisible();
      expect((await traco('Trilha')).largura).toBe('30px');
      expect(['none', 'normal']).toContain((await traco('Hoje')).conteudo);
    });
  });
}

// As abas de baixo (até 899 px) nunca cobrem texto no fim da página: a rolagem reserva a altura delas.
for (const rota of ['/', '/plano', '/recall', '/biblioteca', '/conta/dados', '/orientacoes']) {
  test(`${rota}: as abas não cobrem texto no fim da página`, async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1280) >= 900, 'as abas só ficam embaixo até 899 px');
    await page.goto(`/#${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const cobertos = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const abas = document.querySelector('nav.areas');
      if (!abas) return ['(sem abas)'];
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
