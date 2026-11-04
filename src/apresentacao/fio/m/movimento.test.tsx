import { act, render, screen } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import { movimentoDoFio, useMovimentoDoFio } from './movimento';

/** O jsdom não anima: com `animate` o app lê o movimento de verdade (Vivo, Calmo), sem ele é o modo dos testes. */
function instalarAnimate() {
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn() });
}

afterEach(() => {
  delete (Element.prototype as { animate?: unknown }).animate;
});

function Mostra() {
  return <p>{useMovimentoDoFio()}</p>;
}

describe('o movimento do Fio (Vivo ou Calmo)', () => {
  it('sem perfil nem pedido do sistema é o Vivo, que também é o padrão de quem não configurou nada', () => {
    instalarAnimate();
    simularMovimento('normal');
    expect(movimentoDoFio()).toBe('vivo');
  });

  it('o perfil Calmo e o sistema pedindo menos movimento dão o Calmo', () => {
    instalarAnimate();
    simularMovimento('calmo');
    expect(movimentoDoFio()).toBe('calmo');
    simularMovimento('reduzido');
    expect(movimentoDoFio()).toBe('calmo');
  });

  it('sem animação no navegador (o modo dos testes) fica no Calmo', () => {
    simularMovimento('normal');
    expect(movimentoDoFio()).toBe('calmo');
  });

  it('o gancho acompanha o perfil quando `AplicarAparencia` o troca, sem remontar', async () => {
    instalarAnimate();
    simularMovimento('normal');
    render(<Mostra />);
    expect(screen.getByText('vivo')).toBeInTheDocument();

    await act(async () => {
      document.documentElement.dataset.perfil = 'calmo';
      // O MutationObserver avisa em seguida, fora da tarefa que mudou o atributo.
      await Promise.resolve();
    });
    expect(await screen.findByText('calmo')).toBeInTheDocument();

    await act(async () => {
      delete document.documentElement.dataset.perfil;
      await Promise.resolve();
    });
    expect(await screen.findByText('vivo')).toBeInTheDocument();
  });
});
