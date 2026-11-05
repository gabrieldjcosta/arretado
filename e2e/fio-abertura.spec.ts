import type { Page } from '@playwright/test';
import { expect, pularAAbertura, semViolacoesNoFio, test } from './apoio';

// A abertura e a prova do Arretado novo (docs/design/fio/mockup-aprovado.html, telas `abertura` e `prova`): o ponto
// de luz quica de letra em letra escrevendo o nome, vira o ponto do cacto e um fio o leva, como um pêndulo, até a
// tela seguinte. Os testes de unidade não têm layout nem animação; aqui o navegador confere que a abertura roda, que
// um toque a pula, que ela termina na tela certa (a prova, para quem não escolheu nenhuma; o Agora, para quem já)
// e que a prova passa no axe e na medida de contraste nos dois mundos. Este arquivo desliga a semeadura que cala a
// abertura nos outros testes (ver `apoio.ts`): a primeira vez no aparelho é a de verdade.
test.use({ semearEscrita: false });

const CHAVE_DA_ESCRITA = 'arretado:escrita-do-nome:v1';
const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

const abertura = (page: Page) => page.locator('.m-abertura');
const pergunta = (page: Page) =>
  page.getByRole('heading', { level: 1, name: 'Pra qual prova você estuda?' });

/** Abre o app já com o Arretado novo ligado, como quem recebeu o link da prévia. */
async function abrirNoFio(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('arretado:interface', 'fio');
    } catch {
      /* sem armazenamento */
    }
  });
  await page.goto('/');
}

test('a abertura roda sobre o quadro, sem nav nem "+", e leva a quem não tem prova à pergunta', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await abrirNoFio(page);

  await expect(abertura(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'arretado' })).toBeVisible();
  await expect(page.getByText('Toque para pular')).toBeVisible();
  // Como no mockup: a nav e o "+" só existem nas telas seguintes.
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Guardar um erro/ })).toHaveCount(0);
  // O ponto de luz anda pelo quadro e deixa o rastro.
  await expect(page.locator('.m-voo-ponto')).toHaveCount(1);
  await expect(page.locator('.m-rastro g').first()).toBeAttached();

  // No fim, o ponto pousa no primeiro nó da pergunta e não sobra nada da abertura no quadro.
  await expect(pergunta(page)).toBeVisible({ timeout: 25_000 });
  await expect(abertura(page)).toHaveCount(0);
  await expect(page.locator('.m-voo-ponto')).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator('.m-voo-fio')).toHaveCount(0, { timeout: 5_000 });
  await expect(page).toHaveURL(/#\/fio\/prova$/);
  // A prova não leva a nav (cobriria o fim dela) e o foco vai ao título, como no mockup.
  await expect(page.locator('.m-nav')).toHaveCount(0);
  await expect(pergunta(page)).toBeFocused();
  await expect(page.getByRole('button')).toHaveText([
    'DefensoriaSP, banca FCC',
    'Magistraturaestadual e federal',
    'Ministério Públicoestadual',
    'Ainda não seicomeço pelo que mais cai',
  ]);
  // A abertura contou como vista: a próxima abertura do mesmo Dia não a repete inteira.
  const guardado = await page.evaluate((c) => localStorage.getItem(c), CHAVE_DA_ESCRITA);
  expect(guardado).toContain('"dia"');
});

test('um toque pula a abertura e leva à pergunta, sem voo', async ({ page }) => {
  await abrirNoFio(page);
  await expect(abertura(page)).toBeVisible();
  await abertura(page).click();
  await expect(pergunta(page)).toBeVisible();
  await expect(abertura(page)).toHaveCount(0);
  await expect(page.locator('.m-voo-ponto')).toHaveCount(0);
});

test('qualquer tecla também pula', async ({ page }) => {
  await abrirNoFio(page);
  await expect(abertura(page)).toBeVisible();
  await page.keyboard.press('Shift');
  await expect(pergunta(page)).toBeVisible();
  await expect(abertura(page)).toHaveCount(0);
});

test('a prova: escolher acende o nó e segue para as normas da carreira', async ({ page }) => {
  await abrirNoFio(page);
  await abertura(page).click();
  await expect(pergunta(page)).toBeVisible();
  const defensoria = page.getByRole('button', { name: /^Defensoria/ });
  await defensoria.click();
  await expect(defensoria).toHaveClass(/m-escolhida/);
  await expect(page).toHaveURL(/#\/comecar\/defensoria-publica$/);
});

test('a prova passa no axe e na medida de contraste, de noite e de dia', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await abrirNoFio(page);
  await abertura(page).click();
  await expect(pergunta(page)).toBeVisible();
  await semViolacoesNoFio(page);
});

test('quem já tem prova vê a abertura terminar no Agora, com a marca no lugar e o fio à mão', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  // Traz uma matéria pelo edital com a interface de sempre (a abertura de antes é pulada com uma tecla).
  await page.goto('/#/plano');
  await pularAAbertura(page);
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();
  // Um aparelho em que o nome ainda não foi escrito, agora no Arretado novo.
  await page.evaluate((chave) => {
    localStorage.removeItem(chave);
    localStorage.setItem('arretado:interface', 'fio');
  }, CHAVE_DA_ESCRITA);
  await page.goto('/');
  await page.reload();

  await expect(abertura(page)).toBeVisible();
  await expect(page.getByRole('button', { name: /Puxar o fio/ })).toBeVisible({ timeout: 25_000 });
  await expect(abertura(page)).toHaveCount(0);
  await expect(page.locator('.m-voo-ponto')).toHaveCount(0, { timeout: 5_000 });
  await expect(page.getByRole('button', { name: 'arretado: sua conta e ajustes' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await expect(page.getByText('da prova é seu')).toBeVisible();
  await expect(pergunta(page)).toHaveCount(0);
  await semViolacoesNoFio(page);
});

test('nas aberturas de rotina a mesma coreografia vai mais depressa (uns 4 s), legível até o fim', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  // Um aparelho que já viu a abertura inteira em outro Dia: a primeira de hoje é a de rotina.
  await page.addInitScript((chave) => {
    localStorage.setItem(chave, '{"dia":"2026-01-01"}');
  }, CHAVE_DA_ESCRITA);
  await abrirNoFio(page);
  await expect(abertura(page)).toBeVisible();
  const comeco = Date.now();
  await expect(page.getByText('Tecendo seu destino,')).toBeVisible({ timeout: 6_000 });
  await expect(pergunta(page)).toBeVisible({ timeout: 9_000 });
  expect(Date.now() - comeco).toBeLessThan(9_000);
  await expect(abertura(page)).toHaveCount(0);
  await expect(page.locator('.m-voo-ponto')).toHaveCount(0, { timeout: 3_000 });
});
