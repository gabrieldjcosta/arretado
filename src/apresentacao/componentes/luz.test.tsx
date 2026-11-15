import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AcaoAgora } from './AcaoAgora';
import { PontoDeLuz } from './PontoDeLuz';

describe('PontoDeLuz (D-D7, P3; por mundo na D-D9, Q3)', () => {
  it('é decorativo: um quadrado sem texto, escondido do leitor de tela', () => {
    const { container } = render(<PontoDeLuz estado="feito" />);
    const ponto = container.firstElementChild;
    expect(ponto).toHaveClass('ponto-de-luz');
    expect(ponto).toHaveAttribute('aria-hidden', 'true');
    expect(ponto).toBeEmptyDOMElement();
  });

  it.each(['feito', 'atual', 'falta'] as const)(
    'leva o estado %s no atributo que o CSS lê para escolher a forma do mundo',
    (estado) => {
      const { container } = render(<PontoDeLuz estado={estado} />);
      expect(container.firstElementChild).toHaveAttribute('data-estado', estado);
    },
  );

  it('só se anima quando pedido', () => {
    const { container, rerender } = render(<PontoDeLuz estado="feito" />);
    expect(container.firstElementChild).not.toHaveClass('acende');
    rerender(<PontoDeLuz estado="feito" acende />);
    expect(container.firstElementChild).toHaveClass('acende');
  });
});

describe('AcaoAgora › Escolher outra coisa (P3)', () => {
  it('o botão-texto fica dentro da folha, ao lado do botão de vidro', async () => {
    const aoEscolherOutra = vi.fn();
    render(
      <MemoryRouter>
        <AcaoAgora titulo="X" rotuloBotao="Começar" para="/x" aoEscolherOutra={aoEscolherOutra} />
      </MemoryRouter>,
    );
    const folha = screen.getByRole('region', { name: 'Agora' });
    const outra = screen.getByRole('button', { name: 'Escolher outra coisa' });
    expect(folha).toContainElement(outra);
    await userEvent.setup().click(outra);
    expect(aoEscolherOutra).toHaveBeenCalledOnce();
  });

  it('sem a saída, o botão não aparece (Biblioteca, Fixar)', () => {
    render(
      <MemoryRouter>
        <AcaoAgora titulo="X" rotuloBotao="Ir" para="/x" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Escolher outra coisa' })).toBeNull();
  });
});
