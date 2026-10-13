import { colarTextoPuro, expect, publicar, semViolacoes, test } from './apoio';

const LEI = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'Art. 1º Esta Lei trata do teste.',
  'Parágrafo único. O teste é contínuo.',
  'Art. 2º São deveres:',
  'I - estudar;',
  'II - revisar.',
].join('\n');

test('texto puro: revisar o "a confirmar", corrigir um artigo e confirmar em lote (10.1)', async ({
  page,
}) => {
  await page.goto('/#/biblioteca/importar');
  await colarTextoPuro(page, LEI);
  const revisao = page.getByRole('region', { name: 'Para confirmar' });
  await expect(revisao).toBeVisible({ timeout: 30_000 });
  const lote = revisao.getByRole('button', { name: /^Confirmar \d+ dispositivos$/ });
  await expect(lote).toBeVisible();
  const total = Number((await lote.textContent())?.match(/\d+/)?.[0]);
  expect(total).toBeGreaterThanOrEqual(5);

  // Prévia do inciso, com o artigo como contexto.
  await expect(revisao.getByText('estudar;')).toBeVisible();
  await expect(revisao.getByText('Art. 2º', { exact: false }).first()).toBeVisible();
  await semViolacoes(page);

  // Confirmar um a um.
  await revisao.getByRole('button', { name: 'Confirmar Art. 1º' }).click();
  await expect(
    revisao.getByRole('button', { name: `Confirmar ${String(total - 1)} dispositivos` }),
  ).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Confirmar Art. 1º' })).toHaveCount(0);

  // Corrigir o inciso I: texto novo, e ele sai da lista.
  await revisao.getByRole('button', { name: 'Corrigir I', exact: true }).click();
  const formulario = revisao.getByRole('form', { name: 'Corrigir I' });
  await formulario.getByLabel('Texto').fill('estudar todos os dias;');
  await semViolacoes(page);
  await formulario.getByRole('button', { name: 'Salvar e confirmar' }).click();
  await expect(revisao.getByRole('form')).toHaveCount(0);
  await expect(revisao.getByText('estudar todos os dias;')).toHaveCount(0);
  await expect(
    revisao.getByRole('button', { name: `Confirmar ${String(total - 2)} dispositivos` }),
  ).toBeVisible();

  // Recarregar retoma o rascunho com a revisão guardada.
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'Para confirmar' })
      .getByRole('button', { name: `Confirmar ${String(total - 2)} dispositivos` }),
  ).toBeVisible({ timeout: 30_000 });

  // Confirmar o resto: a região some e o botão de publicar não pede aceite.
  await page
    .getByRole('region', { name: 'Para confirmar' })
    .getByRole('button', { name: `Confirmar ${String(total - 2)} dispositivos` })
    .click();
  await expect(page.getByRole('region', { name: 'Para confirmar' })).toHaveCount(0);
  await semViolacoes(page);
  await publicar(page, 'Lei do teste');
});

test('editor: salva sozinho, divide, converte e junta linhas; a edição sobrevive ao recarregar (10.2)', async ({
  page,
}) => {
  await page.goto('/#/biblioteca/importar');
  await colarTextoPuro(page, LEI);
  const revisao = page.getByRole('region', { name: 'Para confirmar' });
  await expect(revisao).toBeVisible({ timeout: 30_000 });

  // Salvamento automático: o indicador passa por "Digitando…" e volta a "Salvo", sem confirmar.
  await revisao.getByRole('button', { name: 'Corrigir II', exact: true }).click();
  let formulario = revisao.getByRole('form', { name: 'Corrigir II' });
  const estado = formulario.getByRole('status');
  await expect(estado).toHaveText('Salvo');
  await formulario.getByLabel('Texto').fill('revisar tudo. estudar sempre.');
  await expect(estado).toContainText('Digitando');
  await expect(estado).toHaveText('Salvo');
  await semViolacoes(page);

  // Recarregar: o texto salvo sozinho está lá, e a linha continua "a confirmar".
  await page.reload();
  await expect(revisao.getByText('revisar tudo. estudar sempre.')).toBeVisible({ timeout: 30_000 });

  // Dividir no cursor: a segunda parte é um inciso novo, numerado pelo sistema.
  await revisao.getByRole('button', { name: 'Corrigir II', exact: true }).click();
  formulario = revisao.getByRole('form', { name: 'Corrigir II' });
  await formulario.getByLabel('Texto').evaluate((campo: HTMLTextAreaElement) => {
    campo.focus();
    campo.setSelectionRange(13, 13);
  });
  await formulario.getByRole('button', { name: 'Dividir no cursor' }).click();
  await expect(revisao.getByRole('form')).toHaveCount(0);
  await expect(revisao.getByText('estudar sempre.')).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Confirmar III' })).toBeVisible();

  // Converter o inciso III em parágrafo: o número e o recuo são do sistema.
  await revisao.getByRole('button', { name: 'Corrigir III', exact: true }).click();
  formulario = revisao.getByRole('form', { name: 'Corrigir III' });
  await formulario.getByLabel('Converter esta linha em…').selectOption({ label: 'Parágrafo' });
  await semViolacoes(page);
  await formulario.getByRole('button', { name: 'Converter', exact: true }).click();
  await expect(revisao.getByRole('button', { name: 'Confirmar § 1º' })).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Confirmar III' })).toHaveCount(0);

  // Juntar o parágrafo com a linha de cima: some da lista, e o texto vai para o inciso II.
  await revisao.getByRole('button', { name: 'Corrigir § 1º', exact: true }).click();
  formulario = revisao.getByRole('form', { name: 'Corrigir § 1º' });
  await formulario.getByRole('button', { name: 'Juntar com a linha de cima' }).click();
  await expect(revisao.getByRole('button', { name: 'Confirmar § 1º' })).toHaveCount(0);
  await expect(revisao.getByText(/revisar tudo\.\s*§ 1º estudar sempre\./)).toBeVisible();
  await semViolacoes(page);

  // A edição à mão sobrevive a recarregar, e o rascunho editado publica.
  await page.reload();
  await expect(revisao.getByText(/revisar tudo\.\s*§ 1º estudar sempre\./)).toBeVisible({
    timeout: 30_000,
  });
  await revisao.getByRole('button', { name: /^Confirmar \d+ dispositivos$/ }).click();
  await expect(page.getByRole('region', { name: 'Para confirmar' })).toHaveCount(0);
  await publicar(page, 'Lei editada');
});

