import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { CHAVE_DA_INTERFACE } from './interface';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições da sentença.'),
  linha('Art. 2º O prazo de recurso é de 30 (trinta) dias.'),
];

async function abrir(opcoes: { comLei?: boolean; previa?: boolean; rota?: string } = {}) {
  const { repo } = await repositorioDeTeste();
  if (opcoes.comLei) {
    const disciplina = await repo.colecao('disciplinas').criar({ nome: 'Execução Penal' });
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const { norma } = await publicarVersao(repo, versao.id);
    await repo
      .colecao('vinculosDisciplina')
      .criar({ normaId: norma.id, disciplinaId: disciplina.id });
  }
  if (opcoes.previa !== false) window.localStorage.setItem(CHAVE_DA_INTERFACE, 'fio');
  window.location.hash = opcoes.rota ?? '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

afterEach(() => {
  window.localStorage.removeItem(CHAVE_DA_INTERFACE);
});

describe('o Arretado novo (prévia do Fio)', () => {
  it('desligada, abre o Hoje de sempre e as rotas novas voltam a ele', async () => {
    await abrir({ previa: false, rota: '#/destino' });
    await waitFor(() => {
      expect(window.location.hash).toBe('#/');
    });
    expect(screen.queryByRole('navigation', { name: 'Lugares' })).not.toBeInTheDocument();
  });

  it('ligada, mostra os três lugares embaixo, com o Agora aceso', async () => {
    await abrir();
    const nav = await screen.findByRole('navigation', { name: 'Lugares' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Agora', 'Destino', 'Varal']);
    expect(within(nav).getByRole('link', { name: 'Agora' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('sem nenhuma matéria, pergunta a prova em vez de listar começos', async () => {
    await abrir();
    expect(await screen.findByRole('heading', { name: 'Qual é a sua prova?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Escolher minha prova/ })).toHaveAttribute(
      'href',
      '#/comecar',
    );
  });

  it('puxa o fio, lê, pousa e o Destino guarda o caminho', async () => {
    const { usuario } = await abrir({ comLei: true });

    const ponta = await screen.findByRole('group', { name: 'Na ponta do fio' });
    expect(within(ponta).getByText(/Art/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Puxe o fio/ }));
    const passo = await screen.findByRole('region', { name: 'Passo do Fio' });
    // Com um passo só na tela (os outros o Fio pula), a fileira de pontos não diz nada e não aparece.
    expect(within(passo).queryByRole('list', { name: /^Passo \d de \d/ })).not.toBeInTheDocument();
    expect(within(passo).getByRole('link', { name: /Abrir no Leitor/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/biblioteca/normas/'),
    );

    await usuario.click(within(passo).getByRole('button', { name: 'Já li' }));
    // O Lembrar ainda não tem tela: o Fio o pula sozinho e a etapa pousa.
    expect(await screen.findByRole('heading', { name: 'Pousou.' })).toBeInTheDocument();
    expect(screen.getByText(/^Leu /)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Pousar' }));
    await screen.findByRole('group', { name: 'Na ponta do fio' });

    await usuario.click(screen.getByRole('link', { name: 'Destino' }));
    expect(
      await screen.findByRole('heading', { name: 'Seu caminho até aqui' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 etapa pousada/)).toBeInTheDocument();
  });

  it('pular um passo não custa nada e não deixa fato', async () => {
    const { usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxe o fio/ }));
    const passo = await screen.findByRole('region', { name: 'Passo do Fio' });
    await usuario.click(within(passo).getByRole('button', { name: 'Pular este passo' }));
    expect(await screen.findByRole('heading', { name: 'Pousou.' })).toBeInTheDocument();
    expect(screen.getByText(/passou sem deixar fato/)).toBeInTheDocument();
  });

  it('o Varal tem dois varais de folhetos e leva às coisas da pessoa', async () => {
    const { usuario } = await abrir();
    await usuario.click(await screen.findByRole('link', { name: 'Varal' }));
    expect(await screen.findByRole('heading', { name: /pendurado no fio/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^Normas/ })).toHaveAttribute('href', '#/biblioteca');
    });
    expect(screen.getByRole('link', { name: /^Frases/ })).toHaveAttribute(
      'href',
      '#/recall/frases',
    );
  });

  it('a Conta liga e desliga a prévia', async () => {
    const { usuario } = await abrir({ previa: false, rota: '#/conta' });
    await usuario.click(await screen.findByRole('button', { name: 'Experimentar' }));
    expect(await screen.findByRole('navigation', { name: 'Lugares' })).toBeInTheDocument();
    await usuario.click(await screen.findByRole('button', { name: 'Voltar ao de sempre' }));
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'Lugares' })).not.toBeInTheDocument();
    });
  });
});
