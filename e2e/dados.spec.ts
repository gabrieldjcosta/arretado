import { readFile } from 'node:fs/promises';
import { expect, test } from './apoio';

test('exportar → apagar tudo → restaurar integral, pela interface', async ({ page }) => {
  // Dado de referência: tema escuro nas preferências.
  await page.goto('/#/conta/aparencia');
  await page.getByLabel('Escuro').check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');

  await page.goto('/#/conta/dados');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toMatch(/^arretado-\d{4}-\d{2}-\d{2}-\d{4}\.arretado$/);
  const caminho = await arquivo.path();
  const bytes = await readFile(caminho);

  await page.getByRole('button', { name: 'Apagar tudo…' }).click();
  await page.getByLabel(/Entendo que os dados/).check();
  await page.getByRole('button', { name: 'Apagar tudo', exact: true }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-tema', 'escuro');

  await page.goto('/#/conta/dados');
  await page.getByLabel('Pacote do Arretado (.arretado)').setInputFiles({
    name: arquivo.suggestedFilename(),
    mimeType: 'application/zip',
    buffer: bytes,
  });
  await expect(page.getByLabel(/Restaurar integral/)).toBeChecked();
  await page.getByRole('button', { name: 'Ver prévia' }).click();
  await expect(page.getByText(/outra identidade/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importação' }).click();

  await expect(page.getByText('Restauração concluída.', { exact: false })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
});

test('pacote com senha: pede a senha e recusa a errada', async ({ page }) => {
  await page.goto('/#/conta/dados');
  await page.getByLabel(/Proteger com senha/).check();
  await page.getByLabel(/Senha \(mínimo/).fill('senha-muito-boa');
  await page.getByLabel('Repita a senha').fill('senha-muito-boa');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const arquivo = await download;
  const bytes = await readFile(await arquivo.path());

  await page.getByLabel('Pacote do Arretado (.arretado)').setInputFiles({
    name: 'protegido.arretado',
    mimeType: 'application/zip',
    buffer: bytes,
  });
  await page.getByLabel('Senha usada na exportação').fill('errada');
  await page.getByRole('button', { name: 'Abrir pacote' }).click();
  await expect(page.getByText(/senha está errada/)).toBeVisible();
  await page.getByLabel('Senha usada na exportação').fill('senha-muito-boa');
  await page.getByRole('button', { name: 'Abrir pacote' }).click();
  await expect(page.getByText(/protegido por senha\./)).toBeVisible();
});

test('funciona sem rede depois de carregado', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText('Sem conexão. Tudo continua funcionando.')).toBeVisible();
  await page.getByRole('link', { name: 'Recall' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Recall' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajuda', exact: true }).click();
  await page.getByRole('button', { name: 'Relatar problema' }).click();
  await page.getByLabel('O que aconteceu?').fill('Teste sem rede');
  await page.getByRole('button', { name: 'Guardar relato' }).click();
  await expect(page.getByText(/aguardando envio/)).toBeVisible();
  await context.setOffline(false);
});

test('aba aberta avisa quando outra aba sobe o esquema do banco (9.1)', async ({ page }) => {
  await page.goto('/#/conta/dados');
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible();

  // Outra conexão abre o banco numa versão maior, como fará a próxima versão do app em outra aba.
  await page.evaluate(async () => {
    const atual = await new Promise<number>((ok, falha) => {
      const r = indexedDB.open('arretado');
      r.onsuccess = () => {
        ok(r.result.version);
        r.result.close();
      };
      r.onerror = () => {
        falha(new Error(String(r.error)));
      };
    });
    await new Promise<void>((ok, falha) => {
      const r = indexedDB.open('arretado', atual + 10);
      r.onsuccess = () => {
        r.result.close();
        ok();
      };
      r.onerror = () => {
        falha(new Error(String(r.error)));
      };
    });
  });

  await expect(page.getByRole('alert')).toContainText('O Arretado foi atualizado em outra aba.');
  await expect(page.getByRole('alert')).toContainText('Recarregue esta página');
});

test('menu da Conta: 5 itens em cartões de linha inteira com navegação por teclado', async ({
  page,
}) => {
  await page.goto('/#/conta');
  await expect(page.getByRole('heading', { level: 1, name: 'Conta e ajustes' })).toBeVisible();

  const rotulos = [
    'Aparência',
    'Perfis de estudo',
    'Dados',
    'Privacidade e segurança',
    'Orientações',
  ];

  for (const rotulo of rotulos) {
    const link = page.getByRole('link', { name: new RegExp(rotulo) });
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  // Navegação por teclado: foco passa de um cartão para o próximo com Tab
  const linkAparencia = page.getByRole('link', { name: /Aparência/ });
  await linkAparencia.focus();
  await expect(linkAparencia).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Perfis de estudo/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Dados/ })).toBeFocused();
});

test('como guardar o backup e exportar frases e resumos em texto puro (.txt)', async ({ page }) => {
  await page.goto('/#/conta/dados');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Como guardar seu backup' }),
  ).toBeVisible();
  await expect(
    page.getByText('“Exportar” baixa um arquivo com tudo o que você estudou'),
  ).toBeVisible();
  await expect(page.getByText('Guarde fora deste aparelho')).toBeVisible();
  await expect(page.getByText('Para voltar, use “Importar”')).toBeVisible();

  // Exportar em texto quando ainda não há dados
  await expect(page.getByRole('heading', { level: 2, name: 'Exportar em texto' })).toBeVisible();
  await expect(
    page.getByText(
      'Arquivo sem senha, para ler ou guardar onde quiser. Não serve para restaurar; para isso, use o backup.',
    ),
  ).toBeVisible();

  const botaoFrasesSemDado = page.getByRole('button', { name: 'Nenhuma frase ainda' });
  const botaoResumosSemDado = page.getByRole('button', { name: 'Nenhum resumo ainda' });
  await expect(botaoFrasesSemDado).toBeDisabled();
  await expect(botaoResumosSemDado).toBeDisabled();

  // Registrar frase correta
  await page.goto('/#/recall/registrar');
  await page
    .getByLabel('Frase correta')
    .fill('O dolo eventual é compatível com a tentativa no júri.');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();

  // Criar resumo
  await page.goto('/#/biblioteca/resumos/novo');
  await page.getByLabel('Título (opcional)').fill('Controle Difuso');
  await page.getByLabel('Resumo').fill('O controle difuso pode ser exercido por qualquer juiz.');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Controle Difuso' })).toBeVisible();

  // Voltar a Dados e verificar botões habilitados e download
  await page.goto('/#/conta/dados');
  const botaoFrases = page.getByRole('button', { name: 'Frases corretas (.txt)' });
  const botaoResumos = page.getByRole('button', { name: 'Resumos (.txt)' });
  await expect(botaoFrases).toBeEnabled();
  await expect(botaoResumos).toBeEnabled();

  const dlFrases = page.waitForEvent('download');
  await botaoFrases.click();
  const arqFrases = await dlFrases;
  expect(arqFrases.suggestedFilename()).toMatch(/^arretado-frases-\d{4}-\d{2}-\d{2}\.txt$/);
  const textoFrases = await readFile(await arqFrases.path(), 'utf-8');
  expect(textoFrases).toContain('O dolo eventual é compatível com a tentativa no júri.');

  const dlResumos = page.waitForEvent('download');
  await botaoResumos.click();
  const arqResumos = await dlResumos;
  expect(arqResumos.suggestedFilename()).toMatch(/^arretado-resumos-\d{4}-\d{2}-\d{2}\.txt$/);
  const textoResumos = await readFile(await arqResumos.path(), 'utf-8');
  expect(textoResumos).toContain('Controle Difuso');
  expect(textoResumos).toContain('O controle difuso pode ser exercido por qualquer juiz.');
});
