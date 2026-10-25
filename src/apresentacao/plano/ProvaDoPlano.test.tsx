import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataDaProvaInformada } from '../../dominios/recall/prova';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

describe('Plano › data da prova (AP-03)', () => {
  it('guarda a data, mostra sem contagem regressiva e tira de novo', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    const campo = await screen.findByLabelText('Data da prova objetiva (opcional)');
    const guardar = screen.getByRole('button', { name: 'Guardar a data' });
    expect(guardar).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Tirar a data' })).not.toBeInTheDocument();

    await usuario.type(campo, '2027-01-10');
    await usuario.click(guardar);
    await waitFor(async () => {
      expect(await dataDaProvaInformada(repo)).toBe('2027-01-10');
    });
    expect(await screen.findByText('Prova guardada: 10/01/2027.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/faltam|restam \d+ dias|contagem/i);

    await usuario.click(screen.getByRole('button', { name: 'Tirar a data' }));
    await waitFor(async () => {
      expect(await dataDaProvaInformada(repo)).toBeUndefined();
    });
  });
});
