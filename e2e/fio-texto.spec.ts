import type { Locator, Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoesNoFio, test } from './apoio';

// O "Texto bem maior" da Conta cresce o Fio inteiro (desvio 44). Onde o aperto é maior, a 360 px e de noite: o Agora, a
// folha de guardar um erro e a própria Conta. Nada rola de lado, nenhum chip ou botão sai da folha, e o "Pendurar"
// continua alcançável rolando; o folheto ainda voa até o Varal.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

async function comALeiNaPrevia(page: Page) {
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('button', { name: 'Mudar disciplina de LEP' }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Execução Penal' }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Disciplina de LEP atualizada.')).toBeVisible();
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByRole('button', { name: /Puxar o fio/ })).toBeVisible();
}

test.use({ viewport: { width: 360, height: 740 }, colorScheme: 'dark' });

async function semRolagemLateral(alvo: Locator) {
  await expect.poll(() => alvo.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
}

/** Nenhum botão da folha passa da borda dela (os chips quebram em outra linha em vez de sair). */
async function nadaForaDaFolha(folha: Locator) {
  const fora = await folha.evaluate((f) => {
    const caixa = f.getBoundingClientRect();
    return [...f.querySelectorAll<HTMLElement>('button, a, input, textarea')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > caixa.right + 1 || r.left < caixa.left - 1);
      })
      .map((e) => e.textContent.trim() || e.getAttribute('aria-label') || e.tagName);
  });
  expect(fora).toEqual([]);
}

async function capturar(page: Page, nome: string) {
  const pasta = process.env.CAPTURA;
  if (!pasta) return;
  await expect(page.locator('.m-toast.m-on')).toHaveCount(0, { timeout: 8_000 });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.locator('#conteudo').screenshot({ path: `${pasta}/app-noite-360-${nome}.png` });
}

test('com o Texto bem maior, a 360 px, o Agora, a folha de erro e a Conta cabem e o folheto voa', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await comALeiNaPrevia(page);

  // A pessoa escolhe o Texto bem maior na Conta, como de verdade.
  await page.getByRole('button', { name: 'Menu: sua conta e ajustes' }).click();
  const conta = page.getByRole('dialog');
  await conta.getByRole('button', { name: 'Texto bem maior' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-texto-fio', 'bem-maior');
  await capturar(page, 'c-conta');
  await semRolagemLateral(conta.locator('.m-corpo'));
  await nadaForaDaFolha(conta);
  for (const chips of await conta.locator('.m-chips').all()) await semRolagemLateral(chips);
  await conta.getByRole('button', { name: 'Fechar' }).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // O Agora: o ponto e o cartão "Na ponta do fio".
  await expect(page.getByRole('group', { name: 'Na ponta do fio' })).toBeVisible();
  await capturar(page, 'a-agora');
  await semRolagemLateral(page.locator('#conteudo'));

  // A folha de guardar um erro: o campo, os chips e o "Pendurar no varal" (alcançável rolando).
  await page.getByRole('button', { name: /Guardar um erro/ }).click();
  const folha = page.getByRole('dialog');
  await folha.getByRole('textbox').fill('Primário sem violência: 16% da pena.');
  await capturar(page, 'b-erro');
  await semRolagemLateral(folha.locator('.m-corpo'));
  await nadaForaDaFolha(folha);
  const pendurar = folha.getByRole('button', { name: /Pendurar no varal/ });
  await pendurar.scrollIntoViewIfNeeded();
  await expect(pendurar).toBeInViewport();
  await semViolacoesNoFio(page);

  // O folheto voa até o Varal e a Frase fica guardada.
  await pendurar.click();
  await expect(page.locator('.m-voa-folheto')).toBeAttached();
  await expect(page.getByText(/Pendurada no varal/)).toBeVisible();
  await expect(page.locator('.m-voa-folheto')).toHaveCount(0, { timeout: 5_000 });
});
