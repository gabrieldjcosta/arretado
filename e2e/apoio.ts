import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

interface Opcoes {
  /** Para testes que provocam violação de CSP de propósito. */
  permitirViolacoes: boolean;
  /** Para testes que provocam falha no console de propósito. */
  permitirFalhasConsole: boolean;
  /**
   * Todo teste abre o app como um aparelho que já viu a Chegada e a Entrada do Dia, porque as duas são
   * um <dialog> modal (o resto da tela fica inerte) e todo teste começa num aparelho novo. Só a
   * `entrada-do-dia.spec.ts` desliga isto (`test.use({ semearAbertura: false })`).
   */
  semearAbertura: boolean;
  /**
   * Todo teste abre o app como um aparelho em que o nome já foi escrito (D-D14: a Abertura, a camada de tela
   * cheia, um popover, abre em toda abertura, cobre a tela e consome o primeiro toque; só um Dia guardado no
   * futuro a deixa calada), então sem isto todo teste começaria por ela. Só a `escrita-do-nome.spec.ts` e a `abertura.spec.ts` desligam isto (`semearEscrita: false`);
   * a `entrada-do-dia.spec.ts` desliga a anterior e continua com esta.
   */
  semearEscrita: boolean;
}

/**
 * Toda página registra violações de CSP e falhas de console desde o primeiro script;
 * ao fim de cada teste, qualquer ocorrência não permitida falha o teste.
 */
export const test = base.extend<Opcoes & { vigiar: undefined }>({
  permitirViolacoes: [false, { option: true }],
  permitirFalhasConsole: [false, { option: true }],
  semearAbertura: [true, { option: true }],
  semearEscrita: [true, { option: true }],
  vigiar: [
    async (
      { page, permitirViolacoes, permitirFalhasConsole, semearAbertura, semearEscrita },
      use,
    ) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __violacoes: string[] };
        w.__violacoes = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          w.__violacoes.push(
            `${e.violatedDirective}: ${e.blockedURI} ${e.sample} @ ${e.sourceFile}:${String(e.lineNumber)}:${String(e.columnNumber)}`,
          );
        });
      });
      if (semearAbertura) {
        // As mesmas chaves de `src/apresentacao/entrada/regras.ts`; só põe o que falta, então um teste
        // que apague as chaves e recarregue as recebe de volta (a `entrada-do-dia.spec.ts` confere o resultado).
        await page.addInitScript(() => {
          try {
            const guardado = window.localStorage;
            if (guardado.getItem('arretado:chegada:v1') === null) {
              guardado.setItem('arretado:chegada:v1', '{"vista":true}');
            }
            if (guardado.getItem('arretado:entrada-do-dia:v1') === null) {
              guardado.setItem('arretado:entrada-do-dia:v1', '{"dia":"9999-12-31"}');
            }
          } catch {
            /* sem armazenamento */
          }
        });
      }
      if (semearEscrita) {
        // A chave de `componentes/escrita/frequencia.ts`. Um Dia que não chega nunca (como na Entrada do Dia):
        // a Abertura fica calada (`escritaNaTela`: Dia guardado no futuro), com qualquer relógio, também os
        // que os testes põem em Dias de antes ou de depois.
        await page.addInitScript(() => {
          try {
            const guardado = window.localStorage;
            if (guardado.getItem('arretado:escrita-do-nome:v1') === null) {
              guardado.setItem('arretado:escrita-do-nome:v1', '{"dia":"9999-12-31"}');
            }
          } catch {
            /* sem armazenamento */
          }
        });
      }
      const falhas: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') falhas.push(m.text());
      });
      page.on('pageerror', (e) => falhas.push(e.message));

      await use(undefined);

      if (!permitirViolacoes) {
        const violacoes = await violacoesDaPagina(page).catch(() => []);
        expect(violacoes, 'violações de CSP').toEqual([]);
      }
      if (!permitirFalhasConsole) expect(falhas, 'falhas no console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function violacoesDaPagina(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __violacoes?: string[] }).__violacoes ?? []);
}

