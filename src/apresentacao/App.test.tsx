import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { obterPreferencias } from '../core/preferencias';
import { exportarPacote } from '../core/pacote';
import type { Repositorio } from '../core/persistencia';
import { simularJanelaVisual } from '../testes/janela-visual';
import { repositorioDeTeste } from '../testes/repositorio';
import { App } from './App';
import { SECOES, secaoDeAjuda } from './orientacoes/conteudo';
import { RODAPE_CURTO } from './textos';

async function abrirApp(rota = '/', repo?: Repositorio) {
  const r = repo ?? (await repositorioDeTeste()).repo;
  window.location.hash = `#${rota}`;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(r)} />);
  await screen.findByRole('navigation', { name: 'Áreas' });
  return { repo: r, usuario };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-tema');
});

describe('shell (5.1, 5.5)', () => {
  it('mostra as 4 áreas, o menu Ajuda, Conta e o rodapé', async () => {
    await abrirApp();
    const areas = screen.getByRole('navigation', { name: 'Áreas' });
    expect(
      within(areas)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Hoje', 'Trilha', 'Fixar', 'Biblioteca']);
    expect(screen.getByRole('button', { name: 'Ajuda' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Relatar problema' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conta e ajustes' })).toBeInTheDocument();
    expect(screen.getByText(RODAPE_CURTO, { exact: false })).toBeInTheDocument();
  });

  it('o cabeçalho traz Conta e Ajuda, e o rodapé leva a Backup e dados (P2)', async () => {
    await abrirApp();
    const topo = screen.getByRole('banner');
    expect(within(topo).getByRole('link', { name: 'Conta e ajustes' })).toHaveAttribute(
      'href',
      '#/conta',
    );
    expect(within(topo).getByRole('button', { name: 'Ajuda' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Backup e dados' }),
    ).toHaveAttribute('href', '#/conta/dados');
  });

  it.each([
    ['/', 'Hoje'],
    ['/recall', 'Fixar'],
  ])(
    '%s: o "+" fica na linha do título %s e abre o registro de erro (P2)',
    async (rota, titulo) => {
      const { usuario } = await abrirApp(rota);
      const h1 = await screen.findByRole('heading', { level: 1, name: titulo });
      const mais = within(h1.parentElement ?? document.body).getByRole('link', {
        name: 'Novo registro de erro',
      });
      await usuario.click(mais);
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Registrar erro' }),
      ).toBeInTheDocument();
    },
  );

  it.each(['/plano', '/biblioteca'])(
    '%s não tem o "+" (só as telas que registram)',
    async (rota) => {
      await abrirApp(rota);
      await screen.findByRole('heading', { level: 1 });
      expect(screen.queryByRole('link', { name: 'Novo registro de erro' })).not.toBeInTheDocument();
    },
  );

  it('com o teclado aberto, a casca se marca para as abas saírem da frente (P2)', async () => {
    const janela = simularJanelaVisual(window.innerHeight);
    try {
      await abrirApp('/recall/registrar');
      const campo = await screen.findByLabelText('Frase correta');
      expect(document.querySelector('.shell')).not.toHaveAttribute('data-teclado');
      act(() => {
        campo.focus();
        janela.visual.height = window.innerHeight - 300;
        janela.avisar();
      });
      // A casca é lida de novo a cada tentativa: sob carga (o `check` inteiro), a tela ainda pode
      // renderizar depois do foco, e uma referência guardada antes ficaria velha.
      await waitFor(() => {
        expect(document.querySelector('.shell')).toHaveAttribute('data-teclado', 'aberto');
      });
    } finally {
      janela.restaurar();
    }
  });

  it('navega entre as áreas e marca a atual', async () => {
    const { usuario } = await abrirApp();
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Biblioteca' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Biblioteca' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('rota desconhecida mostra saída para o Hoje', async () => {
    await abrirApp('/nao-existe');
    expect(screen.getByRole('heading', { name: 'Tela não encontrada' })).toBeInTheDocument();
  });
});

describe('encaixes da F3 (P0 Fundação)', () => {
  it('Hoje compõe os blocos e mantém a revisão vencida e o vazio de antes', async () => {
    await abrirApp('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Por onde começar?' })).toBeInTheDocument();
  });

  it.each([
    ['/sessao/iniciar', 'Começar uma Sessão'],
    ['/plano/onboarding', 'Para qual carreira você estuda?'],
    ['/plano/pontos', 'Pontos do programa'],
    ['/plano/tarefas', 'Tarefas'],
  ])('rota %s está registrada e mostra o encaixe', async (rota, titulo) => {
    await abrirApp(rota);
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
  });

  it('/plano segue mostrando a Trilha (rótulo novo, rota antiga)', async () => {
    await abrirApp('/plano');
    expect(await screen.findByRole('heading', { level: 1, name: 'Trilha' })).toBeInTheDocument();
  });
});

describe('"?" e Orientações (5.3)', () => {
  it('toda tela aponta para uma seção existente', () => {
    const ids = new Set(SECOES.map((s) => s.id));
    for (const rota of [
      '/',
      '/plano',
      '/recall',
      '/biblioteca',
      '/biblioteca/normas/abc',
      '/biblioteca/importar',
      '/conta',
      '/conta/dados',
      '/conta/privacidade',
      '/conta/aparencia',
      '/orientacoes',
    ]) {
      expect(ids.has(secaoDeAjuda(rota)), rota).toBe(true);
    }
  });

  it('com a F4-A desligada a tela Entrar não existe e Conta não oferece entrada', async () => {
    await abrirApp('/conta/entrar');
    expect(await screen.findByText('Tela não encontrada')).toBeInTheDocument();
  });

  it('leitor e importador têm ajuda própria', () => {
    expect(secaoDeAjuda('/biblioteca/normas/abc')).toBe('legislacao');
    expect(secaoDeAjuda('/biblioteca/importar/v1')).toBe('importar-lei');
  });

  it('"?" em Dados abre a seção de backup', async () => {
    const { usuario } = await abrirApp('/conta/dados');
    await usuario.click(screen.getByRole('button', { name: 'Ajuda' }));
    await usuario.click(screen.getByRole('link', { name: 'Ajuda sobre esta tela' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Orientações' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/orientacoes/backup');
    expect(screen.getByRole('heading', { name: 'Backup e restauração' })).toBeInTheDocument();
  });
});

describe('Ajuda › Relatar problema (5.4)', () => {
  it('exige descrição, guarda na fila local e limita a 1 por dia', async () => {
    const { repo, usuario } = await abrirApp('/recall/frases');
    await usuario.click(screen.getByRole('button', { name: 'Ajuda' }));
    await usuario.click(screen.getByRole('button', { name: 'Relatar problema' }));
    const guardar = screen.getByRole('button', { name: 'Guardar relato' });
    expect(guardar).toBeDisabled();
    await usuario.type(screen.getByLabelText('O que aconteceu?'), 'A lista não carrega');
    await usuario.click(guardar);
    expect(await screen.findByText(/aguardando envio/)).toBeInTheDocument();
    const relatos = await repo.colecao('relatos').todosDoUsuario();
    expect(relatos).toMatchObject([{ descricao: 'A lista não carrega', tela: '/recall/frases' }]);

    await usuario.click(screen.getByRole('button', { name: 'Fechar' }));
    await usuario.click(screen.getByRole('button', { name: 'Ajuda' }));
    await usuario.click(screen.getByRole('button', { name: 'Relatar problema' }));
    expect(await screen.findByText(/já relatou um problema hoje/)).toBeInTheDocument();
  });
});

describe('Conta › Aparência (5.2)', () => {
  it('muda o tema e o aplica ao documento', async () => {
    const { usuario } = await abrirApp('/conta/aparencia');
    await usuario.click(await screen.findByLabelText('Escuro'));
    await waitFor(() => {
      expect(document.documentElement.dataset.tema).toBe('escuro');
    });
    await usuario.click(screen.getByLabelText('Igual ao aparelho'));
    await waitFor(() => {
      expect(document.documentElement.dataset.tema).toBeUndefined();
    });
  });

  it('liga e desliga o destaque automático, com a legenda dos traços (9.8)', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = await abrirApp('/conta/aparencia', repo);
    const caixa = await screen.findByRole('checkbox', {
      name: 'Destacar prazos, condições, termos absolutos e penas',
    });
    // Sem o campo (preferência anterior à 9.8): desligado.
    expect(caixa).not.toBeChecked();
    const legenda = screen.getByRole('list', { name: 'Legenda dos destaques' });
    expect(
      within(legenda)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Prazos e tempo (sublinhado duplo)',
      'Exceções e condições (sublinhado tracejado)',
      'Termos absolutos (sublinhado ondulado)',
      'Penas, quóruns e frações (sublinhado pontilhado)',
    ]);
    await usuario.click(caixa);
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).destacarCondicionantesEPrazos).toBe(true);
    });
    expect(caixa).toBeChecked();
    await usuario.click(caixa);
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).destacarCondicionantesEPrazos).toBe(false);
    });
    // Régua de leitura (fatia 4): desligada por padrão, grava ao ligar.
    const regua = screen.getByRole('checkbox', { name: 'Régua de leitura' });
    expect(regua).not.toBeChecked();
    await usuario.click(regua);
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).reguaDeLeitura).toBe(true);
    });
    expect(regua).toBeChecked();
    // Espiada dos vizinhos (palco do foco): desligada por padrão, grava ao ligar.
    const espiada = screen.getByRole('checkbox', {
      name: 'Mostrar a espiada dos vizinhos no foco',
    });
    expect(espiada).not.toBeChecked();
    await usuario.click(espiada);
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).espiadaDosVizinhos).toBe(true);
    });
  });
});

