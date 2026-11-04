import type { Page } from '@playwright/test';
import { expect, semViolacoesNoFio, test } from './apoio';

// O pouso em cena do Arretado novo (prévia do Fio, D-D25), o do mockup aprovado: o Zé diante de um lugar da vereda,
// as pílulas dos pousos da volta e a saída (descansar ou puxar o fio). O jsdom não mede layout nem cor e não
// anima; aqui o navegador confere que a cena cabe e se desenha (a animação roda), que o ponto de seguir é um alvo
// de toque de verdade e responde ao arrasto, que "descansar" volta ao Agora e que a tela passa no axe nos dois
// mundos.

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
  await page.getByRole('button', { name: /Puxar o fio/ }).click();
  await page.getByRole('button', { name: 'Pular este passo' }).click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Sombra de juazeiro. Pode descansar.' }),
  ).toBeVisible();
}

const noDePuxar = (page: Page) => page.getByRole('button', { name: /Puxar o fio: seguir/ });

/** Quantas animações rodam agora (as que acabaram com `fill: both` seguem na lista e não contam). */
const rodando = (page: Page) =>
  page.evaluate(
    () =>
      document.getAnimations().filter(
        (a) =>
          a.playState === 'running' &&
          // O Zé respira por uns 10 s depois de pronto; isso não atrapalha nada e não se espera.
          !(a.effect as KeyframeEffect | null)?.target?.classList.contains('m-respira'),
      ).length,
  );

/** Espera as animações de entrada (a cena se desenha, o ponto chega do alto) terminarem. */
const assentar = (page: Page) => expect.poll(() => rodando(page), { timeout: 15_000 }).toBe(0);

/** A cena cabe na largura; a saída (descansar, o ponto e a dica) fica à vista, sem rolar e sem a nav. */
async function conferirACenaEASaida(page: Page, largura: number, altura: number) {
  await page.setViewportSize({ width: largura, height: altura });
  // A nav dos três lugares não existe no pouso: a saída é o fio ou descansar.
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toHaveCount(0);

  const cena = page.locator('svg.m-cena');
  const caixaDaCena = await cena.boundingBox();
  const caixaDoQuadro = await page.locator('.m-app').boundingBox();
  if (!caixaDaCena || !caixaDoQuadro) throw new Error('sem caixa da cena');
  expect(caixaDaCena.x).toBeGreaterThanOrEqual(caixaDoQuadro.x - 1);
  expect(caixaDaCena.x + caixaDaCena.width).toBeLessThanOrEqual(
    caixaDoQuadro.x + caixaDoQuadro.width + 1,
  );
  // O desenho do Zé fica dentro da cena, de pé no chão dela.
  const caixaDoZe = await cena.locator('.m-ze-linha').boundingBox();
  if (!caixaDoZe) throw new Error('sem caixa do Zé');
  expect(caixaDoZe.y).toBeGreaterThanOrEqual(caixaDaCena.y);
  expect(caixaDoZe.y + caixaDoZe.height).toBeLessThanOrEqual(
    caixaDaCena.y + caixaDaCena.height + 1,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  // O ponto, a lua e a dica ficam no quadro; o ponto e a lua são alvos de toque de 44 px ou mais.
  const [caixaDoNo, caixaDaLua, caixaDaDica] = await Promise.all([
    noDePuxar(page).boundingBox(),
    page.getByRole('button', { name: 'Descansar por hoje' }).boundingBox(),
    page.getByText('puxe para seguir').boundingBox(),
  ]);
  if (!caixaDoNo || !caixaDaLua || !caixaDaDica) throw new Error('sem caixa da saída');
  const fundo = caixaDoQuadro.y + caixaDoQuadro.height;
  expect(caixaDoNo.y + caixaDoNo.height).toBeLessThanOrEqual(fundo);
  expect(caixaDaLua.y + caixaDaLua.height).toBeLessThanOrEqual(fundo);
  expect(caixaDaDica.y + caixaDaDica.height).toBeLessThanOrEqual(fundo + 1);
  expect(caixaDoNo.width).toBeGreaterThanOrEqual(44);
  expect(caixaDoNo.height).toBeGreaterThanOrEqual(44);
  expect(caixaDaLua.width).toBeGreaterThanOrEqual(44);
  expect(caixaDaLua.height).toBeGreaterThanOrEqual(44);
}

test('a cena do pouso se desenha, a saída fica à vista sem a nav e a tela passa no axe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await noPrimeiroPouso(page);

  // O Zé se traça e o jardim brota: a cena tem animação de verdade rodando logo ao chegar.
  expect(await rodando(page)).toBeGreaterThan(0);
  await assentar(page);
  await expect(page.getByText('Pouso 1 · Juazeiro')).toBeVisible();
  await expect(page.locator('svg.m-cena')).toHaveAttribute('data-lugar', 'Juazeiro');
  await expect(page.locator('svg.m-cena .m-flor')).toHaveCount(1);

  await conferirACenaEASaida(page, 360, 640);
  await semViolacoesNoFio(page);
  await conferirACenaEASaida(page, 1280, 800);
});

test('arrastar o ponto além de 28 px segue para o Agora; um arrasto curto o devolve', async ({
  page,
}) => {
  await noPrimeiroPouso(page);
  await assentar(page);
  const no = noDePuxar(page);
  await no.scrollIntoViewIfNeeded();
  const caixa = await no.boundingBox();
  if (!caixa) throw new Error('sem caixa do ponto');
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;

  // Um arrasto curto (15 px) volta ao lugar na mola e a pessoa continua no pouso.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 15, { steps: 4 });
  await page.mouse.up();
  // A volta é uma mola de 380 ms feita quadro a quadro (não é uma animação da lista do navegador): espera ela.
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
  await expect(page.getByRole('button', { name: /Puxar o fio: começar/ })).toBeVisible();
});

test('descansar volta ao Agora, que fecha o dia com a frase gentil', async ({ page }) => {
  await noPrimeiroPouso(page);
  await page.getByRole('button', { name: 'Descansar por hoje' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page.getByText('É caminhando que se faz o caminho. Parabéns pelos passos que deu hoje.'),
  ).toBeVisible();
  // Fora do pouso a nav dos três lugares volta.
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await semViolacoesNoFio(page);
});

test('o teclado segue: Enter no ponto de seguir leva ao Agora', async ({ page }) => {
  await noPrimeiroPouso(page);
  await noDePuxar(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/$/);
});

test('o pouso respeita o pedido de menos movimento: a cena aparece sem o balanço do Zé', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await noPrimeiroPouso(page);
  await assentar(page);
  // No modo calmo o mockup troca mola e deslocamento por esmaecer; a cena e a saída continuam todas lá.
  await expect(page.locator('svg.m-cena .m-ze-linha')).toBeVisible();
  await expect(noDePuxar(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descansar por hoje' })).toBeVisible();
});
