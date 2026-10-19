import type { Page } from '@playwright/test';
import { expect, importarEPublicar, test } from './apoio';

// O trilho de ferramentas do Leitor (D-D7, P7): a partir de 1200 px o dock sai do canto de baixo e
// fica na margem da direita, ao lado da coluna de lei e abaixo do cabeçalho; abaixo disso volta ao
// canto. O E2E do Leitor só pergunta se os botões estão à vista; aqui se mede onde.

const ALTURA = 800;

interface Caixa {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

const caixa = (page: Page, seletor: string) =>
  page
    .locator(seletor)
    .first()
    .evaluate((el): Caixa => {
      const r = el.getBoundingClientRect();
      return { esquerda: r.left, direita: r.right, topo: r.top, base: r.bottom };
    });

async function abrirALep(page: Page) {
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Art. 1º' })).toBeVisible();
}

test('o trilho: a partir de 1200 px as ferramentas ficam ao lado do texto; abaixo disso, no canto', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'o tamanho da janela é do teste; basta um projeto');
  test.setTimeout(120_000);
  await abrirALep(page);

  for (const largura of [1200, 1280, 1920]) {
    await page.setViewportSize({ width: largura, height: ALTURA });
    await expect
      .poll(
        async () =>
          (await caixa(page, '.acoes-leitor')).esquerda >=
          (await caixa(page, '.lista-leitor')).direita,
        { message: `trilho ao lado do texto a ${String(largura)}` },
      )
      .toBe(true);
    const trilho = await caixa(page, '.acoes-leitor');
    const cabecalho = await caixa(page, '.topo');
    expect(trilho.direita, `dentro da tela a ${String(largura)}`).toBeLessThanOrEqual(largura);
    expect(trilho.topo, `abaixo do cabeçalho a ${String(largura)}`).toBeGreaterThanOrEqual(
      cabecalho.base,
    );
    expect(trilho.base, `acima do pé a ${String(largura)}`).toBeLessThanOrEqual(ALTURA);
  }

  // Um pixel abaixo da folga, o dock volta ao canto de baixo, na direita (o celular e o tablet).
  await page.setViewportSize({ width: 1199, height: ALTURA });
  await expect
    .poll(async () => (await caixa(page, '.acoes-leitor')).base, {
      message: 'dock no canto a 1199',
    })
    .toBeGreaterThan(ALTURA - 40);
  expect((await caixa(page, '.acoes-leitor')).direita).toBeGreaterThan(1199 - 40);
});

test('o aviso da Estrela, mesmo o mais longo, cabe no trilho', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'o tamanho da janela é do teste; basta um projeto');
  test.setTimeout(120_000);
  await abrirALep(page);
  await page.setViewportSize({ width: 1280, height: ALTURA });

  await page.locator('[data-endereco="art1"]').hover();
  await page.getByRole('button', { name: /^Estrela: Art\. 1º/ }).click();
  const aviso = page.locator('.aviso-da-estrela');
  await expect(aviso).toHaveText(/estrela direta/);
  // A frase mais longa que o app diz (uma exceção dentro de uma Seção estrelada, 45 letras): pôr
  // aquela situação exigiria rolar até uma Seção com artigos; o que se mede aqui é o espaço.
  const span = aviso.locator('span');
  await span.evaluate((el) => {
    el.textContent = 'Art. 11: exceção: fora da estrela de Seção I.';
  });
  const trilho = await caixa(page, '.acoes-leitor');
  const dele = await span.evaluate((el): Caixa => {
    const r = el.getBoundingClientRect();
    return { esquerda: r.left, direita: r.right, topo: r.top, base: r.bottom };
  });
  expect(dele.esquerda).toBeGreaterThanOrEqual(trilho.esquerda - 1);
  expect(dele.direita).toBeLessThanOrEqual(trilho.direita + 1);
  expect(dele.direita).toBeLessThanOrEqual(1280);
});
