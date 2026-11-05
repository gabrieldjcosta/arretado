import { simularMovimento } from '../../../testes/movimento';
import { ligarBrilhoAoToque } from './brilho-ao-toque';

function botao(classe: string, desligado = false): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = classe;
  b.disabled = desligado;
  document.body.appendChild(b);
  return b;
}

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

const tocar = (el: Element) => {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
};

afterEach(() => {
  delete (Element.prototype as { animate?: unknown }).animate;
  document.body.replaceChildren();
});

describe('a alvorada e a onda do brilho do mundo', () => {
  it('o botão de ação ganha a alvorada de 900 ms, que sai quando acaba', async () => {
    simularMovimento('normal');
    const { animate, fim } = instalarAnimate();
    const desligar = ligarBrilhoAoToque();
    const b = botao('m-acao');
    tocar(b);
    expect(b.querySelector('.m-alvorada')).not.toBeNull();
    expect(animate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 900 }),
    );
    fim.resolver();
    await Promise.resolve();
    await Promise.resolve();
    expect(b.querySelector('.m-alvorada')).toBeNull();
    desligar();
  });

  it('o botão redondo solta o anel que cresce 1,5x em 1,1 s', () => {
    simularMovimento('normal');
    const { animate } = instalarAnimate();
    const desligar = ligarBrilhoAoToque();
    const b = botao('m-icone');
    tocar(b);
    expect(b.querySelector('.m-aro-onda')).not.toBeNull();
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ transform: 'scale(1.5)' })]),
      expect.objectContaining({ duration: 1100 }),
    );
    desligar();
  });

  it.each(['calmo', 'reduzido'] as const)('no modo %s não acende nada', (modo) => {
    simularMovimento(modo);
    instalarAnimate();
    const desligar = ligarBrilhoAoToque();
    const a = botao('m-acao');
    const r = botao('m-icone');
    tocar(a);
    tocar(r);
    expect(a.querySelector('.m-alvorada')).toBeNull();
    expect(r.querySelector('.m-aro-onda')).toBeNull();
    desligar();
  });

  it('botão desligado não acende', () => {
    simularMovimento('normal');
    instalarAnimate();
    const desligar = ligarBrilhoAoToque();
    const a = botao('m-acao', true);
    tocar(a);
    expect(a.querySelector('.m-alvorada')).toBeNull();
    desligar();
  });
});
