import { render, screen } from '@testing-library/react';
import { LimiteDeErro } from './LimiteDeErro';

function Quebra(): never {
  throw new Error('boom');
}

describe('LimiteDeErro', () => {
  it('mostra aviso em português em vez de tela em branco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Esta tela não abriu.');
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
  });

  it('tira a tela de carregamento do index.html, para o aviso não ficar por baixo dela', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.insertAdjacentHTML('afterbegin', '<div id="carregamento" role="status"></div>');
    const tela = document.getElementById('carregamento');
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    );
    expect(tela).toHaveAttribute('data-saindo');
    tela?.remove();
  });

  it('não interfere quando não há erro', () => {
    render(
      <LimiteDeErro>
        <p>ok</p>
      </LimiteDeErro>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});
