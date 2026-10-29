import { render, screen, waitFor } from '@testing-library/react';
import { Repositorio } from '../../core/persistencia';
import { ProvedorRepositorio } from './ProvedorRepositorio';

function montarTela() {
  document.body.insertAdjacentHTML('afterbegin', '<div id="carregamento" role="status"></div>');
}

describe('Provedor do repositório e a tela de carregamento do index.html', () => {
  afterEach(() => {
    document.getElementById('carregamento')?.remove();
  });

  it('enquanto o banco abre, a tela fica', () => {
    montarTela();
    render(
      <ProvedorRepositorio abrir={() => new Promise<Repositorio>(() => undefined)}>
        <p>app</p>
      </ProvedorRepositorio>,
    );
    expect(document.getElementById('carregamento')).toBeInTheDocument();
    expect(document.getElementById('carregamento')).not.toHaveAttribute('data-saindo');
  });

  it('quando o banco abre, a tela fica por conta da Abertura e, se ninguém a tira, sai sozinha aos 0,6 s', async () => {
    montarTela();
    const repo = await Repositorio.abrir({ nomeBanco: `carregamento-${String(Math.random())}` });
    render(
      <ProvedorRepositorio abrir={() => Promise.resolve(repo)}>
        <p>app</p>
      </ProvedorRepositorio>,
    );
    expect(await screen.findByText('app')).toBeInTheDocument();
    // A rede de segurança espera a Abertura (que decide em até 0,4 s): não sai na hora.
    await new Promise((resolver) => setTimeout(resolver, 250));
    expect(document.getElementById('carregamento')).not.toHaveAttribute('data-saindo');
    await waitFor(
      () => {
        expect(document.getElementById('carregamento')).toBeNull();
      },
      { timeout: 2000 },
    );
  });

  it('se o banco não abre, a tela sai e a explicação aparece', async () => {
    montarTela();
    render(
      <ProvedorRepositorio abrir={() => Promise.reject(new Error('sem banco'))}>
        <p>app</p>
      </ProvedorRepositorio>,
    );
    expect(
      await screen.findByText('Não foi possível abrir os dados deste aparelho.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById('carregamento')).toBeNull();
    });
  });
});
