import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataDaProvaInformada } from '../../dominios/recall/prova';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

describe('Plano › data da prova (AP-03)', () => {
  it('abre a pedido, guarda a data sem contagem regressiva, devolve o foco e tira de novo', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    expect(screen.queryByLabelText('Data da prova objetiva (opcional)')).not.toBeInTheDocument();
    await usuario.click(
      await screen.findByRole('button', { name: 'Informar a data da prova (opcional)' }),
    );
    const campo = screen.getByLabelText('Data da prova objetiva (opcional)');
    expect(campo).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Guardar a data' })).not.toBeInTheDocument();

    await usuario.type(campo, '2000-01-10');
    expect(screen.getByRole('status')).toHaveTextContent('Escolha uma data depois de hoje.');
    expect(screen.queryByRole('button', { name: 'Guardar a data' })).not.toBeInTheDocument();

    await usuario.clear(campo);
    await usuario.type(campo, '2099-01-10');
    await usuario.click(screen.getByRole('button', { name: 'Guardar a data' }));
    await waitFor(async () => {
      expect(await dataDaProvaInformada(repo)).toBe('2099-01-10');
    });
    expect(await screen.findByText('Prova objetiva: 10/01/2099')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mudar' })).toHaveFocus();
    });
    expect(document.body.textContent).not.toMatch(/faltam|restam \d+ dias|contagem/i);

    await usuario.click(screen.getByRole('button', { name: 'Tirar' }));
    await waitFor(async () => {
      expect(await dataDaProvaInformada(repo)).toBeUndefined();
    });
  });
});
