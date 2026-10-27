import type { Locator, Page } from '@playwright/test';
import type { ItemDoAcervo, PacoteDePartida } from '../src/dominios/acervo/esquemas';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';
import { expect, semViolacoes, test } from './apoio';

// Primeiro uso (Onda 1): da folha de boas-vindas ao Art. 1º de uma norma sem digitar e em três toques,
// e as duas telas novas ("Qual concurso você estuda?" e "Para começar") com o axe nos dois temas. O
// acervo e o pacote de partida são falsos (itens pequenos); o tempo e o peso das normas de verdade
// ficam para a medição manual do PR.

function item(id: string, tituloCurto: string, urlOficial?: string): ItemDoAcervo {
  return {
    id,
    versao: 1,
    norma: {
      tituloCurto,
      tipo: 'Lei',
      esfera: urlOficial?.includes('.sp.') ? 'estadual' : 'federal',
      ...(urlOficial ? { urlOficial } : {}),
    },
    nos: [
      {
        endereco: 'art1',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 1º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: `Texto do primeiro artigo de ${tituloCurto}.` }],
      },
      {
        endereco: 'art2',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 2º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: `Texto do segundo artigo de ${tituloCurto}.` }],
      },
    ],
  };
}

const norma = (id: string, titulo: string, editaisQueCitam: number, deQuantos: number) => ({
  id,
  titulo,
  editaisQueCitam,
  porcentagem: Math.round((editaisQueCitam / deQuantos) * 100),
});

const pacote: PacoteDePartida = {
  versao: 1,
  aprovadoEm: '2026-10-25',
  aprovadoPor: 'Teste',
  regra: 'Teste',
  carreiras: {
    'defensoria-publica': {
      nome: 'Defensoria Pública',
      editaisComTexto: 14,
      normas: [
        norma('constituicao-1988', 'Constituição Federal de 1988', 14, 14),
        norma('lei-federal-8078-1990', 'Código de Defesa do Consumidor', 13, 14),
        // Está no pacote e ainda não no acervo: a tela diz que falta, sem travar.
        norma('lei-federal-11340-2006', 'Lei Maria da Penha', 12, 14),
      ],
    },
    magistratura: {
      nome: 'Magistratura',
      editaisComTexto: 17,
      normas: [norma('constituicao-1988', 'Constituição Federal de 1988', 17, 17)],
    },
  },
};

/** Serve um acervo pequeno, o pacote de partida e (opcionalmente) um pacote quebrado. */
async function servirAcervo(page: Page, opcoes: { pacoteQuebrado?: boolean } = {}) {
  const fonte = await FonteEmMemoria.criar(
    [
      {
        item: item('lei-estadual-sp-1', 'Lei SP 1/2000', 'https://www.al.sp.gov.br/lei/1'),
        vinculos: [{ disciplina: 'Direito Constitucional' }],
      },
      {
        item: item('constituicao-1988', 'CF/88', 'https://www.planalto.gov.br/cf'),
        vinculos: [{ disciplina: 'Direito Constitucional' }],
      },
      {
        item: item('lei-federal-8078-1990', 'CDC', 'https://www.planalto.gov.br/cdc'),
        vinculos: [{ disciplina: 'Direito do Consumidor' }],
      },
    ],
    { pacote },
  );
  const indice = await fonte.listar();
  const itens = new Map(
    await Promise.all(indice.itens.map(async (i) => [i.id, await fonte.obter(i.id)] as const)),
  );
  const corpoDoPacote = await fonte.pacoteDePartida();
  await page.route('**/acervo/*.json', (rota) => {
    const nome = /\/acervo\/([^/]+)\.json$/.exec(rota.request().url())?.[1] ?? '';
    if (nome === 'pacote-de-partida') {
      // Resposta que não é um pacote (e não um aborto, que viraria falha no console).
      return rota.fulfill({ json: opcoes.pacoteQuebrado ? {} : corpoDoPacote });
    }
    const corpo = nome === 'indice' ? indice : itens.get(nome);
    return corpo
      ? rota.fulfill({ json: corpo })
      : rota.fulfill({ status: 404, body: 'não encontrado' });
  });
}

interface Gestos {
  toques: number;
  teclas: number;
}

/** Conta o que a pessoa faz de verdade (eventos confiáveis), desde o primeiro script da página. */
async function contarGestos(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __gestos: Gestos };
    w.__gestos = { toques: 0, teclas: 0 };
    window.addEventListener(
      'click',
      (e) => {
        if (e.isTrusted) w.__gestos.toques += 1;
      },
      true,
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.isTrusted) w.__gestos.teclas += 1;
      },
      true,
    );
  });
}
const gestos = (page: Page) =>
  page.evaluate(() => (window as unknown as { __gestos: Gestos }).__gestos);

