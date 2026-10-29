import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LinhaDoPasseio } from './LinhaDoPasseio';

function montar() {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <LinhaDoPasseio />
    </MemoryRouter>,
  );
  return usuario;
}

/** Tudo o que há guardado, por chave. */
const guardado = () =>
  Object.fromEntries(
    Array.from({ length: localStorage.length }, (_, i) => {
      const chave = localStorage.key(i) ?? '';
      return [chave, localStorage.getItem(chave)] as const;
    }),
  );
/** O setup semeia as chaves de "já visto"; para provar que nada se grava, o aparelho começa vazio. */
const esvaziar = () => {
  for (const chave of Object.keys(guardado())) localStorage.removeItem(chave);
};

beforeEach(() => {
  localStorage.clear();
});

describe('Conta › "Passeio pelos menus" (D-D10)', () => {
  it('é uma linha com o título, o apoio e o botão "Fazer o passeio"; nada abre sozinho', () => {
    montar();
    expect(screen.getByText('Passeio pelos menus')).toBeInTheDocument();
    expect(
      screen.getByText('Os quatro menus, um por vez, quando você quiser.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fazer o passeio' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre os quatro passos direto, sem as Boas-vindas, com "Voltar ao app" no primeiro', async () => {
    const usuario = montar();
    await usuario.click(screen.getByRole('button', { name: 'Fazer o passeio' }));
    const folha = screen.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' });
    expect(within(folha).getByRole('button', { name: 'Voltar ao app' })).toBeInTheDocument();
    expect(screen.queryByText('Boas-vindas ao Arretado!')).not.toBeInTheDocument();
  });

  it('"Voltar ao app", "Pular o passeio" e o "Concluir" do último passo fecham a folha e não gravam nada', async () => {
    const usuario = montar();
    esvaziar();
    const abrir = () => usuario.click(screen.getByRole('button', { name: 'Fazer o passeio' }));

    await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Voltar ao app' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Pular o passeio' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await abrir();
    for (let i = 0; i < 3; i += 1)
      await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await usuario.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Vamo começar?' })).not.toBeInTheDocument();
    expect(guardado()).toEqual({});

    // E a linha continua lá, pronta para a próxima vez.
    expect(screen.getByRole('button', { name: 'Fazer o passeio' })).toBeInTheDocument();
  });
});