/** O colado do corpus (Chromium 141, Linux), lido no Node: não abrir inteiro, tem centenas de KB. */
async function colado(id: string) {
  const pasta = new URL('../corpus/normas/', import.meta.url);
  const [html, texto] = await Promise.all([
    readFile(new URL(`${id}.colado.html`, pasta), 'utf8'),
    readFile(new URL(`${id}.colado.txt`, pasta), 'utf8'),
  ]);
  return { html, texto };
}

/**
 * Colar no headless: `ClipboardEvent` sintético com `DataTransfer` (a área de transferência do
 * sistema não é controlável; ver solucao-de-problemas.md › "E2E não consegue colar a lei").
 */
export async function colar(page: Page, id: string) {
  const dados = await colado(id);
  const campo = page.getByLabel('Cole aqui a lei');
  await campo.focus();
  await campo.evaluate((alvo, { html, texto }) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', html);
    clipboardData.setData('text/plain', texto);
    alvo.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, dados);
}

/**
 * Pula a Abertura (a camada de tela cheia de toda abertura do aplicativo, D-D14) como a pessoa faria: com a primeira tecla, que só pula. Para os testes que desligam a semeadura da
 * escrita (`semearEscrita: false`) e não são sobre ela.
 */
export async function pularAAbertura(page: Page) {
  await expect(page.locator('.abertura')).toBeVisible();
  await page.keyboard.press('Shift');
  await expect(page.locator('.abertura')).toHaveCount(0);
}

/**
 * Registra um erro pelo "+" da casca (está em toda tela): abre o painel e toca em "Registrar erro". O link do
 * painel é o único com esse nome dentro dele, fora do Leitor: na lei o item é um botão ligado ao artigo e abre
 * o formulário sem sair dela (D-D24).
 */
export async function irAoRegistroPeloMais(page: Page) {
  await page.getByRole('button', { name: 'Novo registro' }).click();
  await page.locator('.mais-itens').getByRole('link', { name: 'Registrar erro' }).click();
}

/**
 * Abre o diálogo do Lembrete pelo "+" da casca (de qualquer tela, sem trocar de rota) e o devolve. O botão do
 * painel é o único com esse nome dentro dele.
 */
export async function abrirOLembrete(page: Page) {
  await page.getByRole('button', { name: 'Novo registro' }).click();
  await page.locator('.mais-itens').getByRole('button', { name: 'Lembrete' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Lembrete' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

/**
 * A nota do Lembrete como está gravada no IndexedDB (vazia se não há). Fechar o diálogo com Esc grava ao
 * desmontar o campo, em segundo plano e sem aviso na tela: recarregar a página antes disso perde a nota.
 * Quem recarrega logo depois do Esc espera por aqui (`expect.poll`), não por um tempo fixo.
 */
export function lembreteGravado(page: Page) {
  return page.evaluate(async () => {
    const pedir = <T>(pedido: IDBRequest<T>) =>
      new Promise<T>((resolver, rejeitar) => {
        pedido.onsuccess = () => {
          resolver(pedido.result);
        };
        pedido.onerror = () => {
          rejeitar(new Error(String(pedido.error)));
        };
      });
    const banco = await pedir(indexedDB.open('arretado'));
    try {
      const todas = await pedir(
        banco.transaction('preferencias').objectStore('preferencias').getAll() as IDBRequest<
          { lembrete?: string }[]
        >,
      );
      return todas[0]?.lembrete ?? '';
    } finally {
      banco.close();
    }
  });
}

/**
 * Termina na hora as transições de CSS em curso. Virar o tema anima a cor de alguns controles (o link aceso da
 * pílula dos lugares vai de claro a escuro em 0,2 s) enquanto o fundo do indicador vira de uma vez: o axe, medindo
 * no meio do caminho, via texto claro sobre fundo claro e acusava `color-contrast` no CI, onde os quadros saem
 * devagar. Medir o estado já assentado é medir o que a pessoa vê. Não se espera a transição acabar (`finished`):
 * uma que o navegador não faz andar (um botão fora da tela, parada em 0) seguraria o teste até o tempo limite.
 */
async function assentarAsTransicoes(page: Page) {
  await page.evaluate(() => {
    for (const animacao of document.getAnimations()) {
      if (!(animacao instanceof CSSTransition)) continue;
      try {
        animacao.finish();
      } catch {
        /* a transição acabou ou foi cancelada no mesmo instante: já está assentada */
      }
    }
  });
}

/** axe (WCAG AA) nos dois temas, na tela como está. */
export async function semViolacoes(page: Page) {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await assentarAsTransicoes(page);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      colorScheme,
    ).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: null });
}

