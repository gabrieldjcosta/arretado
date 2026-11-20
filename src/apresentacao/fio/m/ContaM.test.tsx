import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { registrarBackup } from '../../../core/persistencia';
import { obterPreferencias } from '../../../core/preferencias';
import { registrarErro } from '../../../dominios/recall/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { ToastM } from './ToastM';
import { esconderAviso } from './toast';
import { ContaM } from './ContaM';
import { movimentoAgora } from '../../movimento';

const versao = vi.hoisted(() => ({ pronta: false, aplicar: vi.fn() }));
vi.mock('../../../offline/registro', () => ({
  useAtualizacaoPronta: () => versao.pronta,
  aplicarAtualizacao: versao.aplicar,
}));

const DIA = 24 * 60 * 60_000;
type Teste = Awaited<ReturnType<typeof repositorioDeTeste>>;

afterEach(() => {
  cleanup();
  versao.pronta = false;
  versao.aplicar.mockClear();
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

async function abrir(preparar?: (teste: Teste) => Promise<void>) {
  const teste = await repositorioDeTeste();
  const { repo } = teste;
  await preparar?.(teste);
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

// O estado da instalação vem do navegador (beforeinstallprompt, userAgent); aqui cada teste o escolhe.
const estadoDaInstalacao = vi.hoisted(() => ({
  valor: 'indisponivel',
  instalar: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../../suporte/instalacao', () => ({
  useInstalacao: () => ({
    estado: estadoDaInstalacao.valor,
    instalar: estadoDaInstalacao.instalar,
  }),
}));

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

  it('o Texto muda o tamanho do texto do Fio e da leitura e avisa', async () => {
    const { repo, usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: 'Texto maior' }));
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).tamanhoFonte).toBe(22);
    });
    expect(within(folha).getByRole('button', { name: 'Texto maior' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText('O texto ficou maior.')).toBeInTheDocument();
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

  it('a Trilha tem porta na folha: a data da prova, o Ciclo e as Tarefas ficam a um toque', async () => {
    const { usuario, folha } = await abrir();
    const linha = within(folha).getByRole('button', { name: /^Trilha/ });
    expect(linha).toHaveTextContent('a data da prova, o ciclo e as tarefas');
    await usuario.click(linha);
    await waitFor(() => {
      expect(screen.getByTestId('rota')).toHaveTextContent('/plano');
    });
  });

  it('"Relatar um problema" abre o relato depois que a folha desce', async () => {
    const { usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: /Relatar um problema/ }));
    expect(await screen.findByRole('dialog', { name: /problema/i })).toBeInTheDocument();
  });

  it('"Seus dados" diz a idade do backup quando há o que guardar (desvio 476b)', async () => {
    const semDados = await abrir();
    expect(within(semDados.folha).getByRole('button', { name: /^Seus dados/ })).toHaveTextContent(
      'Seus dadosbaixar ou apagar',
    );
    cleanup();

    const semBackup = await abrir(async ({ repo }) => {
      await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    });
    await waitFor(() => {
      expect(
        within(semBackup.folha).getByRole('button', { name: /^Seus dados/ }),
      ).toHaveTextContent('baixar ou apagar · ainda sem backup');
    });
    cleanup();

    const antigo = await abrir(async ({ repo, relogio }) => {
      await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
      await registrarBackup(repo);
      relogio.avancar(9 * DIA);
    });
    await waitFor(() => {
      expect(within(antigo.folha).getByRole('button', { name: /^Seus dados/ })).toHaveTextContent(
        'baixar ou apagar · último backup há 9 dias',
      );
    });
  });

  it('com versão nova pronta, a folha oferece "Atualizar o Arretado"; sem ela, não', async () => {
    const sem = await abrir();
    expect(within(sem.folha).queryByRole('button', { name: /Atualizar o Arretado/ })).toBeNull();
    cleanup();

    versao.pronta = true;
    const { usuario, folha } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: /^Atualizar o Arretado/ }));
    expect(versao.aplicar).toHaveBeenCalledOnce();
  });
});

describe('Conta em folha › instalar no aparelho', () => {
  it('sem convite e fora do iOS, a linha não aparece', async () => {
    estadoDaInstalacao.valor = 'indisponivel';
    const { folha } = await abrir();
    expect(within(folha).queryByText('Instalar no aparelho')).toBeNull();
  });

  it('com o convite do navegador, instala e devolve o foco ao título da folha', async () => {
    estadoDaInstalacao.valor = 'convite';
    const { folha, usuario } = await abrir();
    await usuario.click(within(folha).getByRole('button', { name: /Instalar no aparelho/ }));
    expect(estadoDaInstalacao.instalar).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(within(folha).getByRole('heading', { level: 2 })).toHaveFocus();
    });
  });

  it('no iOS, mostra o passo a passo e nenhum botão de instalar', async () => {
    estadoDaInstalacao.valor = 'passo-a-passo-ios';
    const { folha } = await abrir();
    expect(within(folha).getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
    expect(within(folha).queryByRole('button', { name: /Instalar no aparelho/ })).toBeNull();
  });
});
