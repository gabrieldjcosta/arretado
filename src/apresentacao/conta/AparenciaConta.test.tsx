import { render, screen, within } from '@testing-library/react';
import { alterarPreferencias } from '../../core/preferencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

describe('Conta › Aparência: foco na frase', () => {
  it('sem a API de realce do navegador não oferece "Só a frase em leitura", e a gravada antes aparece como desligado', async () => {
    // O jsdom não tem a API de realce: é o caso do navegador antigo.
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { reguaDeFoco: 'frase' });
    window.location.hash = '#/conta/aparencia';
    render(<App abrir={() => Promise.resolve(repo)} />);
    const foco = await screen.findByRole('combobox', { name: 'Foco na frase' });
    expect(within(foco).getAllByRole('option')).toHaveLength(2);
    expect(within(foco).queryByRole('option', { name: 'Só a frase em leitura' })).toBeNull();
    expect(foco).toHaveValue('desligada');
  });
});
