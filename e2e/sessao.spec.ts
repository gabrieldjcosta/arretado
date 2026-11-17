import type { Page } from '@playwright/test';
import { abrirOLembrete, expect, semViolacoes, test } from './apoio';

/** Começa uma Sessão leve pela tela de começar e espera a tela da Sessão. */
async function iniciarSessao(page: Page) {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
}

test('Sessão leve: começa, pausa, volta ao reabrir, fecha com próximo passo (A2)', async ({
  page,
}) => {
  await page.goto('/#/sessao/iniciar');
  await expect(page.getByRole('heading', { level: 1, name: 'Começar uma Sessão' })).toBeVisible();
  await semViolacoes(page);

  await page.getByText('Definir até onde (opcional)').click();
  await page.getByLabel('O que vai estudar?').fill('Lei de Execução Penal');
  await page.getByLabel('Até onde?').fill('até o art. 15');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
  await semViolacoes(page);

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pausada' })).toBeVisible();
  await semViolacoes(page);

  // Ao voltar (recarregar), a Sessão aberta continua lá.
  await page.reload();
  await expect(page.getByText('Até onde: até o art. 15')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à Sessão' }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

  await page.getByRole('link', { name: 'Encerrar' }).click();
  const campo = page.getByLabel('Próximo passo (opcional)');
  await expect(campo).toHaveValue('Continuar depois de até o art. 15');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();
  await semViolacoes(page);
});

test('Sessão: bloquinho de distrações e só estudo (A3a)', async ({ page }) => {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();

  await page.getByRole('button', { name: /bloquinho/ }).click();
  const campo = page.getByLabel('Anotar uma distração');
  await campo.fill('ver o preço do livro');
  await campo.press('Enter');
  await expect(page.getByText('Guardado para depois.')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('checkbox', { name: 'Só estudo' }).click();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeHidden();
  await semViolacoes(page);
  await page.getByRole('checkbox', { name: 'Só estudo' }).click();
  await expect(page.getByRole('navigation', { name: 'Lugares' })).toBeVisible();
  await semViolacoes(page);

  // Recarregar não perde nada; ao fechar, a nota aparece para marcar.
  await page.reload();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByLabel('ver o preço do livro').click();
  await expect(page.getByLabel('ver o preço do livro')).toBeChecked();
  await semViolacoes(page);
});

test('A nota guardada na Sessão fica no Lembrete do "+" até ser marcada como resolvida', async ({
  page,
}) => {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('button', { name: /bloquinho/ }).click();
  const campo = page.getByLabel('Anotar uma distração');
  await campo.fill('ligar para o cartório');
  await campo.press('Enter');
  await expect(page.getByText('Guardado para depois.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();

  await page.goto('/#/recall');
  const dialogo = await abrirOLembrete(page);
  const lista = dialogo.getByRole('list', { name: 'Guardado nas Sessões' });
  const caixa = lista.getByRole('checkbox', { name: 'ligar para o cartório' });
  await expect(caixa).not.toBeChecked();
  await semViolacoes(page);

  await caixa.click();
  await expect(caixa).toBeChecked();
  await semViolacoes(page);

  // Resolvida, a nota não volta ao abrir o Lembrete de novo.
  await page.reload();
  const outra = await abrirOLembrete(page);
  await expect(outra.getByRole('textbox', { name: 'Lembrete' })).toBeVisible();
  await expect(outra.getByRole('list', { name: 'Guardado nas Sessões' })).toHaveCount(0);
});

test('Fora da Sessão, o relógio fica no canto, sem cobrir a pílula dos lugares, e o bloquinho abre sobre ele', async ({
  page,
}) => {
  await iniciarSessao(page);
  await page.goto('/#/biblioteca');
  const relogio = page.getByRole('button', { name: /Abrir o bloquinho/ });
  await expect(relogio).toBeVisible();
  const pilula = await page.getByRole('navigation', { name: 'Lugares' }).boundingBox();
  const caixa = await relogio.boundingBox();
  expect(pilula && caixa).toBeTruthy();
  if (pilula && caixa) {
    // Do tablet em pé (768 px) para cima os lugares ficam no menu lateral, à esquerda (layout B, 17/11): o relógio não o cobre.
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      expect(caixa.x).toBeGreaterThanOrEqual(pilula.x + pilula.width);
    } else expect(caixa.y + caixa.height).toBeLessThanOrEqual(pilula.y);
  }
  await relogio.click();
  await page.getByLabel('Anotar uma distração').fill('comprar café');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Guardado para depois.')).toBeVisible();
});

test('Sessão: no fim da tela o relógio assenta abaixo do fim do texto e acima da pílula dos lugares (texto a 200%)', async ({
  page,
}) => {
  await iniciarSessao(page);
  await page.goto('/#/biblioteca');
  // Celular com o texto ampliado: a tela passa de duas alturas e o fim do texto desce até o canto do relógio.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const relogio = page.getByRole('button', { name: /Abrir o bloquinho/ });
  /** O fim do último texto à vista da tela (a caixa de cada linha, não a do bloco). */
  const fimDoTexto = () =>
    page.evaluate(() => {
      const raiz = document.getElementById('conteudo');
      if (!raiz) return null;
      let fim: number | null = null;
      // 4 = NodeFilter.SHOW_TEXT
      const passeio = document.createTreeWalker(raiz, 4);
      for (let no = passeio.nextNode(); no; no = passeio.nextNode()) {
        if (!(no.textContent ?? '').trim() || !no.parentElement?.checkVisibility()) continue;
        const faixa = document.createRange();
        faixa.selectNodeContents(no);
        for (const c of faixa.getClientRects()) {
          if (c.width > 1 && c.height > 1) fim = Math.max(fim ?? c.bottom, c.bottom);
        }
      }
      return fim;
    });
  const pilula = page.getByRole('navigation', { name: 'Lugares' });
  // O fim da página pode crescer depois do primeiro rolar (fontes e dados chegando): rola de novo a cada leitura.
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      const [r, l, a] = await Promise.all([
        relogio.boundingBox(),
        fimDoTexto(),
        pilula.boundingBox(),
      ]);
      if (!r || l === null || !a) return 'sem caixa: ' + JSON.stringify({ r, l, a });
      const ok = l <= r.y && r.y + r.height <= a.y;
      return ok ? 'ok' : 'fora de ordem: ' + JSON.stringify({ r, l, a });
    })
    .toBe('ok');
});

test('Sessão: na própria tela o relógio não cobre Pausar nem Encerrar (tela baixa e texto a 200%)', async ({
  page,
}) => {
  await iniciarSessao(page);
  const medidas = [
    { largura: 320, altura: 460, fonte: '100%' },
    { largura: 360, altura: 740, fonte: '200%' },
    { largura: 390, altura: 844, fonte: '200%' },
  ];
  for (const { largura, altura, fonte } of medidas) {
    await page.setViewportSize({ width: largura, height: altura });
    await page.evaluate((tamanho) => {
      document.documentElement.style.fontSize = tamanho;
      window.scrollTo(0, 0);
    }, fonte);
    const controles = [
      page.getByRole('button', { name: 'Pausar', exact: true }),
      page.getByRole('link', { name: 'Encerrar' }).first(),
    ];
    const relogio = await page.getByRole('button', { name: /Abrir o bloquinho/ }).boundingBox();
    expect(relogio).toBeTruthy();
    for (const controle of controles) {
      const caixa = await controle.boundingBox();
      expect(caixa).toBeTruthy();
      if (!relogio || !caixa) continue;
      const cruza =
        caixa.x < relogio.x + relogio.width &&
        caixa.x + caixa.width > relogio.x &&
        caixa.y < relogio.y + relogio.height &&
        caixa.y + caixa.height > relogio.y;
      expect(cruza, `${String(largura)} px, texto a ${fonte}: controle sob o relógio`).toBe(false);
    }
  }
});

test('Sessão: o aviso do bloquinho vem à vista quando o painel rola por dentro (320 px de largura e texto a 200%)', async ({
  page,
}) => {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.getByRole('button', { name: /bloquinho/ }).click();
  const campo = page.getByLabel('Anotar uma distração');
  await campo.fill('ver o preço do livro');
  await campo.press('Enter');
  await expect(page.getByText('Guardado para depois.')).toBeInViewport();
});
