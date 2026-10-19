import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nomeBancoDaConta, Repositorio } from '../../../core/persistencia';
import { ServicoDeContaFalso } from '../../../integracoes/conta';
import { guardarCopiaNaNuvem } from '../../../integracoes/conta/backup-nuvem';
import { ContextoRepositorio } from '../../dados/contexto';
import { ProvedorConta } from '../entrar/ContextoConta';
import { NuvemBackup } from './NuvemBackup';

const UID = '88888888-8888-4888-8888-888888888888';
const SESSAO = { uid: UID, email: 'a@exemplo.com' };
const FRASE = 'cavalo bateria grampo correto';
const RAPIDO = 1_000;

async function montar(opcoes: { semRede?: boolean; comCopia?: boolean } = {}) {
  const repo = await Repositorio.abrir({
    nomeBanco: `${nomeBancoDaConta(UID)}-${Math.random()}`,
    usuarioId: UID,
  });
  await repo.colecao('erros').criar({
    resultado: 'errou',
    oQueFoi: 'Prazo',
    status: 'aberto',
    fraseCorreta: 'Frase da cópia.',
  });
  const servico = new ServicoDeContaFalso({ sessao: SESSAO });
  if (opcoes.comCopia) await guardarCopiaNaNuvem(repo, servico, FRASE, { iteracoes: RAPIDO });
  const usado = opcoes.semRede
    ? new ServicoDeContaFalso({ sessao: SESSAO, semRede: true })
    : servico;
  const recarregar = vi.fn();
  const tela = render(
    <ContextoRepositorio.Provider value={repo}>
      <ProvedorConta servico={usado}>
        <NuvemBackup iteracoes={RAPIDO} recarregar={recarregar} />
      </ProvedorConta>
    </ContextoRepositorio.Provider>,
  );
  return { repo, servico, recarregar, tela, usuario: userEvent.setup() };
}

describe('Cópia na nuvem em Conta › Dados (F4-A, A6)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('com VITE_CONTA=0 nada aparece', async () => {
    vi.stubEnv('VITE_CONTA', '0');
    const { tela } = await montar({ comCopia: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(tela.container).toBeEmptyDOMElement();
  });

  describe('com contas ligadas', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_CONTA', '1');
    });

    it('sem rede: mostra o estado sem erro', async () => {
      await montar({ semRede: true });
      expect(await screen.findByText('Salvo neste aparelho')).toBeInTheDocument();
      expect(await screen.findByText(/sem conexão agora/i)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('guardar: avisa da frase antes de cifrar e envia só bytes cifrados', async () => {
      const { servico, usuario } = await montar();
      expect(await screen.findByText(/ainda sem cópia na nuvem/i)).toBeInTheDocument();
      await usuario.click(screen.getByRole('button', { name: 'Guardar cópia na nuvem…' }));
      expect(screen.getByText(/perder a frase é perder a cópia/i)).toBeInTheDocument();
      await usuario.type(screen.getByLabelText(/^Frase/), FRASE);
      await usuario.type(screen.getByLabelText('Repita a frase'), FRASE);
      await usuario.click(screen.getByRole('checkbox', { name: /entendi e aceito/i }));
      await usuario.click(screen.getByRole('button', { name: 'Cifrar e guardar' }));
      expect(await screen.findByText(/cópia guardada na nuvem/i)).toBeInTheDocument();
      expect(screen.getByText(/com cópia na nuvem/i)).toBeInTheDocument();
      expect(servico.copias.size).toBe(1);
    });

    it('restaurar: frase errada não aplica; as três escolhas são explícitas', async () => {
      const { repo, usuario } = await montar({ comCopia: true });
      await repo.colecao('erros').criar({
        resultado: 'errou',
        oQueFoi: 'Outro',
        status: 'aberto',
        fraseCorreta: 'Só neste aparelho.',
      });
      await usuario.click(await screen.findByRole('button', { name: /^Restaurar/ }));
      await usuario.type(screen.getByLabelText('Frase desta cópia'), 'errada');
      await usuario.click(screen.getByRole('button', { name: 'Abrir cópia' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/nada foi alterado/i);
      expect(await repo.colecao('erros').todosDoUsuario()).toHaveLength(2);

      await usuario.clear(screen.getByLabelText('Frase desta cópia'));
      await usuario.type(screen.getByLabelText('Frase desta cópia'), FRASE);
      await usuario.click(screen.getByRole('button', { name: 'Abrir cópia' }));

      const usar = await screen.findByRole('radio', { name: /usar a cópia da nuvem/i });
      const manter = screen.getByRole('radio', { name: /manter o que está neste aparelho/i });
      const separar = screen.getByRole('radio', { name: /espaço separado/i });
      // Nenhuma escolha automática.
      for (const r of [usar, manter, separar]) expect(r).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();

      await usuario.click(usar);
      await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
      expect(await screen.findByRole('heading', { name: 'Prévia' })).toBeInTheDocument();
      expect(await repo.colecao('erros').todosDoUsuario()).toHaveLength(2);
      await usuario.click(screen.getByRole('button', { name: 'Usar a cópia da nuvem' }));
      expect(await screen.findByText(/cópia da nuvem aplicada/i)).toBeInTheDocument();
      await waitFor(async () => {
        expect(await repo.colecao('snapshots').todosDoUsuario()).toHaveLength(1);
      });
    });

    it('manter o local não altera nada', async () => {
      const { repo, usuario } = await montar({ comCopia: true });
      await usuario.click(await screen.findByRole('button', { name: /^Restaurar/ }));
      await usuario.type(screen.getByLabelText('Frase desta cópia'), FRASE);
      await usuario.click(screen.getByRole('button', { name: 'Abrir cópia' }));
      await usuario.click(
        await screen.findByRole('radio', { name: /manter o que está neste aparelho/i }),
      );
      await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
      expect(await screen.findByText(/nada foi alterado/i)).toBeInTheDocument();
      expect(await repo.colecao('snapshots').todosDoUsuario()).toHaveLength(0);
    });
  });
});
