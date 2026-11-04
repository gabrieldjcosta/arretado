import type { Page } from '@playwright/test';
import {
  animacoesVistas,
  comecarCoberturaDasTelas,
  expect,
  importarEPublicar,
  registrarAnimacoes,
  semViolacoesNoFio,
  terminarCoberturaDasTelas,
  test,
  type AnimacaoVista,
} from './apoio';

// O Arretado novo (prévia do Fio, D-D25): os passos com a lei de verdade, no quadro do mockup aprovado. A matéria
// vem do edital (CSV), a LEP é colada e publicada e ligada à disciplina, e o Fio puxa o Ler e o Lembrar. O jsdom
// não mede cor, layout nem animação; aqui o navegador confere que cada cartão passa no axe nos dois mundos, que os
// grifos acendem, que o cartão se passa com o gesto e que o "Desfazer" volta.

const CSV = 'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\n';

/** Edital pelo CSV (cria a disciplina), LEP importada e ligada a ela, prévia ligada, Agora aberto. */
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

/** O cartão do passo, e não o fantasma que a tela anterior deixa esmaecendo (`.m-saindo`). */
const cartaoDa = (page: Page, nome: string) =>
  page.locator(`.m-tela:not(.m-saindo) .m-cartao[data-cartao="${nome}"]`);

const puxador = (page: Page) => page.getByRole('button', { name: /Puxar o fio/ });

