import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { PendenciasDaNorma } from './PendenciasDaNorma';

describe('PendenciasDaNorma (revisão das etapas 8, 9 e 11)', () => {
  it('o grifo ou nota pendente pode ser tirado, e o aviso sai quando não sobra nada', async () => {
    const { repo } = await repositorioDeTeste();
    const normaId = crypto.randomUUID();
    const nota = await repo.colecao('marcacoes').criar({
      normaId,
      dispositivoId: crypto.randomUUID(),
      versaoId: crypto.randomUUID(),
      tipo: 'nota',
      nota: 'Cai na prova.',
      ancora: { texto: 'trecho que sumiu', inicio: 0, fim: 16 },
      status: 'pendente',
    });
    const usuario = userEvent.setup();
    render(
      <ContextoRepositorio.Provider value={repo}>
        <PendenciasDaNorma normaId={normaId} />
      </ContextoRepositorio.Provider>,
    );
    const caixa = await screen.findByRole('region', { name: 'Para reler' });
    expect(caixa).toHaveTextContent('Nota: Cai na prova.');
    await usuario.click(within(caixa).getByRole('button', { name: 'Tirar “trecho que sumiu”' }));
    // Pede confirmação antes de apagar; "Manter" desiste.
    await usuario.click(within(caixa).getByRole('button', { name: 'Manter' }));
    expect(await repo.colecao('marcacoes').obter(nota.id)).toBeDefined();
    await usuario.click(within(caixa).getByRole('button', { name: 'Tirar “trecho que sumiu”' }));
    await usuario.click(within(caixa).getByRole('button', { name: 'Tirar mesmo' }));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Para reler' })).not.toBeInTheDocument();
    });
    expect(await repo.colecao('marcacoes').obter(nota.id)).toBeUndefined();
  });
});
