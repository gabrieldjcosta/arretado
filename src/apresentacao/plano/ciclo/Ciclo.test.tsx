import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cicloAtivo } from '../../../dominios/ciclos';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

async function abrir(rota: string) {
  const { repo } = await repositorioDeTeste();
  const penal = await repo.colecao('disciplinas').criar({ nome: 'Penal', ordem: 1 });
  const civil = await repo.colecao('disciplinas').criar({ nome: 'Civil', ordem: 2 });
  for (let i = 0; i < 4; i++)
    await repo
      .colecao('pontos')
      .criar({ titulo: `P${String(i)}`, disciplinaId: penal.id, faixa: 'alta' });
  await repo.colecao('pontos').criar({ titulo: 'C', disciplinaId: civil.id, faixa: 'media' });
  window.location.hash = rota;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Ciclo de estudo (C3)', () => {
  it('sem ciclo: convite; o assistente cria e a volta aparece com o bloco atual', async () => {
    const { repo, usuario } = await abrir('#/plano/ciclo');
    await usuario.click(await screen.findByRole('link', { name: 'Criar ciclo' }));

    await usuario.click(await screen.findByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('radio', { name: /Igual para todas/ }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/2 blocos por volta/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar ciclo' }));

    expect(await screen.findByRole('heading', { name: 'Volta 1' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Penal');
    expect((await cicloAtivo(repo))?.blocos).toHaveLength(2);
  });

  it('mais uma vez de uma matéria refaz a volta; pular avança o bloco atual', async () => {
    const { repo, usuario } = await abrir('#/plano/ciclo/novo');
    await usuario.click(await screen.findByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('radio', { name: /Igual para todas/ }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Criar ciclo' }));

    await usuario.click(await screen.findByRole('button', { name: 'Mais uma vez de Civil' }));
    expect((await cicloAtivo(repo))?.blocos).toHaveLength(3);

    await usuario.click(await screen.findByRole('button', { name: 'Pular este bloco' }));
    expect(await screen.findByRole('listitem', { current: 'step' })).not.toHaveTextContent('Penal');
  });
});
