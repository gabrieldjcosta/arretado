import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AcaoAgora } from './AcaoAgora';
import { Caneta, CanetaDefs, CanetaDesenho } from './Caneta';
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

describe('Caneta (D-D7, P3)', () => {
  it('é decorativa e traz a pose na caixa da vista', () => {
    const { container } = render(
      <>
        <Caneta pose="encostada" />
        <Caneta pose="deitada" className="pouso" />
      </>,
    );
    const [encostada, deitada] = [...container.querySelectorAll('svg')];
    expect(encostada).toHaveAttribute('aria-hidden', 'true');
    expect(encostada).toHaveAttribute('data-pose', 'encostada');
    expect(encostada).toHaveAttribute('viewBox', '0 0 150 205');
    expect(deitada).toHaveAttribute('data-pose', 'deitada');
    expect(deitada).toHaveAttribute('viewBox', '0 0 190 106');
    expect(deitada).toHaveClass('caneta', 'pouso');
  });

  it('cada caneta leva o gradiente e os filtros com ids próprios', () => {
    const { container } = render(
      <>
        <Caneta pose="encostada" />
        <Caneta pose="deitada" />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    // Cada preenchimento e traço de gradiente aponta para um id que existe.
    const usos = [...container.querySelectorAll('[fill^="url(#"], [stroke^="url(#"]')];
    expect(usos.length).toBeGreaterThan(0);
    for (const el of usos) {
      const uso = [el.getAttribute('fill'), el.getAttribute('stroke')].find((v) =>
        v?.startsWith('url(#'),
      );
      const alvo = (uso ?? '').slice('url(#'.length, -1);
      expect(container.querySelector(`[id="${alvo}"]`)).not.toBeNull();
    }
  });
});

describe('CanetaDefs e CanetaDesenho (A caneta que desenha)', () => {
  it('desenham a mesma caneta por dentro de outro svg, com ids próprios', () => {
    const { container } = render(
      <svg>
        <CanetaDefs id="quadro" />
        <g data-pose="deitada">
          <CanetaDesenho id="quadro" />
        </g>
      </svg>,
    );
    expect(container.querySelector('#quadro-vidro')).not.toBeNull();
    expect(container.querySelector('#quadro-halo-dia')).not.toBeNull();
    expect(container.querySelector('#quadro-halo-noite')).not.toBeNull();
    expect(container.querySelector('path[fill="url(#quadro-vidro)"]')).not.toBeNull();
    expect(container.querySelector('circle[filter="url(#quadro-halo-noite)"]')).not.toBeNull();
    expect(container.querySelectorAll('.caneta-ponto')).toHaveLength(4);
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
