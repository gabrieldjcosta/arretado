import { expect, test } from './apoio';

const DIA = 86_400_000;

test('registrar → cartão → revisar no dia seguinte, sem sair do aparelho', async ({
  page,
  baseURL,
}) => {
  // 6.12: nenhuma requisição para fora do próprio app.
  const externas: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(baseURL ?? 'http://localhost')) externas.push(r.url());
  });
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();

  // Captura em menos de 30 s (Parte 2 §17), pelo botão global.
  const t0 = Date.now();
  await page.getByRole('link', { name: 'Registrar erro' }).click();
  await page.getByLabel('O que foi').fill('Confundi livramento condicional com progressão');
  await page.getByRole('button', { name: 'Errei' }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Erro registrado.')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(30_000);

  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByText(/Cartão criado/)).toBeVisible();
  await page.getByRole('link', { name: 'Completar este erro' }).click();
  await page.getByLabel('Frase correta').fill('Livramento exige requisitos do art. 83 do CP.');
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();

  // Dia seguinte: o cartão está na fila.
  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/');
  await expect(page.getByText('1 cartão para revisar.')).toBeVisible();
  await page.getByRole('link', { name: 'Revisar', exact: true }).click();
  await expect(page.getByText('Confundi livramento condicional com progressão')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Livramento exige requisitos do art. 83 do CP.')).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();

  // Lista passiva.
  await page.goto('/#/recall/frases');
  await expect(
    page.getByRole('link', { name: 'Livramento exige requisitos do art. 83 do CP.' }),
  ).toBeVisible();

  expect(externas).toEqual([]);
});

test('relato de problema não leva conteúdo de estudo (6.12)', async ({ page }) => {
  await page.goto('/#/recall/registrar');
  await page.getByLabel('O que foi').fill('Conteúdo sigiloso de estudo');
  await page.getByRole('button', { name: 'Errei' }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Erro registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Relatar problema' }).click();
  await expect(page.getByText(/nunca conteúdo de estudo/)).toBeVisible();
  await page.getByLabel('O que aconteceu?').fill('Botão demorou');
  await page.getByRole('button', { name: 'Guardar relato' }).click();
  await expect(page.getByText(/aguardando envio/)).toBeVisible();
  const relatos = await page.evaluate(
    () =>
      new Promise<unknown[]>((resolver, rejeitar) => {
        const req = indexedDB.open('arretado');
        req.onerror = () => {
          rejeitar(new Error('falha ao abrir'));
        };
        req.onsuccess = () => {
          const tx = req.result.transaction('relatos', 'readonly');
          const todos = tx.objectStore('relatos').getAll();
          todos.onsuccess = () => {
            resolver(todos.result as unknown[]);
          };
        };
      }),
  );
  expect(JSON.stringify(relatos)).not.toContain('sigiloso');
  expect(relatos).toHaveLength(1);
});
