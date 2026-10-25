import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { temConsentimento, registrarConsentimento } from '../../core/preferencias';
import { ServicoDeContaFalso } from '../../integracoes/conta';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ProvedorConta } from '../conta/entrar/ContextoConta';
import { ContextoRepositorio } from '../dados/contexto';
import { AvisoDePosse } from './AvisoDePosse';
import { ProvedorSincronizacao } from './ProvedorSincronizacao';
import { Sincronizacao } from './Sincronizacao';

const SESSAO = { uid: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'a@exemplo.com' };

async function montar(
  opcoes: { comSessao?: boolean; comAceite?: boolean; servico?: ServicoDeContaFalso } = {},
) {
  const { repo } = await repositorioDeTeste();
  if (opcoes.comAceite) await registrarConsentimento(repo, 'sincronizar');
  const servico =
    opcoes.servico ??
    new ServicoDeContaFalso({ sessao: opcoes.comSessao === false ? null : SESSAO });
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ProvedorConta servico={servico}>
        <ProvedorSincronizacao renovacaoMs={60_000} intervaloDePuxadaMs={0}>
          <MemoryRouter initialEntries={['/conta/sincronizacao']}>
            <AvisoDePosse />
            <Routes>
              <Route path="/conta/sincronizacao" element={<Sincronizacao />} />
            </Routes>
          </MemoryRouter>
        </ProvedorSincronizacao>
      </ProvedorConta>
    </ContextoRepositorio.Provider>,
  );
  return { repo, servico, usuario: userEvent.setup() };
}

describe('Conta › Sincronização (F4-B, B4)', () => {
  it('sem conta, manda entrar', async () => {
    await montar({ comSessao: false });
    expect(await screen.findByText(/pede uma conta/)).toBeInTheDocument();
  });

  it('sem o aceite v4, explica o que muda e liga com um toque (servidor primeiro, depois o Aparelho)', async () => {
    const { repo, servico, usuario } = await montar();
    await usuario.click(await screen.findByRole('button', { name: 'Ligar a sincronização' }));
    expect(await screen.findByRole('heading', { name: 'Estado' })).toBeInTheDocument();
    expect(servico.aceitesDeSincronizacao).toEqual(['v4:sincronizar']);
    expect(await temConsentimento(repo, 'sincronizar')).toBe(true);
    expect(screen.getByText('Este Aparelho.')).toBeInTheDocument();
  });

  it('conta não liberada: o servidor recusa e nada fica marcado no Aparelho', async () => {
    const servico = new ServicoDeContaFalso({ sessao: SESSAO });
    servico.semLiberacao = true;
    const { repo, usuario } = await montar({ servico });
    await usuario.click(await screen.findByRole('button', { name: 'Ligar a sincronização' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ainda não foi liberada/);
    expect(await temConsentimento(repo, 'sincronizar')).toBe(false);
  });

  it('ligada: mostra os três estados, "Sincronizar agora" envia e o estado vira "Igual"', async () => {
    const { repo, servico, usuario } = await montar({ comAceite: true });
    expect(await screen.findByRole('heading', { name: 'Estado' })).toBeInTheDocument();
    await repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'Manual' });
    await waitFor(() => {
      expect(screen.getByText('Salvo neste aparelho')).toBeInTheDocument();
    });
    await usuario.click(screen.getByRole('button', { name: 'Sincronizar agora' }));
    await waitFor(() => {
      expect(screen.getByText('Igual nos seus aparelhos')).toBeInTheDocument();
    });
    expect(servico.lotesRecebidos.flat().some((e) => e.colecao === 'fontes')).toBe(true);
  });

  it('outro Aparelho em uso: aqui fica em leitura até "Passar a editar aqui"', async () => {
    const servico = new ServicoDeContaFalso({ sessao: SESSAO });
    servico.donoDaPosse = 'outro-aparelho';
    const { repo, usuario } = await montar({ comAceite: true, servico });
    expect(await screen.findByText(/Você está usando outro Aparelho agora/)).toBeInTheDocument();
    await expect(repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'x' })).rejects.toThrow(
      'Outro aparelho está editando agora.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Passar a editar aqui' }));
    expect(await screen.findByText('Este Aparelho.')).toBeInTheDocument();
    expect(servico.donoDaPosse).toBe(repo.ctx.aparelhoId);
    await expect(
      repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'x' }),
    ).resolves.toBeTruthy();
  });

  it('sem resposta do servidor de posse: edita com aviso (Q1)', async () => {
    const servico = new ServicoDeContaFalso({ sessao: SESSAO });
    servico.falhaDePosse = true;
    const { repo } = await montar({ comAceite: true, servico });
    expect(await screen.findByText(/Sem confirmar qual Aparelho está ativo/)).toBeInTheDocument();
    await expect(
      repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'x' }),
    ).resolves.toBeTruthy();
  });
});
