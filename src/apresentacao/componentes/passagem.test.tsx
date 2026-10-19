import { renderHook } from '@testing-library/react';
import { simularMovimento } from '../../testes/movimento';
import { usePassagemDeCartao } from './passagem';

interface Animacao {
  keyframes: Keyframe[];
  opcoes: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
}

/** Um cartão no documento, com `animate` de mentira: cada chamada vira uma animação já terminada. */
function prepararCartao() {
  const cartao = document.createElement('article');
  document.body.append(cartao);
  const animacoes: Animacao[] = [];
  Object.assign(cartao, {
    animate: (keyframes: Keyframe[], opcoes: KeyframeAnimationOptions) => {
      const cancel = vi.fn();
      animacoes.push({ keyframes, opcoes, cancel });
      return { finished: Promise.resolve(), cancel };
    },
  });
  const { result } = renderHook(() => usePassagemDeCartao());
  result.current.cartao.current = cartao;
  return { cartao, animacoes, passar: result.current.passar };
}

describe('usePassagemDeCartao (A caneta que desenha)', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('com movimento reduzido troca na hora, depois de gravar, sem animar', async () => {
    const { animacoes, passar } = prepararCartao();
    const avancar = vi.fn();
    await passar(Promise.resolve(), avancar);
    expect(avancar).toHaveBeenCalledOnce();
    expect(animacoes).toHaveLength(0);
  });

  it('Normal: espera 150 ms, o cartão sai 190 ms para a esquerda, o conteúdo troca e o novo entra 210 ms', async () => {
    simularMovimento('normal');
    vi.useFakeTimers();
    const { animacoes, passar } = prepararCartao();
    const avancar = vi.fn();
    const feito = passar(Promise.resolve(), avancar);

    await vi.advanceTimersByTimeAsync(149);
    expect(animacoes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(animacoes).toHaveLength(2);
    await feito;

    const [saida, entrada] = animacoes;
    expect(saida?.keyframes.at(-1)).toMatchObject({ transform: 'translateX(-28px)', opacity: 0 });
    expect(saida?.opcoes).toMatchObject({ duration: 190, fill: 'forwards' });
    expect(entrada?.keyframes[0]).toMatchObject({ transform: 'translateX(12px)', opacity: 0 });
    expect(entrada?.opcoes).toMatchObject({ duration: 210, fill: 'backwards' });
    expect(avancar).toHaveBeenCalledOnce();
    // A saída é desfeita só depois que o conteúdo novo está no lugar.
    expect(saida?.cancel).toHaveBeenCalledOnce();
  });

  it('Calmo: só esmaece, 150 ms para sair e 170 ms para entrar', async () => {
    simularMovimento('calmo');
    vi.useFakeTimers();
    const { animacoes, passar } = prepararCartao();
    const feito = passar(Promise.resolve(), vi.fn());
    await vi.advanceTimersByTimeAsync(140);
    await feito;
    expect(animacoes).toHaveLength(2);
    expect(animacoes[0]?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(animacoes[0]?.opcoes).toMatchObject({ duration: 150, easing: 'linear' });
    expect(animacoes[1]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(animacoes[1]?.opcoes).toMatchObject({ duration: 170 });
  });

  it('se a gravação falha, nada anda e o erro sobe a quem chamou', async () => {
    simularMovimento('normal');
    vi.useFakeTimers();
    const { animacoes, passar } = prepararCartao();
    const avancar = vi.fn();
    const falha = passar(Promise.reject(new Error('sem disco')), avancar);
    const visto = expect(falha).rejects.toThrow('sem disco');
    await vi.advanceTimersByTimeAsync(1000);
    await visto;
    expect(avancar).not.toHaveBeenCalled();
    expect(animacoes).toHaveLength(0);
  });

  it('se a tela saiu enquanto o cartão passava, não troca nada', async () => {
    simularMovimento('normal');
    vi.useFakeTimers();
    const { cartao, passar } = prepararCartao();
    const avancar = vi.fn();
    const feito = passar(Promise.resolve(), avancar);
    await vi.advanceTimersByTimeAsync(100);
    cartao.remove();
    await vi.advanceTimersByTimeAsync(500);
    await feito;
    expect(avancar).not.toHaveBeenCalled();
  });
});
