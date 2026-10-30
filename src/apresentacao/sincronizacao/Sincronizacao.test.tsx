import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  alterarPreferencias,
  temConsentimento,
  registrarConsentimento,
} from '../../core/preferencias';
import { ServicoDeContaFalso } from '../../integracoes/conta';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ProvedorConta } from '../conta/entrar/ContextoConta';
import { ContextoRepositorio } from '../dados/contexto';
import { AvisoDePosse } from './AvisoDePosse';
import { ProvedorSincronizacao } from './ProvedorSincronizacao';
import { Sincronizacao } from './Sincronizacao';

const SESSAO = { uid: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'a@exemplo.com' };

async function montar(
  opcoes: {
    comSessao?: boolean;
    comAceite?: boolean;
    servico?: ServicoDeContaFalso;
    rota?: string;
  } = {},
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
          <MemoryRouter initialEntries={[opcoes.rota ?? '/conta/sincronizacao']}>
            <AvisoDePosse />
            <Routes>
              <Route path="/conta/sincronizacao" element={<Sincronizacao />} />
              <Route path="/hoje" element={<p>Hoje</p>} />
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

  it('quem entrou liga sozinho (servidor primeiro, depois o Aparelho), sem tocar em nada', async () => {
    const { repo, servico } = await montar();
    expect(await screen.findByRole('heading', { name: 'Estado' })).toBeInTheDocument();
    expect(servico.aceitesDeSincronizacao).toEqual(['v4:sincronizar']);
    expect(await temConsentimento(repo, 'sincronizar')).toBe(true);
    expect(screen.getByText('Este Aparelho.')).toBeInTheDocument();
  });

  it('desligar neste Aparelho para a sincronização e oferece ligar de novo', async () => {
    const { usuario } = await montar();
    await usuario.click(await screen.findByRole('button', { name: 'Desligar neste Aparelho' }));
    const ligar = await screen.findByRole('button', { name: 'Ligar a sincronização' });
    await usuario.click(ligar);
    expect(await screen.findByRole('heading', { name: 'Estado' })).toBeInTheDocument();
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
    // Nesta tela o cartão diz o mesmo e tem o botão: a faixa de cima não repete.
    expect(screen.queryByText('Outro Aparelho em uso.')).not.toBeInTheDocument();
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

  it('fora da tela de Sincronização, outro Aparelho em uso é uma faixa curta com o botão', async () => {
    const servico = new ServicoDeContaFalso({ sessao: SESSAO });
    servico.donoDaPosse = 'outro-aparelho';
    const { usuario } = await montar({ comAceite: true, servico, rota: '/hoje' });
    const faixa = await screen.findByRole('status');
    expect(faixa).toHaveTextContent('Outro Aparelho em uso.');
    await usuario.click(within(faixa).getByRole('button', { name: 'Passar a editar aqui' }));
    await waitFor(() => {
      expect(screen.queryByText('Outro Aparelho em uso.')).not.toBeInTheDocument();
    });
  });

  it('escrita recusada pela trava: a faixa vira alerta com o convite para passar a edição (sem a tela tratar)', async () => {
    const servico = new ServicoDeContaFalso({ sessao: SESSAO });
    servico.donoDaPosse = 'outro-aparelho';
    const { repo } = await montar({ comAceite: true, servico });
    expect(await screen.findByText(/Você está usando outro Aparelho agora/)).toBeInTheDocument();
    await expect(repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'x' })).rejects.toThrow();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não dá para editar/);
    // O que é só do aparelho (tamanho da letra) passa pela trava.
    await expect(alterarPreferencias(repo, { tamanhoFonte: 20 })).resolves.toBeTruthy();
  });

  it('"Seus Aparelhos" marca este Aparelho, mostra a plataforma em palavras e renomeia', async () => {
    const { repo, usuario } = await montar({ comAceite: true });
    expect(await screen.findByRole('heading', { name: 'Seus Aparelhos' })).toBeInTheDocument();
    const aparelho = await repo.colecao('aparelhos').obter(repo.ctx.aparelhoId);
    expect(aparelho?.nome).not.toBe('Este aparelho');
    expect(screen.getByText('(este)')).toBeInTheDocument();
    expect(screen.queryByText(/Mozilla/)).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Renomear' }));
    const campo = screen.getByLabelText('Nome do Aparelho');
    await usuario.clear(campo);
    await usuario.type(campo, 'Notebook da sala');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(screen.getByText('Notebook da sala')).toBeInTheDocument();
    });
    expect((await repo.colecao('aparelhos').obter(repo.ctx.aparelhoId))?.nome).toBe(
      'Notebook da sala',
    );
  });

  it('o aparelho que ainda se chamava "Este aparelho" é renomeado pela plataforma ao abrir', async () => {
    const { repo } = await repositorioDeTeste({ nomeAparelho: 'Este aparelho' });
    const aparelho = await repo.colecao('aparelhos').obter(repo.ctx.aparelhoId);
    expect(aparelho?.nome).not.toBe('Este aparelho');
  });

  it('rodada que falhou: o Problema fica no cartão Estado e "Precisa de você" não abre sem Conflito', async () => {
    const servico = new ServicoDeContaFalso({ sessao: SESSAO });
    const { repo, usuario } = await montar({ comAceite: true, servico });
    await screen.findByRole('heading', { name: 'Estado' });
    servico.falhasDeEnvio.push(null);
    await repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'Manual' });
    await usuario.click(screen.getByRole('button', { name: 'Sincronizar agora' }));
    const estado = screen.getByRole('region', { name: 'Estado' });
    expect(await within(estado).findByText(/Problema na última tentativa/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Precisa de você' })).not.toBeInTheDocument();
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
