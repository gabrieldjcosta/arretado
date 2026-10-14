import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { alterarPreferencias } from '../../core/preferencias';
import type { Repositorio } from '../../core/persistencia';
import { criarCartaoDeErro, criarCartaoManual, registrarErro } from '../../dominios/recall/servico';
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

/** Erro como o app anterior à v6 gravava: sem frase correta. */
const erroAntigo = (repo: Repositorio, oQueFoi: string) =>
  repo.colecao('erros').criar({ resultado: 'errou', oQueFoi, status: 'aberto' });

describe('captura de erro (6.2)', () => {
  it('só a frase correta é obrigatória (D25); sem "o que foi" não pergunta pelo cartão', async () => {
    const { repo, usuario } = await abrir('/recall/registrar');
    const salvar = await screen.findByRole('button', { name: 'Salvar' });
    expect(screen.getByLabelText('Frase correta')).toHaveFocus();
    expect(salvar).toBeDisabled();
    await usuario.type(screen.getByLabelText('Frase correta'), 'O prazo do agravo é de 15 dias.');
    expect(salvar).toBeEnabled();
    await usuario.click(salvar);

    expect(await screen.findByText('Frase registrada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sim' })).not.toBeInTheDocument();
    const [erro] = await repo.colecao('erros').todosDoUsuario();
    expect(erro).toMatchObject({
      resultado: 'errou',
      fraseCorreta: 'O prazo do agravo é de 15 dias.',
      status: 'aberto',
    });
    expect(erro?.oQueFoi).toBeUndefined();
    const [frase] = await repo.colecao('frases').todosDoUsuario();
    expect(frase).toMatchObject({ texto: 'O prazo do agravo é de 15 dias.', erroId: erro?.id });

    await usuario.click(screen.getByRole('button', { name: 'Registrar outra' }));
    expect(await screen.findByLabelText('Frase correta')).toHaveValue('');
    expect(screen.getByLabelText('Frase correta')).toHaveFocus();
  });

  it('com "o que foi" em mais detalhes, pergunta pelo cartão sem modal', async () => {
    const { repo, usuario } = await abrir('/recall/registrar');
    await screen.findByRole('button', { name: 'Salvar' });
    expect(screen.getByLabelText('O que foi')).not.toBeVisible();
    await usuario.type(screen.getByLabelText('Frase correta'), 'O prazo é de 15 dias.');
    await usuario.click(screen.getByText('Mais detalhes (opcional)'));
    await usuario.click(screen.getByRole('button', { name: 'Acertei sem certeza' }));
    await usuario.type(screen.getByLabelText('O que foi'), 'Prazo de 5 dias do agravo');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByText('Frase registrada.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Sim' }));
    expect(await screen.findByText(/Cartão criado/)).toBeInTheDocument();
    const [erro] = await repo.colecao('erros').todosDoUsuario();
    expect(erro).toMatchObject({
      fraseCorreta: 'O prazo é de 15 dias.',
      resultado: 'acertou_inseguro',
      oQueFoi: 'Prazo de 5 dias do agravo',
      status: 'com_cartao',
      causaSugerida: 'literalidade',
    });
    const [cartao] = await repo.colecao('cartoes').todosDoUsuario();
    const [frase] = await repo.colecao('frases').todosDoUsuario();
    expect(cartao?.fraseId).toBe(frase?.id);
  });

  it('disciplina e ponto são opcionais e ficam escolhidos para o registro seguinte', async () => {
    const { repo } = await repositorioDeTeste();
    const penal = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    await repo.colecao('disciplinas').criar({ nome: 'Civil' });
    const furto = await repo.colecao('pontos').criar({ titulo: 'Furto', disciplinaId: penal.id });
    const { usuario } = await abrir('/recall/registrar', repo);
    await usuario.selectOptions(
      await screen.findByLabelText('Ponto do edital (opcional)'),
      'Furto',
    );
    expect(screen.getByLabelText('Disciplina (opcional)')).toHaveValue(penal.id);
    await usuario.type(screen.getByLabelText('Frase correta'), 'Primeira.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('A próxima fica em Penal › Furto.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Registrar outra' }));
    expect(await screen.findByLabelText('Ponto do edital (opcional)')).toHaveValue(furto.id);
    await usuario.type(screen.getByLabelText('Frase correta'), 'Segunda.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByText('Frase registrada.');
    const frases = await repo.colecao('frases').todosDoUsuario();
    expect(frases.map((f) => [f.texto, f.disciplinaId, f.pontoId])).toEqual([
      ['Primeira.', penal.id, furto.id],
      ['Segunda.', penal.id, furto.id],
    ]);
  });

  it('atalho E abre a captura; dentro de campo de texto não', async () => {
    const { usuario } = await abrir('/');
    await usuario.keyboard('e');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Registrar erro' }),
    ).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Frase correta'), 'e');
    expect(screen.getByLabelText('Frase correta')).toHaveValue('e');
  });
});

