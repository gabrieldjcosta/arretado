import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ItemDoAcervo } from '../../dominios/acervo/esquemas';
import { aderirEmLote } from '../../dominios/acervo/adesao';
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
        trechos: [{ texto: 'Texto.' }],
      },
      {
        endereco: 'art2',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 2º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: 'Outro texto.' }],
      },
    ],
  };
}

async function fonte() {
  return FonteEmMemoria.criar([
    {
      item: item('lep'),
      vinculos: [{ disciplina: 'Execução Penal', subtitulo: 'Lei toda' }],
      avisos: ['Divergente do edital.'],
    },
    { item: item('eca'), vinculos: [{ disciplina: 'Infância' }, { disciplina: 'Execução Penal' }] },
    { item: item('solta') },
  ]);
}

async function abrir(rota: string, f: FonteEmMemoria) {
  const { repo } = await repositorioDeTeste();
  window.location.hash = rota;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
  return { repo, usuario };
}

describe('Biblioteca › Acervo (3c)', () => {
  it('"Tudo do edital" marca o que falta', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo?tudo=1', f);
    await screen.findByRole('heading', { name: 'Acervo: normas' });
    // Só as com disciplina vêm marcadas: a "SOLTA" não.
    expect(await screen.findByRole('button', { name: /^Adicionar 2 / })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^SOLTA/ })).toHaveAttribute('aria-pressed', 'false');
    // Desmarcar uma das pré-marcadas mantém as outras (revisão das etapas 8, 9 e 11).
    const eca = screen.getAllByRole('button', { name: /^ECA/ })[0];
    if (!eca) throw new Error('sem ECA');
    await usuario.click(eca);
    expect(await screen.findByRole('button', { name: /^Adicionar 1 / })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: /^LEP/ })[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getAllByRole('button', { name: /^ECA/ })[0]).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('agrupa por disciplina e por tipo, filtra, mostra aviso e subtítulo', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo', f);
    const exec = await screen.findByRole('region', { name: 'Execução Penal' });
    const botoesItens = within(exec)
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(botoesItens).toHaveLength(2);
    expect(within(exec).getByText(/Lei toda/)).toBeInTheDocument();
    expect(within(exec).getByText('Divergente do edital.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sem disciplina' })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Agrupar por'), 'tipo');
    expect(screen.getByRole('region', { name: 'Leis federais' })).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Buscar'), 'infancia');
    expect(
      screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed')),
    ).toHaveLength(1);
  });

  it('adiciona com progresso, vira "Já adicionada" e a Biblioteca agrupa por disciplina', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo', f);
    await usuario.click(await screen.findByRole('button', { name: 'Marcar todos que faltam' }));
    await usuario.click(screen.getByRole('button', { name: /^Adicionar 3 / }));
    expect(await screen.findByText(/3 adicionadas/)).toBeInTheDocument();
    expect((await screen.findAllByText('Já adicionada')).length).toBeGreaterThan(0);

    await usuario.click(screen.getByRole('link', { name: 'Normas' }));
    const exec = await screen.findByRole('group', { name: 'Execução Penal' });
    expect(within(exec).getByText('LEP')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Infância' })).toBeInTheDocument();
  });

  it('avisa, sem bloquear, quando o item é uma norma já colada', async () => {
    const f = await FonteEmMemoria.criar([
      {
        item: {
          ...item('lep'),
          norma: { tituloCurto: 'Lei nº 7.210/1984', tipo: 'Lei', esfera: 'federal' },
        },
      },
      { item: item('eca') },
    ]);
    const { repo } = await repositorioDeTeste();
    await repo.colecao('normas').criar({
      tituloCurto: 'LEP',
      escopo: 'pessoal',
      tipo: 'Lei',
      referencia: '7.210/1984',
    });
    window.location.hash = '#/biblioteca/acervo';
    render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
    expect(await screen.findByText('Você já tem uma norma parecida: LEP.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Lei nº 7.210\/1984/ })).toBeEnabled();
    expect(screen.getAllByText(/norma parecida/)).toHaveLength(1);
  });

  it('falha isolada: "Tentar de novo" só nos que falharam', async () => {
    const f = await fonte();
    f.falhas.add('eca');
    const { usuario } = await abrir('#/biblioteca/acervo', f);
    await usuario.click(await screen.findByRole('button', { name: 'Marcar todos que faltam' }));
    await usuario.click(screen.getByRole('button', { name: /^Adicionar 3 / }));
    expect(await screen.findByText(/2 adicionadas; 1 falharam/)).toBeInTheDocument();
    f.falhas.clear();
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo (1)' }));
    await waitFor(() => {
      expect(screen.getByText(/^1 adicionadas/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Tentar de novo/ })).not.toBeInTheDocument();
  });

  it('permite alternar item por teclado (Espaço/Enter), mostra a marca, Disciplinas sugeridas e Alterar disciplina', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo', f);
    const botaoSolta = await screen.findByRole('button', { name: /^SOLTA/ });
    expect(botaoSolta).toHaveAttribute('aria-pressed', 'false');
    expect(botaoSolta.querySelector('.item-acervo-marca svg')).toBeNull();

    // Alternar com teclado
    botaoSolta.focus();
    await usuario.keyboard(' ');
    expect(botaoSolta).toHaveAttribute('aria-pressed', 'true');
    expect(botaoSolta.querySelector('.item-acervo-marca svg')).not.toBeNull();

    await usuario.keyboard('{Enter}');
    expect(botaoSolta).toHaveAttribute('aria-pressed', 'false');
    expect(botaoSolta.querySelector('.item-acervo-marca svg')).toBeNull();

    // Disciplinas sugeridas e botão Alterar disciplina
    expect(screen.getAllByText(/Disciplinas sugeridas:/).length).toBeGreaterThan(0);
    const botaoAlterar = screen.getByRole('button', { name: 'Alterar disciplina de LEP' });
    expect(botaoAlterar).toHaveTextContent('Alterar disciplina');
  });

  it('súmulas sem itens: convite vazio; sem rede: falha com "Tentar de novo"', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo?tipo=sumulas', f);
    expect(
      await screen.findByRole('heading', { name: 'Ainda não há súmulas no acervo' }),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Teses' }));
    expect(await screen.findByRole('heading', { name: 'Nenhuma tese ainda' })).toBeInTheDocument();
  });
});

