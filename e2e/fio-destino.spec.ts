import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoes, test } from './apoio';

// O Destino do Arretado novo (prévia do Fio, D-D25): o Nordeste de verdade, a matéria do Ciclo em cada estado e o
// caminho da pessoa por cima. O jsdom não mede layout nem cor; aqui o navegador confere que o mapa cabe na tela
// (celular, tablet e monitor), que passa no axe nos dois mundos, que a câmera responde (botões, teclado e a
// chegada de longe) e que a ficha de um lugar abre, cabe e fecha com Escape.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/** Edital pelo CSV (cria a disciplina) e a prévia ligada. Com `comLei`, a LEP importada e ligada à matéria. */
async function prepararAPrevia(page: Page, comLei: boolean) {
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();

  if (comLei) {
    await importarEPublicar(page, 'lep-compilado', 'LEP');
    await page.getByRole('button', { name: 'Mudar disciplina de LEP' }).click();
    await page.getByRole('dialog').getByRole('checkbox', { name: 'Execução Penal' }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Disciplina de LEP atualizada.')).toBeVisible();
  }

  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
}

const mapa = (page: Page) => page.getByRole('group', { name: 'Mapa do caminho pelo Nordeste' });

/** A escala da câmera (pixels por unidade do desenho): sobe quando o mapa se aproxima. */
const escala = (page: Page) =>
  mapa(page).evaluate((el) => Number(el.style.getPropertyValue('--cam-k')));

/** Nada pode rolar de lado nem passar da largura da tela. */
async function semRolagemLateral(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test('o mapa cabe na tela, passa no axe e a câmera responde aos botões e ao teclado', async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Sem movimento, a câmera já nasce em torno da pessoa: os números não dependem de um voo.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararAPrevia(page, false);

  await page.goto('/#/destino');
  await expect(
    page.getByRole('heading', { level: 1, name: 'O caminho começa aqui' }),
  ).toBeVisible();
  await expect(mapa(page)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Legenda do mapa' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ir ao Agora/ })).toBeVisible();

  // A caixa do mapa cabe na largura da tela e não é uma faixa sem altura.
  const caixa = await mapa(page).boundingBox();
  const largura = page.viewportSize()?.width ?? 0;
  expect(caixa).not.toBeNull();
  expect(caixa?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(largura);
  expect(caixa?.height ?? 0).toBeGreaterThan(300);
  await semRolagemLateral(page);
  await semViolacoes(page);

  // Aproximar e afastar soltam a câmera (o botão passa a dizer "Voltar para você"); ele a traz de volta, e
  // "Ver o Nordeste" abre o mapa todo.
  const perto = await escala(page);
  await page.getByRole('button', { name: 'Aproximar' }).click();
  await expect.poll(() => escala(page)).toBeGreaterThan(perto * 1.3);
  await page.getByRole('button', { name: 'Afastar' }).click();
  await page.getByRole('button', { name: 'Afastar' }).click();
  await expect.poll(() => escala(page)).toBeLessThan(perto * 0.9);
  await page.getByRole('button', { name: 'Voltar para você' }).click();
  await expect(page.getByRole('button', { name: 'Ver o Nordeste' })).toBeVisible();
  await expect.poll(() => escala(page)).toBeCloseTo(perto, 1);
  await page.getByRole('button', { name: 'Ver o Nordeste' }).click();
  await expect(page.getByRole('button', { name: 'Voltar para você' })).toBeVisible();
  await expect.poll(() => escala(page)).toBeLessThan(perto * 0.7);
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Voltar para você' }).click();
  await expect.poll(() => escala(page)).toBeCloseTo(perto, 1);

  // Com o foco na caixa, mais e menos aproximam e afastam, e zero volta para a pessoa.
  await mapa(page).focus();
  await page.keyboard.press('+');
  await expect.poll(() => escala(page)).toBeGreaterThan(perto * 1.3);
  await page.keyboard.press('0');
  await expect.poll(() => escala(page)).toBeCloseTo(perto, 1);
  await semRolagemLateral(page);
});

test('a ficha de um lugar abre dentro da tela, passa no axe e fecha com Escape devolvendo o foco', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepararAPrevia(page, false);
  await page.goto('/#/destino');
  await expect(mapa(page)).toBeVisible();

  const lugar = page.getByRole('button', { name: /você está aqui: abrir a ficha/ });
  await lugar.click();
  const ficha = page.getByRole('region', { name: /^Ficha de / });
  await expect(ficha).toBeVisible();
  await expect(ficha).toBeFocused();
  await expect(ficha.getByText(/Rascunho da pesquisa/)).toBeVisible();

  // A ficha cabe inteira dentro da caixa do mapa.
  const dentro = await ficha.boundingBox();
  const fora = await mapa(page).boundingBox();
  expect(dentro).not.toBeNull();
  expect(fora).not.toBeNull();
  expect(dentro?.x ?? 0).toBeGreaterThanOrEqual((fora?.x ?? 0) - 1);
  expect((dentro?.x ?? 0) + (dentro?.width ?? 0)).toBeLessThanOrEqual(
    (fora?.x ?? 0) + (fora?.width ?? 0) + 1,
  );
  expect((dentro?.y ?? 0) + (dentro?.height ?? 0)).toBeLessThanOrEqual(
    (fora?.y ?? 0) + (fora?.height ?? 0) + 1,
  );
  await semViolacoes(page);

  await page.keyboard.press('Escape');
  await expect(ficha).toBeHidden();
  await expect(lugar).toBeFocused();

  // Tocar numa porteira fala em palavras (aviso com `role="status"`), sem abrir ficha.
  // O foco leva a câmera até a porteira (a caixa não rola); o Enter a toca.
  await page
    .getByRole('button', { name: /^Porteira de Execução Penal/ })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: /porteira/i })).toBeVisible();
  await semViolacoes(page);
});

test('com a LEP, os artigos que caem viram pontos que abrem o Leitor, e o mapa chega de longe até a pessoa', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await prepararAPrevia(page, true);

  await page.goto('/#/destino');
  await expect(mapa(page)).toBeVisible();
  // A câmera começa no Nordeste todo e, passado um instante, se aproxima da pessoa.
  const longe = await escala(page);
  await expect.poll(() => escala(page), { timeout: 12_000 }).toBeGreaterThan(longe * 1.4);

  const ponto = page.getByRole('link', { name: /abrir no Leitor$/ }).first();
  await expect(ponto).toBeAttached();
  await expect(page.getByText(/do que mais cai em Execução Penal já é seu/)).toBeVisible();
  await semRolagemLateral(page);
  await semViolacoes(page);

  // O ponto é um link para o Leitor, no artigo.
  await ponto.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/biblioteca\/normas\/.+foco=artigo/);
});
