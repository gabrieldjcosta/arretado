import type { Page } from '@playwright/test';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';
import type { ItemDoAcervo } from '../src/dominios/acervo/esquemas';
import { expect, semViolacoes, test, abrirTodasAsNormas } from './apoio';

function item(id: string): ItemDoAcervo {
  return {
    id,
    versao: 1,
    norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
    nos: [
      {
        endereco: 'art1',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 1º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: 'Texto do primeiro artigo.' }],
      },
      {
        endereco: 'art2',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 2º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: 'Texto do segundo artigo.' }],
      },
    ],
  };
}

/** Serve um acervo de 3 itens no lugar de `/acervo/*` (o do site ainda não tem lote). */
async function servirAcervo(page: Page, versaoDaLep = 1, textoNovo = false) {
  const lep = item('lep');
  const [primeiro] = lep.nos;
  if (textoNovo && primeiro)
    primeiro.trechos = [{ texto: 'Texto do primeiro artigo, agora com prazo de seis meses.' }];
  const fonte = await FonteEmMemoria.criar([
    {
      item:
        versaoDaLep === 1
          ? lep
          : { ...lep, versao: versaoDaLep, nos: textoNovo ? lep.nos : lep.nos.slice(0, 1) },
      vinculos: [{ disciplina: 'Execução Penal', subtitulo: 'Lei toda' }],
      avisos: ['Divergente do edital.'],
    },
    { item: item('eca'), vinculos: [{ disciplina: 'Infância' }] },
    { item: item('solta') },
  ]);
  const indice = await fonte.listar();
  const itens = new Map(
    await Promise.all(indice.itens.map(async (i) => [i.id, await fonte.obter(i.id)] as const)),
  );
  await page.route('**/acervo/*.json', (rota) => {
    const nome = /\/acervo\/([^/]+)\.json$/.exec(rota.request().url())?.[1] ?? '';
    const corpo = nome === 'indice' ? indice : itens.get(nome);
    return corpo
      ? rota.fulfill({ json: corpo })
      : rota.fulfill({ status: 404, body: 'não encontrado' });
  });
}

