import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { obterPreferencias } from '../../../core/preferencias';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { ToastM } from './ToastM';
import { esconderAviso } from './toast';
import { ContaM } from './ContaM';
import { movimentoAgora } from '../../movimento';

afterEach(() => {
  cleanup();
  // O jsdom não tem `matchMedia`; o teste do Movimento põe um.
  Reflect.deleteProperty(window, 'matchMedia');
  esconderAviso();
  delete document.documentElement.dataset.movimentoEscolhido;
  delete document.documentElement.dataset.tema;
  try {
    localStorage.removeItem('arretado.fio.movimento');
  } catch {
    // sem armazenamento
  }
});

function Aqui() {
  const l = useLocation();
  return <output data-testid="rota">{l.pathname}</output>;
}

async function abrir() {
  const { repo } = await repositorioDeTeste();
  const usuario = userEvent.setup();
  render(
    <ContextoRepositorio.Provider value={repo}>
      <MemoryRouter initialEntries={['/']}>
        <main id="conteudo">
          <Routes>
            <Route path="/" element={<ContaM aberta aoFechar={() => undefined} />} />
            <Route path="*" element={<p>outra tela</p>} />
          </Routes>
          <Aqui />
          <ToastM />
        </main>
      </MemoryRouter>
    </ContextoRepositorio.Provider>,
  );
  const folha = await screen.findByRole('dialog');
  return { repo, usuario, folha };
}

describe('Conta em folha', () => {
  it('sem conta, diz onde o fio mora e não oferece o login (a chave de contas está desligada)', async () => {
    const { folha } = await abrir();
    expect(within(folha).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Seu fio mora neste aparelho',
    );
    expect(within(folha).queryByRole('button', { name: /Entrar com o Google/ })).toBeNull();
    expect(within(folha).queryByRole('button', { name: /Sair desta conta/ })).toBeNull();
  });

  it('o Céu grava o tema nas Preferências', async () => {
    const { repo, usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: 'Manhã' }));
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).tema).toBe('claro');
    });
    await usuario.click(within(folha).getByRole('button', { name: 'Luar' }));
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).tema).toBe('escuro');
    });
  });

  it('o Texto muda o tamanho da letra de leitura e avisa', async () => {
    const { repo, usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: 'Texto maior' }));
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).tamanhoFonte).toBe(22);
    });
    expect(within(folha).getByRole('button', { name: 'Texto maior' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText('O texto de leitura ficou maior.')).toBeInTheDocument();
  });

  it('o Movimento é deste aparelho: o Calmo acalma o Fio e o Vivo o solta, sobre o perfil', async () => {
    const { usuario, folha } = await abrir();
    document.documentElement.dataset.perfil = 'calmo';
    await usuario.click(within(folha).getByRole('button', { name: 'Vivo' }));
    expect(document.documentElement.dataset.movimentoEscolhido).toBe('vivo');
    expect(localStorage.getItem('arretado.fio.movimento')).toBe('vivo');
    // Sem `matchMedia` o jsdom devolve "reduzido"; o que se confere é a escolha mandando sobre o perfil, na leitura global.
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    expect(movimentoAgora()).toBe('normal');
    await usuario.click(within(folha).getByRole('button', { name: 'Calmo' }));
    expect(movimentoAgora()).toBe('calmo');
    delete document.documentElement.dataset.perfil;
  });

  it('o que é longo ou perigoso leva às telas de antes', async () => {
    const { usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: /Seus dados/ }));
    await waitFor(() => {
      expect(screen.getByTestId('rota')).toHaveTextContent('/conta/dados');
    });
  });

  it('"Relatar um problema" abre o relato depois que a folha desce', async () => {
    const { usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: /Relatar um problema/ }));
    expect(await screen.findByRole('dialog', { name: /problema/i })).toBeInTheDocument();
  });
});
