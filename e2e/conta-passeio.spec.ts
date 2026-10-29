import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

// O Começar da Chegada (D-D10) com a conta ligada: "Entrar com o Google" e a nota de que por ora só
// e-mails convidados entram, acima de "Experimentar sem conta". Roda no build do E2E da conta
// (`--mode e2e-conta`, T30; `VITE_CONTA=1`, serviço falso, sem rede). Sem a conta ligada o Começar tem uma
// saída só, e quem a prova é a `comecar.spec.ts`.
//
// Como a `entrada-do-dia.spec.ts`, desliga a semeadura que deixa o aparelho "já visto": a Chegada precisa abrir.
test.use({ semearAbertura: false });

const comecar = (page: Page) => page.getByRole('dialog', { name: 'Vamo começar?' });

async function chegarAoComecar(page: Page) {
  await page.goto('/#/');
  await page
    .getByRole('dialog', { name: 'Boas-vindas ao Arretado!' })
    .getByRole('button', { name: 'Vamos' })
    .click();
  await page.getByRole('button', { name: 'Pular o passeio' }).click();
  await expect(comecar(page)).toBeVisible();
}

test.describe('Começar, com a conta ligada', () => {
  test('o Google vem primeiro, com a nota; "Experimentar sem conta" é o botão de texto', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    const folha = comecar(page);
    const google = folha.getByRole('button', { name: 'Entrar com o Google' });
    await expect(google).toBeVisible();
    await expect(folha.getByText(/Ao entrar, você aceita o que sai do seu Aparelho/)).toBeVisible();
    await expect(
      folha.getByText('Em fase de teste: por enquanto só e-mails convidados entram.'),
    ).toBeVisible();
    const semConta = folha.getByRole('button', {
      name: 'Experimentar sem conta e salvar seus dados manualmente',
    });
    await expect(semConta).toBeVisible();
    await expect(semConta).toHaveClass(/botao-texto/);

    // A ordem de foco é a visual: o Google, o link do aviso e depois o "sem conta".
    await expect(folha.getByRole('heading', { level: 2 })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(google).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(folha.getByRole('link', { name: 'Ver o que sai do Aparelho' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(semConta).toBeFocused();

    for (const alvo of [google, semConta]) {
      const caixa = await alvo.boundingBox();
      expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(43.99);
    }
    await semViolacoes(page);
  });

  test('o botão do Google tem as cores das diretrizes dele: claro de dia, escuro à noite', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    const google = comecar(page).getByRole('button', { name: 'Entrar com o Google' });
    const cores = () =>
      google.evaluate((el) => {
        const c = getComputedStyle(el);
        return [c.backgroundColor, c.color, c.borderTopColor];
      });
    // O `.botao` do app tem a mesma especificidade de uma classe: só um seletor mais forte o vence, e só o
    // estilo calculado no navegador prova que venceu.
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await cores()).toEqual(['rgb(255, 255, 255)', 'rgb(31, 31, 31)', 'rgb(116, 119, 117)']);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await cores()).toEqual(['rgb(19, 19, 20)', 'rgb(227, 227, 227)', 'rgb(142, 145, 143)']);
  });

  test('o Google abre o login direto (sem a tela Entrar) e volta já dentro da conta', async ({
    page,
  }) => {
    await chegarAoComecar(page);
    await comecar(page).getByRole('button', { name: 'Entrar com o Google' }).click();
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
    await page
      .getByRole('dialog', { name: 'Boas-vindas ao Arretado!' })
      .getByRole('button', { name: 'Vamos' })
      .click();
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Seguir' }).click();
    await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(comecar(page)).toBeVisible();

    // Um segundo toque logo depois (o toque duplo) acerta o que estiver no lugar: com a conta ligada, o Google.
    const google = comecar(page).getByRole('button', { name: 'Entrar com o Google' });
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

  test('"Experimentar sem conta" fecha a folha e deixa o Hoje', async ({ page }) => {
    await chegarAoComecar(page);
    await comecar(page)
      .getByRole('button', { name: 'Experimentar sem conta e salvar seus dados manualmente' })
      .click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  });
});
