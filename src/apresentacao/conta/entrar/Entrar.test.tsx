import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { migrarParaConta } from '../../../core/pacote/migrar-para-conta';
import { RegistroDeContas, Repositorio } from '../../../core/persistencia';
import { ServicoDeContaFalso, type SessaoDeConta } from '../../../integracoes/conta';
import { ProvedorConta } from './ContextoConta';
import { destinoDepoisDeEntrar } from './destino';
import { aceiteDoLoginPendente, descartarAceiteDoLogin } from './aceite';
import { Entrar, VERSAO_TERMOS } from './Entrar';

function montar(
  servico: ServicoDeContaFalso,
  inicial = '/conta/entrar',
  destino: (s: SessaoDeConta) => Promise<string> = () => Promise.resolve('#/conta/migracao'),
) {
  const aoEntrar = vi.fn();
  const prepararConta = vi.fn(() => Promise.resolve());
  render(
    <ProvedorConta servico={servico}>
      <MemoryRouter initialEntries={[inicial]}>
        <Routes>
          <Route
            path="/conta/entrar"
            element={<Entrar aoEntrar={aoEntrar} prepararConta={prepararConta} destino={destino} />}
          />
          <Route path="/conta" element={<p>Conta</p>} />
        </Routes>
      </MemoryRouter>
    </ProvedorConta>,
  );
  return { aoEntrar, prepararConta };
}

afterEach(descartarAceiteDoLogin);

describe('Entrar (F4-A, A3)', () => {
  it('o aceite só existe depois do clique em entrar; "Usar sem conta" não pede nada (A7)', async () => {
    montar(new ServicoDeContaFalso({ convidados: ['a@exemplo.com'] }));
    expect(aceiteDoLoginPendente()).toBeNull();
    expect(screen.getByRole('link', { name: 'Usar sem conta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conta › Privacidade/ })).toBeInTheDocument();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/receba um código/i), 'a@exemplo.com');
    await u.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(aceiteDoLoginPendente()).not.toBeNull();
  });

  it('sem a marca de aceite, o código não entra (A7)', async () => {
    const servico = new ServicoDeContaFalso({ convidados: ['a@exemplo.com'] });
    const { aoEntrar, prepararConta } = montar(servico);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/receba um código/i), 'a@exemplo.com');
    await u.click(screen.getByRole('button', { name: 'Enviar código' }));
    descartarAceiteDoLogin();
    await u.type(await screen.findByLabelText(/código de 6 dígitos/i), '123456');
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/sem aceitar/i);
    expect(prepararConta).not.toHaveBeenCalled();
    expect(aoEntrar).not.toHaveBeenCalled();
  });

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

  describe('destino depois de entrar (A4)', () => {
    const sufixo = () => Math.random().toString(36).slice(2);

    async function entrarCom(destino: (s: SessaoDeConta) => Promise<string>) {
      const { aoEntrar } = montar(
        new ServicoDeContaFalso({ convidados: ['a@exemplo.com'] }),
        '/conta/entrar',
        destino,
      );
      const u = userEvent.setup();
      await u.type(screen.getByLabelText(/receba um código/i), 'a@exemplo.com');
      await u.click(screen.getByRole('button', { name: 'Enviar código' }));
      await u.type(await screen.findByLabelText(/código de 6 dígitos/i), '123456');
      await u.click(screen.getByRole('button', { name: 'Entrar' }));
      await vi.waitFor(() => {
        expect(aoEntrar).toHaveBeenCalledTimes(1);
      });
      return aoEntrar.mock.calls[0]?.[0] as string;
    }

    async function origemComEstudo(): Promise<string> {
      const nomeOrigem = `origem-entrar-${sufixo()}`;
      const repo = await Repositorio.abrir({ nomeBanco: nomeOrigem });
      await repo.colecao('tags').criar({ nome: 'Estudo sem conta' });
      repo.fechar();
      return nomeOrigem;
    }

    it('estudo sem conta e migração não feita: vai para a migração', async () => {
      const registro = new RegistroDeContas(`registro-${sufixo()}`);
      const nomeOrigem = await origemComEstudo();
      expect(await entrarCom((s) => destinoDepoisDeEntrar(s, { registro, nomeOrigem }))).toBe(
        '#/conta/migracao',
      );
    });

    it('estudo sem conta e migração já concluída: vai para a conta', async () => {
      const registro = new RegistroDeContas(`registro-${sufixo()}`);
      const nomeOrigem = await origemComEstudo();
      const origem = await Repositorio.abrir({ nomeBanco: nomeOrigem });
      // uid fixo do ServicoDeContaFalso.
      const r = await migrarParaConta(origem, {
        uid: '55555555-5555-4555-8555-555555555555',
        registro,
        baixarBackup: () => Promise.resolve(),
      });
      origem.fechar();
      expect(r.tipo).toBe('concluida');
      expect(await entrarCom((s) => destinoDepoisDeEntrar(s, { registro, nomeOrigem }))).toBe(
        '#/conta',
      );
    });

    it('banco sem conta só com a identidade, ou inexistente: vai para a conta', async () => {
      const registro = new RegistroDeContas(`registro-${sufixo()}`);
      const soIdentidade = `origem-vazia-${sufixo()}`;
      (await Repositorio.abrir({ nomeBanco: soIdentidade })).fechar();
      expect(
        await destinoDepoisDeEntrar(
          { uid: '00000000-0000-4000-8000-000000000001', email: 'a@exemplo.com' },
          { registro, nomeOrigem: soIdentidade },
        ),
      ).toBe('#/conta');
      expect(
        await entrarCom((s) =>
          destinoDepoisDeEntrar(s, { registro, nomeOrigem: `nao-existe-${sufixo()}` }),
        ),
      ).toBe('#/conta');
    });
  });
});
