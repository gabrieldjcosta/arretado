import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PuxarM } from './PuxarM';

afterEach(cleanup);

/** O jsdom não tem o PointerEvent com `clientY` em todo lugar: um MouseEvent com o nome do evento basta ao React. */
function ponteiro(alvo: Element, tipo: 'pointerdown' | 'pointermove' | 'pointerup', y: number) {
  fireEvent(alvo, new MouseEvent(tipo, { clientY: y, bubbles: true }));
}

describe('o neon amarelo do fio que se puxa (desvio 20)', () => {
  function montar() {
    const aoPuxar = vi.fn();
    render(<PuxarM titulo="Puxe o fio" apoio="para começar" aoPuxar={aoPuxar} />);
    const ponto = screen.getByRole('button', { name: /Puxar o fio/ });
    const area = ponto.closest<HTMLElement>('.m-puxar-area');
    if (!area) throw new Error('o ponto está fora da área do fio');
    return { ponto, area, aoPuxar };
  }

  it('repousa solto, sobe ao puxar (4 px), estoura além do limite (70 px) e volta a soltar', () => {
    const { ponto, area } = montar();
    expect(area.dataset.puxe).toBe('solto');

    ponteiro(ponto, 'pointerdown', 100);
    ponteiro(ponto, 'pointermove', 103);
    expect(area.dataset.puxe).toBe('solto');
    ponteiro(ponto, 'pointermove', 120);
    expect(area.dataset.puxe).toBe('puxando');
    ponteiro(ponto, 'pointermove', 170);
    expect(area.dataset.puxe).toBe('puxando');
    ponteiro(ponto, 'pointermove', 171);
    expect(area.dataset.puxe).toBe('passou');
    ponteiro(ponto, 'pointermove', 101);
    expect(area.dataset.puxe).toBe('solto');
  });

  it('puxar com Enter leva ao passo e o fio volta a repousar solto', () => {
    const { ponto, area, aoPuxar } = montar();
    fireEvent.keyDown(ponto, { key: 'Enter' });
    // No modo dos testes (sem animação) o gesto fecha na hora.
    expect(aoPuxar).toHaveBeenCalledTimes(1);
    expect(area.dataset.puxe).toBe('solto');
  });
});
