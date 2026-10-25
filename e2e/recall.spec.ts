import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

const DIA = 86_400_000;

/** As respostas da revisão: dentro da tela, com 44 px de altura, o rótulo dentro do botão e sem pisar umas nas outras. */
async function respostasCabem(page: Page) {
  const caixas = await page
    .getByRole('group', { name: 'Como foi?' })
    .getByRole('button')
    .evaluateAll((botoes) =>
      botoes.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, sobra: b.scrollWidth - b.clientWidth };
      }),
    );
  const largura = await page.evaluate(() => document.documentElement.clientWidth);
  expect(caixas).toHaveLength(3);
  for (const c of caixas) {
    expect(c.h).toBeGreaterThanOrEqual(44);
    expect(c.sobra).toBeLessThanOrEqual(0);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.x + c.w).toBeLessThanOrEqual(largura);
  }
  caixas.forEach((a, i) => {
    for (const b of caixas.slice(i + 1)) {
      const separados =
        a.x + a.w <= b.x + 0.5 ||
        b.x + b.w <= a.x + 0.5 ||
        a.y + a.h <= b.y + 0.5 ||
        b.y + b.h <= a.y + 0.5;
      expect(separados).toBe(true);
    }
  });
}

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

  // Captura em menos de 30 s (Parte 2 §17), pelo "+" do título do Hoje (P2 do Ponto de luz).
  const t0 = Date.now();
  // Só a frase correta é obrigatória (D25); "o que foi" fica em "mais detalhes".
  await page.getByRole('link', { name: 'Novo registro de erro' }).click();
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
  await expect(page.getByText('1 cartão vencido')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Começar', exact: true })).toHaveAttribute(
    'href',
    /#\/sessao\/iniciar\?tipo=revisao.*origem=revisao_vencida/,
  );
  await page.goto('/#/recall/revisar');
  await expect(page.getByText('Confundi livramento condicional com progressão')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Livramento exige requisitos do art. 83 do CP.')).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();

  await page.goto('/#/recall/frases');
  // Lista passiva.
  await expect(
    page.getByRole('link', { name: 'Livramento exige requisitos do art. 83 do CP.', exact: true }),
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
  // depois de recarregar (D25). O "+" fica no título do Hoje e do Fixar, não na Trilha.
  await page
    .getByRole('navigation', { name: 'Áreas' })
    .getByRole('link', { name: 'Fixar', exact: true })
    .click();
  await page.getByRole('link', { name: 'Novo registro de erro' }).click();
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
  // São 25 passagens de cartão: a conta é de toques, não de movimento.
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

test('Revisar frases e cartão com lacuna: esconder selecionando (Frases 2)', async ({ page }) => {
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  await page.goto('/#/recall/registrar');
  await page.getByLabel('Frase correta').fill('Livramento exige requisitos do art. 83 do CP.');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();

  // Cartão com lacuna: seleciona "art. 83" e esconde.
  await page.goto('/#/recall/frases');
  // P5: "Esconder trecho" é um alvo de toque inteiro (era 139 × 29 px).
  const esconder = page.getByRole('link', { name: /^Esconder trecho:/ });
  const caixa = await esconder.boundingBox();
  expect(caixa?.height).toBeGreaterThanOrEqual(44);
  expect(caixa?.width).toBeGreaterThanOrEqual(44);
  await esconder.click();
  await expect(page.getByRole('heading', { name: 'Esconder trecho' })).toBeVisible();
  await page.getByLabel('Texto da frase').evaluate((el: HTMLTextAreaElement) => {
    const i = el.value.indexOf('art. 83');
    el.focus();
    el.setSelectionRange(i, i + 'art. 83'.length);
  });
  await page.getByRole('button', { name: 'Esconder seleção' }).click();
  await expect(
    page.getByRole('region', { name: 'Como vai aparecer' }).getByText(/requisitos do \[…\] do CP/),
  ).toBeVisible();
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Criar cartão' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fixar' })).toBeVisible();

  // Dia seguinte: a Frase e o cartão vencem; cada modo revisa o seu.
  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/#/recall');
  await page.reload();
  // P5: as abas são Frases · Cartões · Histórico, e o Fixar cai nas Frases.
  await expect(
    page.getByRole('navigation', { name: 'Seções do Fixar' }).getByRole('link'),
  ).toHaveText(['Frases', 'Cartões', 'Histórico']);
  await expect(page).toHaveURL(/#\/recall\/frases$/);
  // Uma só ação para os dois tipos: cartões primeiro; ao fim, segue para as frases.
  await expect(page.getByRole('heading', { name: 'Revisar 1 cartão e 1 frase' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Revisar frases/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Começar' }).click();
  await expect(page.getByText('Livramento exige requisitos do […] do CP.')).toBeVisible();
  // P5: uma caneta por tela, encostada no cartão atual e deitada no fim da rodada.
  await expect(page.locator('svg.caneta')).toHaveAttribute('data-pose', 'encostada');
  await page.keyboard.press('Space');
  await expect(page.getByText('Frase completa')).toBeVisible();
  // P5: as três respostas cabem a 320 px e com a fonte ampliada (o terceiro desce de linha).
  const tela = page.viewportSize();
  await respostasCabem(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await respostasCabem(page);
  await page.setViewportSize({ width: 412, height: 915 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await respostasCabem(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  if (tela) await page.setViewportSize(tela);
  await semViolacoes(page);
  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();
  await expect(page.locator('svg.caneta')).toHaveAttribute('data-pose', 'deitada');
  await page.getByRole('link', { name: /^Seguir para as frases \(1\)$/ }).click();
  await expect(page.getByText('Livramento exige requisitos do art. 83 do CP.')).toBeVisible();
  await semViolacoes(page);
  await page.keyboard.press('1');
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();
});

test('certeza antes de ver a resposta: três chips de 44 px; tocar mostra a resposta; pular segue igual (AP-02)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  for (let i = 1; i <= 2; i += 1) {
    await page.goto('/#/recall/cartoes/novo');
    await page.getByLabel('Frente (pergunta)').fill(`Pergunta ${String(i)}`);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/#\/recall\/cartoes$/);
  }
  await page.clock.setFixedTime(new Date(inicio.getTime() + DIA));
  await page.goto('/#/recall/revisar');
  const grupo = page.getByRole('group', { name: 'Quanta certeza?' });
  await expect(grupo).toBeVisible();
  for (const nome of ['Chutando', 'Acho que sei', 'Tenho certeza']) {
    const caixa = await grupo.getByRole('button', { name: nome }).boundingBox();
    expect(caixa?.height).toBeGreaterThanOrEqual(44);
  }
  await semViolacoes(page);
  // Tela baixa (320 × 568): o rótulo e os chips não empurram "Mostrar resposta" para baixo da barra.
  await page.setViewportSize({ width: 320, height: 568 });
  const pular = await page.getByRole('button', { name: 'Mostrar resposta' }).boundingBox();
  expect((pular?.y ?? 0) + (pular?.height ?? 0)).toBeLessThan(568 - 80);
  await page.setViewportSize({ width: 390, height: 844 });
  await grupo.getByRole('button', { name: 'Tenho certeza' }).click();
  await respostasCabem(page);
  await page.getByRole('button', { name: 'De novo' }).click();
  // Segundo cartão: "Mostrar resposta" pula a certeza e tudo segue como antes.
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: 'Fácil' }).click();
  await expect(page.getByRole('heading', { name: 'Feito.' })).toBeVisible();
});
