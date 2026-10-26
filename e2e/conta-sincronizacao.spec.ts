import type { Browser, BrowserContext, BrowserContextOptions, Page } from '@playwright/test';
import { test, expect, semViolacoes } from './apoio';
import { entrarPorCodigo, registrarFrase } from './conta-apoio';
import { ServidorDeSincronizacaoFalso } from './sincronizacao-servidor';

const EMAIL = 'tres-aparelhos@exemplo.com';
const FRASE_A = 'Frase feita no aparelho A.';

/** Outro aparelho: contexto novo (banco e localStorage próprios), com o mesmo servidor falso. */
async function novoAparelho(
  browser: Browser,
  opcoes: BrowserContextOptions,
  servidor: ServidorDeSincronizacaoFalso,
  nome: string,
): Promise<{ contexto: BrowserContext; page: Page; falhas: string[] }> {
  const contexto = await browser.newContext(opcoes);
  await servidor.instalar(contexto, nome);
  await contexto.addInitScript(() => {
    try {
      localStorage.setItem('arretado:chegada:v1', '{"vista":true}');
      localStorage.setItem('arretado:entrada-do-dia:v1', '{"dia":"9999-12-31"}');
    } catch {
      /* sem armazenamento */
    }
  });
  const page = await contexto.newPage();
  const falhas: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') falhas.push(m.text());
  });
  page.on('pageerror', (e) => falhas.push(e.message));
  return { contexto, page, falhas };
}

async function ligarSincronizacao(page: Page) {
  await page.goto('/#/conta/sincronizacao');
  await page.getByRole('button', { name: 'Ligar a sincronização' }).click();
  await expect(page.getByRole('heading', { name: 'Estado' })).toBeVisible();
}

async function escolherPerfil(page: Page, nome: string) {
  await page.goto('/#/conta/perfis');
  await page.getByRole('radio', { name: new RegExp(`^${nome}`) }).check();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('main').getByRole('status').filter({ hasText: nome })).toBeVisible();
}

