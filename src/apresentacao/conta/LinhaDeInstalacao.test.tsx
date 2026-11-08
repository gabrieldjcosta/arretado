import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinhaDeInstalacao } from './LinhaDeInstalacao';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LinhaDeInstalacao', () => {
  it('sem convite e fora do iOS, não aparece', () => {
    const { container } = render(<LinhaDeInstalacao />);
    expect(container).toBeEmptyDOMElement();
  });

  it('com o convite do navegador, mostra o botão e dispara o prompt', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    render(
      <>
        <h1>Conta e ajustes</h1>
        <ul>
          <LinhaDeInstalacao />
        </ul>
      </>,
    );
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    window.dispatchEvent(evento);
    const botao = await screen.findByRole('button', { name: 'Instalar' });
    expect(botao).toHaveAccessibleDescription('Instalar no aparelho');
    await userEvent.setup().click(botao);
    expect(prompt).toHaveBeenCalledOnce();
    expect(evento.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('no iOS, mostra o passo a passo e nenhum botão', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    );
    render(<LinhaDeInstalacao />);
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
