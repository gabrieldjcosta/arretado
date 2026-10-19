import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AcaoAgora } from './AcaoAgora';
import { Caneta, CanetaDefs, CanetaDesenho } from './Caneta';
import { PontoDeLuz } from './PontoDeLuz';

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

describe('Caneta (D-D7, P3; de vidro na D-D9, Q4)', () => {
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
    expect(encostada).toHaveAttribute('viewBox', '0 0 170 228');
    expect(deitada).toHaveAttribute('data-pose', 'deitada');
    expect(deitada).toHaveAttribute('viewBox', '0 0 246 140');
    expect(deitada).toHaveClass('caneta', 'pouso');
  });

  it('cada caneta leva a tinta, os filtros e a máscara com ids próprios', () => {
    const { container } = render(
      <>
        <Caneta pose="encostada" />
        <Caneta pose="deitada" />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    // A tinta, o halo, a sombra e o aro: quatro por caneta.
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
    // Cada preenchimento, traço, filtro e máscara aponta para um id que existe.
    const usos = [
      ...container.querySelectorAll(
        '[fill^="url(#"], [stroke^="url(#"], [filter^="url(#"], [mask^="url(#"]',
      ),
    ];
    expect(usos.length).toBeGreaterThan(0);
    for (const el of usos) {
      const uso = (['fill', 'stroke', 'filter', 'mask'] as const)
        .map((a) => el.getAttribute(a))
        .find((v) => v?.startsWith('url(#'));
      const alvo = (uso ?? '').slice('url(#'.length, -1);
      expect(container.querySelector(`[id="${alvo}"]`)).not.toBeNull();
    }
  });

  it('é toda de vidro: ponta incluída, com o furo de tinta à vista, a esfera e três faíscas', () => {
    const { container } = render(<Caneta pose="encostada" />);
    expect(container.querySelectorAll('.caneta-vidro')).toHaveLength(1);
    expect(container.querySelector('.caneta-aro')).not.toBeNull();
    expect(container.querySelector('path[stroke^="url(#"]')).not.toBeNull();
    expect(container.querySelector('path[fill^="url(#"]')).not.toBeNull();
    expect(container.querySelectorAll('.caneta-esfera')).toHaveLength(1);
    expect(container.querySelectorAll('.caneta-faisca')).toHaveLength(3);
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
    for (const parte of ['tinta', 'halo', 'sombra', 'aro']) {
      expect(container.querySelector(`#quadro-${parte}`)).not.toBeNull();
    }
    expect(container.querySelector('path[fill="url(#quadro-tinta)"]')).not.toBeNull();
    expect(container.querySelector('circle[filter="url(#quadro-halo)"]')).not.toBeNull();
    expect(container.querySelector('rect[mask="url(#quadro-aro)"]')).not.toBeNull();
    expect(container.querySelectorAll('.caneta-faisca')).toHaveLength(3);
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
