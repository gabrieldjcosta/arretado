import { expect, semViolacoesNoFio, test } from './apoio';

// A Conta em folha no Fio (C2b): o nome "arretado" abre a `folha-conta` do mockup. Sem a chave de contas (o build padrão),
// ela não oferece login; os ajustes de Céu, Movimento e Texto valem; o que é longo leva às telas de antes.

test('a Conta abre em folha e os ajustes valem', async ({ page }) => {
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'arretado: sua conta e ajustes' }).click();
  const folha = page.getByRole('dialog');
  await expect(
    folha.getByRole('heading', { level: 2, name: 'Seu fio mora neste aparelho' }),
  ).toBeVisible();
  await expect(folha.getByRole('button', { name: /Entrar com o Google/ })).toHaveCount(0);

  // O axe e o contraste medido seguem o tema do sistema: medem-se antes de a pessoa fixar o céu.
  await semViolacoesNoFio(page);

  // Movimento: o Calmo vale na hora, neste aparelho, e fica depois de recarregar.
  await folha.getByRole('button', { name: 'Calmo' }).click();
  await expect(folha.getByRole('button', { name: 'Calmo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.m-fio')).toHaveAttribute('data-movimento', 'calmo');
  await folha.getByRole('button', { name: 'Vivo' }).click();
  await expect(page.locator('.m-fio')).toHaveAttribute('data-movimento', 'vivo');

  // Céu: troca o mundo do quadro.
  await folha.getByRole('button', { name: 'Manhã' }).click();
  await expect(page.locator('.m-fio')).toHaveAttribute('data-mundo', 'dia');
  await folha.getByRole('button', { name: 'Luar' }).click();
  await expect(page.locator('.m-fio')).toHaveAttribute('data-mundo', 'noite');
  await folha.getByRole('button', { name: 'Texto maior' }).click();
  await expect(folha.getByRole('button', { name: 'Texto maior' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Relatar um problema: a folha desce e o relato sobe.
  await folha.getByRole('button', { name: /Relatar um problema/ }).click();
  await expect(page.getByRole('dialog', { name: /problema/i })).toBeVisible();
});

test('"Todos os ajustes" leva à Conta de antes', async ({ page }) => {
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'arretado: sua conta e ajustes' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Todos os ajustes/ })
    .click();
  await expect(page).toHaveURL(/#\/conta$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Conta e ajustes' })).toBeVisible();
});
