import { test, expect, semViolacoes } from './apoio';
import { entrarPorCodigo, registrarFrase } from './conta-apoio';

test.describe('Cópia cifrada na nuvem (F4-A, A6)', () => {
  test('guardar com consentimento, frase errada não abre, frase certa restaura com prévia', async ({
    page,
  }) => {
    await entrarPorCodigo(page, 'nuvem@exemplo.com');
    await registrarFrase(page, 'Frase guardada na nuvem.');

    await page.goto('/#/conta/dados');
    const bloco = page.getByRole('region', { name: 'Cópia na nuvem' });
    await expect(bloco.getByText('Ainda sem cópia na nuvem.')).toBeVisible();
    await semViolacoes(page);

    // Sem marcar o consentimento, o botão de guardar fica desligado.
    await bloco.getByRole('button', { name: 'Guardar cópia na nuvem…' }).click();
    await bloco.getByLabel('Frase (mínimo 8 caracteres)').fill('frase-secreta-1');
    await bloco.getByLabel('Repita a frase').fill('frase-secreta-1');
    await expect(bloco.getByRole('button', { name: 'Cifrar e guardar' })).toBeDisabled();
    await bloco.getByLabel(/Entendi e aceito guardar uma cópia cifrada/).check();
    await bloco.getByRole('button', { name: 'Cifrar e guardar' }).click();
    await expect(bloco.getByText(/Cópia guardada na nuvem/)).toBeVisible({ timeout: 30_000 });
    await expect(bloco.getByText(/Com cópia na nuvem/)).toBeVisible();
    await semViolacoes(page);

    // Mudança local depois da cópia: a restauração deve desfazê-la.
    await registrarFrase(page, 'Frase feita depois da cópia.');
    await page.goto('/#/conta/dados');

    await bloco.getByRole('button', { name: /Restaurar a cópia de/ }).click();
    await bloco.getByLabel('Frase desta cópia').fill('frase-errada-99');
    await bloco.getByRole('button', { name: 'Abrir cópia' }).click();
    await expect(bloco.getByRole('alert')).toContainText('Esta frase não abre a cópia', {
      timeout: 30_000,
    });

    await bloco.getByLabel('Frase desta cópia').fill('frase-secreta-1');
    await bloco.getByRole('button', { name: 'Abrir cópia' }).click();
    await expect(bloco.getByText(/A frase abriu a cópia/)).toBeVisible({ timeout: 30_000 });
    await bloco.getByLabel(/Usar a cópia da nuvem/).check();
    await bloco.getByRole('button', { name: 'Continuar' }).click();
    // Prévia antes de qualquer mudança.
    await expect(bloco.getByRole('button', { name: 'Usar a cópia da nuvem' })).toBeVisible();
    await semViolacoes(page);
    await bloco.getByRole('button', { name: 'Usar a cópia da nuvem' }).click();
    await expect(
      bloco.getByRole('status').filter({ hasText: /Cópia da nuvem aplicada/ }),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/#/recall/frases');
    await expect(page.getByText('Frase guardada na nuvem.')).toBeVisible();
    await expect(page.getByText('Frase feita depois da cópia.')).toHaveCount(0);
  });
});
