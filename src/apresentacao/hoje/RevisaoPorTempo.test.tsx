import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { criarCartaoManual, revisar } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const DIA = 24 * 60 * 60_000;

function abrirHoje(repo: Repositorio) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return usuario;
}

async function cartoes(repo: Repositorio, n: number) {
  for (let i = 1; i <= n; i += 1)
    await criarCartaoManual(repo, { frente: `P${String(i)}`, verso: 'v' });
}

describe('Hoje › do tamanho do seu tempo (AP-01)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sem escolher, a folha é a de sempre; escolher 5 min monta 10 cartões e deixa o resto', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await cartoes(repo, 12);
    relogio.avancar(DIA);
    const usuario = abrirHoje(repo);
    const quatro = await screen.findByRole('group', { name: 'Quanto tempo você tem?' });
    expect(screen.getByText('cerca de 5 min')).toBeInTheDocument();
    await usuario.click(within(quatro).getByRole('button', { name: '5 min' }));
    expect(
      await screen.findByText(/10 cartões, pelo que mais cai.*Cerca de 5 min/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Os outros 2 cartões continuam na fila/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Começar' })).toHaveAttribute(
      'href',
      '#/recall/revisar?itens=10',
    );
    expect(document.body.textContent).not.toMatch(/atrasad|pendente|dívida/i);
    // Tocar de novo no mesmo tempo desfaz a escolha.
    await usuario.click(within(quatro).getByRole('button', { name: '5 min' }));
    await waitFor(() => {
      expect(screen.getByText('cerca de 5 min')).toBeInTheDocument();
    });
  });

  it('depois de dois dias fora o lote vem menor e o texto diz isso sem cobrar', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await cartoes(repo, 12);
    const primeiro = (await repo.colecao('cartoes').todosDoUsuario())[0]!;
    await revisar(repo, primeiro.id, 'facil', { duracaoMs: 1000 });
    relogio.avancar(5 * DIA);
    const usuario = abrirHoje(repo);
    const quatro = await screen.findByRole('group', { name: 'Quanto tempo você tem?' });
    await usuario.click(within(quatro).getByRole('button', { name: '5 min' }));
    expect(await screen.findByText(/5 cartões, pelo que mais cai/)).toBeInTheDocument();
    expect(screen.getByText(/Depois de uma pausa o lote vem mais curto/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Começar' })).toHaveAttribute(
      'href',
      '#/recall/revisar?itens=5',
    );
  });
});
