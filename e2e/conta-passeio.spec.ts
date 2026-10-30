import type { Locator, Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// Os dois botões de conta do Começar da Chegada (D-D10; Gabriel, 30/10): "Entrar com o Google e ter sincronização
// automática" e "Continuar sem conta e salvar meus dados manualmente", do mesmo peso, com o aviso do aceite e a nota de
// que por ora só e-mails convidados entram. A primeira tela segue só com o "Vamos" (e o "Agora não" no alto): os botões
// vêm ao fim do passeio ou ao pulá-lo ("Pular o passeio" e Esc num passo); o "Agora não" é uma recusa e fecha a folha.
// Roda no build do E2E da conta (`--mode e2e-conta`, T30; `VITE_CONTA=1`, serviço falso, sem rede). Sem a conta ligada
// o Começar tem uma saída só, e quem a prova é a `comecar.spec.ts`.
//
// Como a `entrada-do-dia.spec.ts`, desliga a semeadura que deixa o aparelho "já visto": a Chegada precisa abrir.
test.use({ semearAbertura: false });

const GOOGLE = 'Entrar com o Google e ter sincronização automática';
const SEM_CONTA = 'Continuar sem conta e salvar meus dados manualmente';

const boasVindas = (page: Page) => page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
const comecar = (page: Page) => page.getByRole('dialog', { name: 'Vamo começar?' });

async function chegarAoComecar(page: Page) {
  await page.goto('/#/');
  await boasVindas(page).getByRole('button', { name: 'Vamos' }).click();
  await page.getByRole('button', { name: 'Pular o passeio' }).click();
  await expect(comecar(page)).toBeVisible();
}

/** Sem rolagem de lado: o botão não corta o texto e a página não ganha barra na horizontal. */
async function semRolagemDeLado(page: Page, ...alvos: Locator[]) {
  for (const alvo of alvos) {
    expect(await alvo.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test.describe('Começar, com a conta ligada', () => {
  test('os dois botões de conta, do mesmo peso, com o aviso e a nota do convite', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    const folha = comecar(page);
    const google = folha.getByRole('button', { name: GOOGLE });
    const semConta = folha.getByRole('button', { name: SEM_CONTA });
    await expect(google).toBeVisible();
    await expect(semConta).toBeVisible();
    await expect(folha.getByText(/Ao entrar, seu estudo passa a ser guardado/)).toBeVisible();
    await expect(
      folha.getByText(/Em fase de teste: por enquanto só e-mails convidados entram\./),
    ).toBeVisible();

    // Dois botões de verdade (o "sem conta" já não é um link sublinhado), do mesmo tamanho e do mesmo peso: nenhum é
    // cheio e nenhum é só texto. O Google vem em cima.
    for (const botao of [google, semConta]) {
      await expect(botao).not.toHaveClass(/principal|botao-texto/);
      expect((await botao.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.99);
    }
    const [caixaDoGoogle, caixaSemConta] = await Promise.all([
      google.boundingBox(),
      semConta.boundingBox(),
    ]);
    expect(caixaDoGoogle?.width).toBeCloseTo(caixaSemConta?.width ?? 0, 0);
    expect(caixaDoGoogle?.height).toBeCloseTo(caixaSemConta?.height ?? 0, 0);
    expect(caixaDoGoogle?.y ?? 0).toBeLessThan(caixaSemConta?.y ?? 0);
    await semRolagemDeLado(page, google, semConta);

    // A ordem de foco é a visual: o Google, o "sem conta" e o link do aviso.
    await expect(folha.getByRole('heading', { level: 2 })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(google).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(semConta).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(folha.getByRole('link', { name: 'Ver o que sai do Aparelho' })).toBeFocused();
    await semViolacoes(page);
  });

  test('o botão do Google tem as cores das diretrizes dele, e a linha de baixo também lê bem', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    const google = comecar(page).getByRole('button', { name: GOOGLE });
    const cores = () =>
      google.evaluate((el) => {
        const c = getComputedStyle(el);
        const apoio = getComputedStyle(el.querySelector('.chegada-opcao-apoio') as Element);
        return [c.backgroundColor, c.color, c.borderTopColor, apoio.color];
      });
    // O `.botao` do app tem a mesma especificidade de uma classe: só um seletor mais forte o vence, e só o
    // estilo calculado no navegador prova que venceu.
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await cores()).toEqual([
      'rgb(255, 255, 255)',
      'rgb(31, 31, 31)',
      'rgb(116, 119, 117)',
      'rgb(68, 71, 70)',
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await cores()).toEqual([
      'rgb(19, 19, 20)',
      'rgb(227, 227, 227)',
      'rgb(142, 145, 143)',
      'rgb(196, 199, 197)',
    ]);
  });

  test('o Google abre o login direto (sem a tela Entrar) e volta já dentro da conta', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    await comecar(page).getByRole('button', { name: GOOGLE }).click();
    await expect(page).not.toHaveURL(/conta\/entrar/);
    await expect(page.getByText('google@exemplo.com')).toBeVisible();
  });

  test('"Ver o que sai do Aparelho" leva à tela Entrar e tira a folha do caminho', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    await comecar(page).getByRole('link', { name: 'Ver o que sai do Aparelho' }).click();
    await expect(page).toHaveURL(/#\/conta\/entrar$/);
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('o toque que sobra do último "Seguir" não cai no Google: o Começar só recebe toque depois de 400 ms', async ({
    page,
  }) => {
    await page.goto('/#/');
    await boasVindas(page).getByRole('button', { name: 'Vamos' }).click();
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Seguir' }).click();
    await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(comecar(page)).toBeVisible();

    // Um segundo toque logo depois (o toque duplo) acerta o que estiver no lugar: com a conta ligada, o Google.
    const google = comecar(page).getByRole('button', { name: GOOGLE });
    const caixa = await google.boundingBox();
    await page.mouse.click((caixa?.x ?? 0) + (caixa?.width ?? 0) / 2, (caixa?.y ?? 0) + 20);
    await page.waitForTimeout(150);
    await expect(comecar(page)).toBeVisible();
    await expect(page).toHaveURL(/#\/$/);

    // Passados os 400 ms, o botão responde.
    await page.waitForTimeout(400);
    await google.click();
    await expect(page.getByText('google@exemplo.com')).toBeVisible();
  });

  test('"Continuar sem conta" fecha a folha e deixa o Hoje', async ({ page }) => {
    await chegarAoComecar(page);
    await comecar(page).getByRole('button', { name: SEM_CONTA }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  });

  test('com a fonte a 200% a folha rola inteira: o título aparece na primeira vista e os dois botões se alcançam', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const folha = comecar(page);
    await expect(folha.getByRole('heading', { level: 2 })).toBeInViewport();
    for (const nome of [GOOGLE, SEM_CONTA]) {
      const botao = folha.getByRole('button', { name: nome });
      await botao.scrollIntoViewIfNeeded();
      await expect(botao).toBeInViewport();
      await semRolagemDeLado(page, botao);
    }
  });
});

test.describe('Os dois botões chegam ao fim do passeio e ao pulá-lo; o "Agora não" só recusa', () => {
  test('a primeira tela só tem o "Vamos" e o "Agora não", sem botão de conta', async ({ page }) => {
    await page.goto('/#/');
    await expect(boasVindas(page).getByRole('button')).toHaveText(['Agora não', 'Vamos']);
    await expect(boasVindas(page).getByRole('link')).toHaveCount(0);
  });

  test('o passeio inteiro (Vamos e quatro "Seguir") termina nos dois botões', async ({ page }) => {
    await page.goto('/#/');
    await boasVindas(page).getByRole('button', { name: 'Vamos' }).click();
    for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(comecar(page).getByRole('button', { name: GOOGLE })).toBeVisible();
    await expect(comecar(page).getByRole('button', { name: SEM_CONTA })).toBeVisible();
  });

  test('"Pular o passeio", de qualquer passo, leva aos dois botões', async ({ page }) => {
    await page.goto('/#/');
    await boasVindas(page).getByRole('button', { name: 'Vamos' }).click();
    await page.getByRole('button', { name: 'Seguir' }).click();
    await page.getByRole('button', { name: 'Pular o passeio' }).click();
    await expect(comecar(page).getByRole('button', { name: GOOGLE })).toBeVisible();
    await expect(comecar(page).getByRole('button', { name: SEM_CONTA })).toBeVisible();
  });

  test('Esc num passo também pula o passeio e leva aos dois botões', async ({ page }) => {
    await page.goto('/#/');
    await boasVindas(page).getByRole('button', { name: 'Vamos' }).click();
    await page.keyboard.press('Escape');
    await expect(comecar(page).getByRole('button', { name: GOOGLE })).toBeVisible();
    await expect(comecar(page).getByRole('button', { name: SEM_CONTA })).toBeVisible();
  });

  test('"Agora não" recusa o passeio: fecha a folha e deixa o Hoje, sem passar pelos dois botões', async ({
    page,
  }) => {
    await page.goto('/#/');
    await boasVindas(page).getByRole('button', { name: 'Agora não' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  });
});
