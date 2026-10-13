import { expect, semViolacoes, test } from './apoio';

const DIA = 86_400_000;

test('registrar → cartão → revisar no dia seguinte, sem sair do aparelho', async ({
  page,
  baseURL,
}) => {
  // 6.12: nenhuma requisição para fora do próprio app.
  const externas: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(baseURL ?? 'http://localhost')) externas.push(r.url());
  });
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();

  // Captura em menos de 30 s (Parte 2 §17), pelo botão global.
  const t0 = Date.now();
  // Só a frase correta é obrigatória (D25); "o que foi" fica em "mais detalhes".
  await page.getByRole('link', { name: /^(Registrar erro|Novo registro de erro)$/ }).click();
  await page.getByLabel('Frase correta').fill('Livramento exige requisitos do art. 83 do CP.');
  await page.getByText('Mais detalhes (opcional)').click();
  await page.getByLabel('O que foi').fill('Confundi livramento condicional com progressão');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(30_000);

  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByText(/Cartão criado/)).toBeVisible();
  await semViolacoes(page);

  // Dia seguinte: o cartão está na fila.
  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/');
  await expect(page.getByText('1 cartão para revisar.')).toBeVisible();
  await page.getByRole('link', { name: 'Revisar', exact: true }).click();
  await expect(page.getByText('Confundi livramento condicional com progressão')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Livramento exige requisitos do art. 83 do CP.')).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();

  // Lista passiva.
  await page.goto('/#/recall/frases');
  await expect(
    page.getByRole('link', { name: 'Livramento exige requisitos do art. 83 do CP.' }),
  ).toBeVisible();

  expect(externas).toEqual([]);
});

test('relato de problema não leva conteúdo de estudo (6.12)', async ({ page }) => {
  await page.goto('/#/recall/registrar');
  await page.getByLabel('Frase correta').fill('Conteúdo sigiloso de estudo');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();
  await page.getByRole('button', { name: 'Ajuda', exact: true }).click();
  await page.getByRole('button', { name: 'Relatar problema' }).click();
  await expect(page.getByText(/nunca conteúdo de estudo/)).toBeVisible();
  await page.getByLabel('O que aconteceu?').fill('Botão demorou');
  await page.getByRole('button', { name: 'Guardar relato' }).click();
  await expect(page.getByText(/aguardando envio/)).toBeVisible();
  const relatos = await page.evaluate(
    () =>
      new Promise<unknown[]>((resolver, rejeitar) => {
        const req = indexedDB.open('arretado');
        req.onerror = () => {
          rejeitar(new Error('falha ao abrir'));
        };
        req.onsuccess = () => {
          const tx = req.result.transaction('relatos', 'readonly');
          const todos = tx.objectStore('relatos').getAll();
          todos.onsuccess = () => {
            resolver(todos.result as unknown[]);
          };
        };
      }),
  );
  expect(JSON.stringify(relatos)).not.toContain('sigiloso');
  expect(relatos).toHaveLength(1);
});

test('importar pontos do edital por CSV e vincular um erro', async ({ page }) => {
  await page.goto('/#/plano');
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Altíssima\nDireito Penal;1;Furto;Alta\n',
      'utf8',
    ),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { name: 'Execução Penal' })).toBeVisible();

  // Disciplina e ponto opcionais, fora de "mais detalhes", lembrados no registro seguinte e
  // depois de recarregar (D25).
  await page.getByRole('link', { name: /^(Registrar erro|Novo registro de erro)$/ }).click();
  await page.getByLabel('Frase correta').fill('A fração da progressão é de 16%.');
  await page
    .getByLabel('Ponto do edital (opcional)')
    .selectOption({ label: '1 Progressão de regime' });
  await expect(page.getByLabel('Disciplina (opcional)').locator('option:checked')).toHaveText(
    'Execução Penal',
  );
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();
  await expect(
    page.getByText('A próxima fica em Execução Penal › Progressão de regime.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Registrar outra' }).click();
  await expect(page.getByLabel('Frase correta')).toBeFocused();
  await page.reload();
  await expect(page.getByLabel('Ponto do edital (opcional)')).toHaveValue(/.+/);
  await page.getByLabel('Frase correta').fill('Furto exige subtração.');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();

  // As duas na lista de frases.
  await page.goto('/#/recall/frases');
  await expect(page.getByText('A fração da progressão é de 16%.')).toBeVisible();
  await expect(page.getByText('Furto exige subtração.')).toBeVisible();
});

test('cota: do Recall ao primeiro cartão em 1 toque; 25 vencidos = 10 + "Revisar mais 10" + 5 (fatia 3)', async ({
  page,
}) => {
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  for (let i = 1; i <= 25; i += 1) {
    await page.goto('/#/recall/cartoes/novo');
    await page.getByLabel('Frente (pergunta)').fill(`Pergunta ${String(i)}`);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/#\/recall\/cartoes$/);
  }

  // Retorno depois de dias sem abrir: a fila acumulada não assusta nem zera nada.
  await page.clock.setFixedTime(new Date(inicio.getTime() + 5 * DIA));
  await page.goto('/#/recall');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Revisar 10 cartões' })).toBeVisible();
  await expect(page.getByText('cerca de 5 min')).toBeVisible();
  await expect(page.getByText(/Hoje: 10 de 25/)).toBeVisible();
  await expect(page.getByText('Nenhum dia nos últimos 7')).toBeVisible();

  await semViolacoes(page);

  // Meta da fatia 3: no máximo 2 toques até o primeiro cartão (aqui, 1).
  await page.getByRole('link', { name: 'Começar' }).click();
  await expect(page.getByText('1 de 10')).toBeVisible();

  const rodada = async (n: number) => {
    for (let i = 0; i < n; i += 1) {
      await page.getByRole('button', { name: 'Mostrar resposta' }).click();
      await page.getByRole('button', { name: 'Fácil' }).click();
    }
  };
  await rodada(10);
  await expect(page.getByText(/Restam 15 cartões para hoje/)).toBeVisible();
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Revisar mais 10' }).click();
  await expect(page.getByText('1 de 10')).toBeVisible();
  await rodada(10);
  await page.getByRole('button', { name: 'Revisar mais 5' }).click();
  await expect(page.getByText('1 de 5')).toBeVisible();
  await rodada(5);
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Revisar mais/ })).toHaveCount(0);

  await page.goto('/#/recall');
  await page.reload();
  await expect(page.getByText('1 dos últimos 7 dias')).toBeVisible();
});
