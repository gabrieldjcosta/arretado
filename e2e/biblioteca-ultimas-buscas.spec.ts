import { expect, importarEPublicar, semViolacoes, test } from './apoio';

test('Biblioteca: as últimas buscas sobem quando o campo ganha foco e voltam ao clicar', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await importarEPublicar(page, 'lep-compilado', 'LEP');

  const campo = page.getByRole('searchbox', { name: 'Buscar norma' });
  const painel = page.locator('.busca-painel');
  // Sem buscas lembradas, não há painel.
  await expect(painel).toHaveCount(0);

  await campo.fill('LEP');
  await campo.press('Enter');
  await campo.fill('');
  await campo.blur();

  // O painel só aparece com o foco no campo vazio.
  await expect(painel).toBeHidden();
  await campo.focus();
  await expect(painel).toBeVisible();
  await expect(painel.getByText('Últimas buscas')).toBeVisible();
  await semViolacoes(page);

  // Esc esconde o painel e o foco fica no campo (WCAG 1.4.13); sair e voltar o abre de novo.
  await campo.press('Escape');
  await expect(painel).toBeHidden();
  await expect(campo).toBeFocused();
  await campo.blur();
  await campo.focus();
  await expect(painel).toBeVisible();

  await painel.getByRole('button', { name: 'LEP', exact: true }).click();
  await expect(campo).toHaveValue('LEP');
  await expect(painel).toHaveCount(0);

  // Esquecer apaga a memória deste aparelho.
  await campo.fill('');
  await campo.focus();
  await painel.getByRole('button', { name: 'Esquecer estas buscas' }).click();
  await expect(painel).toHaveCount(0);
});
