import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { registrarBackup, Repositorio } from '../../../core/persistencia';
import { ContextoRepositorio } from '../../dados/contexto';
import { ApagarTudo } from './ApagarTudo';

async function montar(comCopia: boolean) {
  const repo = await Repositorio.abrir({ nomeBanco: `apagar-${Math.random()}` });
  if (comCopia) await registrarBackup(repo);
  render(
    <ContextoRepositorio.Provider value={repo}>
      <MemoryRouter>
        <ApagarTudo />
      </MemoryRouter>
    </ContextoRepositorio.Provider>,
  );
  const u = userEvent.setup();
  await u.click(screen.getByRole('button', { name: 'Apagar tudo…' }));
  await u.click(screen.getByLabelText(/Entendo que os dados/));
  return { u, botao: () => screen.getByRole('button', { name: 'Apagar tudo', exact: true }) };
}

describe('Apagar tudo e recomeçar (A7)', () => {
  it('sem cópia, o botão só libera depois de confirmar a exportação', async () => {
    const { u, botao } = await montar(false);
    expect(await screen.findByText(/exporte uma cópia/i)).toBeInTheDocument();
    expect(botao()).toBeDisabled();
    await u.click(screen.getByLabelText(/Já exportei/));
    expect(botao()).toBeEnabled();
  });

  it('com cópia registrada, libera sem pedir confirmação extra', async () => {
    const { botao } = await montar(true);
    await vi.waitFor(() => {
      expect(botao()).toBeEnabled();
    });
    expect(screen.queryByLabelText(/Já exportei/)).not.toBeInTheDocument();
  });
});
