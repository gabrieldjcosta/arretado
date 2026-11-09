import type { Locator, Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

// O Hoje da Q5 (D-D9): a linha "Retomar em" (sem caneta, D-D12) e o "Em seguida"
// em <details> com "Trocar". Os testes de componente provam o texto e a troca; aqui rodam o teclado (que o
// jsdom não tem), o axe nos dois temas, os alvos de 44 px e a cara de cada mundo.

const ONTEM = new Date('2026-10-14T21:40:00-03:00');
const HOJE = new Date('2026-10-15T09:30:00-03:00');

/**
 * Um Hoje com três atividades: o cartão vencido é o Agora; a tarefa e a leitura salva ficam em "Em seguida".
 * Tudo é feito "ontem, 21h40" e o Hoje abre no dia seguinte: o relógio é fixo, então o texto é exato.
 */
async function prepararOHoje(page: Page) {
  await page.clock.setFixedTime(ONTEM);

  await page.goto('/#/plano/tarefas');
  await page.getByLabel('O que fazer?').fill('Ler arts. 112 a 117 da LEP');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(
    page.getByRole('region', { name: 'Fila' }).getByText('Ler arts. 112 a 117 da LEP'),
  ).toBeVisible();

  await page.goto('/#/recall/registrar');
  await page.getByLabel('Frase correta').fill('Livramento exige requisitos do art. 83 do CP.');
  await page.getByText('Mais detalhes (opcional)').click();
  await page.getByLabel('O que foi').fill('Confundi livramento condicional com progressão');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Frase registrada.')).toBeVisible();
  await expect(page.getByText(/Cartão criado/)).toBeVisible();

  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page
    .getByRole('region', { name: 'Normas' })
    .getByRole('link', { name: /LEP/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
  await page.getByRole('button', { name: 'Lido até aqui' }).click();
  await expect(page.locator('.marca-lido-ate')).toHaveText('Lido até aqui');

  // Sair do Leitor grava a posição: sair ainda "ontem", e só então virar o dia.
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  await page.clock.setFixedTime(HOJE);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Agora' })).toBeVisible();
}

const bloco = (page: Page) => page.locator('details.em-seguida-bloco');
const resumo = (page: Page) => page.locator('details.em-seguida-bloco > summary');
const estaAberto = (el: Locator) => el.evaluate((d) => (d as HTMLDetailsElement).open);

/**
 * Espera o fim das animações de abrir do "Em seguida" (180 ms, `translateY`). Medida no meio delas, a altura
 * sai com erro de float (44 − 2^-14 = 43,99994) e o alvo de 44 px parece falhar por nada.
 */
const emRepouso = (page: Page) =>
  page.evaluate(async () => {
    // Só as que terminam: uma animação infinita (um brilho, o Zé respirando) nunca resolve `finished` e
    // travava o teste até o tempo limite no CI.
    const animacoes = (
      document.querySelector('.em-seguida-bloco')?.getAnimations({ subtree: true }) ?? []
    ).filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? 0));
    await Promise.race([
      Promise.allSettled(animacoes.map((a) => a.finished)),
      new Promise((resolver) => setTimeout(resolver, 3000)),
    ]);
  });

/** Quanto a página passa da largura da janela (0 = nada rola de lado). */
const rolagemLateral = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const caixa = (el: Locator) =>
  el.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { esquerda: r.left, direita: r.right, topo: r.top, base: r.bottom, h: r.height };
  });

test('Hoje: "Retomar em", sem caneta, e o "Em seguida" pelo teclado', async ({ page }) => {
  test.setTimeout(120_000);
  await prepararOHoje(page);

  // A linha diz onde retomar e quando foi salvo, sem o "Você parou" que soa como dívida.
  const parada = page.locator('.parada');
  await expect(parada).toContainText('Retomar em LEP');
  await expect(parada).toContainText('salvo ontem, 21h40');
  await expect(parada).not.toContainText('Você parou');
  // A caneta saiu do Hoje (D-D12): nenhuma caneta na tela.
  await expect(page.locator('svg.caneta')).toHaveCount(0);

  // Fechado: o rótulo, a primeira atividade e quantas vêm depois; a lista só aparece aberta.
  await expect(resumo(page)).toContainText('Em seguida');
  await expect(resumo(page)).toContainText(/, mais 1$/);
  await expect(page.locator('.em-seguida-lista')).toBeHidden();
  await semViolacoes(page);

  // Enter e Espaço abrem e fecham, e o foco do teclado se vê.
  await resumo(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(resumo(page)).toBeFocused();
  const anel = await resumo(page).evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      visivel: el.matches(':focus-visible'),
      estilo: css.outlineStyle,
      largura: css.outlineWidth,
    };
  });
  expect(anel.visivel).toBe(true);
  expect(anel.estilo).not.toBe('none');
  expect(Number.parseFloat(anel.largura)).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Enter');
  await expect.poll(() => estaAberto(bloco(page))).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(() => estaAberto(bloco(page))).toBe(false);
  await page.keyboard.press('Space');
  await expect.poll(() => estaAberto(bloco(page))).toBe(true);

  // Aberto: a lista, com o nome e o tempo de cada atividade, e alvos de 44 px (resumo, linhas e opções).
  const linhas = page.locator('.em-seguida-lista > li');
  await expect(linhas).toHaveCount(2);
  await expect(linhas.first()).toContainText('Ler arts. 112 a 117 da LEP');
  await expect(linhas.nth(1)).toContainText('Continuar a leitura');
  await emRepouso(page);
  for (const alvo of [
    resumo(page),
    page.locator('.em-seguida-linha').first(),
    page.locator('.em-seguida-linha').nth(1),
  ]) {
    expect((await caixa(alvo)).h).toBeGreaterThanOrEqual(44);
  }
  await linhas.first().locator('summary').click();
  await emRepouso(page);
  for (const chip of await linhas.first().getByRole('button').all()) {
    expect((await caixa(chip)).h).toBeGreaterThanOrEqual(44);
  }
  expect(await rolagemLateral(page), 'sem rolagem lateral com tudo aberto').toBeLessThanOrEqual(0);
  await semViolacoes(page);
});