/** Nada pode rolar de lado nem passar da largura da tela. */
async function semRolagemLateral(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

/**
 * O botão da vez se alcança: o cartão pode passar da tela (a lei é longa), e então a tela do passo rola (como no
 * mockup, onde `.m-tela` tem `overflow-y: auto`). Rolada até o botão, ele fica inteiro dentro do quadro.
 */
async function botaoAlcancavel(page: Page, nome: RegExp | string) {
  const botao = page.getByRole('button', { name: nome });
  await botao.scrollIntoViewIfNeeded();
  const dentro = await botao.evaluate((el) => {
    const quadro = document.querySelector('.m-app')?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return quadro !== undefined && b.top >= quadro.top && b.bottom <= quadro.bottom + 1;
  });
  expect(dentro).toBe(true);
}

test('Ler e Lembrar com a LEP: cada cartão cabe, passa no axe, os grifos acendem e o pouso fecha a etapa', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await comALeiNaPrevia(page);

  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/passo$/);
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');
  await expect(page.getByText('Passo 1 de 2')).toBeAttached();
  // Os grifos do artigo acendem um a um, e a legenda diz o que cada cor é (a assinatura do Ler no mockup).
  await expect(ler.locator('.m-lei .m-aceso').first()).toBeVisible({ timeout: 10_000 });
  await expect(ler.getByRole('link', { name: 'Abrir no Leitor' })).toBeVisible();
  await botaoAlcancavel(page, 'Pronto, li');
  await semRolagemLateral(page);
  await semViolacoesNoFio(page);

  // "Pronto, li" leva ao Lembrar do mesmo artigo (o Art. 2º tem destaque).
  await ler.getByRole('button', { name: 'Pronto, li' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Agora sem olhar.' })).toBeVisible();
  const lembrar = cartaoDa(page, 'lembrar');
  const respostas = lembrar.getByRole('group', {
    name: /Escolha o que a lei diz|Esta frase está como na lei\?/,
  });
  await expect(respostas.getByRole('button').first()).toBeVisible();
  await semRolagemLateral(page);
  await semViolacoesNoFio(page);

  // Responde com a primeira conta: a escolhida voa até o buraco e a lei diz o que era.
  await respostas.getByRole('button').first().click();
  const retorno = lembrar.locator('.m-retorno');
  await expect(retorno).toHaveText(/Isso\.|a Frase certa, tirada da lei/);
  const acertou = (await retorno.innerText()).startsWith('Isso.');
  await botaoAlcancavel(page, acertou ? 'Seguir' : 'Guardar e seguir');
  await semViolacoesNoFio(page);
  await lembrar.getByRole('button', { name: acertou ? 'Seguir' : 'Guardar e seguir' }).click();

  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  await expect(page.getByRole('heading', { level: 2, name: /Pode descansar\.$/ })).toBeVisible();
  await expect(page.getByText(/^Leu /)).toBeVisible();
  await expect(page.getByText(/Lembrou /)).toBeVisible();
  if (!acertou) await expect(page.getByText(/guardou 1 Frase/)).toBeVisible();
  await semViolacoesNoFio(page);
  await page.getByRole('button', { name: /Puxar o fio: seguir/ }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('o cartão se passa com o gesto: para a direita segue, para a esquerda pula, e o aviso desfaz', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await comALeiNaPrevia(page);
  await puxador(page).click();
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');

  /** Arrasta o cartão pelo texto da lei (que não é botão nem link), `dx` px para o lado. */
  const arrastar = async (dx: number) => {
    // O cartão acabou de chegar (ou de voltar do "Desfazer", pela mola): só se arrasta depois de parar.
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length), { timeout: 8000 })
      .toBe(0);
    const alvo = await ler.locator('.m-porque').boundingBox();
    if (!alvo) throw new Error('sem caixa do cartão');
    const x = alvo.x + alvo.width / 2;
    const y = alvo.y + alvo.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y, { steps: 4 });
    await page.mouse.move(x + dx, y, { steps: 4 });
    await page.mouse.up();
  };

  // Um arrasto curto não passa o cartão: ele volta na mola e o passo continua.
  await arrastar(50);
  await expect(ler).toBeVisible();
  await expect(page.getByText('Passo 1 de 2')).toBeAttached();

  // Para a direita, além do limite, o Ler fecha e o Lembrar chega; o aviso oferece "Desfazer".
  await arrastar(180);
  await expect(page.getByRole('heading', { level: 2, name: 'Agora sem olhar.' })).toBeVisible();
  await expect(page.locator('.m-toast').getByText('Feito')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(cartaoDa(page, 'ler')).toBeVisible();
  await expect(page.locator('.m-toast').getByText('Desfeito')).toBeVisible();

  // Para a esquerda, o passo é pulado: não custa nada, e o aviso também desfaz.
  await arrastar(-180);
  await expect(page.locator('.m-toast').getByText('Pulado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeVisible();
});

test('Pausar guarda o passo, volta ao Agora e o fio convida a continuar', async ({ page }) => {
  test.setTimeout(240_000);
  await comALeiNaPrevia(page);

  await puxador(page).click();
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');
  await ler.getByRole('button', { name: 'Pausar: tudo fica salvo' }).click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('Tudo salvo. O fio te espera aqui.')).toBeVisible();
  await expect(page.getByText('Puxe para continuar')).toBeVisible();
  await semViolacoesNoFio(page);

  // Voltar ao passo mostra o mesmo cartão, no mesmo lugar.
  await puxador(page).click();
  await expect(page.locator('.m-cartao[data-cartao="ler"] .m-olho').first()).toHaveText(
    'Ler · Execução Penal',
  );
});

test('no Lembrar, o teclado alcança "Pular este passo" mesmo sem arrastar', async ({ page }) => {
  test.setTimeout(240_000);
  await comALeiNaPrevia(page);
  await puxador(page).click();
  await page.getByRole('button', { name: 'Pronto, li' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Agora sem olhar.' })).toBeVisible();

  // Fora da vista até receber o foco; com o foco, aparece no pé do cartão e cabe na tela.
  const pular = page.getByRole('button', { name: 'Pular este passo' });
  await expect(pular).toBeAttached();
  await pular.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(pular).toBeFocused();
  const caixa = await pular.boundingBox();
  expect(caixa?.width).toBeGreaterThan(40);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
});

// O movimento do mockup aprovado, animação por animação. A lista saiu de anotar toda `Element.animate` do mockup
// (`node scripts/fio-animacoes-do-mockup.mjs`) andando a mesma jornada: puxar o fio, Ler, Lembrar, o pouso e a volta.
// O que o app anima precisa ter o mesmo alvo, a mesma duração, o mesmo atraso e a mesma curva. Quem tirar uma animação
// (ou trocar a mola por um `ease`) quebra aqui, e foi assim que o teste de antes deixou passar um app parado.
const MOLA = 'cubic-bezier(.34,1.56,.64,1)';
const SAIR = 'cubic-bezier(.2,.7,.2,1)';
const TROCAR = 'cubic-bezier(.45,0,.25,1)';
interface MovimentoDoMockup {
  /** O que é, em palavras, para a falha dizer o que faltou. */
  quem: string;
  tag: string;
  classes: string[];
  props: string;
  duracao: number;
  atraso?: number;
  easing: string;
  /** Só existe quando a pergunta do Lembrar é de lacuna (as bolinhas), e não de certo ou errado. */
  soComBolinhas?: boolean;
}
const MOVIMENTO_DO_MOCKUP: readonly MovimentoDoMockup[] = [
  {
    quem: 'o ponto de puxar chega do alto',
    tag: 'button',
    classes: ['puxador'],
    props: 'opacity,transform',
    duracao: 700,
    easing: MOLA,
  },
  {
    quem: 'o ponto desce ao puxar',
    tag: 'button',
    classes: ['puxador'],
    props: 'transform',
    duracao: 180,
    easing: TROCAR,
  },
  {
    quem: 'o ponto volta na mola',
    tag: 'button',
    classes: ['puxador'],
    props: 'transform',
    duracao: 420,
    easing: MOLA,
  },
  {
    quem: 'a tela que sai esmaece',
    tag: 'section',
    classes: ['tela', 'saindo'],
    props: 'opacity,transform',
    duracao: 260,
    easing: 'cubic-bezier(.4,0,1,1)',
  },
  {
    quem: 'a tela nova chega',
    tag: 'section',
    classes: ['tela'],
    props: 'opacity,transform',
    duracao: 480,
    atraso: 90,
    easing: SAIR,
  },
  {
    quem: 'a faísca sobe ao próximo nó',
    tag: 'span',
    classes: ['faisca'],
    props: 'offset,opacity,top',
    duracao: 520,
    easing: TROCAR,
  },
  {
    quem: 'o fio do trilho cresce',
    tag: 'span',
    classes: ['feita'],
    props: 'height',
    duracao: 420,
    easing: SAIR,
  },
  {
    quem: 'o nó novo do trilho entra na mola',
    tag: 'span',
    classes: ['no', 'atual'],
    props: 'transform',
    duracao: 500,
    atraso: 300,
    easing: MOLA,
  },
  {
    quem: 'o cartão sai para o lado',
    tag: 'div',
    classes: ['cartao'],
    props: 'opacity,transform',
    duracao: 320,
    easing: TROCAR,
  },
  {
    quem: 'a onda de luz abre no botão',
    tag: 'span',
    classes: ['onda'],
    props: 'opacity,transform',
    duracao: 600,
    easing: SAIR,
  },
  {
    quem: 'a resposta voa até o buraco',
    tag: 'button',
    classes: ['bolinha'],
    props: 'opacity,transform',
    duracao: 460,
    easing: TROCAR,
    soComBolinhas: true,
  },
  {
    quem: 'o rodapé do cartão chega depois da resposta',
    tag: 'div',
    classes: ['rodape-cartao'],
    props: 'opacity,transform',
    duracao: 380,
    atraso: 120,
    easing: MOLA,
  },
  {
    quem: 'o Zé se traça',
    tag: 'path',
    classes: ['ze-linha'],
    props: 'strokeDashoffset',
    duracao: 1400,
    easing: 'cubic-bezier(.4,0,.3,1)',
  },
  {
    quem: 'o rosto do Zé aparece',
    tag: 'g',
    classes: ['ze-rosto'],
    props: 'opacity',
    duracao: 500,
    atraso: 1300,
    easing: 'linear',
  },
  {
    quem: 'a flor brota',
    tag: 'g',
    classes: ['flor'],
    props: 'transform',
    duracao: 800,
    atraso: 1900,
    easing: MOLA,
  },
  {
    quem: 'o ponto de seguir chega depois da cena',
    tag: 'button',
    classes: ['no-seguir'],
    props: 'opacity,transform',
    duracao: 700,
    atraso: 900,
    easing: MOLA,
  },
  {
    quem: 'o ponto de seguir é puxado',
    tag: 'button',
    classes: ['no-seguir'],
    props: 'transform',
    duracao: 520,
    easing: MOLA,
  },
];

const mesmoMovimento = (visto: AnimacaoVista, m: MovimentoDoMockup) =>
  visto.tag === m.tag &&
  m.classes.every((c) => visto.classes.includes(c)) &&
  visto.props === m.props &&
  visto.duracao === m.duracao &&
  visto.atraso === (m.atraso ?? 0) &&
  visto.easing === m.easing;

test('o movimento do mockup está todo no app: cada animação da jornada, com a duração e a curva dele', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await registrarAnimacoes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await comALeiNaPrevia(page);

  // Puxa o fio, lê, lembra, segue ao pouso e puxa de volta ao Agora: a jornada que o mockup anda.
  await comecarCoberturaDasTelas(page);
  await puxador(page).focus();
  await page.keyboard.press('Enter');
  const ler = cartaoDa(page, 'ler');
  await expect(ler.locator('.m-olho').first()).toHaveText('Ler · Execução Penal');
  await ler.getByRole('button', { name: 'Pronto, li' }).click();
  const lembrar = cartaoDa(page, 'lembrar');
  const respostas = lembrar.getByRole('group', {
    name: /Escolha o que a lei diz|Esta frase está como na lei\?/,
  });
  await expect(respostas.getByRole('button').first()).toBeVisible();
  const comBolinhas = (await respostas.locator('.m-bolinha').count()) > 0;
  await respostas.getByRole('button').first().click();
  await expect(lembrar.locator('.m-retorno')).toHaveText(/Isso\.|a Frase certa, tirada da lei/);
  await lembrar.getByRole('button', { name: /^(Seguir|Guardar e seguir)$/ }).click();
  await expect(page).toHaveURL(/#\/fio\/pouso$/);
  const noDeSeguir = page.getByRole('button', { name: /Puxar o fio: seguir/ });
  await expect(noDeSeguir).toBeVisible();
  // O ponto de seguir chega 0,9 s depois da cena; puxado antes disso, a chegada dele nem aparece.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) =>
                  a.playState === 'running' &&
                  a.effect instanceof KeyframeEffect &&
                  a.effect.target?.classList.contains('m-no-seguir'),
              ).length,
        ),
      {
        timeout: 10_000,
      },
    )
    .toBe(0);
  await noDeSeguir.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/$/);

  // Em nenhuma das quatro trocas de tela o quadro fica vazio: a que sai e a que entra se cruzam, como no mockup (lá a
  // cobertura mínima é de uns 0,75; um vão, que foi o que o app tinha ao esperar os dados de cada tela, dá 0).
  const cobertura = await terminarCoberturaDasTelas(page);
  expect(cobertura.length).toBeGreaterThan(60);
  expect(Math.min(...cobertura)).toBeGreaterThan(0.4);

  const vistas = await animacoesVistas(page);
  const faltam = MOVIMENTO_DO_MOCKUP.filter((m) => !m.soComBolinhas || comBolinhas)
    .filter((m) => !vistas.some((v) => mesmoMovimento(v, m)))
    .map(
      (m) =>
        `${m.quem}: ${m.tag}.${m.classes.join('.')} ${m.props} ${String(m.duracao)} ms +${String(m.atraso ?? 0)} ${m.easing}`,
    );
  expect(faltam).toEqual([]);
});

