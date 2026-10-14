import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ServicoDeContaFalso } from '../../../integracoes/conta';
import { ProvedorConta } from './ContextoConta';
import { Entrar, VERSAO_TERMOS } from './Entrar';

function montar(servico: ServicoDeContaFalso, inicial = '/conta/entrar') {
  const aoEntrar = vi.fn();
  const prepararConta = vi.fn(() => Promise.resolve());
  render(
    <ProvedorConta servico={servico}>
      <MemoryRouter initialEntries={[inicial]}>
        <Routes>
          <Route
            path="/conta/entrar"
            element={<Entrar aoEntrar={aoEntrar} prepararConta={prepararConta} />}
          />
          <Route path="/conta" element={<p>Conta</p>} />
        </Routes>
      </MemoryRouter>
    </ProvedorConta>,
  );
  return { aoEntrar, prepararConta };
}

describe('Entrar (F4-A, A3)', () => {
  it('código por e-mail: pede, confirma, prepara o banco da conta e registra o aceite', async () => {
    const servico = new ServicoDeContaFalso({ convidados: ['a@exemplo.com'] });
    const { aoEntrar, prepararConta } = montar(servico);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/receba um código/i), 'A@exemplo.com');
    await u.click(screen.getByRole('button', { name: 'Enviar código' }));
    await u.type(await screen.findByLabelText(/código de 6 dígitos/i), '123456');
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    await vi.waitFor(() => {
      expect(aoEntrar).toHaveBeenCalled();
    });
    expect(prepararConta).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@exemplo.com' }));
    expect(servico.aceites).toEqual([VERSAO_TERMOS]);
  });

  it('e-mail sem convite mostra o aviso e deixa seguir sem conta', async () => {
    montar(new ServicoDeContaFalso({ convidados: ['a@exemplo.com'] }));
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/receba um código/i), 'fora@exemplo.com');
    await u.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ainda não foi liberado/i);
    expect(screen.getByRole('link', { name: 'Usar sem conta' })).toBeInTheDocument();
  });

  it('código errado não entra', async () => {
    const { aoEntrar } = montar(new ServicoDeContaFalso());
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/receba um código/i), 'a@exemplo.com');
    await u.click(screen.getByRole('button', { name: 'Enviar código' }));
    await u.type(await screen.findByLabelText(/código de 6 dígitos/i), '000000');
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/código inválido/i);
    expect(aoEntrar).not.toHaveBeenCalled();
  });

  it('sem rede avisa sem travar; erro vindo do retorno do Google aparece', async () => {
    montar(new ServicoDeContaFalso({ semRede: true }), '/conta/entrar?erro=sem-convite');
    expect(screen.getByRole('alert')).toHaveTextContent(/ainda não foi liberado/i);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar com o Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/sem conexão/i);
  });
});
