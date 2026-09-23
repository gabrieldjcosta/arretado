import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { criarCartaoDeErro, registrarErro } from '../../dominios/recall/servico';
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

describe('captura de erro (6.2)', () => {
  it('só salva com resultado e "o que foi"; depois pergunta pelo cartão sem modal', async () => {
    const { repo, usuario } = await abrir('/recall/registrar');
    const salvar = await screen.findByRole('button', { name: 'Salvar' });
    expect(screen.getByLabelText('O que foi')).toHaveFocus();
    expect(salvar).toBeDisabled();
    await usuario.type(screen.getByLabelText('O que foi'), 'Prazo de 5 dias do agravo');
    expect(salvar).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Errei' }));
    expect(salvar).toBeEnabled();
    await usuario.click(salvar);

    expect(await screen.findByText('Erro registrado.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Sim' }));
    expect(await screen.findByText(/Cartão criado/)).toBeInTheDocument();

    const [erro] = await repo.colecao('erros').todosDoUsuario();
    expect(erro).toMatchObject({
      resultado: 'errou',
      oQueFoi: 'Prazo de 5 dias do agravo',
      status: 'com_cartao',
      causaSugerida: 'literalidade',
    });
    expect(await repo.colecao('cartoes').contar()).toBe(1);
  });

  it('"mais detalhes" começa recolhido e grava a frase correta', async () => {
    const { repo, usuario } = await abrir('/recall/registrar');
    await screen.findByRole('button', { name: 'Salvar' });
    expect(screen.getByLabelText('Frase correta')).not.toBeVisible();
    await usuario.click(screen.getByText('Mais detalhes (opcional)'));
    await usuario.type(screen.getByLabelText('Frase correta'), 'O prazo é de 15 dias.');
    await usuario.click(screen.getByRole('button', { name: 'Acertei sem certeza' }));
    await usuario.type(screen.getByLabelText('O que foi'), 'Agravo');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByText('Erro registrado.');
    const [erro] = await repo.colecao('erros').todosDoUsuario();
    expect(erro?.fraseCorreta).toBe('O prazo é de 15 dias.');
    expect(erro?.resultado).toBe('acertou_inseguro');
  });

  it('atalho E abre a captura; dentro de campo de texto não', async () => {
    const { usuario } = await abrir('/');
    await usuario.keyboard('e');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Registrar erro' }),
    ).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('O que foi'), 'e');
    expect(screen.getByLabelText('O que foi')).toHaveValue('e');
  });
});

describe('completar depois (6.3)', () => {
  it('salva sozinho e mostra "Salvo"', async () => {
    const { repo } = await repositorioDeTeste();
    const erro = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'Remição' });
    const { usuario } = await abrir(`/recall/erros/${erro.id}`, repo);
    await usuario.type(
      await screen.findByLabelText('Frase correta'),
      'Três dias de trabalho, um de pena.',
    );
    await usuario.click(screen.getByLabelText(/Lacuna/));
    await waitFor(
      async () => {
        const e = await repo.colecao('erros').obter(erro.id);
        expect(e).toMatchObject({
          fraseCorreta: 'Três dias de trabalho, um de pena.',
          causa: 'lacuna',
        });
      },
      { timeout: 3000 },
    );
    expect(await screen.findByText('Salvo')).toBeInTheDocument();
    expect(screen.getByText(/Ação recomendada/)).toBeInTheDocument();
  });

  it('lista marca "completar" e filtra, preservando o filtro no endereço', async () => {
    const { repo } = await repositorioDeTeste();
    await registrarErro(repo, { resultado: 'errou', oQueFoi: 'Rápido' });
    await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'Completo',
      fraseCorreta: 'F.',
      causa: 'lacuna',
    });
    const { usuario } = await abrir('/recall', repo);
    const lista = await screen.findByRole('list');
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lista).getAllByText('completar')).toHaveLength(1);
    await usuario.click(screen.getByText('Filtros'));
    await usuario.click(screen.getByLabelText('Só os que faltam completar'));
    await waitFor(() => {
      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    });
    expect(window.location.hash).toContain('completar=1');
  });
});

describe('drill (6.6) e lista passiva (6.8)', () => {
  it('vira, responde pelo teclado e termina com "Amanhã: N"', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const erro = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'Prazo do agravo?',
      fraseCorreta: '15 dias úteis.',
    });
    await criarCartaoDeErro(repo, erro.id);
    relogio.avancar(86_400_000);
    const { usuario } = await abrir('/recall/revisar', repo);

    expect(await screen.findByText('Prazo do agravo?')).toBeInTheDocument();
    expect(screen.getByText('1 de 1')).toBeInTheDocument();
    expect(screen.queryByText('15 dias úteis.')).not.toBeInTheDocument();
    await usuario.keyboard(' ');
    expect(await screen.findByText('15 dias úteis.')).toBeInTheDocument();
    await usuario.keyboard('3');
    expect(await screen.findByRole('heading', { name: 'Feito.' })).toBeInTheDocument();
    expect(screen.getByText('Amanhã: 0 cartões.')).toBeInTheDocument();
    expect(await repo.colecao('revisoes').contar()).toBe(1);
  });

  it('frases corretas em lista corrida, abrindo o erro', async () => {
    const { repo } = await repositorioDeTeste();
    const erro = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'x',
      fraseCorreta: 'Frase A.',
    });
    const { usuario } = await abrir('/recall/frases', repo);
    await usuario.click(await screen.findByRole('link', { name: 'Frase A.' }));
    expect(window.location.hash).toBe(`#/recall/erros/${erro.id}`);
  });
});

describe('cartões (6.7)', () => {
  it('suspender tira da lista de ativos e aparece em suspensos', async () => {
    const { repo } = await repositorioDeTeste();
    const erro = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'Frente X' });
    await criarCartaoDeErro(repo, erro.id);
    const { usuario } = await abrir('/recall/cartoes', repo);
    await usuario.click(await screen.findByRole('button', { name: 'Suspender' }));
    await waitFor(() => {
      expect(screen.queryByText('Frente X')).not.toBeInTheDocument();
    });
    await usuario.click(screen.getByRole('button', { name: 'Suspensos' }));
    expect(await screen.findByText('Frente X')).toBeInTheDocument();
  });
});
