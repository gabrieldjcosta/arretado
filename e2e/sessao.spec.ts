import type { Page } from '@playwright/test';
import { expect, semViolacoes, test } from './apoio';

/** Com um cartão vencido o Hoje tem uma ação; no Hoje vazio o começo é um só e não há cartão de Sessão. */
async function abrirHojeComAgora(page: Page) {
  const inicio = new Date('2026-09-23T12:00:00-03:00');
  await page.clock.setFixedTime(inicio);
  await page.goto('/#/recall/cartoes/novo');
  await page.getByLabel('Frente (pergunta)').fill('Pergunta');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(/#\/recall\/cartoes$/);
  await page.clock.setFixedTime(new Date(inicio.getTime() + 86_400_000));
  await page.goto('/#/');
  await page.reload();
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

test('Hoje: fechar o Dia depois de uma Sessão e reabrir (A3b)', async ({ page }) => {
  await page.goto('/#/sessao/iniciar');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sessão encerrada' })).toBeVisible();

  await page.goto('/#/');
  const bloco = page.getByRole('region', { name: 'Fechar o Dia' });
  await expect(bloco).toContainText('1 Sessão');
  await semViolacoes(page);
  await bloco.getByRole('button', { name: 'Fechar o Dia' }).click();
  await expect(bloco.getByRole('heading', { name: 'Dia fechado' })).toBeVisible();
  await semViolacoes(page);
  await bloco.getByRole('button', { name: 'Reabrir o Dia' }).click();
  await expect(bloco.getByRole('button', { name: 'Fechar o Dia' })).toBeVisible();
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
  await expect(page.getByRole('navigation', { name: 'Áreas' })).toBeHidden();
  await semViolacoes(page);
  await page.getByRole('checkbox', { name: 'Só estudo' }).click();
  await expect(page.getByRole('navigation', { name: 'Áreas' })).toBeVisible();
  await semViolacoes(page);

  // Recarregar não perde nada; ao fechar, a nota aparece para marcar.
  await page.reload();
  await page.getByRole('link', { name: 'Encerrar' }).click();
  await page.getByLabel('ver o preço do livro').click();
  await expect(page.getByLabel('ver o preço do livro')).toBeChecked();
  await semViolacoes(page);
});

test('A nota guardada na Sessão fica no Para lembrar do Hoje até ser marcada como resolvida', async ({
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

  await page.goto('/#/');
  const lista = page.getByRole('list', { name: 'Guardado nas Sessões' });
  const caixa = lista.getByRole('checkbox', { name: 'ligar para o cartório' });
  await expect(caixa).not.toBeChecked();
  await semViolacoes(page);

  await caixa.click();
  await expect(caixa).toBeChecked();
  await semViolacoes(page);

  // Resolvida, a nota não volta ao abrir o Hoje de novo.
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Para lembrar' })).toBeVisible();
  await expect(lista).toHaveCount(0);
});

test('Sessão por atividade: questões no cartão do Hoje, Errei guarda o erro e o canto fica sobre as abas', async ({
  page,
}) => {
  await abrirHojeComAgora(page);
  await page.getByRole('button', { name: /Questões/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
  await page.getByRole('button', { name: 'Acertei' }).click();
  await page.getByRole('button', { name: 'Errei' }).click();
  await page.getByLabel('Frase correta').fill('O prazo é de cinco dias.');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Guardar erro' }).click();
  await expect(page.getByText('2 feitas, 1 acerto.')).toBeVisible();
  // O formulário fechou com o foco dentro dele: o foco volta ao Errei (no navegador, a gravação é uma promessa).
  await expect(page.getByRole('button', { name: 'Errei' })).toBeFocused();

  // Fora da Sessão, o relógio fica no canto, sem cobrir a barra de áreas, e o bloquinho abre sobre ele.
  await page
    .getByRole('navigation', { name: 'Áreas' })
    .getByRole('link', { name: 'Biblioteca' })
    .click();
  const relogio = page.getByRole('button', { name: /Abrir o bloquinho/ });
  await expect(relogio).toBeVisible();
  const areas = await page.getByRole('navigation', { name: 'Áreas' }).boundingBox();
  const caixa = await relogio.boundingBox();
  expect(areas && caixa).toBeTruthy();
  if (areas && caixa && (page.viewportSize()?.width ?? 1000) < 900) {
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(areas.y);
  }
  await relogio.click();
  await page.getByLabel('Anotar uma distração').fill('comprar café');
  await semViolacoes(page);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Guardado para depois.')).toBeVisible();
});

test('Hoje: o cartão "Começar uma Sessão" não disputa a ação principal da tela', async ({
  page,
}) => {
  await abrirHojeComAgora(page);
  await expect(page.getByRole('heading', { name: 'Começar uma Sessão' })).toBeVisible();
  await expect(page.locator('main .principal')).toHaveCount(1);
});

test('Sessão: no fim da tela o relógio assenta abaixo do rodapé, acima das abas, sem cobrir "Backup e dados" (texto a 200%)', async ({
  page,
}) => {
  await abrirHojeComAgora(page);
  await page.getByRole('button', { name: /Questões/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Áreas' })
    .getByRole('link', { name: 'Biblioteca' })
    .click();
  // Celular com o texto ampliado: a tela passa de duas alturas e o rodapé desce até o canto do relógio.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const relogio = page.getByRole('button', { name: /Abrir o bloquinho/ });
  const rodape = page.getByRole('link', { name: 'Backup e dados' });
  const abas = page.getByRole('navigation', { name: 'Áreas' });
  // O fim da página pode crescer depois do primeiro rolar (fontes e dados chegando): rola de novo a cada leitura.
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      const [r, l, a] = await Promise.all([
        relogio.boundingBox(),
        rodape.boundingBox(),
        abas.boundingBox(),
      ]);
      if (!r || !l || !a) return 'sem caixa: ' + JSON.stringify({ r, l, a });
      const ok = l.y + l.height <= r.y && r.y + r.height <= a.y;
      return ok ? 'ok' : 'fora de ordem: ' + JSON.stringify({ r, l, a });
    })
    .toBe('ok');
});
