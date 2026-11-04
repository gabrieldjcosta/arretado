import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NumeroQueRola } from './NumeroQueRola';

describe('Destino › o número que rola', () => {
  it('dá o número em texto ao leitor de tela e esconde os dígitos desenhados', () => {
    const { container } = render(
      <p>
        <NumeroQueRola valor={42} chave="teste-a" />
        <small>%</small>
      </p>,
    );
    expect(container.querySelector('.visualmente-oculto')).toHaveTextContent('42');
    expect(container).toHaveTextContent('42%');
    expect(container.querySelector('.rola')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.rola-digito')).toHaveLength(2);
  });

  it('mantém o texto certo quando o número muda e ganha um dígito', () => {
    const { container, rerender } = render(<NumeroQueRola valor={9} chave="teste-b" />);
    rerender(<NumeroQueRola valor={10} chave="teste-b" />);
    expect(container.querySelector('.visualmente-oculto')).toHaveTextContent('10');
    expect(container.querySelectorAll('.rola-digito')).toHaveLength(2);
  });
});
