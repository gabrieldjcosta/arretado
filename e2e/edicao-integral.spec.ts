import { colarTextoPuro, expect, publicar, semViolacoes, test } from './apoio';

const LEI = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'Art. 1º Esta Lei trata do teste.',
  'Parágrafo único. O teste é contínuo.',
  'Art. 2º São deveres:',
  'I - estudar;',
  'II - revisar.',
].join('\n');

test('texto inteiro: o confirmado fica, o novo e o mudado voltam a confirmar; apagar pergunta antes (10.4)', async ({
  page,
}) => {
  await page.goto('/#/biblioteca/importar');
  await colarTextoPuro(page, LEI);
  const revisao = page.getByRole('region', { name: 'Para confirmar' });
  await expect(revisao).toBeVisible({ timeout: 30_000 });
  await revisao.getByRole('button', { name: /^Confirmar \d+ dispositivos$/ }).click();
  await expect(revisao).toHaveCount(0);

  await page.getByText('Editar o texto inteiro').click();
  const campo = page.getByRole('textbox', { name: 'Texto da norma' });
  await expect(campo).toHaveValue(/^Art\. 1º Esta Lei trata do teste\.\nParágrafo único/);
  await semViolacoes(page);

  await campo.fill(
    [
      'Art. 1º Esta Lei trata do teste.',
      'Parágrafo único O teste é contínuo.',
      'Art. 1º-A O estudo é diário.',
      'Art. 2º São deveres:',
      'I - estudar;',
      'II - revisar sempre.',
    ].join('\n'),
  );
  await page.getByRole('button', { name: 'Salvar e reorganizar' }).click();
  await expect(page.getByText(/^Salvo\./)).toContainText('1 mudou, 1 nova');
  // Só o novo e o mudado pedem conferência.
  await expect(
    page.getByRole('region', { name: 'Para confirmar' }).getByRole('button', {
      name: 'Confirmar 2 dispositivos',
    }),
  ).toBeVisible();
  await semViolacoes(page);

  // Recarregar: a edição está guardada.
  await page.reload();
  await page.getByText('Editar o texto inteiro').click();
  await expect(page.getByRole('textbox', { name: 'Texto da norma' })).toHaveValue(
    /Art\. 1º-A O estudo é diário\.\nArt\. 2º/,
  );

  // Tirar uma linha já conferida: a tela pergunta antes.
  const texto = await page.getByRole('textbox', { name: 'Texto da norma' }).inputValue();
  await page
    .getByRole('textbox', { name: 'Texto da norma' })
    .fill(texto.replace('Parágrafo único O teste é contínuo.\n', ''));
  await page.getByRole('button', { name: 'Salvar e reorganizar' }).click();
  await expect(page.getByRole('alert')).toContainText('1 linha sai do rascunho (1 já conferida).');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Salvar mesmo assim' }).click();
  await expect(page.getByText(/^Salvo\./)).toContainText('1 saiu');

  await page
    .getByRole('region', { name: 'Para confirmar' })
    .getByRole('button', { name: 'Confirmar 2 dispositivos' })
    .click();
  await publicar(page, 'Lei do teste');
});

test('escrever do zero: súmula a partir de um artigo vazio (10.4)', async ({ page }) => {
  await page.goto('/#/biblioteca/importar');
  await page.getByRole('textbox', { name: 'Título curto' }).fill('Súmula 1');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Começar a escrever' }).click();

  const campo = page.getByRole('textbox', { name: 'Texto da norma' });
  await expect(campo).toHaveValue('Art. 1º', { timeout: 30_000 });
  await semViolacoes(page);
  await campo.fill('Art. 1º A súmula vale para todos os casos.');
  await page.getByRole('button', { name: 'Salvar e reorganizar' }).click();
  await expect(page.getByText(/^Salvo\./)).toContainText('1 mudou');
  await page
    .getByRole('region', { name: 'Para confirmar' })
    .getByRole('button', { name: 'Confirmar 1 dispositivo' })
    .click();
  await expect(page.getByRole('textbox', { name: 'Título curto' })).toHaveValue('Súmula 1');
  await publicar(page, 'Súmula 1');
});
