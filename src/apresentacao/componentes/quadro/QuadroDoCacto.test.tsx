import { act, render, screen } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import { PARTES } from './cena';
import { QuadroDoCacto } from './QuadroDoCacto';

const totalDeFios = (ate: number) =>
  PARTES.slice(0, ate).reduce((soma, parte) => soma + parte.fios.length, 0);
const fios = (container: HTMLElement) => container.querySelectorAll('.quadro-fio').length;

describe('QuadroDoCacto (A caneta que desenha)', () => {
  it('a cena é decorativa, a caneta é uma só e a legenda é um status', () => {
    const { container } = render(<QuadroDoCacto dias={1} desenha={false} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.quadro-caneta')).toHaveLength(1);
    expect(container.querySelector('.quadro-caneta')).toHaveAttribute('data-pose', 'deitada');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('o néon (D-D10) é um grupo sob os traços, com filtro de região fixa e desvio 6', () => {
    const { container } = render(<QuadroDoCacto dias={4} desenha={false} />);
    const svg = container.querySelector('svg');
    const grupo = svg?.querySelector('g.quadro-neon');
    expect(grupo).toHaveClass('neon-camada');
    // Sob os traços, para o brilho ficar atrás da linha: aguada, néon, traços, caneta.
    const grupos = [...(svg?.children ?? [])].filter((el) => el.tagName === 'g');
    expect(grupos).toHaveLength(4);
    expect(grupos[1]).toBe(grupo);
    expect(grupos[2]?.querySelector('.quadro-fio')).not.toBeNull();
    expect(grupos[3]).toHaveClass('quadro-caneta');
    const id = /url\(#([^)]+)\)/.exec(grupo?.getAttribute('filter') ?? '')?.[1];
    const filtro = svg?.querySelector(`filter[id="${id ?? ''}"]`);
    expect(filtro).toHaveAttribute('filterUnits', 'userSpaceOnUse');
    expect(filtro?.querySelector('feGaussianBlur')).toHaveAttribute('stdDeviation', '6');
    // Parado e pronto: o tronco e os dois braços têm o gêmeo no papel.
    expect(grupo?.querySelectorAll('.quadro-neon-fio')).toHaveLength(3);
  });

  it('já fechado: o quadro aparece pronto até a parte de hoje, com a legenda dita', () => {
    const { container } = render(<QuadroDoCacto dias={3} desenha={false} />);
    // O chão, o tronco e o braço esquerdo.
    expect(fios(container)).toBe(totalDeFios(3));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Hoje a caneta desenhou o braço esquerdo.',
    );
  });

  it('com movimento reduzido, fechar o Dia mostra a parte pronta e diz o que foi desenhado', async () => {
    const { container } = render(<QuadroDoCacto dias={2} desenha />);
    expect(await screen.findByText('Hoje a caneta desenhou o tronco.')).toBeInTheDocument();
    expect(fios(container)).toBe(totalDeFios(2));
  });

  it('depois da 16ª parte, o Dia seguinte abre uma folha nova', () => {
    const { container, rerender } = render(<QuadroDoCacto dias={16} desenha={false} />);
    expect(fios(container)).toBe(totalDeFios(16));
    expect(screen.getByRole('status')).toHaveTextContent('Hoje a caneta desenhou a borboleta.');
    rerender(<QuadroDoCacto dias={17} desenha={false} />);
    expect(fios(container)).toBe(totalDeFios(1));
    expect(screen.getByRole('status')).toHaveTextContent('Hoje a caneta desenhou o chão.');
  });

  describe('com movimento', () => {
    beforeEach(() => {
      simularMovimento('calmo');
      Object.assign(window.SVGElement.prototype, {
        getTotalLength: () => 100,
        getPointAtLength: (comprimento: number) => ({ x: comprimento, y: 5 }),
      });
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
      Reflect.deleteProperty(window.SVGElement.prototype, 'getTotalLength');
      Reflect.deleteProperty(window.SVGElement.prototype, 'getPointAtLength');
    });

    it('a legenda só é dita quando o desenho termina; antes, só as partes anteriores estão no papel', async () => {
      const { container } = render(<QuadroDoCacto dias={3} desenha />);
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(fios(container)).toBe(totalDeFios(2));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(screen.getByRole('status')).toBeEmptyDOMElement();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Hoje a caneta desenhou o braço esquerdo.',
      );
      expect(fios(container)).toBe(totalDeFios(3));
    });

    it('sair no meio do desenho não deixa nada para trás', async () => {
      const { unmount } = render(<QuadroDoCacto dias={2} desenha />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(document.querySelector('.quadro')).toBeNull();
    });
  });
});
