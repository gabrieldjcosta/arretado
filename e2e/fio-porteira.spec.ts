import type { Page } from '@playwright/test';
import { expect, semViolacoesNoFio, test } from './apoio';
import { servir } from './lep-com-mapa';

// A folha da porteira (C2e): tocar numa porteira pronta do Destino abre a folha com o deque de certo ou errado; ao fim,
// "Ver no meu fio" fecha a folha e a porteira passa a aberta, girando na mola.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

async function comALeiLida(page: Page) {
  await servir(page);
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();

  await page.goto('/#/biblioteca/acervo');
  await page.getByRole('button', { name: /^LEP/ }).click();
  await page.getByRole('button', { name: /^Adicionar 1 / }).click();
  await expect(page.getByText(/1 adicionada\./)).toBeVisible();
  await page.getByRole('link', { name: 'Normas', exact: true }).click();
  await page
    .getByRole('region', { name: 'Normas' })
    .getByRole('link', { name: /LEP/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await page.keyboard.press('End');
  await page.waitForTimeout(800);
  await page.keyboard.press('End');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Lido até aqui' }).click();
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.goto('/#/');
}

// CAPTURA=<pasta> guarda as fotos da folha (inicio e fim) para pôr ao lado do mockup.
const CAPTURA = process.env.CAPTURA;
const foto = async (page: Page, nome: string) => {
  if (!CAPTURA) return;
  for (const [tema, rotulo] of [
    ['dark', 'noite'],
    ['light', 'dia'],
  ] as const) {
    await page.emulateMedia({ colorScheme: tema });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${CAPTURA}/app-${rotulo}-${nome}.png` });
  }
};

test('a porteira pronta abre a folha e passa', async ({ page }, info) => {
  test.setTimeout(180_000);
  await comALeiLida(page);
  await page.getByRole('button', { name: /Destino/ }).click();
  const porta = page.getByRole('button', {
    name: 'Porteira de Execução Penal: pronta para você',
  });
  await expect(porta).toBeVisible({ timeout: 15_000 });
  await porta.click();

  const folha = page.getByRole('dialog');
  await expect(folha.getByRole('heading', { name: 'Certo ou errado?' })).toBeVisible();
  await foto(page, `${info.project.name}-1-deque`);
  await semViolacoesNoFio(page);

  // Responde o deque até a folha oferecer "Ver no meu fio".
  const ver = folha.getByRole('button', { name: 'Ver no meu fio' });
  for (let i = 0; i < 12 && !(await ver.isVisible()); i += 1) {
    const certo = folha.getByRole('button', { name: 'Certo', exact: true });
    if (await certo.isVisible()) await certo.click();
    else await page.waitForTimeout(250);
    await page.waitForTimeout(400);
  }
  await expect(ver).toBeVisible();
  await foto(page, `${info.project.name}-2-fim`);
  await ver.click();
  await expect(folha).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Porteira de Execução Penal: aberta' }),
  ).toBeVisible();
});
