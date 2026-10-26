import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvisoDeAtualizacao } from './AvisoDeAtualizacao';

const estado = vi.hoisted(() => ({ pronta: true, aplicar: vi.fn() }));
vi.mock('../../offline/registro', () => ({
  useAtualizacaoPronta: () => estado.pronta,
  aplicarAtualizacao: estado.aplicar,
}));

describe('Hoje › linha de versão nova (AP-00)', () => {
  beforeEach(() => {
    estado.pronta = true;
    estado.aplicar.mockClear();
  });

  it('sem versão nova pronta, não aparece', () => {
    estado.pronta = false;
    render(<AvisoDeAtualizacao />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('com versão nova, avisa e "Atualizar" aplica sem esconder nada antes da hora', async () => {
    const usuario = userEvent.setup();
    render(<AvisoDeAtualizacao />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Uma versão nova do Arretado está pronta.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(estado.aplicar).toHaveBeenCalledOnce();
  });

  it('"Depois" esconde a linha e não aplica a versão', async () => {
    const usuario = userEvent.setup();
    render(<AvisoDeAtualizacao />);
    await usuario.click(screen.getByRole('button', { name: 'Depois' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(estado.aplicar).not.toHaveBeenCalled();
  });
});
