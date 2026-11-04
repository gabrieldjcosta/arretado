import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoesNoFio, test } from './apoio';

// O Arretado novo (prévia do Fio, D-D25): os passos com a lei de verdade, no quadro do mockup aprovado. A matéria
// vem do edital (CSV), a LEP é colada e publicada e ligada à disciplina, e o Fio puxa o Ler e o Lembrar. O jsdom
// não mede cor, layout nem animação; aqui o navegador confere que cada cartão passa no axe nos dois mundos, que os
// grifos acendem, que o cartão se passa com o gesto e que o "Desfazer" volta.

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
  await expect(puxador(page)).toBeVisible();
}

/** O cartão do passo, e não o fantasma que a tela anterior deixa esmaecendo (`.m-saindo`). */
const cartaoDa = (page: Page, nome: string) =>
  page.locator(`.m-tela:not(.m-saindo) .m-cartao[data-cartao="${nome}"]`);

const puxador = (page: Page) => page.getByRole('button', { name: /Puxar o fio/ });

/** Nada pode rolar de lado nem passar da largura da tela. */
async function semRolagemLateral(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

/**
 * O botão da vez se alcança: o cartão pode passar da tela (a lei é longa), e então a tela do passo rola (como no
 * mockup, onde `.m-tela` tem `overflow-y: auto`). Rolada até o botão, ele fica inteiro dentro do quadro.
 */
async function botaoAlcancavel(page: Page, nome: RegExp | string) {
  const botao = page.getByRole('button', { name: nome });
  await botao.scrollIntoViewIfNeeded();
  const dentro = await botao.evaluate((el) => {
    const quadro = document.querySelector('.m-app')?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return quadro !== undefined && b.top >= quadro.top && b.bottom <= quadro.bottom + 1;
  });
  expect(dentro).toBe(true);
}

test('Ler e Lembrar com a LEP: cada cartão cabe, passa no axe, os grifos acendem e o pouso fecha a etapa', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await comALeiNaPrevia(page);

  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');
  await expect(page.getByText('Passo 1 de 2')).toBeAttached();
  // Os grifos do artigo acendem um a um, e a legenda diz o que cada cor é (a assinatura do Ler no mockup).
  await expect(ler.locator('.m-lei .m-aceso').first()).toBeVisible({ timeout: 10_000 });
  await expect(ler.getByRole('link', { name: 'Abrir no Leitor' })).toBeVisible();
  await botaoAlcancavel(page, 'Pronto, li');
  await semRolagemLateral(page);
  await semViolacoesNoFio(page);

  // "Pronto, li" leva ao Lembrar do mesmo artigo (o Art. 2º tem destaque).
  await ler.getByRole('button', { name: 'Pronto, li' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Agora sem olhar.' })).toBeVisible();
  const lembrar = cartaoDa(page, 'lembrar');
  const respostas = lembrar.getByRole('group', {
    name: /Escolha o que a lei diz|Esta frase está como na lei\?/,
  });
  await expect(respostas.getByRole('button').first()).toBeVisible();
  await semRolagemLateral(page);
  await semViolacoesNoFio(page);

  // Responde com a primeira conta: a escolhida voa até o buraco e a lei diz o que era.
  await respostas.getByRole('button').first().click();
  const retorno = lembrar.locator('.m-retorno');
  await expect(retorno).toHaveText(/Isso\.|a Frase certa, tirada da lei/);
  const acertou = (await retorno.innerText()).startsWith('Isso.');
  await botaoAlcancavel(page, acertou ? 'Seguir' : 'Guardar e seguir');
  await semViolacoesNoFio(page);
  await lembrar.getByRole('button', { name: acertou ? 'Seguir' : 'Guardar e seguir' }).click();

  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(page.getByRole('heading', { level: 2, name: /Pode descansar\.$/ })).toBeVisible();
  await expect(page.getByText(/^Leu /)).toBeVisible();
  await expect(page.getByText(/Lembrou /)).toBeVisible();
  if (!acertou) await expect(page.getByText(/guardou 1 Frase/)).toBeVisible();
  await semViolacoesNoFio(page);
  await page.getByRole('button', { name: /Puxar o fio: seguir/ }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('o cartão se passa com o gesto: para a direita segue, para a esquerda pula, e o aviso desfaz', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await comALeiNaPrevia(page);
  await puxador(page).click();
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');

  /** Arrasta o cartão pelo texto da lei (que não é botão nem link), `dx` px para o lado. */
  const arrastar = async (dx: number) => {
    // O cartão acabou de chegar (ou de voltar do "Desfazer", pela mola): só se arrasta depois de parar.
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length), { timeout: 8000 })
      .toBe(0);
    const alvo = await ler.locator('.m-porque').boundingBox();
    if (!alvo) throw new Error('sem caixa do cartão');
    const x = alvo.x + alvo.width / 2;
    const y = alvo.y + alvo.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y, { steps: 4 });
    await page.mouse.move(x + dx, y, { steps: 4 });
    await page.mouse.up();
  };

  // Um arrasto curto não passa o cartão: ele volta na mola e o passo continua.
  await arrastar(50);
  await expect(ler).toBeVisible();
  await expect(page.getByText('Passo 1 de 2')).toBeAttached();

  // Para a direita, além do limite, o Ler fecha e o Lembrar chega; o aviso oferece "Desfazer".
  await arrastar(180);
  await expect(page.getByRole('heading', { level: 2, name: 'Agora sem olhar.' })).toBeVisible();
  await expect(page.locator('.m-toast').getByText('Feito')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(cartaoDa(page, 'ler')).toBeVisible();
  await expect(page.locator('.m-toast').getByText('Desfeito')).toBeVisible();

  // Para a esquerda, o passo é pulado: não custa nada, e o aviso também desfaz.
  await arrastar(-180);
  await expect(page.locator('.m-toast').getByText('Pulado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeVisible();
});

test('Pausar guarda o passo, volta ao Agora e o fio convida a continuar', async ({ page }) => {
  test.setTimeout(240_000);
  await comALeiNaPrevia(page);

  await puxador(page).click();
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');
  await ler.getByRole('button', { name: 'Pausar: tudo fica salvo' }).click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('Tudo salvo. O fio te espera aqui.')).toBeVisible();
  await expect(page.getByText('Puxe para continuar')).toBeVisible();
  await semViolacoesNoFio(page);

  // Voltar ao passo mostra o mesmo cartão, no mesmo lugar.
  await puxador(page).click();
  await expect(page.locator('.m-cartao[data-cartao="ler"] .m-olho').first()).toHaveText(
    'Ler · Execução Penal',
  );
});

test('no Lembrar, o teclado alcança "Pular este passo" mesmo sem arrastar', async ({ page }) => {
  test.setTimeout(240_000);
  await comALeiNaPrevia(page);
  await puxador(page).click();
  await page.getByRole('button', { name: 'Pronto, li' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Agora sem olhar.' })).toBeVisible();

  // Fora da vista até receber o foco; com o foco, aparece no pé do cartão e cabe na tela.
  const pular = page.getByRole('button', { name: 'Pular este passo' });
  await expect(pular).toBeAttached();
  await pular.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(pular).toBeFocused();
  const caixa = await pular.boundingBox();
  expect(caixa?.width).toBeGreaterThan(40);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
});