describe('Biblioteca › Acervo › atualização (6a)', () => {
  it('avisa de versão nova, mostra a prévia, atualiza e lista o que reler', async () => {
    const v1 = await FonteEmMemoria.criar([{ item: item('lep') }]);
    const { repo } = await repositorioDeTeste();
    await aderirEmLote(repo, v1, ['lep']);
    const normas = await repo.colecao('normas').todosDoUsuario();
    const norma = normas[0];
    const dispositivos = await repo.colecao('dispositivos').todosDoUsuario();
    const art2 = dispositivos.find((d) => d.endereco === 'art2');
    if (!norma || !art2) throw new Error('adesão sem norma');
    await repo
      .colecao('estrelas')
      .criar({ alvoId: art2.id, normaId: norma.id, origemTipo: 'direta' });

    const velho = item('lep');
    const v2 = await FonteEmMemoria.criar([
      { item: { ...velho, versao: 2, nos: velho.nos.slice(0, 1) } },
    ]);
    window.location.hash = '#/biblioteca/acervo';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={v2} />);
    expect(await screen.findByText(/Há versão nova/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByText(/1 saem da norma/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Atualizar agora' }));
    await waitFor(() => {
      expect(screen.queryByText(/Há versão nova/)).not.toBeInTheDocument();
    });

    window.location.hash = `#/biblioteca/normas/${norma.id}`;
    const lista = await screen.findByRole('region', { name: 'Para reler' }, { timeout: 4000 });
    expect(lista).toHaveTextContent('Art. 2º saiu da norma');
    await usuario.click(within(lista).getByRole('button', { name: 'Já reli' }));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Para reler' })).not.toBeInTheDocument();
    });
  });
});

describe('Biblioteca › Acervo: normas excluídas não vazam', () => {
  it('norma do acervo excluída não aparece como "Já adicionada"', async () => {
    const f = await fonte();
    const { repo } = await repositorioDeTeste();
    await aderirEmLote(repo, f, ['lep']);
    for (const n of await repo.colecao('normas').todosDoUsuario()) {
      await repo.colecao('normas').excluir(n.id);
    }
    window.location.hash = '#/biblioteca/acervo';
    render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
    const botao = await screen.findByRole('button', { name: /^LEP/ });
    expect(botao).toBeEnabled();
    expect(screen.queryByText('Já adicionada')).not.toBeInTheDocument();
  });

  it('norma colada excluída não gera o aviso de norma parecida', async () => {
    const f = await FonteEmMemoria.criar([
      {
        item: {
          ...item('lep'),
          norma: { tituloCurto: 'Lei nº 7.210/1984', tipo: 'Lei', esfera: 'federal' },
        },
      },
    ]);
    const { repo } = await repositorioDeTeste();
    const colada = await repo.colecao('normas').criar({
      tituloCurto: 'LEP',
      escopo: 'pessoal',
      tipo: 'Lei',
      referencia: '7.210/1984',
    });
    await repo.colecao('normas').excluir(colada.id);
    window.location.hash = '#/biblioteca/acervo';
    render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
    expect(await screen.findByRole('button', { name: /^Lei nº 7.210\/1984/ })).toBeEnabled();
    expect(screen.queryByText(/norma parecida/)).not.toBeInTheDocument();
  });
});
