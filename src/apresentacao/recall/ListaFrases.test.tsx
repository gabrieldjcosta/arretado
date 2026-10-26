import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { criarFraseDeTrecho } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { ListaFrases } from './ListaFrases';

afterEach(cleanup);

// O cartão some junto com a recarga da lista; quem diz o que houve e recebe o foco é a lista.
vi.mock('./FixarEstas', () => ({
  FixarEstas: ({ aoFixar }: { aoFixar?: (n: number) => void }) => (
    <button
      type="button"
      onClick={() => {
        aoFixar?.(3);
      }}
    >
      Fixar
    </button>
  ),
}));

describe('Frases', () => {
  it('depois de fixar, a lista diz quantas entraram e leva o foco até essa linha', async () => {
    const { repo } = await repositorioDeTeste();
    await criarFraseDeTrecho(repo, {
      texto: 'Frase um',
      trecho: {
        dispositivoId: '11111111-1111-4111-8111-111111111111',
        texto: 'trecho',
        inicio: 0,
        fim: 6,
      },
    });
    const usuario = userEvent.setup();
    render(
      <ContextoRepositorio.Provider value={repo}>
        <MemoryRouter>
          <ListaFrases />
        </MemoryRouter>
      </ContextoRepositorio.Provider>,
    );
    await usuario.click(await screen.findByRole('button', { name: 'Fixar' }));
    const aviso = await screen.findByText(
      /3 frases fixadas\. A Revisão começa amanhã, 5 por dia\./,
    );
    expect(aviso).toHaveFocus();
  });
});