/** Todo botão e link de ação tem 44 px de lado, no mínimo (0,01 de folga para o arredondamento). */
async function alvosDe44(alvos: Locator) {
  const quantos = await alvos.count();
  expect(quantos).toBeGreaterThan(0);
  for (let i = 0; i < quantos; i += 1) {
    const caixa = await alvos.nth(i).boundingBox();
    const nome = (await alvos.nth(i).textContent()) ?? String(i);
    expect(caixa?.height ?? 0, nome).toBeGreaterThanOrEqual(43.99);
    expect(caixa?.width ?? 0, nome).toBeGreaterThanOrEqual(43.99);
  }
}

const semRolagemLateral = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('primeiro uso, num aparelho novo', () => {
  // A Chegada precisa abrir: é de onde a contagem de toques parte.
  test.use({ semearAbertura: false });

  test('da Chegada ao Art. 1º em três toques, sem digitar', async ({ page }) => {
    await servirAcervo(page);
    await contarGestos(page);
    await page.goto('/#/');
    const chegada = page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    await expect(chegada).toBeVisible();

    const inicio = Date.now();
    await chegada.getByRole('link', { name: 'Escolher meu concurso' }).click();
    await page.getByRole('link', { name: /^Defensoria Pública/ }).click();
    // A Trilha do edital mais recente vem marcada: o mesmo toque monta as normas e a Trilha.
    const trilha = page.getByRole('checkbox', { name: /^Montar também a Trilha/ });
    await expect(trilha).toBeChecked();
    await expect(trilha).toHaveAccessibleName(/\d+ matérias, baseado no edital/);
    await page.getByRole('button', { name: 'Adicionar e ler' }).click();

    // A primeira norma da lista abre no Leitor, no começo: o Art. 1º já está na tela.
    await expect(page).toHaveURL(/#\/biblioteca\/normas\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'CF/88' })).toBeVisible();
    await expect(page.getByText('Texto do primeiro artigo de CF/88.')).toBeVisible();
    test
      .info()
      .annotations.push({ type: 'tempo', description: `${String(Date.now() - inicio)} ms` });

    expect(await gestos(page)).toEqual({ toques: 3, teclas: 0 });

    // As duas que o acervo tem entraram; a que falta no acervo não travou nada.
    await page.goto('/#/biblioteca');
    await expect(page.getByRole('region', { name: 'Normas' })).toBeVisible();
    await expect(page.getByText('CDC').first()).toBeVisible();
    await expect(page.getByText('Maria da Penha')).toHaveCount(0);

    // E a Trilha tem os Pontos do edital, sem nenhuma pergunta a mais.
    await page.goto('/#/plano');
    await expect(page.getByText(/^\d+ pontos\./)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ciclo de estudo' })).toBeVisible();
  });

  test('"Ler uma norma" e "Registrar um erro" seguem na folha, depois do caminho principal', async ({
    page,
  }) => {
    await servirAcervo(page);
    await page.goto('/#/');
    const chegada = page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    await expect(chegada).toBeVisible();
    const links = chegada.getByRole('link');
    await expect(links.nth(0)).toHaveText('Escolher meu concurso');
    await expect(links.nth(0)).toHaveClass(/principal/);
    await expect(links.nth(1)).toHaveText('Ler uma norma');
    await expect(links.nth(1)).not.toHaveClass(/principal/);
    await expect(links.nth(2)).toHaveText('Registrar um erro');
    await expect(links.nth(2)).not.toHaveClass(/principal/);
  });

  test('o Hoje vazio também começa por "Escolher meu concurso"', async ({ page }) => {
    await servirAcervo(page);
    await page.goto('/#/');
    await page
      .getByRole('dialog', { name: 'Boas-vindas ao Arretado!' })
      .getByRole('button', { name: 'Agora não' })
      .click();
    const comecos = page.getByRole('region', { name: 'Por onde começar' });
    await expect(comecos.getByRole('link', { name: 'Escolher meu concurso' })).toHaveClass(
      /principal/,
    );
    await comecos.getByRole('link', { name: 'Escolher meu concurso' }).click();
    await expect(page).toHaveURL(/#\/comecar$/);
  });

  test('a 320 × 568 a saída "Agora não" já está na primeira tela da folha, sem rolar', async ({
    page,
  }) => {
    await servirAcervo(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/#/');
    const chegada = page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    await expect(chegada.getByRole('button', { name: 'Agora não' })).toBeInViewport({ ratio: 1 });
  });

  test('"Rever as boas-vindas": ao dispensar a folha, com Esc ou com "Agora não", o foco volta ao Ajuda', async ({
    page,
  }) => {
    await servirAcervo(page);
    await page.goto('/#/');
    const chegada = page.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    await chegada.getByRole('button', { name: 'Agora não' }).click();
    const ajuda = page.getByRole('button', { name: 'Ajuda', exact: true });
    const reabrir = async () => {
      await ajuda.click();
      await page.getByRole('button', { name: 'Rever as boas-vindas' }).click();
      await expect(chegada).toBeVisible();
    };
    await reabrir();
    await page.keyboard.press('Escape');
    await expect(ajuda).toBeFocused();
    await reabrir();
    await chegada.getByRole('button', { name: 'Agora não' }).click();
    await expect(ajuda).toBeFocused();
  });
});

test.describe('as duas telas novas', () => {
  test('"Qual concurso você estuda?": as carreiras, sem violações do axe e com alvos de 44 px', async ({
    page,
  }) => {
    await servirAcervo(page);
    await page.goto('/#/comecar');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Qual concurso você estuda?' }),
    ).toBeVisible();
    const defensoria = page.getByRole('link', { name: /^Defensoria Pública/ });
    await expect(defensoria).toContainText('14 editais');
    await expect(page.getByRole('link', { name: /^Magistratura/ })).toContainText('17 editais');
    await expect(
      page.getByRole('link', { name: /^Outro concurso, ou ainda não sei/ }),
    ).toHaveAttribute('href', '#/biblioteca/acervo');
    await semViolacoes(page);
    await alvosDe44(page.locator('main').locator('a.botao, a[href^="#/comecar/"], button'));
    expect(await semRolagemLateral(page)).toBe(0);
  });

  test('"Para começar": as normas do acervo na ordem do pacote, o que falta, sem violações do axe', async ({
    page,
  }) => {
    await servirAcervo(page);
    await page.goto('/#/comecar/defensoria-publica');
    await expect(page.getByRole('heading', { level: 1, name: 'Para começar' })).toBeVisible();
    await expect(page.getByText('Defensoria Pública', { exact: true })).toBeVisible();
    const linhas = page.locator('main ul.comecar-normas li');
    await expect(linhas).toHaveText([
      'Constituição Federal de 198814 de 14 editais',
      'Código de Defesa do Consumidor13 de 14 editais',
    ]);
    await expect(page.getByText(/Faltam no acervo: Lei Maria da Penha\./)).toBeVisible();
    await semViolacoes(page);
    await alvosDe44(page.locator('main').locator('a.botao, button'));
    expect(await semRolagemLateral(page)).toBe(0);
  });

  test('com o pacote indisponível, diz o que fazer e deixa tentar de novo', async ({ page }) => {
    await servirAcervo(page, { pacoteQuebrado: true });
    await page.goto('/#/comecar');
    const falha = page.getByRole('alert');
    await expect(falha).toContainText('Não foi possível abrir a lista de concursos.');
    await expect(falha).toContainText('Nada foi perdido');
    await expect(page.getByRole('link', { name: 'Ir à Biblioteca' })).toBeVisible();
    await semViolacoes(page);

    await page.unroute('**/acervo/*.json');
    await servirAcervo(page);
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByRole('link', { name: /^Defensoria Pública/ })).toBeVisible();
  });
});

test.describe('o Acervo depois da escolha', () => {
  test('a lista abre pelo que vale em todo o país; a lei de um estado fica no fim do grupo', async ({
    page,
  }) => {
    await servirAcervo(page);
    await page.goto('/#/biblioteca/acervo');
    const grupo = page.getByRole('region', { name: 'Direito Constitucional' });
    const itens = grupo.getByRole('button').filter({ has: page.locator('.item-acervo-marca') });
    await expect(itens).toHaveCount(2);
    await expect(itens.first()).toContainText('CF/88');
    await expect(itens.last()).toContainText('Lei SP 1/2000');
  });

  test('depois de "Adicionar", o "Abrir" leva à norma', async ({ page }) => {
    await servirAcervo(page);
    await page.goto('/#/biblioteca/acervo');
    await page.getByRole('button', { name: /^CDC/ }).click();
    await page.getByRole('button', { name: /^Adicionar 1 / }).click();
    await expect(page.getByText(/1 adicionada\./)).toBeVisible();
    const aviso = page.getByRole('status').filter({ hasText: '1 adicionada.' });
    await aviso.getByRole('link', { name: 'Abrir' }).click();
    await expect(page).toHaveURL(/#\/biblioteca\/normas\/[^/]+$/);
    await expect(page.getByText('Texto do primeiro artigo de CDC.')).toBeVisible();
  });
});
