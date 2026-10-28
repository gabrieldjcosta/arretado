import { act, fireEvent, render, screen } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import { BoasVindas } from './BoasVindas';

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
