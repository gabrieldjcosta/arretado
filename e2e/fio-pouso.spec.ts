import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// O pouso em cena do Arretado novo (prévia do Fio, D-D25): o Zé diante de um lugar da vereda, as pílulas dos pousos
// da volta e a saída (descansar ou puxar o fio). O jsdom não mede layout nem cor; aqui o navegador confere que a cena
// cabe na tela, que o nó de puxar é um alvo de toque de verdade e responde ao arrasto, que "descansar" volta ao
// Agora e que a tela passa no axe nos dois mundos.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/** Edital pelo CSV, prévia ligada e a primeira etapa pulada: o pouso 1, o do juazeiro. */
async function noPrimeiroPouso(page: Page) {
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
  await page.goto('/#/');
  await page.getByRole('button', { name: /Puxe o fio/ }).click();
  await page
    .getByRole('region', { name: 'Passo do Fio' })
    .getByRole('button', { name: 'Pular este passo' })
    .click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sombra de juazeiro. Pode descansar.' }),
  ).toBeVisible();
}

const noDePuxar = (page: Page) => page.getByRole('button', { name: /seguir para o próximo passo/ });

/** A cena é de 3 por 2 e tem de 200 a 420 px de altura (40% da tela); a saída fica à vista, sem rolar e sem a pílula. */
async function conferirACenaEASaida(page: Page, largura: number, altura: number) {
  await page.setViewportSize({ width: largura, height: altura });
  // A pílula dos três lugares some no pouso: a saída é o fio ou descansar.
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toHaveCount(0);

  const cena = page.locator('.fio-cena');
  const caixaDaCena = await cena.boundingBox();
  if (!caixaDaCena) throw new Error('sem caixa da cena');
  expect(caixaDaCena.x).toBeGreaterThanOrEqual(0);
  expect(caixaDaCena.x + caixaDaCena.width).toBeLessThanOrEqual(largura);
  expect(Math.abs(caixaDaCena.width / caixaDaCena.height - 1.5)).toBeLessThan(0.02);
  expect(caixaDaCena.height).toBeLessThanOrEqual(Math.min(Math.max(200, 0.4 * altura), 420) + 1);
  // O Zé fica de pé no chão da cena.
  const caixaDoZe = await cena.locator('.fio-cena-ze').boundingBox();
  if (!caixaDoZe) throw new Error('sem caixa do Zé');
  expect(caixaDoZe.y + caixaDoZe.height).toBeLessThanOrEqual(
    caixaDaCena.y + caixaDaCena.height + 1,
  );
  expect(caixaDoZe.y).toBeGreaterThanOrEqual(caixaDaCena.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  // O nó, a lua e a dica ficam à vista sem rolar; o nó e a lua são alvos de toque de 44 px ou mais.
  const caixaDoNo = await noDePuxar(page).boundingBox();
  const caixaDaLua = await page.getByRole('button', { name: 'Descansar por hoje' }).boundingBox();
  const caixaDaDica = await page.getByText('Puxe para seguir').boundingBox();
  if (!caixaDoNo || !caixaDaLua || !caixaDaDica) throw new Error('sem caixa da saída');
  expect(caixaDoNo.y + caixaDoNo.height).toBeLessThanOrEqual(altura);
  expect(caixaDaLua.y + caixaDaLua.height).toBeLessThanOrEqual(altura);
  expect(caixaDaDica.y + caixaDaDica.height).toBeLessThanOrEqual(altura);
  expect(caixaDoNo.width).toBeGreaterThanOrEqual(44);
  expect(caixaDoNo.height).toBeGreaterThanOrEqual(44);
  expect(caixaDaLua.width).toBeGreaterThanOrEqual(44);
  expect(caixaDaLua.height).toBeGreaterThanOrEqual(44);
}

test('a cena do pouso cabe, a saída fica à vista sem a pílula e a tela passa no axe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await noPrimeiroPouso(page);

  await conferirACenaEASaida(page, 360, 640);
  await semViolacoes(page);
  await conferirACenaEASaida(page, 1280, 800);
});

test('arrastar o nó além de 28 px segue para o Agora; um arrasto curto o devolve', async ({
  page,
}) => {
  await noPrimeiroPouso(page);
  const no = noDePuxar(page);
  await no.scrollIntoViewIfNeeded();
  // O nó chega depois da cena (0,9 s de espera e 0,7 s de descida).
  await page.waitForTimeout(1800);
  const caixa = await no.boundingBox();
  if (!caixa) throw new Error('sem caixa do nó');
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;

  // Um arrasto curto (15 px) volta ao lugar e a pessoa continua no pouso.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 15, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  const depois = await no.boundingBox();
  expect(Math.abs((depois?.y ?? 0) - caixa.y)).toBeLessThan(2);

  // Além de 28 px, puxa: a etapa conta e o Agora volta com o fio solto.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 50, { steps: 6 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('button', { name: /Puxe o fio/ })).toBeVisible();
});

test('descansar volta ao Agora, que diz que está tudo salvo', async ({ page }) => {
  await noPrimeiroPouso(page);
  await page.getByRole('button', { name: 'Descansar por hoje' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('Tudo salvo. O fio te espera aqui.')).toBeVisible();
  // Fora do pouso a pílula dos três lugares volta.
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await semViolacoes(page);
});

test('o teclado segue: Enter no nó de puxar leva ao Agora', async ({ page }) => {
  await noPrimeiroPouso(page);
  await noDePuxar(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/$/);
});