/**
 * O aviso do quadro do Fio (`.m-toast`) sobe e some sozinho (2,3 s; 3,2 s com "Desfazer"). O axe espera ele sumir,
 * para não medir a cor de um aviso a meio da transição, e então confere os dois mundos.
 */
export async function semViolacoesNoFio(page: Page) {
  await expect(page.locator('.m-toast.m-on')).toHaveCount(0, { timeout: 10_000 });
  await semViolacoes(page);
  await textoLegivelNoFio(page);
}

/**
 * Enfeite puro do quadro do Fio: não leva contraste (WCAG 1.4.3 não o pede) e fica fora da medida, mas só se o
 * leitor de tela também o ignora (`aria-hidden`). As flores do pouso são enfeite; o nome do lugar está ao lado.
 * Texto que se lê não entra aqui: a dica do cartão e o "descansar" do pouso passaram a ler-se (desvio 19 de
 * `ajustes.css`) e são medidos.
 */
const ENFEITE_FORA_DA_MEDIDA = ['.m-flores'];

/** Um texto visível do quadro: o que diz, de que cor é e a caixa que ocupa na tela (px de CSS). */
interface TextoDoQuadro {
  quem: string;
  texto: string;
  cor: [number, number, number];
  alfa: number;
  grande: boolean;
  caixa: { x: number; y: number; w: number; h: number };
}

/**
 * Os textos do quadro que se veem inteiros e parados: com a cor, o tamanho e a caixa. Fica de fora o que está
 * escondido, coberto por outra coisa, esmaecendo (opacidade abaixo de 0,99) ou sem tamanho para ler.
 */
function textosDoQuadro(page: Page): Promise<TextoDoQuadro[]> {
  return page.evaluate((enfeites) => {
    const achados: TextoDoQuadro[] = [];
    for (const el of document.querySelectorAll('.m-app *')) {
      const temTexto = [...el.childNodes].some(
        (no) => no.nodeType === Node.TEXT_NODE && (no.textContent ?? '').trim() !== '',
      );
      if (!temTexto) continue;
      if (enfeites.some((seletor) => el.matches(seletor)) && el.closest('[aria-hidden="true"]'))
        continue;
      const estilo = getComputedStyle(el);
      if (estilo.visibility === 'hidden' || estilo.display === 'none') continue;
      const caixa = el.getBoundingClientRect();
      let x0 = Math.max(0, caixa.left);
      let y0 = Math.max(0, caixa.top);
      let x1 = Math.min(window.innerWidth, caixa.right);
      let y1 = Math.min(window.innerHeight, caixa.bottom);
      // O que um pai com rolagem ou recorte esconde não se vê (o corpo de uma folha rola): mede-se só a parte que aparece,
      // para os pixels do fundo não serem os de trás da folha. Um filho `fixed` escapa do recorte dos pais; um `absolute`,
      // do recorte dos que estão entre ele e o bloco que o contém.
      if (estilo.position !== 'fixed') {
        let pai: Element | null = el.parentElement;
        if (estilo.position === 'absolute') {
          const bloco = (el as HTMLElement).offsetParent;
          while (pai && pai !== bloco) pai = pai.parentElement;
        }
        for (; pai; pai = pai.parentElement) {
          const recorte = getComputedStyle(pai);
          if (recorte.overflowX === 'visible' && recorte.overflowY === 'visible') continue;
          const area = pai.getBoundingClientRect();
          x0 = Math.max(x0, area.left);
          y0 = Math.max(y0, area.top);
          x1 = Math.min(x1, area.right);
          y1 = Math.min(y1, area.bottom);
        }
      }
      if (x1 - x0 < 4 || y1 - y0 < 4) continue;
      const alvo = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (!alvo || !(el === alvo || el.contains(alvo) || alvo.contains(el))) continue;
      let opacidade = 1;
      for (let pai: Element | null = el; pai; pai = pai.parentElement) {
        opacidade *= Number(getComputedStyle(pai).opacity);
      }
      if (opacidade < 0.99) continue;
      const [r = 0, g = 0, b = 0, a = 1] = (estilo.color.match(/[\d.]+/g) ?? []).map(Number);
      const escala = estilo.color.startsWith('color(') ? 255 : 1;
      const tamanho = parseFloat(estilo.fontSize);
      achados.push({
        quem:
          el.tagName.toLowerCase() +
          (typeof el.className === 'string' && el.className.trim() !== ''
            ? `.${el.className.trim().split(/\s+/).join('.')}`
            : ''),
        texto: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 28),
        cor: [r * escala, g * escala, b * escala],
        alfa: a,
        grande: tamanho >= 24 || (tamanho >= 18.66 && Number(estilo.fontWeight) >= 700),
        caixa: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
      });
    }
    return achados;
  }, ENFEITE_FORA_DA_MEDIDA);
}

