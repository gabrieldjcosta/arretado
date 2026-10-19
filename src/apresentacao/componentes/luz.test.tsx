import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AcaoAgora } from './AcaoAgora';
import { Caneta } from './Caneta';
import { PontoDeLuz } from './PontoDeLuz';
import { TracoDoCachorro } from './TracoDoCachorro';

describe('PontoDeLuz (D-D7, P3)', () => {
  it('aceso: círculo cheio com o contorno e o núcleo', () => {
    const { container } = render(<PontoDeLuz estado="feito" />);
    const ponto = container.querySelector('svg');
    expect(ponto).toHaveAttribute('data-estado', 'feito');
    expect(ponto).toHaveAttribute('aria-hidden', 'true');
    expect(ponto?.querySelector('circle.ponto-luz')).not.toBeNull();
    expect(ponto?.querySelector('circle.ponto-anel')).not.toHaveClass('apagado');
    expect(ponto?.querySelector('.ponto-nucleo')).not.toBeNull();
  });

  it('pela metade: só um lado aceso, com o contorno inteiro', () => {
    const { container } = render(<PontoDeLuz estado="atual" />);
    expect(container.querySelector('path.ponto-luz')).not.toBeNull();
    expect(container.querySelector('circle.ponto-luz')).toBeNull();
    expect(container.querySelector('.ponto-anel')).not.toHaveClass('apagado');
    expect(container.querySelector('.ponto-nucleo')).not.toBeNull();
  });

  it('apagado: um anel só, sem luz nem núcleo', () => {
    const { container } = render(<PontoDeLuz estado="falta" />);
    expect(container.querySelector('.ponto-luz')).toBeNull();
    expect(container.querySelector('.ponto-nucleo')).toBeNull();
    expect(container.querySelector('.ponto-anel')).toHaveClass('apagado');
  });

  it('só se anima quando pedido', () => {
    const { container, rerender } = render(<PontoDeLuz estado="feito" />);
    expect(container.querySelector('svg')).not.toHaveClass('acende');
    rerender(<PontoDeLuz estado="feito" acende />);
    expect(container.querySelector('svg')).toHaveClass('acende');
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

describe('TracoDoCachorro (D-D7, P3)', () => {
  it('um traço só, com o olho e o focinho como pontos', () => {
    const { container } = render(<TracoDoCachorro />);
    const cachorro = container.querySelector('svg');
    expect(cachorro).toHaveAttribute('aria-hidden', 'true');
    expect(cachorro).not.toHaveClass('desenha');
    expect(container.querySelectorAll('path.traco-linha')).toHaveLength(1);
    expect(container.querySelector('path.traco-linha')).toHaveAttribute('pathLength', '100');
    expect(container.querySelectorAll('circle.traco-ponto')).toHaveLength(2);
  });

  it('com `desenha`, se desenha; a classe de fora é mantida', () => {
    const { container } = render(<TracoDoCachorro desenha className="fora" />);
    expect(container.querySelector('svg')).toHaveClass('traco-do-cachorro', 'desenha', 'fora');
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