describe('Conta › Dados (5.2)', () => {
  it('exporta gerando um arquivo .arretado', async () => {
    const criar = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() });
    const clicar = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { usuario } = await abrirApp('/conta/dados');
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(await screen.findByText(/Pacote gerado: arretado-.*\.arretado/)).toBeInTheDocument();
    expect(criar).toHaveBeenCalledTimes(1);
    expect(clicar).toHaveBeenCalledTimes(1);
  });

  it('senha exige 8 caracteres e confirmação igual', async () => {
    const { usuario } = await abrirApp('/conta/dados');
    await usuario.click(screen.getByLabelText(/Proteger com senha/));
    const exportar = screen.getByRole('button', { name: 'Exportar' });
    await usuario.type(screen.getByLabelText(/Senha \(mínimo/), 'curta');
    expect(exportar).toBeDisabled();
    await usuario.clear(screen.getByLabelText(/Senha \(mínimo/));
    await usuario.type(screen.getByLabelText(/Senha \(mínimo/), 'senha-longa');
    await usuario.type(screen.getByLabelText('Repita a senha'), 'senha-longa');
    expect(exportar).toBeEnabled();
  });

  it('importa com prévia obrigatória e permite desfazer', async () => {
    const { repo } = await repositorioDeTeste();
    const { bytes, nomeArquivo } = await exportarPacote(repo);
    const extra = await repo.colecao('erros').criar({
      resultado: 'errou',
      oQueFoi: 'Depois do backup',
      status: 'aberto',
    });
    const { usuario } = await abrirApp('/conta/dados', repo);

    await usuario.upload(
      screen.getByLabelText('Pacote do Arretado (.arretado)'),
      new File([bytes as Uint8Array<ArrayBuffer>], nomeArquivo),
    );
    await usuario.click(await screen.findByLabelText(/Restaurar integral/));
    await usuario.click(screen.getByRole('button', { name: 'Ver prévia' }));
    expect(await screen.findByRole('heading', { name: 'Prévia' })).toBeInTheDocument();
    expect(screen.getByText('1 item deste aparelho será excluído.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Confirmar importação' }));
    expect(await screen.findByText(/Importação concluída/)).toBeInTheDocument();
    expect(await repo.colecao('erros').obter(extra.id)).toBeUndefined();

    await usuario.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Restaurar' }),
    );
    expect(await screen.findByText('Dados restaurados ao ponto escolhido.')).toBeInTheDocument();
    expect(await repo.colecao('erros').obter(extra.id)).toBeDefined();
  });

  it('recusa arquivo que não é pacote com mensagem clara', async () => {
    const { usuario } = await abrirApp('/conta/dados');
    await usuario.upload(
      screen.getByLabelText('Pacote do Arretado (.arretado)'),
      new File(['texto qualquer'], 'x.arretado'),
    );
    expect(
      await screen.findByText('Este arquivo não é um pacote do Arretado.'),
    ).toBeInTheDocument();
  });
});

