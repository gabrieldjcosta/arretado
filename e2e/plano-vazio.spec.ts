import { expect, semViolacoes, test } from './apoio';

const TABELA_IA_EXEMPLO = `\`\`\`
Disciplina;Código;Ponto
Direito Penal;1;Aplicação da lei penal
Direito Penal;2;Crime
\`\`\``;

test('Plano vazio: acolhimento, dois caminhos, prompt IA e colar resultado', async ({ page }) => {
  await page.goto('/#/plano');
  await expect(page.getByRole('heading', { level: 1, name: 'Trilha' })).toBeVisible();

  // 1. Vazio acolhedor com título e texto base
  await expect(
    page.getByRole('heading', { level: 2, name: 'Monte seu plano do seu jeito' }),
  ).toBeVisible();
  await expect(page.getByText(/Escolha o concurso e o app monta a Trilha/)).toBeVisible();

  // 2. Um começo só: "Escolher meu concurso" é o principal; "Trazer meu edital" ao lado; o passo a
  //    passo pelo catálogo continua, como link de texto.
  const escolher = page.getByRole('link', { name: 'Escolher meu concurso' });
  await expect(escolher).toBeVisible();
  await expect(escolher).toHaveAttribute('href', '#/comecar');
  await expect(escolher).toHaveClass(/principal/);

  const linkTrazer = page.getByRole('link', { name: 'Trazer meu edital' });
  await expect(linkTrazer).toBeVisible();

  const linkCatalogo = page.getByRole('link', { name: 'Montar pelo catálogo' });
  await expect(linkCatalogo).toHaveAttribute('href', '#/plano/onboarding');

  // Axe nos 2 temas com o estado vazio inicial
  await semViolacoes(page);

  // 3. Rola até a importação
  await linkTrazer.click();
  const secaoImportar = page.locator('#importar-edital');
  await expect(secaoImportar).toBeVisible();

  // 4. Detalhes de orientação para IA e prompt com botão copiar
  const detalhesIa = page.locator('summary', { hasText: 'Não sabe montar a planilha?' });
  await expect(detalhesIa).toBeVisible();
  await detalhesIa.click();

  await expect(
    page.getByText(
      'Copie o texto abaixo, cole na sua IA preferida junto com o conteúdo programático do edital e traga o resultado para cá.',
    ),
  ).toBeVisible();

  const botaoCopiar = page.getByRole('button', { name: 'Copiar' });
  await expect(botaoCopiar).toBeVisible();

  // Axe nos 2 temas com o bloco de IA aberto
  await semViolacoes(page);

  // 5. Colar o resultado da IA
  const campoColado = page.getByLabel('Ou cole o resultado da IA');
  await campoColado.fill(TABELA_IA_EXEMPLO);

  const botaoLer = page.getByRole('button', { name: 'Ler o texto colado' });
  await botaoLer.click();

  // 6. Prévia de importação
  await expect(page.getByText('2 pontos em 1 disciplinas.')).toBeVisible();
  await semViolacoes(page);

  // 7. Confirmar importação
  await page.getByRole('button', { name: 'Importar pontos' }).click();

  // 8. Tela com pontos importados
  await expect(page.getByRole('heading', { level: 2, name: 'Direito Penal' })).toBeVisible();
  await expect(page.getByText('1. Aplicação da lei penal')).toBeVisible();
  await expect(page.getByText('2. Crime')).toBeVisible();

  // Axe nos 2 temas com os pontos importados
  await semViolacoes(page);
});
