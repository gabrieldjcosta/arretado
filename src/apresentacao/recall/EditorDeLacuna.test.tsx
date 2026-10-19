import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Intervalo } from '../../core/modelo';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { EditorDeLacuna } from './EditorDeLacuna';
import { ajustarAPalavras } from './lacuna';

function Teste({ texto }: { texto: string }) {
  const [o, setO] = useState<Intervalo[]>([]);
  return (
    <>
      <EditorDeLacuna texto={texto} ocultos={o} aoMudar={setO} />
      <output>{JSON.stringify(o)}</output>
    </>
  );
}

/** Seleciona do offset `a` ao `b` dentro do primeiro nó de texto do editor. */
function selecionar(a: number, b: number) {
  const no = document.querySelector('.lacuna-editor span')?.firstChild;
  if (!no) throw new Error('sem texto');
  const faixa = document.createRange();
  faixa.setStart(no, a);
  faixa.setEnd(no, b);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(faixa);
}

afterEach(cleanup);

describe('ajustarAPalavras', () => {
  it('alarga até a palavra inteira e tira espaços das pontas', () => {
    const t = 'o prazo é de quinze dias';
    expect(ajustarAPalavras(t, { inicio: 9, fim: 17 })).toEqual({ inicio: 10, fim: 19 });
    expect(ajustarAPalavras(t, { inicio: 1, fim: 2 })).toBeNull();
    expect(ajustarAPalavras(t, { inicio: 0, fim: 1 })).toEqual({ inicio: 0, fim: 1 });
  });
});

describe('EditorDeLacuna', () => {
  it('selecionar já esconde; tocar na tarja mostra de novo', async () => {
    const usuario = userEvent.setup();
    render(<Teste texto="O prazo é de quinze dias." />);
    selecionar(12, 16);
    await act(async () => {
      document.querySelector('.lacuna-editor')?.dispatchEvent(new Event('pointerup'));
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /Trecho escondido: quinze/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('[{"inicio":13,"fim":19}]');
    await usuario.click(screen.getByRole('button', { name: /Trecho escondido/ }));
    expect(screen.getByRole('status')).toHaveTextContent('[]');
  });
});

describe('registrar com lacuna', () => {
  it('salvar com trecho escondido cria o erro, a frase e o cartão de lacuna', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/recall/registrar';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    await usuario.type(await screen.findByLabelText('Frase correta'), 'O prazo é de quinze dias.');
    await usuario.click(screen.getByRole('button', { name: 'Criar cartão com lacuna' }));
    selecionar(12, 16);
    await act(async () => {
      document.querySelector('.lacuna-editor')?.dispatchEvent(new Event('pointerup'));
      await Promise.resolve();
    });
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Cartão criado/)).toBeInTheDocument();
    const [cartao] = await repo.colecao('cartoes').todosDoUsuario();
    expect(cartao).toMatchObject({ tipo: 'lacuna', frente: 'O prazo é de […] dias.' });
  });

  it('registrar vários: uma frase por linha, com lacuna só na escolhida', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/recall/registrar/varios';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    await usuario.type(
      await screen.findByLabelText('Frases certas'),
      'Frase um.{Enter}Frase dois.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Esconder trecho: Frase dois.' }));
    selecionar(6, 10);
    await act(async () => {
      document.querySelector('.lacuna-editor')?.dispatchEvent(new Event('pointerup'));
      await Promise.resolve();
    });
    await usuario.click(screen.getByRole('button', { name: 'Salvar 2 frases' }));
    expect(
      await screen.findByText(/2 frases registradas, 1 cartão com lacuna/),
    ).toBeInTheDocument();
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(2);
    expect(await repo.colecao('cartoes').todosDoUsuario()).toHaveLength(1);
  });
});
