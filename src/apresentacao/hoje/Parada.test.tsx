import { render, screen } from '@testing-library/react';
import { Parada } from './Parada';

const parada = { rotulo: 'LEP, art. 112, § 2º', quando: 'ontem, 22h10' };

describe('Hoje › Parada (P3)', () => {
  it('diz onde e quando parou, com a caneta de pé à direita', () => {
    const { container } = render(<Parada parada={parada} />);
    const linha = screen.getByText(/Você parou em/);
    expect(linha).toHaveTextContent('Você parou em LEP, art. 112, § 2ºontem, 22h10');
    expect(linha.querySelector('strong')).toHaveTextContent('LEP, art. 112, § 2º');
    expect(container.querySelector('.parada')).toHaveClass('com-caneta');
    expect(container.querySelector('svg.caneta')).toHaveAttribute('data-pose', 'encostada');
  });

  it('sem leitura salva, a caneta aparece sozinha: ela é da folha, não do texto', () => {
    const { container } = render(<Parada />);
    expect(screen.queryByText(/Você parou em/)).toBeNull();
    expect(container.querySelectorAll('svg.caneta')).toHaveLength(1);
  });

  it('com o Dia fechado, a caneta sai (vai para o Resumo) e fica só o texto', () => {
    const { container } = render(<Parada parada={parada} comCaneta={false} />);
    expect(screen.getByText(/Você parou em/)).toBeInTheDocument();
    expect(container.querySelector('svg.caneta')).toBeNull();
    expect(container.querySelector('.parada')).not.toHaveClass('com-caneta');
  });

  it('sem leitura e sem caneta, não há nada para mostrar', () => {
    const { container } = render(<Parada comCaneta={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