/** Para cada texto, a razão de contraste entre a cor dele e o fundo (a mediana dos pixels da caixa, sem o texto). */
async function contrasteDosTextos(page: Page, textos: TextoDoQuadro[]) {
  // A folha construída pelo CSSOM passa pelo CSP (`style-src 'self'`); `page.screenshot({ style })` não passa.
  await page.evaluate(() => {
    const folha = new CSSStyleSheet();
    folha.replaceSync(
      '*, *::before, *::after { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }',
    );
    (window as unknown as { __folhaSemTexto: CSSStyleSheet }).__folhaSemTexto = folha;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, folha];
  });
  let foto: Buffer;
  try {
    foto = await page.screenshot({ animations: 'disabled', scale: 'css' });
  } finally {
    await page.evaluate(() => {
      const { __folhaSemTexto: folha } = window as unknown as { __folhaSemTexto: CSSStyleSheet };
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((f) => f !== folha);
    });
  }
  return page.evaluate(
    async ({ png, itens }: { png: string; itens: TextoDoQuadro[] }) => {
      const imagem = await createImageBitmap(
        new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: 'image/png' }),
      );
      const tela = document.createElement('canvas');
      tela.width = imagem.width;
      tela.height = imagem.height;
      const ctx = tela.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('sem canvas para medir o fundo');
      ctx.drawImage(imagem, 0, 0);
      const linear = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const luz = (r: number, g: number, b: number) =>
        0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      return itens.map((item) => {
        const { x, y, w, h } = item.caixa;
        const dados = ctx.getImageData(
          Math.floor(x),
          Math.floor(y),
          Math.max(1, Math.ceil(w)),
          Math.max(1, Math.ceil(h)),
        ).data;
        const mediana = [0, 1, 2].map((canal) => {
          const valores: number[] = [];
          for (let i = canal; i < dados.length; i += 4) valores.push(dados[i] ?? 0);
          valores.sort((a, b) => a - b);
          return valores[Math.floor(valores.length / 2)] ?? 0;
        });
        const [fr = 0, fg = 0, fb = 0] = item.cor.map(
          (v, canal) => v * item.alfa + (mediana[canal] ?? 0) * (1 - item.alfa),
        );
        const [mr = 0, mg = 0, mb = 0] = mediana;
        const [clara = 0, escura = 0] = [luz(fr, fg, fb), luz(mr, mg, mb)].sort((a, b) => b - a);
        return {
          quem: item.quem,
          texto: item.texto,
          razao: (clara + 0.05) / (escura + 0.05),
          minimo: item.grande ? 3 : 4.5,
        };
      });
    },
    { png: foto.toString('base64'), itens: textos },
  );
}

/**
 * Todo texto do quadro do Fio se lê, nos dois mundos (WCAG 1.4.3: 4,5:1; 3:1 em texto grande). O axe não decide nada
 * sobre texto em cima de degradê (responde "incompleto"), e o mockup é todo degradê: "passa no axe" não prova que dá
 * para ler (de dia, as respostas do Lembrar tinham 1,3:1 e passavam). Aqui se mede nos pixels: tira-se o texto,
 * fotografa-se e compara-se a cor dele com o fundo de trás da caixa. Só vale para o quadro (`.m-app`).
 */
