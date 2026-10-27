import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { BlocosDoHoje } from './BlocosDoHoje';

const Vazio = () => null;
const Bloco = ({ nome }: { nome: string }) => <p>{nome}</p>;

describe('BlocosDoHoje (S7)', () => {
  it('mostra os dois primeiros blocos que aparecem e guarda o resto em "Ver mais"', async () => {
    const usuario = userEvent.setup();
    render(
      <BlocosDoHoje>
        <Vazio />
        <Bloco nome="Em seguida" />
        <Vazio />
        <Bloco nome="A lei mudou" />
        <Bloco nome="Para lembrar" />
        <Bloco nome="Backup" />
      </BlocosDoHoje>,
    );

    expect(screen.getByText('Em seguida')).toBeVisible();
    expect(screen.getByText('A lei mudou')).toBeVisible();
    expect(screen.getByText('Para lembrar')).not.toBeVisible();
    expect(screen.getByText('Backup')).not.toBeVisible();

    const botao = screen.getByRole('button', { name: 'Ver mais' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(botao);
    expect(screen.getByText('Para lembrar')).toBeVisible();
    expect(screen.getByText('Backup')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await usuario.click(screen.getByRole('button', { name: 'Ver menos' }));
    expect(screen.getByText('Backup')).not.toBeVisible();
  });

  it('com até dois blocos não há botão', () => {
    render(
      <BlocosDoHoje>
        <Bloco nome="Em seguida" />
        <Vazio />
        <Bloco nome="Backup" />
      </BlocosDoHoje>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Backup')).toBeVisible();
  });

  it('um bloco que aparece depois entra na conta', async () => {
    function Tela() {
      const [chegou, setChegou] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setChegou(true);
            }}
          >
            chegou
          </button>
          <BlocosDoHoje>
            <Bloco nome="A" />
            <Bloco nome="B" />
            {chegou ? <Bloco nome="C" /> : <Vazio />}
          </BlocosDoHoje>
        </>
      );
    }
    render(<Tela />);
    expect(screen.queryByRole('button', { name: /^Ver / })).not.toBeInTheDocument();
    await act(async () => {
      screen.getByRole('button', { name: 'chegou' }).click();
      await Promise.resolve();
    });
    expect(await screen.findByRole('button', { name: 'Ver mais' })).toBeInTheDocument();
    expect(screen.getByText('C')).not.toBeVisible();
  });
});
