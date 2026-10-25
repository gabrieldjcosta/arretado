import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ItemDoAcervo, PacoteDePartida } from '../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

function item(id: string): ItemDoAcervo {
  return {
    id,
    versao: 1,
    norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
    nos: [
      {
        endereco: 'art1',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 1º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: 'Texto do primeiro artigo.' }],
      },
    ],
  };
}

const norma = (id: string, titulo: string, editaisQueCitam: number) => ({
  id,
  titulo,
  editaisQueCitam,
  porcentagem: 50,
});

const pacote: PacoteDePartida = {
  versao: 1,
  aprovadoEm: '2026-10-25',
  aprovadoPor: 'Teste',
  regra: 'Teste',
  carreiras: {
    'carreira-a': {
      nome: 'Carreira A',
      editaisComTexto: 4,
      normas: [
        norma('lei-a', 'Lei A (a primeira)', 4),
        norma('lei-sumida', 'Lei Sumida', 3),
        norma('lei-b', 'Lei B', 2),
      ],
    },
    'carreira-b': { nome: 'Carreira B', editaisComTexto: 1, normas: [norma('lei-c', 'Lei C', 1)] },
  },
};

async function fonte(comPacote = true) {
  return FonteEmMemoria.criar(
    [{ item: item('lei-a') }, { item: item('lei-b') }, { item: item('lei-c') }],
    comPacote ? { pacote } : {},
  );
}

async function abrir(rota: string, f: FonteEmMemoria) {
  const { repo } = await repositorioDeTeste();
  window.location.hash = rota;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
  return { repo, usuario };
}

describe('Escolher meu concurso › Qual concurso você estuda?', () => {
  it('lista as carreiras do pacote, com os editais, e o caminho de quem ainda não sabe', async () => {
    await abrir('#/comecar', await fonte());
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Qual concurso você estuda?' }),
    ).toBeInTheDocument();

    const a = await screen.findByRole('link', { name: /^Carreira A/ });
    expect(a).toHaveAttribute('href', '#/comecar/carreira-a');
    expect(a).toHaveTextContent('4 editais');
    const b = screen.getByRole('link', { name: /^Carreira B/ });
    expect(b).toHaveAttribute('href', '#/comecar/carreira-b');
    expect(b).toHaveTextContent('1 edital');
    expect(b).not.toHaveTextContent('1 editais');

    const outro = screen.getByRole('link', { name: /^Outro concurso, ou ainda não sei/ });
    expect(outro).toHaveAttribute('href', '#/biblioteca/acervo');
    expect(screen.getByRole('link', { name: 'Voltar ao Hoje' })).toHaveAttribute('href', '#/');
  });

  it('sem o pacote (sem internet, por exemplo) diz o que fazer, e tentar de novo funciona', async () => {
    const f = await fonte(false);
    const { usuario } = await abrir('#/comecar', f);
    const falha = await screen.findByRole('alert');
    expect(falha).toHaveTextContent('Não foi possível abrir a lista de concursos.');
    expect(falha).toHaveTextContent('Nada foi perdido');
    expect(screen.getByRole('link', { name: 'Ir à Biblioteca' })).toHaveAttribute(
      'href',
      '#/biblioteca',
    );
    const pedidosAntes = f.pedidos.length;
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByRole('alert');
    expect(f.pedidos.length).toBeGreaterThan(pedidosAntes);
  });
});

describe('Escolher meu concurso › Para começar', () => {
  it('mostra as normas do acervo na ordem do pacote, com os editais, e diz o que falta', async () => {
    await abrir('#/comecar/carreira-a', await fonte());
    // O título também aparece no carregamento, então a carreira é o que diz que a tela chegou.
    expect(await screen.findByText('Carreira A')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Para começar' })).toBeVisible();

    const linhas = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(linhas.map((l) => l.textContent)).toEqual([
      'Lei A (a primeira)4 de 4 editais',
      'Lei B2 de 4 editais',
    ]);
    expect(screen.getByRole('button', { name: 'Adicionar e ler' })).toBeEnabled();
    // Uma linha acima do botão diz o que ele faz.
    expect(
      screen.getByText('As 2 normas entram no aparelho e a primeira abre para ler.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver todo o acervo' })).toHaveAttribute(
      'href',
      '#/biblioteca/acervo',
    );
    expect(screen.getByText(/Faltam no acervo: Lei Sumida\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Importe do Planalto' })).toHaveAttribute(
      'href',
      '#/biblioteca/importar',
    );
    expect(screen.getByRole('link', { name: 'Outro concurso' })).toHaveAttribute(
      'href',
      '#/comecar',
    );
  });

  it('não avisa de falta quando o acervo tem todas', async () => {
    await abrir('#/comecar/carreira-b', await fonte());
    await screen.findByRole('button', { name: 'Adicionar e ler' });
    expect(screen.queryByText(/Faltam no acervo/)).toBeNull();
  });

  it('com uma norma só, a linha acima do botão fala no singular', async () => {
    await abrir('#/comecar/carreira-b', await fonte());
    expect(await screen.findByText('A norma entra no aparelho e abre para ler.')).toBeVisible();
  });

  it('"Adicionar e ler" adiciona todas, sem repetir, e abre a primeira no Leitor', async () => {
    const { repo, usuario } = await abrir('#/comecar/carreira-a', await fonte());
    await usuario.click(await screen.findByRole('button', { name: 'Adicionar e ler' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'LEI-A' })).toBeInTheDocument();
    expect(await screen.findByText(/Texto do primeiro artigo/)).toBeInTheDocument();
    const normas = await repo.colecao('normas').todosDoUsuario();
    expect(normas.map((n) => n.origemAcervo?.id).sort()).toEqual(['lei-a', 'lei-b']);
    expect(window.location.hash).toBe(
      `#/biblioteca/normas/${normas.find((n) => n.origemAcervo?.id === 'lei-a')?.id ?? ''}`,
    );
  });

  it('quando uma falha, diz qual, deixa ler o que entrou e tentar de novo', async () => {
    const f = await fonte();
    f.falhas.add('lei-a');
    const { repo, usuario } = await abrir('#/comecar/carreira-a', f);
    await usuario.click(await screen.findByRole('button', { name: 'Adicionar e ler' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Não deu para adicionar tudo.');
    expect(aviso).toHaveTextContent('Lei A (a primeira):');
    expect(aviso).not.toHaveTextContent('Lei B:');
    expect(screen.getByRole('heading', { level: 1, name: 'Para começar' })).toBeVisible();
    const ler = within(aviso).getByRole('link', { name: 'Ler o que já entrou' });
    const lei = (await repo.colecao('normas').todosDoUsuario()).find(
      (n) => n.origemAcervo?.id === 'lei-b',
    );
    expect(ler).toHaveAttribute('href', `#/biblioteca/normas/${lei?.id ?? ''}`);

    // Voltou a rede: o mesmo botão, agora "Tentar de novo", termina o que faltava e abre a primeira.
    f.falhas.clear();
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'LEI-A' })).toBeInTheDocument();
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(2);
  });

  it.each(['nao-existe', 'constructor', '__proto__', 'toString'])(
    'a carreira "%s", que não está no pacote, leva de volta à lista',
    async (slug) => {
      await abrir(`#/comecar/${slug}`, await fonte());
      expect(await screen.findByText('Esse concurso não está na lista')).toBeVisible();
      expect(screen.getByRole('link', { name: 'Escolher meu concurso' })).toHaveAttribute(
        'href',
        '#/comecar',
      );
    },
  );
});