test('acervo: "Tudo do edital" adiciona, lista por disciplina e lê offline (3c)', async ({
  page,
}) => {
  await servirAcervo(page);
  await page.goto('/#/biblioteca');
  await expect(page.getByRole('heading', { name: 'Nenhuma norma ainda' })).toBeVisible();
  await semViolacoes(page);

  await page.goto('/#/biblioteca/acervo?tudo=1');
  await expect(page.getByRole('heading', { name: 'Acervo: normas' })).toBeVisible();
  const exec = page.getByRole('region', { name: 'Execução Penal' });
  await expect(exec.getByText('Divergente do edital.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^SOLTA/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await semViolacoes(page);

  await page.getByRole('button', { name: /^Adicionar 2 / }).click();
  await expect(page.getByText(/2 adicionadas/)).toBeVisible();
  await expect(exec.getByText('Já adicionada')).toBeVisible();

  // Depois de adicionadas, o acervo não faz falta: tudo funciona sem rede.
  // O acervo some: nada do que já foi adicionado depende dele.
  await page.unroute('**/acervo/*.json');
  // Resposta vazia (e não abortada): a Biblioteca consulta o índice para o selo "Há versão nova" e
  // ignora o que não é um índice; um aborto viraria falha no console.
  await page.route('**/acervo/*.json', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.getByRole('link', { name: 'Normas', exact: true }).click();
  await abrirTodasAsNormas(page);
  // R1: uma linha por norma, com a disciplina no apoio.
  const normas = page.getByRole('region', { name: 'Normas' });
  const linhaLep = normas.getByRole('link', { name: /^LEP/ });
  await expect(linhaLep).toContainText('Execução Penal');
  await expect(normas.getByRole('link', { name: /^ECA/ })).toContainText('Infância');
  await semViolacoes(page);
  await linhaLep.click();
  await expect(page.getByText('Texto do primeiro artigo.')).toBeVisible();
});

test('acervo: escolher a disciplina ao adicionar e mudá-la depois (Ajustes A)', async ({
  page,
}) => {
  await servirAcervo(page);
  await page.goto('/#/biblioteca/acervo');
  const lep = page.getByRole('region', { name: 'Execução Penal' });
  await expect(lep.getByText('Disciplinas sugeridas: Execução Penal')).toBeVisible();
  await page.getByRole('button', { name: 'Alterar disciplina de LEP' }).click();
  const dialogo = page.getByRole('dialog');
  await semViolacoes(page);
  await dialogo.getByRole('checkbox', { name: 'Execução Penal' }).uncheck();
  await dialogo.getByRole('checkbox', { name: 'Outros' }).check();
  await dialogo.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Disciplinas sugeridas: Outros').first()).toBeVisible();

  await page.getByRole('button', { name: /^LEP/ }).click();
  await page.getByRole('button', { name: /^Adicionar 1 / }).click();
  await expect(page.getByText(/1 adicionada\./)).toBeVisible();

  await page.getByRole('link', { name: 'Normas', exact: true }).click();
  await abrirTodasAsNormas(page);
  await expect(page.getByRole('link', { name: /^LEP/ })).not.toContainText('Execução Penal');
  await page.getByRole('button', { name: 'Mudar disciplina de LEP' }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Execução Penal' }).check();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Disciplina de LEP atualizada.')).toBeVisible();
  await expect(page.getByRole('link', { name: /^LEP/ })).toContainText('Execução Penal');
  await semViolacoes(page);
});

test('acervo: versão nova avisa, mostra a prévia e atualiza (6a)', async ({ page }) => {
  await servirAcervo(page);
  await page.goto('/#/biblioteca/acervo');
  await page.getByRole('button', { name: /^LEP/ }).click();
  await page.getByRole('button', { name: /^Adicionar 1 / }).click();
  await expect(page.getByText(/1 adicionada\./)).toBeVisible();
  await expect(page.getByText('Há versão nova')).toHaveCount(0);

  await page.unroute('**/acervo/*.json');
  await servirAcervo(page, 2);
  await page.reload();
  await expect(page.getByText(/Há versão nova/)).toBeVisible();
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText(/1 saem da norma/)).toBeVisible();
  await semViolacoes(page);
  await dialogo.getByRole('button', { name: 'Atualizar agora' }).click();
  await expect(page.getByText(/Há versão nova/)).toHaveCount(0);
});

test('acervo: a lei mudou avisa o que você guardou sobre o artigo, com antes e agora (AP-05)', async ({
  page,
}) => {
  await servirAcervo(page);
  await page.goto('/#/biblioteca/acervo');
  await page.getByRole('button', { name: /^LEP/ }).click();
  await page.getByRole('button', { name: /^Adicionar 1 / }).click();
  await expect(page.getByText(/1 adicionada\./)).toBeVisible();
  await page.getByRole('link', { name: 'Normas', exact: true }).click();
  await abrirTodasAsNormas(page);
  await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /^LEP/ }).click();
  await expect(page.getByText('Texto do primeiro artigo.')).toBeVisible();
  await page.locator('[data-endereco="art1"]').hover();
  const estrela = page.getByRole('button', { name: 'Estrela: Art. 1º' });
  await estrela.click();
  await expect(estrela).toHaveAttribute('aria-pressed', 'true');
  await page.unroute('**/acervo/*.json');
  await servirAcervo(page, 2, true);
  await page.goto('/#/biblioteca/acervo');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar agora' }).click();
  await expect(page.getByText(/Há versão nova/)).toHaveCount(0);

  // O Hoje avisa e leva à norma.
  await page.goto('/#/');
  const noHoje = page.getByRole('region', { name: 'A lei mudou' });
  await expect(noHoje).toContainText('o texto mudou em 1 dispositivo em que você guardou algo');
  await semViolacoes(page);
  await noHoje.getByRole('link', { name: /^Ver o que mudou em / }).click();
  const aviso = page.getByRole('region', { name: 'A lei mudou' });
  await expect(aviso).toContainText('Antes: Texto do primeiro artigo.');
  await expect(aviso).toContainText(
    'Agora: Texto do primeiro artigo, agora com prazo de seis meses.',
  );
  await expect(aviso).toContainText('Estrela');
  await semViolacoes(page);
  const ja = aviso.getByRole('button', { name: /^Já reli/ });
  expect((await ja.boundingBox())?.height).toBeGreaterThanOrEqual(24);
  await ja.click();
  await expect(aviso).toHaveCount(0);
});

test.describe('sem rede', () => {
  test.use({ permitirFalhasConsole: true });

  test('acervo: sem rede, mostra a falha e deixa tentar de novo (3c)', async ({ page }) => {
    await page.route('**/acervo/*.json', (rota) => rota.abort());
    await page.goto('/#/biblioteca/acervo');
    await expect(page.getByText('Não foi possível abrir o acervo.')).toBeVisible();
    await semViolacoes(page);
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });
});