export async function textoLegivelNoFio(page: Page) {
  if ((await page.locator('.m-app').count()) === 0) return;
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    // O mundo do Fio troca um instante depois (matchMedia, React, `data-mundo`). Medir antes é medir as cores de um
    // mundo sobre o fundo do outro: texto claro da noite sobre o branco do dia dava 1,1:1 num botão que se lê bem.
    await expect(page.locator('.m-fio')).toHaveAttribute(
      'data-mundo',
      colorScheme === 'dark' ? 'noite' : 'dia',
    );
    await assentarAsTransicoes(page);
    // O que esmaece (uma tela que acabou de entrar) só conta depois de parado; sem nenhum texto parado, não se mediu nada.
    await expect
      .poll(async () => (await textosDoQuadro(page)).length, { timeout: 8_000 })
      .toBeGreaterThan(2);
    const medidas = await contrasteDosTextos(page, await textosDoQuadro(page));
    expect(
      medidas
        .filter((m) => m.razao < m.minimo)
        .map(
          (m) => `"${m.texto}" ${m.quem}: ${m.razao.toFixed(2)}:1 (mínimo ${String(m.minimo)}:1)`,
        ),
      colorScheme,
    ).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: null });
}

/**
 * A cor que o navegador desenha em cada um dos pontos da tela (px de CSS), lida na fotografia da página. O CSS
 * declarado não diz o que o olho vê: um fundo "transparente" com um halo por cima pode parecer escuro ao lado dele, e
 * só o pixel mostra se o interior de um botão mudou ao tocá-lo. As transições são levadas ao fim antes de fotografar.
 */
export async function coresNosPixels(
  page: Page,
  pontos: Array<[number, number]>,
): Promise<Array<[number, number, number]>> {
  await assentarAsTransicoes(page);
  const foto = await page.screenshot({ animations: 'disabled', scale: 'css' });
  return page.evaluate(
    async ({ png, lugares }: { png: string; lugares: Array<[number, number]> }) => {
      const imagem = await createImageBitmap(
        new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: 'image/png' }),
      );
      const tela = document.createElement('canvas');
      tela.width = imagem.width;
      tela.height = imagem.height;
      const ctx = tela.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('sem canvas para medir o pixel');
      ctx.drawImage(imagem, 0, 0);
      return lugares.map(([x, y]): [number, number, number] => {
        const [r = 0, g = 0, b = 0] = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return [r, g, b];
      });
    },
    { png: foto.toString('base64'), lugares: pontos },
  );
}

/** Uma `Element.animate` que a página recebeu: o alvo (tag e classes sem o prefixo `m-`) e o que se pediu dela. */
export interface AnimacaoVista {
  tag: string;
  classes: string[];
  props: string;
  duracao: number | null;
  atraso: number;
  easing: string;
}

/**
 * Anota toda `Element.animate` da página, para conferir que o app move o que o mockup aprovado move, com a mesma
 * duração, o mesmo atraso e a mesma curva (`fio-passos.spec.ts`). Chamar antes do primeiro `goto`.
 */
export async function registrarAnimacoes(page: Page) {
  await page.addInitScript(() => {
    const vistas: AnimacaoVista[] = [];
    (window as unknown as { __animacoesVistas: AnimacaoVista[] }).__animacoesVistas = vistas;
    const original = Reflect.get(Element.prototype, 'animate');
    Element.prototype.animate = function (quadros, opcoes) {
      const o = typeof opcoes === 'number' ? { duration: opcoes } : (opcoes ?? {});
      const props = new Set<string>();
      if (Array.isArray(quadros))
        for (const q of quadros) Object.keys(q).forEach((k) => props.add(k));
      vistas.push({
        tag: this.tagName.toLowerCase(),
        classes: [...this.classList].map((c) => c.replace(/^m-/, '')),
        props: [...props].sort().join(','),
        duracao: typeof o.duration === 'number' ? o.duration : null,
        atraso: typeof o.delay === 'number' ? o.delay : 0,
        easing: o.easing ?? 'linear',
      });
      return original.call(this, quadros, opcoes);
    };
  });
}

/**
 * Anota, a cada quadro, quanto do quadro as telas do Fio cobrem (as opacidades compostas: 1 com uma tela firme, perto de
 * 0,8 no meio do cruzamento de duas, 0 se o quadro ficasse vazio). A troca de tela do mockup cruza a que sai com a
 * que entra sem deixar vão; um vão aparece aqui como 0 (`terminarCoberturaDasTelas`).
 */
