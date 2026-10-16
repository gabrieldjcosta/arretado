import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as moduloMigracao from '../../../core/pacote/migrar-para-conta';
import * as moduloExportar from '../../../core/pacote/exportar';
import { RegistroDeContas, type Repositorio } from '../../../core/persistencia';
import * as moduloIntegracaoConta from '../../../integracoes/conta';
import { CopiaAnteriorSecao } from '../dados/CopiaAnterior';
import { Migracao } from './Migracao';

vi.mock('../../../core/pacote/migrar-para-conta', () => ({
  preverMigracao: vi.fn(),
  migrarParaConta: vi.fn(),
  estadoDaMigracao: vi.fn(),
  copiaAnterior: vi.fn(),
  apagarCopiaAnterior: vi.fn(),
}));

vi.mock('../../../core/pacote/exportar', () => ({
  exportarPacote: vi.fn(),
}));

describe('Telas de migração (F4-A, A4b)', () => {
  const uidConta = '11111111-1111-4111-8111-111111111111';
  let repoFalso: Repositorio;
  let registroFalso: RegistroDeContas;

  beforeEach(() => {
    vi.clearAllMocks();
    repoFalso = {
      fechar: vi.fn(),
    } as unknown as Repositorio;

    registroFalso = {
      contaAtiva: vi.fn().mockResolvedValue({ uid: uidConta, email: 'teste@exemplo.com' }),
    } as unknown as RegistroDeContas;

    vi.spyOn(moduloIntegracaoConta, 'contasHabilitadas').mockReturnValue(true);
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  describe('Tela 1: Prévia', () => {
    it('mostra a contagem de registros, coleções, tamanho em MB, texto de que nada sai para a internet e botões', async () => {
      vi.mocked(moduloMigracao.preverMigracao).mockResolvedValue({
        colecoes: 5,
        registros: 120,
        bytes: 1048576, // 1 MB
        porColecao: {},
      });

      render(
        <MemoryRouter>
          <Migracao origem={repoFalso} registro={registroFalso} uid={uidConta} />
        </MemoryRouter>,
      );

      expect(await screen.findByRole('heading', { name: 'Prévia da cópia' })).toBeInTheDocument();
      expect(
        screen.getByText(
          '120 registros em 5 coleções, 1 MB serão copiados para a sua conta neste aparelho. Nada sai para a internet agora.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Nada obrigatório.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copiar para a conta' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Agora não' })).toBeInTheDocument();
    });

    it('caminho "Agora não": aciona o callback ao clicar no botão', async () => {
      vi.mocked(moduloMigracao.preverMigracao).mockResolvedValue({
        colecoes: 2,
        registros: 10,
        bytes: 2048,
        porColecao: {},
      });

      const aoAgoraNao = vi.fn();
      const u = userEvent.setup();

      render(
        <MemoryRouter>
          <Migracao
            origem={repoFalso}
            registro={registroFalso}
            uid={uidConta}
            aoAgoraNao={aoAgoraNao}
          />
        </MemoryRouter>,
      );

      const botaoAgoraNao = await screen.findByRole('button', { name: 'Agora não' });
      await u.click(botaoAgoraNao);
      expect(aoAgoraNao).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tela 2: Andamento', () => {
    it('mostra as etapas em texto simples com aria-live="polite"', async () => {
      vi.mocked(moduloMigracao.preverMigracao).mockResolvedValue({
        colecoes: 3,
        registros: 50,
        bytes: 10240,
        porColecao: {},
      });

      let callbackAvancar: ((etapa: moduloMigracao.EtapaMigracao) => void) | undefined;
      vi.mocked(moduloMigracao.migrarParaConta).mockImplementation((_repo, opcoes) => {
        callbackAvancar = opcoes.aoAvancar;
        // Não resolve imediatamente para podermos inspecionar o andamento
        return new Promise(() => {});
      });

      const u = userEvent.setup();

      render(
        <MemoryRouter>
          <Migracao origem={repoFalso} registro={registroFalso} uid={uidConta} />
        </MemoryRouter>,
      );

      const botaoCopiar = await screen.findByRole('button', { name: 'Copiar para a conta' });
      await u.click(botaoCopiar);

      const regiaoAoVivo = await screen.findByRole('status');
      expect(regiaoAoVivo).toHaveAttribute('aria-live', 'polite');

      // Verifica texto simples das etapas
      expect(screen.getByText('guardando uma cópia')).toBeInTheDocument();
      expect(screen.getByText('copiando')).toBeInTheDocument();
      expect(screen.getByText('conferindo')).toBeInTheDocument();
      expect(screen.getByText('pronto')).toBeInTheDocument();

      // Avança etapa para conferindo
      act(() => {
        callbackAvancar?.('verificacao');
      });
      await waitFor(() => {
        expect(screen.getByText('conferindo')).toHaveClass('atual');
      });
    });
  });

  describe('Tela 3: Resultado', () => {
    it('concluída: mostra "Tudo copiado" e o caminho para o Hoje', async () => {
      vi.mocked(moduloMigracao.preverMigracao).mockResolvedValue({
        colecoes: 3,
        registros: 50,
        bytes: 10240,
        porColecao: {},
      });

      vi.mocked(moduloMigracao.migrarParaConta).mockResolvedValue({
        tipo: 'concluida',
        uid: uidConta,
        contagens: {},
        hash: 'hash-123',
      });

      const aoConcluir = vi.fn();
      const u = userEvent.setup();

      render(
        <MemoryRouter>
          <Migracao
            origem={repoFalso}
            registro={registroFalso}
            uid={uidConta}
            aoConcluir={aoConcluir}
          />
        </MemoryRouter>,
      );

      const botaoCopiar = await screen.findByRole('button', { name: 'Copiar para a conta' });
      await u.click(botaoCopiar);

      expect(await screen.findByRole('heading', { name: 'Tudo copiado' })).toBeInTheDocument();
      const linkHoje = screen.getByRole('link', { name: 'Ir para o Hoje' });
      expect(linkHoje).toBeInTheDocument();
      await u.click(linkHoje);
      expect(aoConcluir).toHaveBeenCalled();
    });

    it('falhou: mostra "Nada foi alterado. Seus dados continuam como estavam." e "Tentar de novo"', async () => {
      vi.mocked(moduloMigracao.preverMigracao).mockResolvedValue({
        colecoes: 3,
        registros: 50,
        bytes: 10240,
        porColecao: {},
      });

      vi.mocked(moduloMigracao.migrarParaConta).mockResolvedValue({
        tipo: 'falhou',
        etapa: 'copia',
        motivo: 'Download do backup automático não pôde ser iniciado.',
      });

      const u = userEvent.setup();

      render(
        <MemoryRouter>
          <Migracao origem={repoFalso} registro={registroFalso} uid={uidConta} />
        </MemoryRouter>,
      );

      const botaoCopiar = await screen.findByRole('button', { name: 'Copiar para a conta' });
      await u.click(botaoCopiar);

      expect(
        await screen.findByRole('heading', {
          name: 'Nada foi alterado. Seus dados continuam como estavam.',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Download do backup automático não pôde ser iniciado.'),
      ).toBeInTheDocument();

      const botaoTentarDeNovo = screen.getByRole('button', { name: 'Tentar de novo' });
      expect(botaoTentarDeNovo).toBeInTheDocument();

      // Clica para tentar de novo
      await u.click(botaoTentarDeNovo);
      expect(moduloMigracao.migrarParaConta).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tela 4: Dados › Cópia de antes da conta', () => {
    it('não renderiza nada se não houver cópia anterior ou se VITE_CONTA estiver desligado', async () => {
      vi.mocked(moduloMigracao.copiaAnterior).mockResolvedValue(null);

      const { container } = render(<CopiaAnteriorSecao registro={registroFalso} />);
      await waitFor(() => {
        expect(moduloMigracao.copiaAnterior).toHaveBeenCalled();
      });
      expect(container).toBeEmptyDOMElement();
    });

    it('com cópia anterior: mostra título com data, texto sobre 30 dias, e botões Exportar e Apagar com confirmação', async () => {
      vi.mocked(moduloMigracao.copiaAnterior).mockResolvedValue({
        nomeBanco: 'arretado',
        uid: uidConta,
        migradoEm: '2026-10-15T12:00:00.000Z',
      });

      const fecharFn = vi.fn();
      const repoCopiaMock = {
        fechar: fecharFn,
      } as unknown as Repositorio;

      vi.mocked(moduloExportar.exportarPacote).mockResolvedValue({
        bytes: new Uint8Array([1, 2, 3]),
        nomeArquivo: 'backup-copia.arretado',
      } as moduloExportar.PacoteGerado);

      const u = userEvent.setup();

      render(
        <CopiaAnteriorSecao
          registro={registroFalso}
          abrirCopia={() => Promise.resolve(repoCopiaMock)}
        />,
      );

      expect(
        await screen.findByRole('heading', { name: /Cópia de antes da conta \(15\/10\)/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Esta cópia nunca é apagada sozinha\. Dá para apagar depois de uns 30 dias com a conta ok\./,
        ),
      ).toBeInTheDocument();

      const botaoExportar = screen.getByRole('button', { name: 'Exportar' });
      const botaoApagar = screen.getByRole('button', { name: 'Apagar' });
      expect(botaoExportar).toBeInTheDocument();
      expect(botaoApagar).toBeInTheDocument();

      // Teste de exportar
      await u.click(botaoExportar);
      expect(await screen.findByText(/Pacote gerado: backup-copia\.arretado/)).toBeInTheDocument();
      expect(fecharFn).toHaveBeenCalled();

      // Teste de apagar com confirmação
      await u.click(botaoApagar);
      expect(
        await screen.findByRole('heading', { name: 'Apagar cópia de antes da conta?' }),
      ).toBeInTheDocument();

      const botaoConfirmarApagar = screen.getByRole('button', { name: 'Apagar cópia' });
      await u.click(botaoConfirmarApagar);

      expect(moduloMigracao.apagarCopiaAnterior).toHaveBeenCalledWith(registroFalso);
      expect(await screen.findByText('Cópia anterior apagada deste aparelho.')).toBeInTheDocument();
    });
  });
});
