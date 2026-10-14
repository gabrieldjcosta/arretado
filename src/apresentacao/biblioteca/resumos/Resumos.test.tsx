import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

describe('Biblioteca › Resumos', () => {
  it('cria um resumo só com o corpo, reabre e edita', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/biblioteca/resumos';
    const usuario = userEvent.setup();
    render(
      <App abrir={() => Promise.resolve(repo)} fonteAcervo={await FonteEmMemoria.criar([])} />,
    );
    expect(
      await screen.findByText('Nenhum resumo ainda', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Escrever um resumo' }));
    const salvar = await screen.findByRole('button', { name: 'Salvar' }, { timeout: 5000 });
    expect(salvar).toBeDisabled();
    await usuario.type(screen.getByLabelText('Resumo'), 'ADPF 347 e o estado de coisas');
    await usuario.click(salvar);
    expect(
      await screen.findByRole(
        'heading',
        { name: 'ADPF 347 e o estado de coisas' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Editar' }));
    await usuario.type(screen.getByLabelText('Resumo'), ' inconstitucional');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(
      () => {
        expect(screen.getByText(/inconstitucional/)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await usuario.click(
      await screen.findByRole('button', { name: 'Excluir resumo' }, { timeout: 5000 }),
    );
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(
      await screen.findByText('Nenhum resumo ainda', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