test('Hoje: "Trocar" muda a ordem só nesta visita e não grava nada', async ({ page }) => {
  test.setTimeout(120_000);
  await prepararOHoje(page);

  await resumo(page).click();
  const linhas = page.locator('.em-seguida-lista > li');
  await expect(linhas.first()).toContainText('Ler arts. 112 a 117 da LEP');

  // "Trocar" abre as atividades com algo a fazer hoje, a da linha marcada; "amanhã" não é oferecido.
  await linhas.first().getByText('Trocar', { exact: true }).click();
  const opcoes = linhas.first().getByRole('group', { name: 'Trocar por' });
  await expect(opcoes.getByRole('button')).toHaveText([
    'Ler arts. 112 a 117 da LEP',
    'Continuar a leitura',
  ]);
  await expect(opcoes.getByRole('button', { name: 'Ler arts. 112 a 117 da LEP' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(opcoes).not.toContainText('amanhã');
  await semViolacoes(page);

  // Trocar põe a leitura no primeiro lugar (e a tarefa no segundo); fechado, o resumo diz o novo primeiro.
  await opcoes.getByRole('button', { name: 'Continuar a leitura' }).click();
  await expect(linhas.first()).toContainText('Continuar a leitura');
  await expect(linhas.nth(1)).toContainText('Ler arts. 112 a 117 da LEP');
  await resumo(page).click();
  await expect(resumo(page)).toContainText('Continuar a leitura, mais 1');

  // Nada foi gravado: recarregar traz a ordem da decisão de volta.
  await page.reload();
  await expect(resumo(page)).toContainText('Ler arts. 112 a 117 da LEP, mais 1');
});

test('Hoje: a letra do rótulo muda de mundo, o movimento respeita o Calmo e nada vaza a 320 e 195 px', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'o tamanho da janela é do teste; basta um projeto');
  test.setTimeout(120_000);
  await prepararOHoje(page);

  const letra = () =>
    page.locator('.em-seguida-rotulo').evaluate((el) => getComputedStyle(el).fontFamily);

  // De dia o rótulo vem na letra de título; à noite, na da interface. A faixa de caneta sob o lugar da linha
  // de parada saiu na D-D16: a linha é só texto, igual nos dois mundos.
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await letra()).toMatch(/^"?Schibsted Grotesk/);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await letra()).toMatch(/^"?Atkinson Hyperlegible Next/);
  await page.emulateMedia({ colorScheme: null });

  await resumo(page).click();
  await page.locator('.em-seguida-lista > li').first().getByText('Trocar', { exact: true }).click();

  // Movimento: a seta gira e a lista desce em 180 ms; no perfil Calmo e com movimento reduzido, nada anda.
  const movimento = async () => [
    // A seta do "Começar uma Sessão" é a mesma (D-D16): aqui interessa a do bloco "Em seguida".
    await page
      .locator('.em-seguida-bloco .em-seguida-seta')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    await page.locator('.em-seguida-lista').evaluate((el) => getComputedStyle(el).animationName),
  ];
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await movimento()).toEqual(['0.18s', 'em-seguida-abre']);
  await page.evaluate(() => {
    document.documentElement.dataset.perfil = 'calmo';
  });
  expect(await movimento()).toEqual(['0s', 'none']);
  await page.evaluate(() => {
    delete document.documentElement.dataset.perfil;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await movimento()).toEqual(['0s', 'none']);
  await page.emulateMedia({ reducedMotion: null });

  // 320 px, e 195 px (o 200% de zoom de um celular de 390): a coluna não passa da tela com tudo aberto.
  for (const largura of [320, 195]) {
    await page.setViewportSize({ width: largura, height: 800 });
    await expect
      .poll(() => rolagemLateral(page), { message: `sem rolagem lateral a ${String(largura)} px` })
      .toBeLessThanOrEqual(0);
  }
});
