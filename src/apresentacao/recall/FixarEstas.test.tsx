import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { FixarEstas } from './FixarEstas';

afterEach(cleanup);

const itens = ['1', '2', '3'].map((n) => ({
  dispositivoId: `00000000-0000-4000-8000-00000000000${n}`,
  versaoId: '22222222-2222-4222-8222-222222222222',
  rotulo: `Súmula Vinculante ${n}`,
  texto: `Enunciado ${n}.`,
}));

async function montar(props: Parameters<typeof FixarEstas>[0]) {
  const { repo } = await repositorioDeTeste();
  const usuario = userEvent.setup();
  render(
    <ContextoRepositorio.Provider value={repo}>
      <MemoryRouter>
        <FixarEstas {...props} />
      </MemoryRouter>
    </ContextoRepositorio.Provider>,
  );
  return { repo, usuario };
}

describe('Fixar estas', () => {
  it('mostra a lista inteira e não grava nada antes de confirmar', async () => {
    const { repo, usuario } = await montar({ itens });
    await usuario.click(screen.getByRole('button', { name: 'Ver a lista' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Fixar as súmulas vinculantes?' });
    expect(within(dialogo).getAllByRole('listitem')).toHaveLength(3);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agora não' }));
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);
  });

  it('confirmar cria as Frases', async () => {
    const { repo, usuario } = await montar({ itens });
    await usuario.click(screen.getByRole('button', { name: 'Ver a lista' }));
    await usuario.click(await screen.findByRole('button', { name: 'Fixar 3 frases' }));
    expect(await screen.findByText('3 frases fixadas.')).toBeInTheDocument();
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(3);
  });

  it('sem a coleção na Biblioteca, leva a adicioná-la; sem nada a fixar, some', async () => {
    await montar({ itens: [], semColecao: true });
    expect(screen.getByRole('link', { name: 'Adicionar as súmulas' })).toHaveAttribute(
      'href',
      '/biblioteca/acervo?tipo=sumulas',
    );
    cleanup();
    await montar({ itens: [] });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