export async function comecarCoberturaDasTelas(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __cobertura: number[]; __coberturaViva: boolean };
    w.__cobertura = [];
    w.__coberturaViva = true;
    const quadro = () => {
      const telas = [...document.querySelectorAll<HTMLElement>('.m-app .m-tela')];
      const vazio = telas.reduce(
        (resto, t) => resto * (1 - Number(getComputedStyle(t).opacity)),
        1,
      );
      w.__cobertura.push(telas.length === 0 ? 0 : 1 - vazio);
      if (w.__coberturaViva) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  });
}

/** Para de anotar e devolve a cobertura de cada quadro desde `comecarCoberturaDasTelas`. */
export function terminarCoberturaDasTelas(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __cobertura: number[]; __coberturaViva: boolean };
    w.__coberturaViva = false;
    return w.__cobertura;
  });
}

/** O que `registrarAnimacoes` anotou até agora. */
export function animacoesVistas(page: Page): Promise<AnimacaoVista[]> {
  return page.evaluate(
    () => (window as unknown as { __animacoesVistas: AnimacaoVista[] }).__animacoesVistas,
  );
}

/**
 * Quantos pontos diferem de verdade entre dois recortes PNG (canal a canal, além de 16 em 255): o
 * lockup parado e o quadro final da escrita desenham os mesmos caminhos, mas um é tracejado e o outro
 * não, e a serrilha do Chromium muda 1 ou 2 níveis nas bordas. -1 se os tamanhos diferem.
 */
export async function pontosDiferentes(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ({ primeiro, segundo }) => {
      const ler = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const imagem = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const tela = new OffscreenCanvas(imagem.width, imagem.height);
        const contexto = tela.getContext('2d');
        if (!contexto) throw new Error('sem canvas');
        contexto.drawImage(imagem, 0, 0);
        return contexto.getImageData(0, 0, imagem.width, imagem.height);
      };
      const [x, y] = await Promise.all([ler(primeiro), ler(segundo)]);
      if (x.width !== y.width || x.height !== y.height) return -1;
      let diferentes = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const maior = Math.max(
          ...[0, 1, 2, 3].map((k) => Math.abs((x.data[i + k] ?? 0) - (y.data[i + k] ?? 0))),
        );
        if (maior > 16) diferentes += 1;
      }
      return diferentes;
    },
    { primeiro: a.toString('base64'), segundo: b.toString('base64') },
  );
}

/** Da Biblioteca: título curto e "Publicar", com o sumário já na tela. */
export async function publicar(page: Page, titulo: string) {
  const campo = page.getByRole('textbox', { name: 'Título curto' });
  await campo.fill(titulo);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: `${titulo} publicada.` })).toBeVisible();
  await abrirTodasAsNormas(page);
}

/** A lista de Normas já vem agrupada e aberta (até 3 disciplinas): espera a seção aparecer. */
export async function abrirTodasAsNormas(page: Page) {
  await expect(page.getByRole('region', { name: 'Normas' })).toBeVisible();
}

/** Cola a página compilada do corpus em Importar e publica com o título curto dado. */
export async function importarEPublicar(page: Page, id: string, titulo: string) {
  await page.goto('/#/biblioteca/importar');
  await colar(page, id);
  await expect(page.getByRole('region', { name: 'Estrutura encontrada' })).toBeVisible({
    timeout: 30_000,
  });
  await publicar(page, titulo);
}

/** Colar só texto puro (sem `text/html`): o fallback que deixa os dispositivos "a confirmar". */
export async function colarTextoPuro(page: Page, texto: string) {
  const campo = page.getByLabel('Cole aqui a lei');
  await campo.focus();
  await campo.evaluate((alvo, conteudo) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', conteudo);
    alvo.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, texto);
}

/** `scrollY` depois que a rolagem assentou (iguais em 3 quadros seguidos); evita comparar no meio da restauração. */
export async function rolagemAssentada(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let ultimo = window.scrollY;
        let iguais = 0;
        const quadro = () => {
          iguais = window.scrollY === ultimo ? iguais + 1 : 0;
          ultimo = window.scrollY;
          if (iguais >= 3) resolve(ultimo);
          else requestAnimationFrame(quadro);
        };
        requestAnimationFrame(quadro);
      }),
  );
}
