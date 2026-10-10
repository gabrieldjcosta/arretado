import type { Page } from '@playwright/test';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';
import type { ItemDoAcervo } from '../src/dominios/acervo/esquemas';
import { expect, semViolacoes, test } from './apoio';

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
async function servirAcervo(page: Page) {
  const fonte = await FonteEmMemoria.criar([
    {
      item: item('lep'),
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

  await page.getByRole('link', { name: 'Tudo do edital da DPE-SP' }).click();
  await expect(page.getByRole('heading', { name: 'Acervo: normas' })).toBeVisible();
  const exec = page.getByRole('region', { name: 'Execução Penal' });
  await expect(exec.getByText('Divergente do edital.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /SOLTA/ })).not.toBeChecked();
  await semViolacoes(page);

  await page.getByRole('button', { name: /^Adicionar 2 / }).click();
  await expect(page.getByText(/2 adicionadas/)).toBeVisible();
  await expect(exec.getByText('Já adicionada')).toBeVisible();

  // Depois de adicionadas, o acervo não faz falta: tudo funciona sem rede.
  // O acervo some: nada do que já foi adicionado depende dele.
  await page.unroute('**/acervo/*.json');
  await page.route('**/acervo/*.json', (rota) => rota.abort());
  await page.getByRole('link', { name: 'Normas', exact: true }).click();
  const execPenal = page.getByRole('region', { name: 'Execução Penal' });
  await expect(execPenal.getByText('LEP')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Infância' })).toBeVisible();
  await semViolacoes(page);
  await execPenal.getByRole('link', { name: /LEP/ }).click();
  await expect(page.getByText('Texto do primeiro artigo.')).toBeVisible();
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
