import { render, screen, waitFor } from '@testing-library/react';
import {
  entrarNaConta,
  nomeBancoDaConta,
  RegistroDeContas,
  Repositorio,
} from '../../core/persistencia';
import { temConsentimento } from '../../core/preferencias';
import { descartarAceiteDoLogin, marcarAceiteDoLogin } from '../conta/entrar/aceite';
import { ProvedorRepositorio } from './ProvedorRepositorio';

const UID_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const UID_B = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

async function preparar(UID = UID_A) {
  const registro = new RegistroDeContas(`registro-${Math.random()}`);
  await entrarNaConta({ uid: UID, email: 'a@exemplo.com' }, { registro });
  const repo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID) });
  return { registro, repo };
}

describe('Provedor do repositório grava o aceite do login (F4-A, A7)', () => {
  afterEach(() => {
    descartarAceiteDoLogin();
    vi.unstubAllEnvs();
  });

  it('ao abrir o banco da conta, sem abrir Conta, grava v3:login', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const { registro, repo } = await preparar();
    marcarAceiteDoLogin();
    render(
      <ProvedorRepositorio abrir={() => Promise.resolve(repo)} registro={registro}>
        <p>app</p>
      </ProvedorRepositorio>,
    );
    expect(await screen.findByText('app')).toBeInTheDocument();
    await waitFor(async () => {
      expect(await temConsentimento(repo, 'login')).toBe(true);
    });
  });

  it('com VITE_CONTA=0 nada é gravado', async () => {
    vi.stubEnv('VITE_CONTA', '0');
    const { registro, repo } = await preparar(UID_B);
    marcarAceiteDoLogin();
    render(
      <ProvedorRepositorio abrir={() => Promise.resolve(repo)} registro={registro}>
        <p>app</p>
      </ProvedorRepositorio>,
    );
    expect(await screen.findByText('app')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 100));
    expect(await temConsentimento(repo, 'login')).toBe(false);
  });
});