describe('completar depois (6.3)', () => {
  it('salva sozinho e mostra "Salvo"', async () => {
    const { repo } = await repositorioDeTeste();
    const erro = await erroAntigo(repo, 'Remição');
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
    await registrarErro(repo, { resultado: 'errou', oQueFoi: 'Rápido', fraseCorreta: 'R.' });
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
    const erro = await registrarErro(repo, { oQueFoi: 'Frente X', fraseCorreta: 'Verso X.' });
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

describe('correções da revisão da etapa 6', () => {
  it('edição feita logo antes de sair da tela é gravada', async () => {
    const { repo } = await repositorioDeTeste();
    const erro = await erroAntigo(repo, 'Sursis');
    const { usuario } = await abrir(`/recall/erros/${erro.id}`, repo);
    await usuario.type(await screen.findByLabelText('Frase correta'), 'Suspensão condicional.');
    await usuario.click(screen.getByRole('link', { name: 'Voltar ao Recall' }));
    await waitFor(async () => {
      expect((await repo.colecao('erros').obter(erro.id))?.fraseCorreta).toBe(
        'Suspensão condicional.',
      );
    });
  });

  it('ano incompleto não impede gravar os outros campos', async () => {
    const { repo } = await repositorioDeTeste();
    const erro = await erroAntigo(repo, 'Sursis');
    const { usuario } = await abrir(`/recall/erros/${erro.id}`, repo);
    await usuario.type(await screen.findByLabelText('Ano'), '26');
    expect(screen.getByText('Use 4 dígitos, de 1900 a 2100.')).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Frase correta'), 'F.');
    await waitFor(
      async () => {
        expect((await repo.colecao('erros').obter(erro.id))?.fraseCorreta).toBe('F.');
      },
      { timeout: 3000 },
    );
    await usuario.clear(screen.getByLabelText('Ano'));
    await usuario.type(screen.getByLabelText('Ano'), '2024');
    await waitFor(
      async () => {
        expect((await repo.colecao('erros').obter(erro.id))?.fonte?.ano).toBe(2024);
      },
      { timeout: 3000 },
    );
  });

  it('no drill, Enter num link do menu segue o link em vez de virar o cartão', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const erro = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'Frente',
      fraseCorreta: 'Verso',
    });
    await criarCartaoDeErro(repo, erro.id);
    relogio.avancar(86_400_000);
    const { usuario } = await abrir('/recall/revisar', repo);
    await screen.findByText('Frente');
    await usuario.click(screen.getByText('Mais opções'));
    screen.getByRole('link', { name: 'Editar' }).focus();
    await usuario.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Editar cartão' }),
    ).toBeInTheDocument();
  });
});