describe('estados universais (5.6)', () => {
  it('faixa offline aparece sem conexão', async () => {
    await abrirApp();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    // Espera: sob carga, a assinatura do useSyncExternalStore (efeito) pode chegar depois do evento.
    expect(await screen.findByText('Sem conexão. Tudo continua funcionando.')).toBeInTheDocument();
    online.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => {
      expect(screen.queryByText('Sem conexão. Tudo continua funcionando.')).not.toBeInTheDocument();
    });
  });

  it('falha ao abrir o banco explica o que fazer e que nada foi perdido', async () => {
    render(<App abrir={() => Promise.reject(new Error('bloqueado'))} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Nada foi perdido/);
  });
});

describe('correções da revisão da etapa 5', () => {
  it('trocar para "Restaurar integral" libera a prévia mesmo sem módulos marcados antes', async () => {
    const { repo } = await repositorioDeTeste();
    const { bytes, nomeArquivo } = await exportarPacote(repo);
    const { usuario } = await abrirApp('/conta/dados', repo);
    await usuario.upload(
      screen.getByLabelText('Pacote do Arretado (.arretado)'),
      new File([bytes as Uint8Array<ArrayBuffer>], nomeArquivo),
    );
    await usuario.click(await screen.findByLabelText(/Substituir módulos/));
    const modulos = within(screen.getByRole('group', { name: 'Módulos' }));
    for (const caixa of modulos.getAllByRole('checkbox')) await usuario.click(caixa);
    expect(screen.getByRole('button', { name: 'Ver prévia' })).toBeDisabled();
    await usuario.click(screen.getByLabelText(/Restaurar integral/));
    expect(screen.getByRole('button', { name: 'Ver prévia' })).toBeEnabled();
  });

  it('falha ao gravar a aparência volta ao valor salvo e avisa', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = await abrirApp('/conta/aparencia', repo);
    const prefs = await import('../core/preferencias');
    vi.spyOn(prefs, 'alterarPreferencias').mockRejectedValueOnce(new Error('cota'));
    await usuario.click(await screen.findByLabelText('Escuro'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível guardar/);
    expect(screen.getByLabelText('Igual ao aparelho')).toBeChecked();
  });

  it('Conta › Aparência: "Cartões por vez" grava só valores válidos (fatia 3)', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/conta/aparencia';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    const campo = await screen.findByLabelText('Cartões por vez');
    expect(campo).toHaveValue(10);
    await usuario.clear(campo);
    await usuario.type(campo, '25');
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).cotaDiaria).toBe(25);
    });
    await usuario.clear(campo);
    await usuario.type(campo, '3');
    await usuario.tab();
    expect((await obterPreferencias(repo)).cotaDiaria).toBe(25);
    expect(campo).toHaveValue(25);
  });
});