const LEI_COM_CAPITULOS = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'CAPÍTULO I',
  'Dos deveres',
  'Art. 1º Esta Lei trata do teste.',
  'Art. 2º São deveres:',
  'I - estudar;',
  'II - revisar.',
  'CAPÍTULO II',
  'Dos direitos',
  'Art. 3º São direitos:',
  'I - descansar;',
  'II - estudar com calma.',
].join('\n');

test('bloco: abrir um capítulo e um intervalo, converter, trocar e confirmar o bloco (10.3)', async ({
  page,
}) => {
  await page.goto('/#/biblioteca/importar');
  await colarTextoPuro(page, LEI_COM_CAPITULOS);
  const revisao = page.getByRole('region', { name: 'Para confirmar' });
  await expect(revisao).toBeVisible({ timeout: 30_000 });

  await revisao.getByText('Corrigir por bloco', { exact: true }).click();
  await semViolacoes(page);

  // Um capítulo: só as linhas dele aparecem.
  const escolha = revisao.getByRole('form', { name: 'Escolher o bloco' });
  await escolha.getByLabel('Trecho').selectOption({ label: 'CAPÍTULO II — Dos direitos' });
  await escolha.getByRole('button', { name: 'Abrir o bloco' }).click();
  const acoes = revisao.getByRole('region', { name: 'Ações no bloco' });
  await expect(acoes.getByText('CAPÍTULO II', { exact: false }).first()).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Corrigir Art. 3º' })).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Corrigir Art. 1º' })).toHaveCount(0);
  await semViolacoes(page);

  // Trocar uma palavra em todo o bloco.
  await acoes.getByLabel('Procurar').fill('estudar');
  await acoes.getByLabel('Trocar por').fill('ler');
  await acoes.getByRole('button', { name: 'Trocar no bloco' }).click();
  await expect(revisao.getByText('1 linha mudou.')).toBeVisible();
  await expect(revisao.getByText('ler com calma.')).toBeVisible();

  // Converter todos os incisos do bloco em parágrafos.
  await acoes.getByLabel('Converter todos os').selectOption({ label: 'incisos (2)' });
  await acoes.getByLabel('em', { exact: true }).selectOption({ label: 'Parágrafo' });
  await acoes.getByRole('button', { name: 'Converter no bloco' }).click();
  await expect(revisao.getByText('2 linhas convertidas.')).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Corrigir § 2º' })).toBeVisible();

  // Um intervalo de artigos: o capítulo I inteiro (artigos 1 e 2), e a correção por linha segue.
  await escolha.getByLabel('O bloco é').selectOption('artigos');
  await escolha.getByLabel('Do artigo').fill('1');
  await escolha.getByLabel('Até o artigo').fill('2');
  await escolha.getByRole('button', { name: 'Abrir o bloco' }).click();
  await expect(revisao.getByRole('button', { name: 'Corrigir Art. 2º' })).toBeVisible();
  await expect(revisao.getByRole('button', { name: 'Corrigir Art. 3º' })).toHaveCount(0);
  await revisao.getByRole('button', { name: 'Corrigir II', exact: true }).click();
  await revisao
    .getByRole('form', { name: 'Corrigir II' })
    .getByLabel('Texto')
    .fill('revisar sempre.');
  await expect(revisao.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible();
  await revisao.getByRole('button', { name: 'Fechar', exact: true }).click();

  // Número inexistente avisa sem quebrar.
  await escolha.getByLabel('Até o artigo').fill('99');
  await escolha.getByRole('button', { name: 'Abrir o bloco' }).click();
  await expect(revisao.getByRole('alert')).toContainText('Não há o artigo "99"');

  // Confirmar o bloco confirma só as linhas dele.
  await escolha.getByLabel('Até o artigo').fill('2');
  await escolha.getByRole('button', { name: 'Abrir o bloco' }).click();
  await revisao.getByRole('button', { name: /^Confirmar \d+ do bloco$/ }).click();
  await expect(revisao.getByText(/linhas? confirmadas?\s+no bloco\./)).toBeVisible();
  await expect(revisao.getByRole('button', { name: /^Confirmar \d+ do bloco$/ })).toBeDisabled();

  // A edição por bloco sobrevive a recarregar, e o rascunho publica.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Para confirmar' })).toBeVisible({
    timeout: 30_000,
  });
  await page
    .getByRole('region', { name: 'Para confirmar' })
    .getByRole('button', { name: /^Confirmar \d+ dispositivos$/ })
    .click();
  await expect(page.getByRole('region', { name: 'Para confirmar' })).toHaveCount(0);
  await publicar(page, 'Lei por bloco');
});
