import type { Page } from '@playwright/test';
import { expect, importarEPublicar, rolagemAssentada, test } from './apoio';

// As áreas seguras do aparelho (D-D7, P7). Com `viewport-fit=cover` a página vai até a borda do
// vidro, e a ilha, o entalhe e o indicador de início do iPhone ficam por cima dela. O Chromium
// emula as margens (`Emulation.setSafeAreaInsetsOverride`): cada tela é medida em três aparelhos e
// nenhum texto nem controle pode cair dentro delas.

interface Area {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** O ponto da rolagem em que se mede: o começo da página, um pedaço adiante ou o fim. */
type Onde = 'topo' | 'meio' | 'pe';

interface Aparelho {
  nome: string;
  largura: number;
  altura: number;
  area: Area;
}

const APARELHOS: Aparelho[] = [
  // Ilha dinâmica no alto, indicador de início embaixo: o telefone em pé (abas embaixo).
  {
    nome: 'iPhone em pé',
    largura: 393,
    altura: 852,
    area: { top: 59, bottom: 34, left: 0, right: 0 },
  },
  // Deitado, a ilha vai para um lado (59 px nos dois, para valer virado para qualquer um): 852 px
  // ainda é o desenho de tablet em pé, com as abas embaixo.
  {
    nome: 'iPhone deitado',
    largura: 852,
    altura: 393,
    area: { top: 0, bottom: 21, left: 59, right: 59 },
  },
  // O Pro Max deitado passa de 900 px: as abas sobem para o cabeçalho.
  {
    nome: 'iPhone Pro Max deitado',
    largura: 932,
    altura: 430,
    area: { top: 0, bottom: 21, left: 59, right: 59 },
  },
];

const TELAS = [
  ['/', 'Hoje'],
  ['/plano', 'Trilha'],
  ['/recall/frases', 'Fixar'],
  ['/biblioteca', 'Biblioteca'],
  ['/conta', 'Conta'],
  ['/sessao/iniciar', 'Começar a Sessão'],
] as const;

const SO_NO_DESKTOP = 'o aparelho é emulado no teste (tamanho e áreas seguras); basta um projeto';

/** Tamanho de janela e áreas seguras do aparelho; confere que o Chromium de fato as aplicou. */
async function emular(page: Page, aparelho: Aparelho) {
  await page.setViewportSize({ width: aparelho.largura, height: aparelho.altura });
  const sessao = await page.context().newCDPSession(page);
  await sessao.send('Emulation.setSafeAreaInsetsOverride', { insets: aparelho.area });
  await page.goto('/');
  // Sem isso um Chromium que ignorasse a emulação deixaria todos os testes passarem sem medir nada.
  const lida = await page.evaluate(() => {
    const sonda = document.createElement('div');
    sonda.style.paddingTop = 'env(safe-area-inset-top)';
    sonda.style.paddingBottom = 'env(safe-area-inset-bottom)';
    sonda.style.paddingLeft = 'env(safe-area-inset-left)';
    sonda.style.paddingRight = 'env(safe-area-inset-right)';
    document.body.append(sonda);
    const estilo = getComputedStyle(sonda);
    const medidas = {
      top: Number.parseFloat(estilo.paddingTop),
      bottom: Number.parseFloat(estilo.paddingBottom),
      left: Number.parseFloat(estilo.paddingLeft),
      right: Number.parseFloat(estilo.paddingRight),
    };
    sonda.remove();
    return medidas;
  });
  expect(lida, 'áreas seguras emuladas').toEqual(aparelho.area);
}

/**
 * Texto e controles à vista dentro das margens que o aparelho reserva. O texto vale pelas linhas que
 * ocupa (não pela caixa do bloco); controles com fundo ou borda e desenhos, pela caixa (um link ou
 * botão sem fundo nem borda vale pelo texto e pelo desenho de dentro). Cada um conta pelo que
 * aparece: o que a rolagem de um ancestral corta (as fileiras de abas que rolam de lado) não é
 * medido, nem o que está escondido (`<details>` fechado).
 *
 * O que é fixo vale nas quatro bordas, sempre, até fora da tela (não chega lá rolando). O que é
 * grudado (o cabeçalho, a lista de títulos do Leitor) só está preso depois de rolar: no `topo` ainda
 * é página; no `meio` e no `pe`, vale nas quatro. O resto rola, então só o alto conta no `topo` e só
 * o pé, no `pe`; os lados, sempre.
 */
async function invasoes(page: Page, area: Area, onde: Onde): Promise<string[]> {
  return page.evaluate(
    ({ area, onde }) => {
      const esquerda = area.left;
      const direita = window.innerWidth - area.right;
      const alto = area.top;
      const baixo = window.innerHeight - area.bottom;
      const achados: string[] = [];

      /**
       * O que aparece de `r`: a caixa cortada pelos ancestrais que rolam ou escondem. O texto também
       * é cortado pelo elemento que o contém; um controle, só pelos de fora dele.
       */
      const aparece = (el: Element, r: DOMRect, doTexto: boolean): DOMRect | null => {
        let [e, d, c, b] = [r.left, r.right, r.top, r.bottom];
        if (doTexto || getComputedStyle(el).position !== 'fixed') {
          for (let o = doTexto ? el : el.parentElement; o && o !== document.body;) {
            const estilo = getComputedStyle(o);
            const caixa = o.getBoundingClientRect();
            if (estilo.overflowX !== 'visible') {
              e = Math.max(e, caixa.left);
              d = Math.min(d, caixa.right);
            }
            if (estilo.overflowY !== 'visible') {
              c = Math.max(c, caixa.top);
              b = Math.min(b, caixa.bottom);
            }
            // Um fixo é cortado só pelo que ele mesmo esconde, não pelos ancestrais.
            o = estilo.position === 'fixed' ? null : o.parentElement;
          }
        }
        return d - e < 2 || b - c < 2 ? null : new DOMRect(e, c, d - e, b - c);
      };

      /** O elemento, ou um ancestral dele, é fixo ou grudado? */
      const posicoes = (el: Element) => {
        const dele = { fixo: false, grudado: false };
        for (let o: Element | null = el; o; o = o.parentElement) {
          const posicao = getComputedStyle(o).position;
          dele.fixo ||= posicao === 'fixed';
          dele.grudado ||= posicao === 'sticky';
        }
        return dele;
      };

      const ver = (rotulo: string, el: Element, caixa: DOMRect, doTexto = false) => {
        const r = aparece(el, caixa, doTexto);
        const { fixo, grudado } = posicoes(el);
        // O que rola chega à tela rolando; um fixo que está inteiro fora dela não chega nunca.
        if (!r || (!fixo && (r.right <= 0 || r.left >= window.innerWidth))) return;
        const aVista = fixo || (r.bottom > 0 && r.top < window.innerHeight);
        const preso = fixo || (grudado && onde !== 'topo');
        const fora =
          r.left < esquerda - 0.5 ||
          r.right > direita + 0.5 ||
          (aVista && (onde === 'topo' || preso) && r.top < alto - 0.5) ||
          (aVista && (onde === 'pe' || preso) && r.bottom > baixo + 0.5);
        if (fora) {
          achados.push(
            `${rotulo}: x ${String(Math.round(r.left))}-${String(Math.round(r.right))}, y ${String(Math.round(r.top))}-${String(Math.round(r.bottom))}`,
          );
        }
      };

      const percorrer = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let no = percorrer.nextNode(); no; no = percorrer.nextNode()) {
        const dono = no.parentElement;
        const texto = no.textContent?.trim();
        if (
          !dono ||
          !texto ||
          !dono.checkVisibility() ||
          getComputedStyle(dono).visibility === 'hidden'
        )
          continue;
        const intervalo = document.createRange();
        intervalo.selectNodeContents(no);
        for (const r of intervalo.getClientRects()) ver(`"${texto.slice(0, 30)}"`, dono, r, true);
      }

      /** A caixa tem tinta própria (fundo, borda ou sombra)? Sem isso a tinta é o que há dentro. */
      const temTinta = (estilo: CSSStyleDeclaration) =>
        estilo.backgroundImage !== 'none' ||
        estilo.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        estilo.boxShadow !== 'none' ||
        ['Top', 'Right', 'Bottom', 'Left'].some(
          (lado) =>
            estilo.getPropertyValue(`border-${lado.toLowerCase()}-style`) !== 'none' &&
            Number.parseFloat(estilo.getPropertyValue(`border-${lado.toLowerCase()}-width`)) > 0,
        );

      for (const el of document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, svg, img',
      )) {
        const estilo = getComputedStyle(el);
        if (!el.checkVisibility() || estilo.visibility === 'hidden') continue;
        // Link, botão-texto e a Estrela não têm fundo nem borda: a caixa deles (que pode avançar
        // para a margem da página) é alvo de toque, não tinta. A tinta é o texto e o desenho de
        // dentro, medidos à parte.
        if (el.matches('a[href], button, summary') && !temTinta(estilo)) continue;
        // Margem negativa é o recuo com que o botão alinha o desenho à margem da página: a parte da
        // caixa que sobra por causa dela também é alvo de toque, não tinta.
        const r = el.getBoundingClientRect();
        const aEsquerda = Math.max(0, -Number.parseFloat(estilo.marginLeft));
        const aDireita = Math.max(0, -Number.parseFloat(estilo.marginRight));
        ver(
          `${el.tagName.toLowerCase()}.${el.getAttribute('class')?.split(' ')[0] ?? ''}`,
          el,
          new DOMRect(r.x + aEsquerda, r.y, r.width - aEsquerda - aDireita, r.height),
        );
      }
      return achados;
    },
    { area, onde },
  );
}

