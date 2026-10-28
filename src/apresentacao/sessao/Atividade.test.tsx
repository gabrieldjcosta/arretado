import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

async function abrir(rota: string, repo?: Repositorio) {
  const r = repo ?? (await repositorioDeTeste()).repo;
  window.location.hash = `#${rota}`;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(r)} />);
  await screen.findByRole('navigation', { name: 'Áreas' });
  return { repo: r, usuario };
}

/** Um cartão vencido faz o Agora ser uma ação (no Hoje vazio o cartão de Sessão não aparece). */
async function repoComAgora() {
  const { repo } = await repositorioDeTeste();
  const c = await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
  await repo.colecao('cartoes').atualizar(c.id, { proximaRevisao: '2000-01-01' });
  return repo;
}

describe('Atividade da Sessão no Hoje', () => {
  it('um toque no tipo começa a Sessão com a atividade e leva à tela dela', async () => {
    const { repo, usuario } = await abrir('/', await repoComAgora());
    await usuario.click(await screen.findByRole('button', { name: /Jurisprudência/ }));
    await waitFor(() => {
      expect(window.location.hash).toBe('#/biblioteca/precedentes');
    });
    const [s] = await repo.colecao('sessoes').todosDoUsuario();
    expect(s).toMatchObject({ estado: 'ativa', atividade: 'jurisprudencia' });
  });

  it('sugere questões quando não há leitura nem escolha anterior', async () => {
    await abrir('/', await repoComAgora());
    const sugerido = await screen.findByRole('button', { name: /Questões/ });
    expect(sugerido).toHaveTextContent('(sugerido)');
  });

  it('com Sessão aberta, o cartão de começar some', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'lei' });
    await abrir('/', repo);
    expect(await screen.findByRole('region', { name: 'Sessão aberta' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Começar uma Sessão' })).toBeNull();
  });

  it('com Sessão aberta e uma Próxima ação, o Hoje tem um só Continuar', async () => {
    const repo = await repoComAgora();
    await iniciarSessao(repo, { atividade: 'lei' });
    await abrir('/', repo);
    await screen.findByRole('region', { name: 'Sessão aberta' });
    expect(screen.getAllByRole('link', { name: /^Continuar/ })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Continuar a leitura' })).toBeNull();
  });
});

it('no Hoje vazio não há cartão de Sessão: o começo é um só', async () => {
  await abrir('/');
  await screen.findByRole('heading', { name: 'Por onde começar?' });
  expect(screen.queryByRole('heading', { name: 'Começar uma Sessão' })).toBeNull();
});

describe('Sessão de questões', () => {
  it('Acertei e Errei contam; Errei guarda o erro ligado à Sessão com só a frase correta', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { atividade: 'questoes' });
    const { usuario } = await abrir('/sessao/atual', repo);
    await usuario.click(await screen.findByRole('button', { name: 'Acertei' }));
    expect(await screen.findByText('1 feita, 1 acerto.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Errei' }));
    await usuario.type(screen.getByLabelText('Frase correta'), 'O prazo é de cinco dias.');
    await usuario.click(screen.getByRole('button', { name: 'Guardar erro' }));
    expect(await screen.findByText('2 feitas, 1 acerto.')).toBeInTheDocument();
    const erros = await repo.colecao('erros').todosDoUsuario();
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatchObject({ sessaoId: s.id, resultado: 'errou' });
  });

  it('ao fechar o formulário do Errei, o foco volta ao botão Errei', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'questoes' });
    const { usuario } = await abrir('/sessao/atual', repo);
    await usuario.click(await screen.findByRole('button', { name: 'Errei' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Errei' })).toHaveFocus();
    });
    await usuario.click(screen.getByRole('button', { name: 'Errei' }));
    await usuario.type(screen.getByLabelText('Frase correta'), 'O prazo é de cinco dias.');
    await usuario.click(screen.getByRole('button', { name: 'Guardar erro' }));
    expect(await screen.findByText(/Já está no Fixar\./)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Errei' })).toHaveFocus();
    });
  });

  it('Acertei e Errei têm o mesmo peso: nenhum dos dois é a ação principal', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'questoes' });
    await abrir('/sessao/atual', repo);
    expect(await screen.findByRole('button', { name: 'Acertei' })).not.toHaveClass('principal');
    expect(screen.getByRole('button', { name: 'Errei' })).not.toHaveClass('principal');
  });

  it('"Só contar" conta o erro sem criar registro', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'questoes' });
    const { usuario } = await abrir('/sessao/atual', repo);
    await usuario.click(await screen.findByRole('button', { name: 'Errei' }));
    await usuario.click(screen.getByRole('button', { name: 'Só contar' }));
    expect(await screen.findByText('1 feita, 0 acertos.')).toBeInTheDocument();
    expect(await repo.colecao('erros').todosDoUsuario()).toHaveLength(0);
  });

  it('o fechamento já vem com as questões contadas', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'questoes', temporizadorMin: undefined });
    const { usuario } = await abrir('/sessao/atual', repo);
    await usuario.click(await screen.findByRole('button', { name: 'Acertei' }));
    await screen.findByText('1 feita, 1 acerto.');
    await usuario.click(screen.getByRole('link', { name: 'Encerrar' }));
    await usuario.click(await screen.findByText('Fez questões? (opcional)'));
    expect(screen.getByLabelText('Questões feitas')).toHaveValue(1);
    expect(screen.getByLabelText('Quantas acertou')).toHaveValue(1);
  });
});

describe('Canto da Sessão', () => {
  it('fora da Sessão, mostra o relógio; o bloquinho guarda a distração e fecha com Esc', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { atividade: 'lei' });
    const { usuario } = await abrir('/biblioteca', repo);
    await usuario.click(
      await screen.findByRole('button', { name: /^Sessão, .*Abrir o bloquinho/ }),
    );
    await usuario.type(screen.getByLabelText('Anotar uma distração'), 'comprar café');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Guardado para depois.')).toBeInTheDocument();
    const [atual] = await repo.colecao('sessoes').todosDoUsuario();
    expect(atual?.id).toBe(s.id);
    expect(atual?.estacionamento?.[0]?.texto).toBe('comprar café');
    await usuario.keyboard('{Escape}');
    expect(screen.queryByLabelText('Anotar uma distração')).toBeNull();
    // O foco estava dentro do bloquinho: volta ao relógio, não vai ao começo da página.
    expect(screen.getByRole('button', { name: /Abrir o bloquinho/ })).toHaveFocus();
  });

  it('o relógio diz "Sessão" e o tempo, e o Tab do relógio entra no bloquinho', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'lei' });
    const { usuario } = await abrir('/biblioteca', repo);
    const relogio = await screen.findByRole('button', { name: /Abrir o bloquinho/ });
    expect(relogio).toHaveTextContent(/^Sessão · /);
    await usuario.click(relogio);
    await usuario.tab();
    expect(screen.getByLabelText('Anotar uma distração')).toHaveFocus();
  });

  it('pausar pelo canto muda o relógio para "Pausada"', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'material' });
    const { usuario } = await abrir('/recall', repo);
    await usuario.click(await screen.findByRole('button', { name: /Abrir o bloquinho/ }));
    await usuario.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(await screen.findByRole('button', { name: /Sessão pausada/ })).toBeInTheDocument();
  });

  it('não aparece nas telas da Sessão nem sem Sessão aberta', async () => {
    const { repo } = await repositorioDeTeste();
    await abrir('/biblioteca', repo);
    expect(screen.queryByRole('button', { name: /bloquinho/ })).toBeNull();
  });
});
