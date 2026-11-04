import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

// O Arretado novo (prévia do Fio, D-D25): os passos com a lei de verdade. A matéria vem do edital (CSV), a LEP
// é colada e publicada e ligada à disciplina, e o Fio puxa o Ler, o Lembrar e, se a pessoa errar, o Guardar.
// O jsdom não mede cor nem layout; aqui o navegador confere que cada cartão passa no axe nos dois mundos e que
// as respostas e a pílula de luz cabem na tela.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/** Edital pelo CSV (cria a disciplina), LEP importada e ligada a ela, prévia ligada, Agora aberto. */
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
  await expect(page.getByRole('button', { name: /Puxe o fio/ })).toBeVisible();
}

/** Nada pode rolar de lado nem passar da largura da tela. */
async function semRolagemLateral(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test('Ler, Lembrar e Guardar com a LEP: cada cartão cabe, passa no axe e o pouso fecha a etapa', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await comALeiNaPrevia(page);

  await page.getByRole('button', { name: /Puxe o fio/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);
  const passo = page.getByRole('region', { name: 'Passo do Fio' });
  await expect(passo.getByRole('heading', { level: 1 })).toContainText('LEP, Art');
  await semRolagemLateral(page);
  await semViolacoes(page);

  // O Ler de "Já li" leva ao Lembrar do mesmo artigo (o Art. 2º tem destaque).
  await passo.getByRole('button', { name: 'Já li' }).click();
  await expect(passo.getByRole('heading', { level: 1, name: 'Lembrar LEP' })).toBeVisible();
  const pergunta = passo.getByRole('article', { name: 'Lembrar' });
  await expect(pergunta.getByRole('button').first()).toBeVisible();
  await semRolagemLateral(page);
  await semViolacoes(page);

  // Responde com a primeira opção; a lei diz o que era e o botão da vez fecha o Lembrar.
  await pergunta.getByRole('button').first().click();
  await expect(pergunta.getByRole('status')).toHaveText(/Isso\.|A lei diz:/);
  const acertou = (await pergunta.getByRole('status').innerText()).startsWith('Isso.');
  await semViolacoes(page);
  const proxima = passo.getByRole('button', { name: /^(Seguir|Concluir)$/ });
  await proxima.click();

  // Errou: a Frase certa já escrita, e um toque guarda. Acertou: a etapa pousa direto.
  if (!acertou) {
    await expect(passo.getByRole('heading', { level: 1, name: 'Guardar as Frases' })).toBeVisible();
    await semViolacoes(page);
    await passo.getByRole('button', { name: 'Guardar esta Frase' }).click();
    await expect(passo.getByText('Frase guardada. Volta amanhã.')).toBeVisible();
    await passo.getByRole('button', { name: 'Seguir' }).click();
  }

  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(page.getByRole('heading', { level: 1, name: /Pode descansar\.$/ })).toBeVisible();
  await expect(page.getByText(/^Leu /)).toBeVisible();
  await expect(page.getByText(/^Lembrou /)).toBeVisible();
  await semViolacoes(page);
  await page.getByRole('button', { name: /seguir para o próximo passo/ }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('Pausar guarda o passo, volta ao Agora e o fio convida a continuar', async ({ page }) => {
  test.setTimeout(240_000);
  await comALeiNaPrevia(page);

  await page.getByRole('button', { name: /Puxe o fio/ }).click();
  const passo = page.getByRole('region', { name: 'Passo do Fio' });
  await expect(passo.getByRole('heading', { level: 1 })).toContainText('LEP, Art');
  await passo.getByRole('button', { name: 'Pausar: tudo fica salvo' }).click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('Tudo salvo. O fio te espera aqui.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Puxe para continuar/ })).toBeVisible();
  await semViolacoes(page);

  // Voltar ao passo mostra o mesmo cartão, no mesmo lugar.
  await page.getByRole('button', { name: /Puxe para continuar/ }).click();
  await expect(passo.getByRole('heading', { level: 1 })).toContainText('LEP, Art');
});
