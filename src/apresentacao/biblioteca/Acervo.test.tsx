import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ItemDoAcervo } from '../../dominios/acervo/esquemas';
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
  it('Biblioteca vazia oferece "Tudo do edital" e marca o que falta', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca', f);
    await usuario.click(await screen.findByRole('link', { name: 'Tudo do edital da DPE-SP' }));
    await screen.findByRole('heading', { name: 'Acervo: normas' });
    // Só as com disciplina vêm marcadas: a "SOLTA" não.
    expect(await screen.findByRole('button', { name: /^Adicionar 2 / })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /SOLTA/ })).not.toBeChecked();
  });

  it('agrupa por disciplina e por tipo, filtra, mostra aviso e subtítulo', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo', f);
    const exec = await screen.findByRole('region', { name: 'Execução Penal' });
    expect(within(exec).getAllByRole('checkbox')).toHaveLength(2);
    expect(within(exec).getByText(/Lei toda/)).toBeInTheDocument();
    expect(within(exec).getByText('Divergente do edital.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sem disciplina' })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Agrupar por'), 'tipo');
    expect(screen.getByRole('region', { name: 'Leis federais' })).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Buscar'), 'infancia');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('adiciona com progresso, vira "Já adicionada" e a Biblioteca agrupa por disciplina', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo', f);
    await usuario.click(await screen.findByRole('button', { name: 'Marcar todos que faltam' }));
    await usuario.click(screen.getByRole('button', { name: /^Adicionar 3 / }));
    expect(await screen.findByText(/3 adicionadas/)).toBeInTheDocument();
    expect((await screen.findAllByText('Já adicionada')).length).toBeGreaterThan(0);

    await usuario.click(screen.getByRole('link', { name: 'Normas' }));
    const exec = await screen.findByRole('region', { name: 'Execução Penal' });
    expect(within(exec).getByText('LEP')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Infância' })).toBeInTheDocument();
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

  it('súmulas sem itens: convite vazio; sem rede: falha com "Tentar de novo"', async () => {
    const f = await fonte();
    const { usuario } = await abrir('#/biblioteca/acervo?tipo=sumulas', f);
    expect(
      await screen.findByRole('heading', { name: 'Ainda não há súmulas no acervo' }),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Teses' }));
    expect(
      await screen.findByRole('heading', { name: 'Ainda não há teses no acervo' }),
    ).toBeInTheDocument();
  });
});
