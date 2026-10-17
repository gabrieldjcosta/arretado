import { test, expect, semViolacoes } from './apoio';

test.describe('Migração do uso local para a conta (F4-A, A4b)', () => {
  // O build do E2E não liga `VITE_CONTA`, então /conta/entrar e /conta/migracao não existem; e,
  // ligada, a tela Entrar falaria com o Supabase real (e-mail de verdade). Volta a rodar quando houver
  // serviço de conta falso no build de teste (escolha técnica pendente com o Gabriel).
  test.fixme();
  test('estudar sem conta, entrar, migrar, ver a cópia em Dados e axe nos 2 temas', async ({
    page,
  }) => {
    // 1. Estudar sem conta: registra uma Frase correta (sem estudo, entrar não oferece a migração).
    await page.goto('/#/recall/registrar');
    await page.getByLabel('Frase correta').fill('Livramento exige requisitos do art. 83 do CP.');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Frase registrada.')).toBeVisible();

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

    // 3. Com estudo sem conta, entrar recarrega direto na migração.
    await expect(page).toHaveURL(/#\/conta\/migracao$/);

    // Tela 1: Prévia
    await expect(page.getByRole('heading', { name: 'Migrar para a conta' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Prévia da cópia' })).toBeVisible();
    await semViolacoes(page);

    // Tela 2 (andamento) passa rápido demais para conferir; o resultado é o que vale.
    await page.getByRole('button', { name: 'Copiar para a conta' }).click();

    // Tela 3: Resultado; só a conclusão passa.
    await expect(page.getByRole('heading', { name: 'Tudo copiado' })).toBeVisible({
      timeout: 15_000,
    });
    await semViolacoes(page);

    // "Ir para o Hoje" recarrega e abre o banco da conta (T26).
    await page.getByRole('link', { name: 'Ir para o Hoje' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();

    // 4. Ver a cópia em Dados
    await page.goto('/#/conta/dados');
    await expect(page.getByRole('heading', { name: 'Dados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Cópia de antes da conta/ })).toBeVisible();
    await semViolacoes(page);
  });
});
