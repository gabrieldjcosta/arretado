import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nomeBancoDaConta, Repositorio } from '../../../core/persistencia';
import { temConsentimento } from '../../../core/preferencias';
import { ServicoDeContaFalso } from '../../../integracoes/conta';
import { ContextoRepositorio } from '../../dados/contexto';
import { ProvedorConta } from '../entrar/ContextoConta';
import { NuvemBackup } from './NuvemBackup';

const UID = '99999999-9999-4999-8999-999999999999';
const SESSAO = { uid: UID, email: 'a@exemplo.com' };
const FRASE = 'cavalo bateria grampo correto';

async function montar() {
  const repo = await Repositorio.abrir({
    nomeBanco: `${nomeBancoDaConta(UID)}-${Math.random()}`,
    usuarioId: UID,
  });
  const servico = new ServicoDeContaFalso({ sessao: SESSAO });
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ProvedorConta servico={servico}>
        <NuvemBackup iteracoes={1_000} />
      </ProvedorConta>
    </ContextoRepositorio.Provider>,
  );
  const usuario = userEvent.setup();
  await usuario.click(await screen.findByRole('button', { name: 'Guardar cópia na nuvem…' }));
  return { repo, servico, usuario };
}

async function preencher(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText(/^Frase/), FRASE);
  await usuario.type(screen.getByLabelText('Repita a frase'), FRASE);
}

describe('Cópia na nuvem exige o aceite v3:backup-nuvem (F4-A, A7)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CONTA', '1');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sem marcar o aceite, o envio fica bloqueado e nada sai', async () => {
    const { repo, servico, usuario } = await montar();
    const caixa = screen.getByRole('checkbox', { name: /entendi e aceito/i });
    expect(caixa).not.toBeChecked();
    expect(screen.getByRole('group', { name: /antes da primeira cópia/i })).toBeInTheDocument();
    await preencher(usuario);
    expect(screen.getByRole('button', { name: 'Cifrar e guardar' })).toBeDisabled();
    expect(servico.copias.size).toBe(0);
    expect(await temConsentimento(repo, 'backup-nuvem')).toBe(false);
  });

  it('com o aceite, envia e grava v3:backup-nuvem; a segunda cópia não pede de novo', async () => {
    const { repo, servico, usuario } = await montar();
    await preencher(usuario);
    await usuario.click(screen.getByRole('checkbox', { name: /entendi e aceito/i }));
    await usuario.click(screen.getByRole('button', { name: 'Cifrar e guardar' }));
    expect(await screen.findByText(/cópia guardada na nuvem/i)).toBeInTheDocument();
    expect(servico.copias.size).toBe(1);
    const [u] = await repo.colecao('usuarios').todosDoUsuario();
    expect(u?.consentimentos.map((c) => c.versaoPolitica)).toContain('v3:backup-nuvem');

    await usuario.click(screen.getByRole('button', { name: 'Guardar cópia na nuvem…' }));
    expect(screen.queryByRole('checkbox', { name: /entendi e aceito/i })).toBeNull();
    await preencher(usuario);
    expect(screen.getByRole('button', { name: 'Cifrar e guardar' })).toBeEnabled();
  });
});