describe('cota e início do Recall (fatia 3)', () => {
  async function comVencidos(n: number) {
    const { repo, relogio } = await repositorioDeTeste();
    for (let i = 1; i <= n; i += 1) {
      await criarCartaoManual(repo, { frente: `Frente ${String(i)}`, verso: 'v' });
    }
    relogio.avancar(86_400_000);
    return repo;
  }

  it('início: ação única com a cota, a estimativa, "Hoje: N de V" e o próximo passo', async () => {
    const repo = await comVencidos(25);
    const { usuario } = await abrir('/recall', repo);
    expect(await screen.findByRole('heading', { name: 'Revisar 10 cartões' })).toBeInTheDocument();
    expect(screen.getByText('cerca de 5 min')).toBeInTheDocument();
    expect(screen.getByText(/Hoje: 10 de 25/)).toBeInTheDocument();
    expect(screen.getByText('Nenhum dia nos últimos 7')).toBeInTheDocument();
    expect(screen.getByText(/Depois:/)).toHaveTextContent('registrar um erro');
    // Da abertura ao primeiro cartão: 1 toque.
    await usuario.click(screen.getByRole('link', { name: 'Começar' }));
    expect(await screen.findByText('1 de 10')).toBeInTheDocument();
  });

  it('com cartões e frases vencidos: uma só ação, e o fim dos cartões segue para as frases', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'Frente 1', verso: 'v' });
    await registrarErro(repo, { fraseCorreta: 'Frase correta do dia.' });
    relogio.avancar(86_400_000);
    const { usuario } = await abrir('/recall', repo);
    expect(
      await screen.findByRole('heading', { name: 'Revisar 1 cartão e 1 frase' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Revisar frases/ })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Começar' }));
    await usuario.keyboard(' ');
    await usuario.keyboard('3');
    await usuario.click(await screen.findByRole('link', { name: 'Seguir para as frases (1)' }));
    expect(await screen.findByText('Frase correta do dia.')).toBeInTheDocument();
  });

  it('fim da rodada: neutro no perfil Calmo; com sotaque só em outro perfil e no sorteio', async () => {
    const termina = async (perfil?: 'guiado') => {
      const repo = await comVencidos(1);
      if (perfil) await alterarPreferencias(repo, { perfilDeEstudo: perfil });
      const { usuario } = await abrir('/recall/revisar', repo);
      expect(await screen.findByText('Frente 1')).toBeInTheDocument();
      await usuario.keyboard(' ');
      await usuario.keyboard('3');
      return screen.findByRole('heading', { name: /Feito|Rodada feita/ });
    };
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(await termina()).toHaveTextContent('Feito.');
    cleanup();
    expect(await termina('guiado')).toHaveTextContent('Danado de bom! Rodada feita.');
  });

  it('sem fila: convida a registrar e diz o que vence amanhã', async () => {
    const { repo } = await repositorioDeTeste();
    await abrir('/recall', repo);
    expect(
      await screen.findByRole('heading', { name: 'Registre seu primeiro erro' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Depois:/)).toHaveTextContent('seu primeiro cartão aparece amanhã');
  });

  it('drill: 25 vencidos = 10 + "Revisar mais 10" + 5; nada é cortado nem perdido', async () => {
    const repo = await comVencidos(25);
    const { usuario } = await abrir('/recall/revisar', repo);
    const rodada = async (n: number) => {
      for (let i = 0; i < n; i += 1) {
        await screen.findByRole('button', { name: 'Mostrar resposta' });
        await usuario.keyboard(' ');
        await screen.findByRole('group', { name: 'Como foi?' });
        await usuario.keyboard('3');
      }
    };
    expect(await screen.findByText('1 de 10')).toBeInTheDocument();
    await rodada(10);
    expect(
      await screen.findByText('Restam 15 cartões para hoje. Os outros esperam; nada é apagado.'),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Revisar mais 10' }));
    expect(await screen.findByText('1 de 10')).toBeInTheDocument();
    await rodada(10);
    await usuario.click(await screen.findByRole('button', { name: 'Revisar mais 5' }));
    expect(await screen.findByText('1 de 5')).toBeInTheDocument();
    await rodada(5);
    expect(await screen.findByRole('heading', { name: 'Feito.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisar mais/ })).not.toBeInTheDocument();
    expect(await repo.colecao('revisoes').contar()).toBe(25);
  });
});