test.describe('Sincronização entre aparelhos (F4-B, B4)', () => {
  // Três aparelhos e uma rodada com rede caindo: leva mais que o padrão.
  test.setTimeout(180_000);
  // O trecho sem rede faz o navegador registrar "Failed to load resource" para cada chamada que
  // caiu: é o esperado. Exceções não tratadas continuam vigiadas pelo `pageerror` abaixo.
  test.use({ permitirFalhasConsole: true });

  test('três aparelhos: ligar, "Igual nos seus aparelhos", posse e Conflito decidido sem perder dado', async ({
    page,
    browser,
    contextOptions,
  }) => {
    const servidor = new ServidorDeSincronizacaoFalso();
    await servidor.instalar(page.context(), 'A');
    const excecoesDeA: string[] = [];
    page.on('pageerror', (e) => excecoesDeA.push(e.message));

    // Aparelho A: entra, liga a sincronização (aceite v4 no servidor), registra uma Frase.
    await entrarPorCodigo(page, EMAIL);
    await ligarSincronizacao(page);
    expect(servidor.aceites).toEqual(['v4:sincronizar']);
    await expect(page.getByText('Este Aparelho.', { exact: true })).toBeVisible();
    await semViolacoes(page);
    await registrarFrase(page, FRASE_A);
    await page.goto('/#/conta/sincronizacao');
    await page.getByRole('button', { name: 'Sincronizar agora' }).click();
    await expect(page.getByText('Igual nos seus aparelhos')).toBeVisible({ timeout: 20_000 });

    // Aparelho B: mesma conta. A está em uso, então aqui começa em leitura, com a pergunta.
    const b = await novoAparelho(browser, contextOptions, servidor, 'B');
    await entrarPorCodigo(b.page, EMAIL);
    await ligarSincronizacao(b.page);
    // Na tela de Sincronização quem diz isto é o cartão "Quem está editando"; a faixa de cima só
    // aparece nas outras telas (o botão é o mesmo).
    await expect(b.page.getByRole('button', { name: 'Passar a editar aqui' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      b.page.getByRole('status').filter({ hasText: 'Outro Aparelho em uso' }),
    ).toHaveCount(0);
    await semViolacoes(b.page);
    // A Frase de A chegou a B pela recarga completa, antes de qualquer edição.
    await b.page.goto('/#/recall/frases');
    await expect(b.page.getByText(FRASE_A)).toBeVisible({ timeout: 20_000 });
    const faixaB = b.page.getByRole('status').filter({ hasText: 'Outro Aparelho em uso' });
    await expect(faixaB).toBeVisible();
    await semViolacoes(b.page);

    // "Passar a editar aqui": B assume; A descobre na renovação seguinte e vira só leitura.
    await b.page.getByRole('button', { name: 'Passar a editar aqui' }).click();
    await expect(faixaB).toHaveCount(0);
    expect(servidor.donoDaPosse).not.toBeNull();
    await page.goto('/#/recall/frases');
    const faixaA = page.getByRole('status').filter({ hasText: 'Outro Aparelho em uso' });
    await expect(faixaA).toBeVisible({ timeout: 20_000 });

    // Conflito: A sem rede edita mesmo assim (Q1); B, com a posse, muda o mesmo registro.
    servidor.cortarRede('A');
    await page.context().setOffline(true);
    await expect(
      page.getByRole('status').filter({ hasText: 'Sem confirmar qual Aparelho' }),
    ).toBeVisible({ timeout: 20_000 });
    await escolherPerfil(page, 'Guiado');
    await escolherPerfil(b.page, 'Leitura');
    await b.page.goto('/#/conta/sincronizacao');
    await b.page.getByRole('button', { name: 'Sincronizar agora' }).click();
    await expect(b.page.getByText('Igual nos seus aparelhos')).toBeVisible({ timeout: 20_000 });

    servidor.religarRede('A');
    await page.context().setOffline(false);
    await page.goto('/#/conta/sincronizacao');
    await page.getByRole('button', { name: 'Sincronizar agora' }).click();
    await expect(page.getByRole('link', { name: '1 Conflito para decidir' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('link', { name: '1 Conflito para decidir' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Preferências/ })).toBeVisible();
    await expect(page.locator('mark', { hasText: 'guiado' })).toBeVisible();
    await expect(page.locator('mark', { hasText: 'leitura' })).toBeVisible();
    await semViolacoes(page);
    // O cartão tem recuo e as versões cabem dentro dele, e a tela não rola na horizontal nem com a
    // letra a 200% (a regra de lista de linhas vencia o recuo do cartão; a grade de 16 rem estourava).
    const cartao = await page.locator('.conflito').boundingBox();
    const versao = await page.locator('.versao-conflito').first().boundingBox();
    if (!cartao || !versao) throw new Error('O cartão do Conflito não tem caixa na tela.');
    expect(versao.x - cartao.x).toBeGreaterThanOrEqual(12);
    expect(cartao.x + cartao.width - (versao.x + versao.width)).toBeGreaterThanOrEqual(12);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
    await page.getByRole('button', { name: 'Ficar com a deste Aparelho' }).click();
    await expect(page.getByText('Nenhum Conflito. Seus Aparelhos concordam.')).toBeVisible();

    // A escolha chega a B: o perfil Guiado passa a valer lá também.
    await b.page.goto('/#/conta/perfis');
    await expect(b.page.getByRole('radio', { name: /^Guiado \(em uso\)/ })).toBeVisible({
      timeout: 20_000,
    });

    // Aparelho C: B fechou (soltou a posse) e A ficou sem rede; passados 60 s sem sinal de
    // ninguém, a posse vem sem pergunta.
    await b.contexto.close();
    servidor.cortarRede('A');
    servidor.avancarRelogio(61_000);
    const c = await novoAparelho(browser, contextOptions, servidor, 'C');
    await entrarPorCodigo(c.page, EMAIL);
    await ligarSincronizacao(c.page);
    await expect(c.page.getByText('Este Aparelho.', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await c.page.goto('/#/recall/frases');
    await expect(c.page.getByText(FRASE_A)).toBeVisible({ timeout: 20_000 });
    await expect(c.page.getByRole('status').filter({ hasText: 'Outro Aparelho' })).toHaveCount(0);

    expect(excecoesDeA, 'exceções em A').toEqual([]);
    expect(b.falhas, 'falhas no console de B').toEqual([]);
    expect(c.falhas, 'falhas no console de C').toEqual([]);
    await c.contexto.close();
  });
});
