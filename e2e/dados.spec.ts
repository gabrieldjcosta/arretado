import { readFile } from 'node:fs/promises';
import { expect, test } from './apoio';

test('exportar → apagar tudo → restaurar integral, pela interface', async ({ page }) => {
  // Dado de referência: tema escuro nas preferências.
  await page.goto('/#/conta/aparencia');
  await page.getByLabel('Escuro').check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');

  await page.goto('/#/conta/dados');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toMatch(/^arretado-\d{4}-\d{2}-\d{2}-\d{4}\.arretado$/);
  const caminho = await arquivo.path();
  const bytes = await readFile(caminho);

  await page.getByRole('button', { name: 'Apagar tudo…' }).click();
  await page.getByLabel(/Entendo que os dados/).check();
  await page.getByRole('button', { name: 'Apagar tudo', exact: true }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-tema', 'escuro');

  await page.goto('/#/conta/dados');
  await page.getByLabel('Pacote do Arretado (.arretado)').setInputFiles({
    name: arquivo.suggestedFilename(),
    mimeType: 'application/zip',
    buffer: bytes,
  });
  await expect(page.getByLabel(/Restaurar integral/)).toBeChecked();
  await page.getByRole('button', { name: 'Ver prévia' }).click();
  await expect(page.getByText(/outra identidade/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importação' }).click();

  await expect(page.getByText('Restauração concluída.', { exact: false })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
});

test('pacote com senha: pede a senha e recusa a errada', async ({ page }) => {
  await page.goto('/#/conta/dados');
  await page.getByLabel(/Proteger com senha/).check();
  await page.getByLabel(/Senha \(mínimo/).fill('senha-muito-boa');
  await page.getByLabel('Repita a senha').fill('senha-muito-boa');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const arquivo = await download;
  const bytes = await readFile(await arquivo.path());

  await page.getByLabel('Pacote do Arretado (.arretado)').setInputFiles({
    name: 'protegido.arretado',
    mimeType: 'application/zip',
    buffer: bytes,
  });
  await page.getByLabel('Senha usada na exportação').fill('errada');
  await page.getByRole('button', { name: 'Abrir pacote' }).click();
  await expect(page.getByText(/senha está errada/)).toBeVisible();
  await page.getByLabel('Senha usada na exportação').fill('senha-muito-boa');
  await page.getByRole('button', { name: 'Abrir pacote' }).click();
  await expect(page.getByText(/protegido por senha\./)).toBeVisible();
});

test('funciona sem rede depois de carregado', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText('Sem conexão. Tudo continua funcionando.')).toBeVisible();
  await page.getByRole('link', { name: 'Recall' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Recall' })).toBeVisible();
  await page.getByRole('button', { name: 'Relatar problema' }).click();
  await page.getByLabel('O que aconteceu?').fill('Teste sem rede');
  await page.getByRole('button', { name: 'Guardar relato' }).click();
  await expect(page.getByText(/aguardando envio/)).toBeVisible();
  await context.setOffline(false);
});

test('aba aberta avisa quando outra aba sobe o esquema do banco (9.1)', async ({ page }) => {
  await page.goto('/#/conta/dados');
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible();

  // Outra conexão abre o banco numa versão maior, como fará a próxima versão do app em outra aba.
  await page.evaluate(async () => {
    const atual = await new Promise<number>((ok, falha) => {
      const r = indexedDB.open('arretado');
      r.onsuccess = () => {
        ok(r.result.version);
        r.result.close();
      };
      r.onerror = () => {
        falha(new Error(String(r.error)));
      };
    });
    await new Promise<void>((ok, falha) => {
      const r = indexedDB.open('arretado', atual + 10);
      r.onsuccess = () => {
        r.result.close();
        ok();
      };
      r.onerror = () => {
        falha(new Error(String(r.error)));
      };
    });
  });

  await expect(page.getByRole('alert')).toContainText('O Arretado foi atualizado em outra aba.');
  await expect(page.getByRole('alert')).toContainText('Recarregue esta página');
});
