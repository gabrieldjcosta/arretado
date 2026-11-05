import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoesNoFio, test } from './apoio';

// O passo "Ache o erro" (o `achar` do mockup aprovado): uma palavra da lei está trocada, a pessoa toca nela.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

async function comALei(page: Page) {
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
}

/** Anda pelos passos, olhando o que a tela oferece a cada volta, até o cartão `achar`; devolve o que viu. */
async function ateOAche(page: Page): Promise<string[]> {
  const vistos: string[] = [];
  const quadro = '.m-tela:not(.m-saindo)';
  await page.getByRole('button', { name: /Puxar o fio/ }).click();
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(250);
    if (await page.locator(`${quadro} .m-cartao[data-cartao="achar"] .m-palavra`).count())
      return vistos;
    if (/#\/fio\/pouso$/.test(page.url())) {
      vistos.push('pouso');
      await page.getByRole('textbox', { name: /O que você lembra desta etapa/ }).fill('a pena');
      await page.getByRole('button', { name: 'Mostrar o resumo' }).click();
      await page.getByRole('button', { name: /Puxar o fio: seguir/ }).click();
      await expect(page).toHaveURL(/#\/$/);
      await page.getByRole('button', { name: /Puxar o fio/ }).click();
      continue;
    }
    const pronto = page.locator(`${quadro} .m-cartao`).getByRole('button', { name: 'Pronto, li' });
    const seguir = page
      .locator(`${quadro} .m-cartao`)
      .getByRole('button', { name: /^(Seguir|Guardar e seguir)$/ });
    const conta = page
      .locator(`${quadro} .m-cartao[data-cartao="lembrar"]`)
      .getByRole('group')
      .getByRole('button', { disabled: false });
    if (await pronto.count()) {
      vistos.push('ler');
      await pronto.click({ timeout: 3_000 }).catch(() => undefined);
    } else if (await seguir.count()) {
      vistos.push('seguir');
      await seguir
        .first()
        .click({ timeout: 3_000 })
        .catch(() => undefined);
    } else if (await conta.count()) {
      vistos.push('lembrar');
      await conta
        .first()
        .click({ timeout: 3_000 })
        .catch(() => undefined);
    }
  }
  return vistos;
}

/** Só com CAPTURA=<pasta>: as fotos do cartão, de noite e de dia, para pôr ao lado do mockup. */
async function capturar(page: Page, nome: string) {
  const pasta = process.env.CAPTURA;
  if (!pasta) return;
  for (const [tema, rotulo] of [
    ['dark', 'noite'],
    ['light', 'dia'],
  ] as const) {
    await page.emulateMedia({ colorScheme: tema });
    await page.waitForTimeout(600);
    await page.locator('#conteudo').screenshot({ path: `${pasta}/app-${rotulo}-${nome}.png` });
  }
  await page.emulateMedia({ colorScheme: 'dark' });
}

test('Ache o erro: o cartão cabe, passa no axe, a troca aparece e o Seguir leva adiante', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await comALei(page);
  await ateOAche(page);
  expect(await page.locator('[data-cartao="achar"]').count()).toBe(1);
  const cartao = page.locator('.m-tela:not(.m-saindo) .m-cartao[data-cartao="achar"]');
  await expect(
    cartao.getByRole('heading', { name: 'Uma palavra está trocada. Toque nela.' }),
  ).toBeVisible();
  await capturar(page, '1-achar');
  await semViolacoesNoFio(page);
  const palavras = cartao.locator('.m-palavra');
  const n = await palavras.count();
  for (let i = 0; i < n; i++) {
    if ((await cartao.locator('.m-troca').count()) > 0) break;
    await palavras.nth(i).click();
  }
  await expect(cartao.locator('.m-troca')).toBeVisible();
  await expect(cartao.locator('.m-palavra.m-errada').first()).toBeVisible();
  await capturar(page, '2-achou');
  await semViolacoesNoFio(page);

  // O acerto: a mesma carta de novo (a etapa guarda o passo), tocando de primeira na palavra trocada.
  const indice = await palavras.evaluateAll((ps) =>
    ps.findIndex((p) => p.classList.contains('m-errada')),
  );
  expect(indice).toBeGreaterThanOrEqual(0);
  await page.reload();
  const de_novo = page.locator('.m-tela:not(.m-saindo) .m-cartao[data-cartao="achar"]');
  await expect(de_novo.locator('.m-palavra').first()).toBeVisible();
  await de_novo.locator('.m-palavra').nth(indice).click();
  await expect(de_novo.locator('.m-troca')).toBeVisible();
  await expect(de_novo.getByText(/^Achou\. A lei diz/)).toBeVisible();
  await capturar(page, '3-acertou');
  await semViolacoesNoFio(page);
  await de_novo.getByRole('button', { name: 'Seguir' }).click();
});
