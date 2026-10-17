// Migração dentro do app de verdade (revisão do PR 168): ProvedorRepositorio real, migração real e
// fake-indexeddb, sem mock do núcleo. Depois de entrar, a conta já está ativa e a recarga cai em
// #/conta/migracao; a cópia apaga e recria o banco da conta, e a tela não pode cair junto.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoSintetico } from '../../../core/pacote/fixtures/banco-sintetico';
import { estadoDaMigracao } from '../../../core/pacote/migrar-para-conta';
import {
  entrarNaConta,
  NOME_BANCO_PRINCIPAL,
  NOME_REGISTRO_DE_CONTAS,
  nomeBancoDaConta,
  RegistroDeContas,
} from '../../../core/persistencia';
import { App } from '../../App';
import { recarregarEm } from '../recarregar';

vi.mock('../recarregar', () => ({ recarregarEm: vi.fn() }));

const UID = '0b7c2f3e-5a1d-4c6e-9f80-123456789abc';

describe('Migração no app (ProvedorRepositorio real)', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_CONTA', '1');
    // O backup baixa um arquivo; o jsdom não tem URL de Blob.
    URL.createObjectURL = vi.fn(() => 'blob:teste');
    URL.revokeObjectURL = vi.fn();
    const { repo } = await criarBancoSintetico(NOME_BANCO_PRINCIPAL);
    repo.fechar();
    // Como a tela Entrar faz: abre o banco da conta (só a identidade) e o ativa.
    await entrarNaConta({ uid: UID, email: 'convidado@exemplo.com' });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.mocked(recarregarEm).mockClear();
    window.location.hash = '';
    for (const nome of [NOME_BANCO_PRINCIPAL, nomeBancoDaConta(UID), NOME_REGISTRO_DE_CONTAS]) {
      await Dexie.delete(nome);
    }
  });

  it('copiar para a conta conclui sem derrubar o app, e "Ir para o Hoje" recarrega (T26)', async () => {
    window.location.hash = '#/conta/migracao';
    const u = userEvent.setup();
    render(<App />);

    await u.click(await screen.findByRole('button', { name: 'Copiar para a conta' }));

    expect(await screen.findByRole('heading', { name: 'Tudo copiado' })).toBeInTheDocument();
    expect(screen.queryByText(/apagados em outra aba/)).not.toBeInTheDocument();
    expect(await estadoDaMigracao(UID)).toBe('concluida');
    expect((await new RegistroDeContas().contaAtiva())?.uid).toBe(UID);

    await u.click(screen.getByRole('link', { name: 'Ir para o Hoje' }));
    expect(recarregarEm).toHaveBeenCalledWith('#/');
  });
});