/** A página carrega dados depois do título: mede só quando a altura parou de mudar. */
async function alturaAssentada(page: Page) {
  let anterior = -1;
  for (let iguais = 0, i = 0; iguais < 3 && i < 100; i++) {
    const altura = await page.evaluate(() => document.documentElement.scrollHeight);
    iguais = altura === anterior ? iguais + 1 : 0;
    anterior = altura;
    await page.waitForTimeout(100);
  }
}

/** Nada nas áreas do aparelho em cada ponto da rolagem pedido: o começo, o meio e o fim da página. */
async function semInvasoes(page: Page, area: Area, pontos: Onde[] = ['topo', 'pe']) {
  await alturaAssentada(page);
  for (const onde of pontos) {
    await page.evaluate((onde) => {
      const fim = document.documentElement.scrollHeight;
      window.scrollTo(0, onde === 'topo' ? 0 : onde === 'meio' ? Math.min(800, fim / 2) : fim);
    }, onde);
    await rolagemAssentada(page);
    expect(await invasoes(page, area, onde), onde).toEqual([]);
  }
}

for (const aparelho of APARELHOS) {
  for (const [rota, titulo] of TELAS) {
    test(`${aparelho.nome}: ${titulo} não põe nada nas áreas do aparelho`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== 'desktop', SO_NO_DESKTOP);
      await emular(page, aparelho);
      await page.goto(`/#${rota}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await semInvasoes(page, aparelho.area);
      if (aparelho.largura >= 900) {
        // A partir de 900 px o cabeçalho segue a coluna do conteúdo, também com a área segura dos lados.
        const [marca, titulo] = await page.evaluate(() => [
          document.querySelector('.marca')?.getBoundingClientRect().left ?? -1,
          document.querySelector('main h1')?.getBoundingClientRect().left ?? -2,
        ]);
        expect(Math.abs(marca - titulo), 'a marca alinha com o título').toBeLessThanOrEqual(1);
      }
    });
  }

  test(`${aparelho.nome}: o Leitor, o modo foco e o dock não põem nada nas áreas do aparelho`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', SO_NO_DESKTOP);
    test.setTimeout(120_000);
    await importarEPublicar(page, 'lep-compilado', 'LEP');
    await emular(page, aparelho);
    await page.goto('/#/biblioteca');
    await page.getByRole('region', { name: 'Normas' }).getByRole('link', { name: /LEP/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'LEP' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Art. 1º' })).toBeVisible();
    await semInvasoes(page, aparelho.area, ['topo', 'meio']);

    // A busca com tantos achados que o diálogo cresce até onde a tela deixa: ele fica nas áreas seguras.
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    const busca = page.getByRole('dialog', { name: 'Buscar na norma' });
    await busca.getByRole('searchbox', { name: 'Texto ou endereço' }).fill('de');
    await expect(busca.getByText(/os \d+ primeiros abaixo\./)).toBeVisible();
    await semInvasoes(page, aparelho.area, ['topo']);
    await busca.getByRole('button', { name: 'Fechar' }).click();
    await expect(busca).toBeHidden();

    // O cartão do artigo no centro da tela, sem moldura, com a bandeja do foco aberta. Do começo da
    // norma, onde o cartão é curto: sem a moldura a página é só o cartão centrado, e a ilha em cima
    // não a faz rolar (um artigo longo num celular deitado já rola um pouco, por causa do respiro).
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await rolagemAssentada(page);
    await page.getByRole('button', { name: 'Modo foco' }).click();
    await expect(page).toHaveURL(/[?&]foco=artigo/);
    await page.getByRole('button', { name: 'Mais ações do foco' }).click();
    await semInvasoes(page, aparelho.area, ['topo']);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
      'sobra de rolagem no foco do artigo',
    ).toBeLessThanOrEqual(0);

    // O texto corrido sem moldura (o cabeçalho some): a primeira linha ainda fica abaixo da ilha.
    await page.getByRole('button', { name: 'Texto corrido', exact: true }).click();
    await expect(page).toHaveURL(/[?&]foco=texto/);
    await semInvasoes(page, aparelho.area, ['topo', 'meio']);
  });

  test(`${aparelho.nome}: a Sessão, também no "Só estudo", não põe nada nas áreas do aparelho`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', SO_NO_DESKTOP);
    await emular(page, aparelho);
    await page.goto('/#/sessao/iniciar');
    await page.getByRole('button', { name: 'Começar', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sessão' })).toBeVisible();
    await semInvasoes(page, aparelho.area);

    // Sem as abas nem o rodapé, o que a casca reserva embaixo é só a área segura do aparelho.
    await page.getByRole('checkbox', { name: 'Só estudo' }).click();
    await expect(page.getByRole('navigation', { name: 'Áreas' })).toBeHidden();
    await semInvasoes(page, aparelho.area);
  });
}