test('o botão de ação é o Sol no Vivo e o Só contorno no Calmo, de noite e de dia', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await comALeiNaPrevia(page);
  await puxador(page).focus();
  await page.keyboard.press('Enter');
  await expect(cartaoDa(page, 'ler')).toBeVisible();
  const botao = page.getByRole('button', { name: 'Pronto, li' });
  await botao.scrollIntoViewIfNeeded();

  /** O que o navegador desenha no botão e o movimento que a raiz declara. */
  const cara = () =>
    botao.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        movimento: document.querySelector('.m-fio')?.getAttribute('data-movimento'),
        fundo: cs.backgroundImage,
        cor: cs.backgroundColor,
        texto: cs.color,
        sombra: cs.boxShadow,
        antes: getComputedStyle(el, '::before').content,
      };
    });

  // As cores do botão têm transição (0,2 s): cada traço espera chegar ao valor de lá, em vez de ler no meio do caminho.
  const traco = (nome: 'fundo' | 'cor' | 'texto' | 'sombra' | 'antes') => async () =>
    (await cara())[nome];

  for (const esquema of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: esquema, reducedMotion: 'no-preference' });
    // Vivo, o padrão: o Sol, do mesmo material do ponto (fundo dourado radial, anel âmbar, halo).
    await expect.poll(async () => (await cara()).movimento).toBe('vivo');
    expect((await cara()).fundo).toContain('radial-gradient');
    await expect.poll(traco('texto')).toBe('rgb(58, 39, 0)');
    await expect.poll(traco('sombra')).toContain('rgba(211, 146, 0, 0.55) 0px 0px 0px 1.5px inset');
    expect(await traco('antes')()).toBe('none');
    await semViolacoesNoFio(page);

    // Calmo (o sistema pedindo menos movimento): só o contorno, sem bolinha; o sol vira o brilho ao tocar.
    await page.emulateMedia({ colorScheme: esquema, reducedMotion: 'reduce' });
    await expect.poll(async () => (await cara()).movimento).toBe('calmo');
    expect((await cara()).fundo).toBe('none');
    await expect.poll(traco('cor')).toBe('rgba(0, 0, 0, 0)');
    await expect.poll(traco('sombra')).toBe('rgb(211, 146, 0) 0px 0px 0px 1.5px inset');
    expect(await traco('antes')()).toBe('none');
    await botao.hover();
    await expect.poll(traco('sombra')).toContain('rgba(255, 197, 61, 0.35)');
    await page.mouse.move(0, 0);
    await semViolacoesNoFio(page);
  }
});
