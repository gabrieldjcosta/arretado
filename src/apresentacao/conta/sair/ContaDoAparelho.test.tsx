import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  entrarNaConta,
  nomeBancoDaConta,
  registrarBackup,
  RegistroDeContas,
  Repositorio,
} from '../../../core/persistencia';
import { FalhaDeConta, ServicoDeContaFalso } from '../../../integracoes/conta';
import { ContextoRepositorio } from '../../dados/contexto';
import { ProvedorConta } from '../entrar/ContextoConta';
import { ContaDoAparelhoSecao } from './ContaDoAparelho';

const UID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const OUTRA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

async function montar(opcoes: { comCopia?: boolean; servico?: ServicoDeContaFalso } = {}) {
  const registro = new RegistroDeContas(`registro-${Math.random()}`);
  await entrarNaConta({ uid: OUTRA, email: 'outra@exemplo.com' }, { registro });
  await entrarNaConta({ uid: UID, email: 'a@exemplo.com' }, { registro });
  const repo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID) });
  if (opcoes.comCopia) await registrarBackup(repo);
  const servico = opcoes.servico ?? new ServicoDeContaFalso();
  const recarregar = vi.fn();
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ProvedorConta servico={servico}>
        <MemoryRouter>
          <ContaDoAparelhoSecao registro={registro} recarregar={recarregar} />
        </MemoryRouter>
      </ProvedorConta>
    </ContextoRepositorio.Provider>,
  );
  await screen.findByText('a@exemplo.com');
  return { registro, servico, recarregar, usuario: userEvent.setup() };
}

describe('Conta neste aparelho (F4-A, A5)', () => {
  it('lista a outra conta e troca para ela sem rede', async () => {
    const { registro, recarregar, usuario } = await montar();
    await usuario.click(screen.getByRole('button', { name: 'Usar esta conta' }));
    await waitFor(() => {
      expect(recarregar).toHaveBeenCalled();
    });
    expect((await registro.contaAtiva())?.uid).toBe(OUTRA);
  });

  it('sair mantendo os dados: conta deixa de ser ativa e o banco fica', async () => {
    const { registro, recarregar, usuario } = await montar();
    await usuario.click(screen.getByRole('button', { name: 'Sair…' }));
    await usuario.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => {
      expect(recarregar).toHaveBeenCalled();
    });
    expect(await registro.contaAtiva()).toBeNull();
    expect((await registro.listar()).map((c) => c.uid)).toContain(UID);
  });

  it('"apagar daqui" só libera depois de confirmar a exportação quando não há cópia', async () => {
    const { usuario } = await montar();
    await usuario.click(screen.getByRole('button', { name: 'Sair…' }));
    await usuario.click(screen.getByLabelText(/Apagar daqui/));
    expect(screen.getByRole('button', { name: 'Apagar daqui e sair' })).toBeDisabled();
    await usuario.click(screen.getByLabelText(/Já exportei/));
    expect(screen.getByRole('button', { name: 'Apagar daqui e sair' })).toBeEnabled();
  });

  it('com cópia recente "apagar daqui" já está liberado e remove a conta do aparelho', async () => {
    const { registro, recarregar, usuario } = await montar({ comCopia: true });
    await usuario.click(screen.getByRole('button', { name: 'Sair…' }));
    await usuario.click(screen.getByLabelText(/Apagar daqui/));
    await usuario.click(screen.getByRole('button', { name: 'Apagar daqui e sair' }));
    await waitFor(() => {
      expect(recarregar).toHaveBeenCalled();
    });
    expect((await registro.listar()).map((c) => c.uid)).not.toContain(UID);
  });

  it('excluir conta exige digitar, chama o servidor e só então apaga o aparelho', async () => {
    const servico = new ServicoDeContaFalso();
    const espiao = vi.spyOn(servico, 'excluirConta').mockResolvedValue();
    const { registro, recarregar, usuario } = await montar({ servico });
    await usuario.click(screen.getByRole('button', { name: 'Excluir minha conta…' }));
    const botao = screen.getByRole('button', { name: 'Excluir para sempre' });
    expect(botao).toBeDisabled();
    await usuario.type(screen.getByLabelText(/Digite/), 'excluir');
    await usuario.click(botao);
    await waitFor(() => {
      expect(recarregar).toHaveBeenCalled();
    });
    expect(espiao).toHaveBeenCalledTimes(1);
    expect((await registro.listar()).map((c) => c.uid)).not.toContain(UID);
  });

  it('se o servidor falhar na exclusão, nada é apagado no aparelho', async () => {
    const servico = new ServicoDeContaFalso();
    vi.spyOn(servico, 'excluirConta').mockRejectedValue(
      new FalhaDeConta('sem-rede', 'Sem conexão.'),
    );
    const { registro, recarregar, usuario } = await montar({ servico });
    await usuario.click(screen.getByRole('button', { name: 'Excluir minha conta…' }));
    await usuario.type(screen.getByLabelText(/Digite/), 'excluir');
    await usuario.click(screen.getByRole('button', { name: 'Excluir para sempre' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Nada foi apagado/);
    expect(recarregar).not.toHaveBeenCalled();
    expect((await registro.contaAtiva())?.uid).toBe(UID);
  });
});
