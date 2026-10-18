import { act, render, screen } from '@testing-library/react';
import { simularJanelaVisual } from '../../testes/janela-visual';
import { useTecladoAberto } from './teclado-aberto';

function Sonda() {
  const aberto = useTecladoAberto();
  return (
    <>
      <input aria-label="campo" />
      <button type="button">botão</button>
      <output>{aberto ? 'teclado' : 'sem teclado'}</output>
    </>
  );
}

describe('useTecladoAberto (casca, P2)', () => {
  const restauros: (() => void)[] = [];

  function simular(altura: number) {
    const janela = simularJanelaVisual(altura);
    restauros.push(janela.restaurar);
    return janela;
  }

  afterEach(() => {
    restauros.splice(0).forEach((restaurar) => {
      restaurar();
    });
  });

  it('sem visualViewport, nunca', () => {
    render(<Sonda />);
    act(() => {
      screen.getByLabelText('campo').focus();
    });
    expect(screen.getByRole('status')).toHaveTextContent('sem teclado');
  });

  it('campo em foco e janela visual encolhida: teclado aberto; sair do campo fecha', () => {
    simular(window.innerHeight - 300);
    render(<Sonda />);
    expect(screen.getByRole('status')).toHaveTextContent('sem teclado');
    act(() => {
      screen.getByLabelText('campo').focus();
    });
    expect(screen.getByRole('status')).toHaveTextContent('teclado');
    act(() => {
      screen.getByLabelText('campo').blur();
    });
    expect(screen.getByRole('status')).toHaveTextContent('sem teclado');
  });

  it('a janela encolhe depois do foco (o teclado sobe com atraso): acompanha o resize', () => {
    const janela = simular(window.innerHeight);
    render(<Sonda />);
    act(() => {
      screen.getByLabelText('campo').focus();
    });
    expect(screen.getByRole('status')).toHaveTextContent('sem teclado');
    act(() => {
      janela.visual.height = window.innerHeight - 280;
      janela.avisar();
    });
    expect(screen.getByRole('status')).toHaveTextContent('teclado');
  });

  it('janela encolhida sem campo em foco, ou com zoom de pinça, não é teclado', () => {
    const janela = simular(window.innerHeight - 300);
    render(<Sonda />);
    act(() => {
      screen.getByRole('button', { name: 'botão' }).focus();
    });
    expect(screen.getByRole('status')).toHaveTextContent('sem teclado');
    act(() => {
      screen.getByLabelText('campo').focus();
      janela.visual.scale = 2;
      janela.avisar();
    });
    expect(screen.getByRole('status')).toHaveTextContent('sem teclado');
  });
});
