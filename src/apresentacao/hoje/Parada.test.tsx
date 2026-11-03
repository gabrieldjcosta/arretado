import { render, screen } from '@testing-library/react';
import { Parada } from './Parada';

const parada = { rotulo: 'LEP, art. 112, § 2º', quando: 'salvo ontem, 22h10' };

describe('Hoje › Parada (P3)', () => {
  it('diz onde retomar e quando salvou, sem caneta (D-D12)', () => {
    const { container } = render(<Parada parada={parada} />);
    const linha = screen.getByText(/Retomar em/);
    expect(linha).toHaveTextContent('Retomar em LEP, art. 112, § 2º, salvo ontem, 22h10');
    expect(linha.querySelector('strong.parada-onde')).toHaveTextContent('LEP, art. 112, § 2º');
    expect(linha.querySelector('.parada-quando')).toHaveTextContent('salvo ontem, 22h10');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('sem leitura salva, não há nada para mostrar', () => {
    const { container } = render(<Parada />);
    expect(container).toBeEmptyDOMElement();
  });
});
