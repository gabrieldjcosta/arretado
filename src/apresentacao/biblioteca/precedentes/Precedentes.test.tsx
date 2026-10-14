import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

const espera = { timeout: 5000 };

describe('Biblioteca › Precedentes', () => {
  it('cadastra, mostra a tese, favorita, relaciona a outro e exclui', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/biblioteca/precedentes';
    const usuario = userEvent.setup();
    render(
      <App abrir={() => Promise.resolve(repo)} fonteAcervo={await FonteEmMemoria.criar([])} />,
    );
    expect(await screen.findByText('Nenhum precedente ainda', {}, espera)).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: 'Cadastrar um precedente' }));
    const salvar = await screen.findByRole('button', { name: 'Salvar' }, espera);
    expect(salvar).toBeDisabled();
    await usuario.type(screen.getByLabelText(/^Tribunal/), 'STF');
    await usuario.type(screen.getByLabelText(/^Número/), 'ADPF 347');
    await usuario.type(screen.getByLabelText(/^Texto/), 'Estado de coisas inconstitucional.');
    await usuario.click(salvar);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /STF ADPF 347/ })).toBeInTheDocument();
    }, espera);
    expect(
      screen.getByText('Estado de coisas inconstitucional.', { selector: 'blockquote' }),
    ).toBeInTheDocument();

    const estrela = screen.getByRole('button', { name: 'Marcar como favorito' });
    await usuario.click(estrela);
    expect(
      await screen.findByRole('button', { name: 'Tirar dos favoritos' }, espera),
    ).toHaveAttribute('aria-pressed', 'true');

    // Sem outro precedente, "Relacionar a outro" só oferece o acervo.
    await usuario.click(screen.getByRole('button', { name: 'Relacionar a outro' }));
    expect(
      await screen.findByText('Ou uma súmula, tese ou lei do acervo', {}, espera),
    ).toBeInTheDocument();
    await usuario.keyboard('{Escape}');

    await usuario.click(screen.getByRole('button', { name: 'Excluir precedente' }));
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Nenhum precedente ainda', {}, espera)).toBeInTheDocument();
  });
});
