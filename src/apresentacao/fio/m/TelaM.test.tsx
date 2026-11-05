import { cleanup, fireEvent, render } from '@testing-library/react';
import { TelaM } from './TelaM';
import { definirTela } from './tela-atual';

afterEach(() => {
  cleanup();
  definirTela(null);
});

function tela(): HTMLElement {
  const { container } = render(
    <main id="conteudo">
      <TelaM nome="mapa">texto</TelaM>
    </main>,
  );
  const el = container.querySelector<HTMLElement>('[data-tela="mapa"]');
  if (!el) throw new Error('a tela não montou');
  return el;
}

describe('a tela do quadro que rola esmaece sob o "+" (desvio 36)', () => {
  it('em repouso não há esmaecimento: nem a classe nem o quanto', () => {
    const el = tela();
    expect(el).not.toHaveClass('m-rolada');
    expect(el.style.getPropertyValue('--m-rolado')).toBe('');
  });

  it('o esmaecimento entra aos poucos nos primeiros 40 px de rolagem e fica inteiro depois', () => {
    const el = tela();
    el.scrollTop = 10;
    fireEvent.scroll(el);
    expect(el).toHaveClass('m-rolada');
    expect(el.style.getPropertyValue('--m-rolado')).toBe('0.25');
    el.scrollTop = 20;
    fireEvent.scroll(el);
    expect(el.style.getPropertyValue('--m-rolado')).toBe('0.50');
    el.scrollTop = 400;
    fireEvent.scroll(el);
    expect(el.style.getPropertyValue('--m-rolado')).toBe('1.00');
  });

  it('ao voltar ao topo a classe sai e o repouso fica como o do mockup', () => {
    const el = tela();
    el.scrollTop = 80;
    fireEvent.scroll(el);
    expect(el).toHaveClass('m-rolada');
    el.scrollTop = 0;
    fireEvent.scroll(el);
    expect(el).not.toHaveClass('m-rolada');
    expect(el.style.getPropertyValue('--m-rolado')).toBe('0.00');
  });
});
