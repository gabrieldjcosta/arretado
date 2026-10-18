import { expect, publicar, test, violacoesDaPagina } from './apoio';

test.describe('CSP (D18)', () => {
  test('está presente e o app carrega sem violação nem falha no console', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(await violacoesDaPagina(page)).toEqual([]);
  });

  test.describe('violação provocada', () => {
    test.use({ permitirViolacoes: true, permitirFalhasConsole: true });

    test('bloqueia script em linha e atribuição de HTML bruto', async ({ page }) => {
      await page.goto('/');
      const resultado = await page.evaluate(() => {
        const w = window as unknown as { __executou?: boolean };
        let bloqueouScript = false;
        try {
          const s = document.createElement('script');
          s.textContent = 'window.__executou = true';
          document.body.appendChild(s);
        } catch {
          bloqueouScript = true;
        }
        let bloqueouHtml = false;
        try {
          const d = document.createElement('div');
          d.innerHTML = '<img src=x onerror="window.__executou = true">';
        } catch {
          bloqueouHtml = true;
        }
        return { executou: w.__executou === true, bloqueouScript, bloqueouHtml };
      });
      expect(resultado.executou).toBe(false);
      expect(resultado.bloqueouScript).toBe(true);
      expect(resultado.bloqueouHtml).toBe(true);
      await expect.poll(async () => (await violacoesDaPagina(page)).length).toBeGreaterThan(0);
    });
  });
});

const LEI_MALICIOSA = `
<html><head>
<meta http-equiv="refresh" content="0;url=https://exemplo.invalid/">
<style>body{display:none}</style>
<script>window.__executou = true</script>
<base href="https://exemplo.invalid/">
</head><body onload="window.__executou = true">
<p>LEI Nº 99.999, DE 1º DE JANEIRO DE 2000</p>
<img src="x" onerror="window.__executou = true">
<iframe src="https://exemplo.invalid/"></iframe>
<svg onload="window.__executou = true"><script>window.__executou = true</script></svg>
<form action="https://exemplo.invalid/"><input name="a"><button>enviar</button></form>
<object data="https://exemplo.invalid/x.swf"></object>
<p>Art. 1º Fica proibido <a href="javascript:window.__executou=true" onclick="window.__executou = true">aqui</a> o que a lei proíbe.</p>
<p>Art. 2º Esta lei vale <a href="data:text/html,<script>window.__executou=true</script>">agora</a>.</p>
<p style="background:url(https://exemplo.invalid/rastreio.png)">Art. 3º Esta lei entra em vigor na data de sua publicação.</p>
</body></html>`;

test.describe('payload malicioso no fluxo completo de colar', () => {
  test('colar, publicar e ler: nada executa, nada carrega, nada sobra no DOM', async ({ page }) => {
    const externas: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('exemplo.invalid')) externas.push(r.url());
    });
    await page.goto('/#/biblioteca/importar');
    await page.getByLabel('Cole aqui a lei').evaluate((alvo, html) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/html', html);
      clipboardData.setData('text/plain', 'Art. 1º texto simples');
      alvo.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
      );
    }, LEI_MALICIOSA);
    await expect(page.getByRole('region', { name: 'Estrutura encontrada' })).toBeVisible({
      timeout: 30_000,
    });
    await publicar(page, 'Lei 99.999');

    await page
      .getByRole('region', { name: 'Normas' })
      .getByRole('link', { name: /Lei 99/ })
      .click();
    await expect(page.getByText('Fica proibido')).toBeVisible();

    const achados = await page.evaluate(() => {
      const w = window as unknown as { __executou?: boolean };
      const raiz = document.querySelector('main') ?? document.body;
      return {
        executou: w.__executou === true,
        perigosos: raiz.querySelectorAll(
          'script, iframe, object, embed, form, input, style, base, meta, svg, img',
        ).length,
        manipuladores: Array.from(raiz.querySelectorAll('*')).filter((e) =>
          e.getAttributeNames().some((n) => n.startsWith('on')),
        ).length,
        enderecosPerigosos: Array.from(raiz.querySelectorAll('[href], [src]')).filter((e) =>
          /^\s*(javascript|data|vbscript):/i.test(
            e.getAttribute('href') ?? e.getAttribute('src') ?? '',
          ),
        ).length,
        estiloDoPayload: Array.from(raiz.querySelectorAll('[style]')).filter((e) =>
          (e.getAttribute('style') ?? '').includes('exemplo.invalid'),
        ).length,
      };
    });
    expect(achados.executou).toBe(false);
    expect(achados.perigosos).toBe(0);
    expect(achados.manipuladores).toBe(0);
    expect(achados.enderecosPerigosos).toBe(0);
    expect(achados.estiloDoPayload).toBe(0);
    await page.waitForTimeout(500);
    expect(externas, 'pedidos a endereços do payload').toEqual([]);
  });

  test('conteúdo acima do limite por importação é recusado com orientação', async ({ page }) => {
    await page.goto('/#/biblioteca/importar');
    await page.getByLabel('Cole aqui a lei').evaluate((alvo) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', 'a'.repeat(10_000_001));
      alvo.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
      );
    });
    await expect(page.getByText('o limite é 10 MB')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Copie só a lei')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Estrutura encontrada' })).toHaveCount(0);
  });
});

test.describe('política de privacidade v2 (versão anterior dentro da v3)', () => {
  test('Conta › Privacidade diz o que a busca por URL envia e o que não sai do aparelho', async ({
    page,
  }) => {
    await page.goto('/#/conta/privacidade');
    await expect(page.getByRole('heading', { level: 1, name: /versão 3/ })).toBeVisible();
    await page.getByText(/Versão anterior \(política v2/).click();
    await expect(page.getByRole('heading', { level: 2, name: /política v2/ })).toBeVisible();
    await expect(page.getByText('envia só o endereço da lei')).toBeVisible();
    await expect(page.getByText('nenhum dado de estudo sai do aparelho')).toBeVisible();
  });
});
