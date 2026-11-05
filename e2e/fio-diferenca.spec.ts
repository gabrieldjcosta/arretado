import type { Page } from '@playwright/test';
import { expect, importarEPublicar, semViolacoesNoFio, test } from './apoio';

// O passo "Ache a diferença" (ideia 6 do Fio que ensina): dois artigos parecidos da LEP lado a lado (o Art. 120,
// permissão de saída, e o Art. 122, saída temporária), e a pessoa toca nas palavras que os separam. O gerador só o
// planeja numa etapa de quatro passos com um par da incidência; aqui o estado do Fio é posto à mão para o teste
// não depender de quantas etapas já se andaram. O navegador confere o que o jsdom não mede: o axe, a largura, o grifo
// que chega e o rodapé que só vem depois de achar (ou de pedir para ver).

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

const puxador = (page: Page) => page.getByRole('button', { name: /Puxar o fio/ });
const cartaoDa = (page: Page, nome: string) =>
  page.locator(`.m-tela:not(.m-saindo) .m-cartao[data-cartao="${nome}"]`);

async function comALeiNaPrevia(page: Page) {
  await page.goto('/#/plano');
  await page.getByRole('button', { name: 'Trazer meu edital' }).click();
  await page.getByLabel('Arquivo CSV').setInputFiles({
    name: 'ciclo.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });
  await page.getByRole('button', { name: 'Importar pontos' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Execução Penal' })).toBeVisible();
  await importarEPublicar(page, 'lep-compilado', 'LEP');
  await page.getByRole('button', { name: 'Mudar disciplina de LEP' }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Execução Penal' }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Disciplina de LEP atualizada.')).toBeVisible();
  await page.goto('/#/fio/ligar');
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await page.goto('/#/');
  await expect(puxador(page)).toBeVisible();
}

/** Abre o primeiro passo (o Fio grava a etapa) e troca a etapa por uma só com o par Art. 120 e Art. 122 da LEP. */
async function comOParNaEtapa(page: Page) {
  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(cartaoDa(page, 'ler')).toBeVisible();
  const trocou = await page.evaluate(() => {
    const chave = Object.keys(window.localStorage).find((k) => k.startsWith('arretado:fio:v1:'));
    if (chave === undefined) return false;
    const estado = JSON.parse(window.localStorage.getItem(chave) ?? '{}') as {
      etapa?: { passos: { normaId?: string; materiaId: string }[]; aberto?: number } & Record<
        string,
        unknown
      >;
    };
    const ler = estado.etapa?.passos[0];
    if (!estado.etapa || !ler?.normaId) return false;
    const nova: Record<string, unknown> = {
      ...estado.etapa,
      passos: [
        {
          tipo: 'ache_a_diferenca',
          materiaId: ler.materiaId,
          normaId: ler.normaId,
          tituloCurto: 'LEP',
          a: { endereco: 'art120', rotulo: 'Art. 120' },
          b: { endereco: 'art122', rotulo: 'Art. 122' },
        },
      ],
      fechados: [null],
    };
    delete nova.aberto;
    estado.etapa = nova as never;
    window.localStorage.setItem(chave, JSON.stringify(estado));
    return true;
  });
  expect(trocou).toBe(true);
  await page.goto('/#/');
  await page.reload();
  await expect(puxador(page)).toBeVisible();
  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);
}

test('Ache a diferença: tocar nas palavras grifa a diferença e o rodapé só vem depois', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await comALeiNaPrevia(page);
  await comOParNaEtapa(page);

  const cartao = cartaoDa(page, 'diferenca');
  await expect(cartao.locator('.m-olho').first()).toHaveText('Ache a diferença');
  await expect(
    cartao.getByRole('heading', { level: 2, name: 'Os dois se parecem. O que muda?' }),
  ).toBeVisible();
  const lados = cartao.locator('[data-lado]');
  await expect(lados).toHaveCount(2);
  // Os dois artigos cabem na largura do celular, um sobre o outro.
  const [a, b] = await Promise.all([lados.nth(0).boundingBox(), lados.nth(1).boundingBox()]);
  expect(a && b && b.y > a.y + a.height - 1).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(cartao.getByRole('button', { name: 'Seguir' })).toHaveCount(0);
  await semViolacoesNoFio(page);

  // Palavra igual nos dois: balança, apaga um pouco, avisa uma vez e não tranca nada.
  const igual = cartao.locator('.m-palavra:not(.m-diverge)').first();
  await igual.click();
  // O balanço roda de verdade (`transform` só vale na palavra solta, que é caixa própria).
  expect(await igual.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(igual).toHaveClass(/m-tentou/);
  await expect(page.getByText('Essa está igual nos dois. Procure de novo.')).toBeVisible();

  // Tocar nas que diferem as grifa; ao achar a última o rodapé troca para "Seguir".
  const diferentes = cartao.locator('.m-diverge');
  const quantas = await diferentes.count();
  expect(quantas).toBeGreaterThan(1);
  await diferentes.nth(0).click();
  expect(await diferentes.nth(0).evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  for (let i = 1; i < quantas; i++) await diferentes.nth(i).click();
  await expect(cartao.locator('.m-diverge.m-achada')).toHaveCount(quantas);
  await expect(cartao.locator('.m-retorno')).toContainText(`Achou as ${String(quantas)}.`);
  // O grifo se lê: fundo e letra com contraste (o axe não decide nada sobre fundo translúcido).
  await semViolacoesNoFio(page);
  await cartao.getByRole('button', { name: 'Seguir' }).click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  // O pouso abre na página em branco; "Pular" vai ao resumo, onde ficam os fatos.
  await page.getByRole('button', { name: 'Pular', exact: true }).click();
  await expect(page.getByText(/Achou a diferença entre os arts\. 120 e 122 \(LEP\)/)).toBeVisible();
});

test('Ache a diferença: "Mostrar a diferença" grifa o que faltou, em tela larga os artigos ficam lado a lado', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 900, height: 800 });
  await comALeiNaPrevia(page);
  await comOParNaEtapa(page);

  const cartao = cartaoDa(page, 'diferenca');
  const lados = cartao.locator('[data-lado]');
  await expect(lados).toHaveCount(2);
  const [a, b] = await Promise.all([lados.nth(0).boundingBox(), lados.nth(1).boundingBox()]);
  expect(a && b && b.x > a.x + a.width - 1).toBe(true);

  await cartao.getByRole('button', { name: 'Mostrar a diferença' }).click();
  await expect(cartao.locator('.m-diverge.m-mostrada').first()).toBeVisible();
  await expect(cartao.locator('.m-retorno')).toContainText('A diferença está grifada.');
  await semViolacoesNoFio(page);
  await cartao.getByRole('button', { name: 'Seguir' }).click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  // O pouso abre na página em branco; "Pular" vai ao resumo, onde ficam os fatos.
  await page.getByRole('button', { name: 'Pular', exact: true }).click();
  await expect(page.getByText(/Comparou os arts\. 120 e 122 \(LEP\)/)).toBeVisible();
});
