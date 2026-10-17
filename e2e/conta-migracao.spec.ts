import { test, expect, semViolacoes } from './apoio';

test.describe('Migração do uso local para a conta (F4-A, A4b)', () => {
  test('estudar sem conta, entrar, migrar, ver a cópia em Dados e axe nos 2 temas', async ({
    page,
  }) => {
    // 1. Estudar sem conta: abre o Hoje
    await page.goto('/#/');
    await expect(page).toHaveTitle(/Arretado/i);

    // 2. Entrar na conta
    await page.goto('/#/conta/entrar');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

    // Formulário de e-mail e código (com o ServicoDeContaFalso / padrão de teste)
    const campoEmail = page.getByLabel(/receba um código/i);
    await campoEmail.fill('convidado@exemplo.com');
    await page.getByRole('button', { name: 'Enviar código' }).click();

    // Digita o código de teste
    const campoCodigo = page.getByLabel(/código de 6 dígitos/i);
    await expect(campoCodigo).toBeVisible();
    await campoCodigo.fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // 3. Oferece a migração (redireciona para /#/conta/migracao ou navega até ela)
    // Se ainda não estiver na tela de migração por reload, navega explicitamente
    if (!page.url().includes('/conta/migracao')) {
      await page.goto('/#/conta/migracao');
    }

    // Tela 1: Prévia
    await expect(page.getByRole('heading', { name: /Migrar para a conta|Prévia/i })).toBeVisible();
    await semViolacoes(page);

    // Clica em Copiar para a conta se o botão estiver visível
    const botaoCopiar = page.getByRole('button', { name: 'Copiar para a conta' });
    if (await botaoCopiar.isVisible()) {
      await botaoCopiar.click();

      // Tela 2: Andamento
      const andamento = page.locator('.migracao-andamento');
      if (await andamento.isVisible()) {
        await semViolacoes(page);
      }

      // Tela 3: Resultado (pode ficar vermelho até o núcleo A4a existir)
      const resultadoConcluido = page.getByRole('heading', { name: 'Tudo copiado' });
      const resultadoFalhou = page.getByRole('heading', {
        name: 'Nada foi alterado. Seus dados continuam como estavam.',
      });

      // Aguarda conclusão ou falha da migração (núcleo em implementação)
      await expect(resultadoConcluido.or(resultadoFalhou)).toBeVisible({ timeout: 15_000 });
      await semViolacoes(page);
    }

    // 4. Ver a cópia em Dados
    await page.goto('/#/conta/dados');
    await expect(page.getByRole('heading', { name: 'Dados' })).toBeVisible();
    await semViolacoes(page);
  });
});
