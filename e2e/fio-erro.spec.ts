import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoesNoFio, test } from './apoio';

// "Guardar um erro" no Fio (C2a): o "+" abre a folha do mockup, as sugestões de artigo vêm da etapa de agora, o "Ler na lei"
// abre o artigo e "Pendurar no varal" guarda de verdade, com o aviso e o "Desfazer". O navegador confere o axe, o
// contraste medido nos pixels, que a folha cabe no quadro e que o botão desligado não é um verde de lama.

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

test('o "+" abre a folha de guardar um erro e pendura a Frase no varal', async ({ page }) => {
  await comALeiNaPrevia(page);
  await page.getByRole('button', { name: /Guardar um erro/ }).click();
  const folha = page.getByRole('dialog');
  await expect(
    folha.getByRole('heading', { level: 2, name: 'Qual é a frase certa?' }),
  ).toBeVisible();

  // Sem a Frase certa não dá para pendurar, e o botão desligado perde a cor (sem o verde de lama da noite).
  const pendurar = folha.getByRole('button', { name: /Pendurar no varal/ });
  await expect(pendurar).toBeDisabled();

  // A folha cabe no quadro, e o quadro não ganha rolagem lateral.
  const quadro = page.locator('#conteudo');
  const caixaDaFolha = await folha.boundingBox();
  const caixaDoQuadro = await quadro.boundingBox();
  expect(caixaDaFolha && caixaDoQuadro).toBeTruthy();
  if (caixaDaFolha && caixaDoQuadro) {
    expect(caixaDaFolha.y).toBeGreaterThanOrEqual(caixaDoQuadro.y - 1);
    expect(caixaDaFolha.y + caixaDaFolha.height).toBeLessThanOrEqual(
      caixaDoQuadro.y + caixaDoQuadro.height + 1,
    );
  }

  // A primeira sugestão já vem escolhida; "Nenhum" a desliga e esconde o "Ler na lei".
  const sugestoes = folha.getByRole('group', { name: 'Ligar a um artigo' });
  await expect(sugestoes.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
  await folha.getByRole('button', { name: 'Ler na lei' }).click();
  await expect(folha.locator('.m-lei')).toBeVisible();
  await folha.getByRole('button', { name: 'Nenhum' }).click();
  await expect(folha.getByRole('button', { name: 'Ler na lei' })).toHaveCount(0);
  await sugestoes.getByRole('button').first().click();

  await folha.getByRole('textbox').fill('Primário com violência progride com 25% da pena.');
  await folha.getByRole('button', { name: 'Questão' }).click();
  await expect(pendurar).toBeEnabled();
  await semViolacoesNoFio(page);

  await pendurar.click();
  await expect(page.getByText('Pendurada no varal. Volta na revisão amanhã.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // O varal mostra a Frase guardada no Caderno, e o "Desfazer" do aviso a tira.
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await page.goto('/#/recall/frases');
  await expect(page.getByText('Primário com violência progride com 25% da pena.')).toHaveCount(0);
});
