import { simularMovimento } from '../../../testes/movimento';
import { ligarOndaDeLuz } from './onda';

function botaoDeAcao(): HTMLButtonElement {
  const botao = document.createElement('button');
  botao.className = 'm-acao';
  document.body.appendChild(botao);
  return botao;
}

/** O jsdom não anima: um `animate` de mentira que devolve a promessa do fim, para ver a onda nascer e sair. */
function instalarAnimate() {
  const fim: { resolver: () => void } = { resolver: () => undefined };
  const animate = vi.fn(() => ({
    finished: new Promise<void>((resolver) => {
      fim.resolver = resolver;
    }),
  }));
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
  return { animate, fim };
}

afterEach(() => {
  delete (Element.prototype as { animate?: unknown }).animate;
  document.body.replaceChildren();
});

describe('a onda de luz do botão de ação', () => {
  it('nasce onde o dedo tocou, abre em 600 ms e sai quando acaba', async () => {
    simularMovimento('normal');
    const { animate, fim } = instalarAnimate();
    const desligar = ligarOndaDeLuz();
    const botao = botaoDeAcao();

    botao.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 6 }),
    );
    const onda = botao.querySelector<HTMLElement>('.m-onda');
    expect(onda).not.toBeNull();
    expect(animate).toHaveBeenCalledWith(
      [
        { transform: 'scale(0)', opacity: 0.9 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      expect.objectContaining({ duration: 600, fill: 'none' }),
    );

    fim.resolver();
    await vi.waitFor(() => {
      expect(botao.querySelector('.m-onda')).toBeNull();
    });
    desligar();
  });

  it('só no que é botão de ação, e desligada não faz nada', () => {
    simularMovimento('normal');
    instalarAnimate();
    const desligar = ligarOndaDeLuz();
    const outro = document.createElement('button');
    document.body.appendChild(outro);
    outro.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(outro.querySelector('.m-onda')).toBeNull();

    desligar();
    const botao = botaoDeAcao();
    botao.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(botao.querySelector('.m-onda')).toBeNull();
  });

  it('no modo calmo ou reduzido, o mockup não solta a onda', () => {
    const { animate } = instalarAnimate();
    const desligar = ligarOndaDeLuz();
    for (const modo of ['calmo', 'reduzido'] as const) {
      simularMovimento(modo);
      const botao = botaoDeAcao();
      botao.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(botao.querySelector('.m-onda')).toBeNull();
    }
    expect(animate).not.toHaveBeenCalled();
    desligar();
  });
});
