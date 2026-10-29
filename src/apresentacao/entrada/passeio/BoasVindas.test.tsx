import { act, fireEvent, render, screen } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import { criarEncontro, type OfertaDaChegada } from '../../componentes/escrita/encontro';
import { FLOR } from '../../componentes/ze/geometria';
import { BoasVindas } from './BoasVindas';
import type { EntradaDoZe } from './entrada-do-ze';

function montar() {
  const props = { idTitulo: 'titulo', aoVamos: vi.fn(), aoAgoraNao: vi.fn() };
  const tela = render(<BoasVindas {...props} />);
  const escalaY = () =>
    Number(
      /scale\([\d.]+ ([\d.]+)\)/.exec(
        tela.container.querySelector('.z-olho')?.getAttribute('transform') ?? '',
      )?.[1],
    );
  const luz = () => tela.container.querySelector<SVGGElement>('.z-luz')?.style.opacity ?? 'sem luz';
  return { ...tela, props, escalaY, luz };
}

/** Anda o relógio falso e deixa as promessas do controle (o fim da piscada limpa o estilo) correrem. */
const andar = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('as Boas-vindas: o Zé dá vida à espera (D-D10, contrato §9)', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no movimento normal os dois olhos piscam a primeira vez aos 2,2 s, e não antes', async () => {
    simularMovimento('normal');
    const { escalaY } = montar();
    await andar(2199);
    expect(escalaY()).toBe(1);
    await andar(1 + 80);
    expect(escalaY()).toBeLessThan(0.3);
    await andar(200);
    expect(escalaY()).toBe(1);
  });

  it('a segunda piscada da rajada vem 0,34 s depois da primeira', async () => {
    simularMovimento('normal');
    const { escalaY } = montar();
    await andar(2200 + 340 + 80);
    expect(escalaY()).toBeLessThan(0.3);
  });

  it.each(['calmo', 'reduzido'] as const)('no %s o Zé não pisca', async (movimento) => {
    simularMovimento(movimento);
    const { escalaY } = montar();
    for (let t = 0; t < 30_000; t += 40) {
      await andar(40);
      expect(escalaY()).toBe(1);
    }
  });

  it('se a pessoa demora, a luz amarela da mão pisca 3 vezes aos 10 s e volta ao normal', async () => {
    simularMovimento('normal');
    const { luz } = montar();
    await andar(9999);
    expect(luz()).toBe('');
    await andar(1 + 230);
    expect(Number(luz())).toBeLessThan(0.3);
    await andar(3 * 460);
    expect(luz()).toBe('');
  });

  it('um toque, uma tecla ou a rolagem adia a luz: ela só pisca 10 s depois do último gesto', async () => {
    simularMovimento('normal');
    const { luz, container } = montar();
    await andar(9000);
    fireEvent.pointerDown(container.firstElementChild as Element);
    await andar(9999);
    expect(luz()).toBe('');
    await andar(1 + 230);
    expect(Number(luz())).toBeLessThan(0.3);
  });

  it('no Calmo a luz é um esmaecer só, lento (0,9 s); no reduzido não pisca', async () => {
    simularMovimento('calmo');
    const calmo = montar();
    await andar(10_000 + 450);
    expect(Number(calmo.luz())).toBeLessThan(0.3);
    await andar(500);
    expect(calmo.luz()).toBe('');
    calmo.unmount();

    simularMovimento('reduzido');
    const reduzido = montar();
    await andar(60_000);
    expect(reduzido.luz()).toBe('');
  });

  it('só há dois botões, e sair da tela para as piscadas e a luz de vez', async () => {
    simularMovimento('normal');
    const { props, unmount } = montar();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    screen.getByRole('button', { name: 'Vamos' }).click();
    screen.getByRole('button', { name: 'Agora não' }).click();
    expect(props.aoVamos).toHaveBeenCalledTimes(1);
    expect(props.aoAgoraNao).toHaveBeenCalledTimes(1);
    await andar(2000);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('as Boas-vindas da primeira vez: o Zé espera a luz e se desenha (M3b)', () => {
  const COMPRIMENTO = 800;
  /** O corpo da tela vai de (0, 0) a (400, 600): o pé do Zé (20, 210) está dentro. */
  let corpo = { left: 0, top: 0, right: 400, bottom: 600 };

  beforeEach(() => {
    simularMovimento('normal');
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    // O jsdom não mede traços nem tela: o contorno tem 800 de comprimento e começa em (0, 200); a matriz do
    // desenho põe o pé em (20, 210) na janela, na escala 1.
    Object.assign(window.SVGElement.prototype, {
      getTotalLength: () => COMPRIMENTO,
      getPointAtLength: (comprimento: number) => ({ x: comprimento / 10, y: 200 }),
      getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 }),
    });
    corpo = { left: 0, top: 0, right: 400, bottom: 600 };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const { left, top, right, bottom } = this.classList.contains('chegada-corpo')
        ? corpo
        : { left: 0, top: 0, right: 0, bottom: 0 };
      return { left, top, right, bottom, width: right - left, height: bottom - top } as DOMRect;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    for (const nome of ['getTotalLength', 'getPointAtLength', 'getScreenCTM']) {
      Reflect.deleteProperty(window.SVGElement.prototype, nome);
    }
  });

  function montarComEncontro(entrada: EntradaDoZe) {
    const encontro = criarEncontro();
    const aoReceber = vi.fn();
    const tela = render(
      <BoasVindas
        idTitulo="titulo"
        aoVamos={vi.fn()}
        aoAgoraNao={vi.fn()}
        entrada={entrada}
        encontro={encontro}
        aoReceber={aoReceber}
      />,
    );
    const zona = () => tela.container.querySelector<HTMLElement>('.chegada-tela');
    const luz = () => tela.container.querySelector('.z-pena')?.getAttribute('visibility');
    const escalaY = () =>
      Number(
        /scale\([\d.]+ ([\d.]+)\)/.exec(
          tela.container.querySelector('.z-olho')?.getAttribute('transform') ?? '',
        )?.[1],
      );
    /** A oferta que a tela fez ao Encontro, se fez. */
    const oferta = (): Promise<OfertaDaChegada | null> =>
      encontro.esperar(10, new AbortController().signal);
    return { ...tela, encontro, aoReceber, zona, luz, escalaY, oferta };
  }

  it('na espera a tela existe, marcada, e se oferece à luz: o pé esquerdo do Zé e o que fazer ao pousar', async () => {
    const { zona, aoReceber, oferta } = montarComEncontro('espera');
    expect(zona()).toHaveAttribute('data-entrada', 'espera');
    expect(zona()).not.toHaveAttribute('data-revelado');
    const aOferta = oferta();
    await andar(0);
    const recebida = await aOferta;
    expect(recebida?.medirPe()).toEqual({ x: 20, y: 210, raio: FLOR.r });
    recebida?.receber();
    expect(aoReceber).toHaveBeenCalledTimes(1);
  });

  it('o foco já está no título: quem usa leitor de tela não espera a luz', () => {
    montarComEncontro('espera');
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('o pé fora da área à vista (tela baixa, corpo rolado) não vale: a luz vai ao cabeçalho', async () => {
    corpo = { left: 0, top: 0, right: 400, bottom: 100 };
    const { oferta } = montarComEncontro('espera');
    const recebida = await oferta();
    expect(recebida?.medirPe()).toBeNull();
    corpo = { left: 100, top: 0, right: 400, bottom: 600 };
    expect(recebida?.medirPe()).toBeNull();
  });

  it('esperando, o Zé não tem vida (nem piscadas nem a luz da mão); sair retira a oferta', async () => {
    const { escalaY, luz, unmount, oferta } = montarComEncontro('espera');
    for (let t = 0; t < 30_000; t += 500) {
      await andar(500);
      expect(escalaY()).toBe(1);
    }
    expect(luz()).toBe('hidden');
    unmount();
    // O relógio é falso: a espera de 10 ms pela oferta só acaba se o tempo andar.
    const aOferta = oferta();
    await andar(10);
    expect(await aOferta).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ao pousar a luz, o Zé se desenha: o texto sobe na metade do contorno e a vida começa depois', async () => {
    const { zona, luz, escalaY, container } = montarComEncontro('desenhar');
    // O primeiro quadro: só o contorno por desenhar, a luz da caneta no pé, o texto ainda escondido.
    expect(zona()).toHaveAttribute('data-entrada', 'desenhar');
    expect(zona()).not.toHaveAttribute('data-revelado');
    expect(luz()).toBe('visible');
    expect(container.querySelector<SVGElement>('.z-flor')?.style.opacity).toBe('0');

    await andar(150);
    expect(zona()).not.toHaveAttribute('data-revelado');
    await andar(450);
    expect(zona()).toHaveAttribute('data-revelado');
    // A metade do contorno: ainda falta traço por desenhar.
    expect(
      Number(container.querySelector<SVGElement>('.z-linha')?.style.strokeDashoffset),
    ).toBeGreaterThan(0);

    // O Zé inteiro e parado (cerca de 3 s no total); só então as piscadas contam os 2,2 s.
    await andar(2500);
    expect(luz()).toBe('hidden');
    expect(container.querySelector<SVGElement>('.z-flor')?.style.opacity).toBe('');
    await andar(2199);
    expect(escalaY()).toBe(1);
    await andar(1 + 80);
    expect(escalaY()).toBeLessThan(0.3);
  });

  it('sair no meio do desenho para tudo: nenhum relógio fica para trás', async () => {
    const { unmount } = montarComEncontro('desenhar');
    await andar(700);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('com movimento reduzido ou Calmo o Zé aparece pronto e o texto já está à vista', () => {
    for (const movimento of ['calmo', 'reduzido'] as const) {
      simularMovimento(movimento);
      const { zona, luz, container, unmount } = montarComEncontro('desenhar');
      expect(zona()).toHaveAttribute('data-revelado');
      expect(luz()).toBe('hidden');
      expect(container.querySelector<SVGElement>('.z-flor')?.style.opacity).toBe('');
      unmount();
    }
  });
});
