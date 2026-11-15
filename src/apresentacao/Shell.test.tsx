import { render, screen } from '@testing-library/react';
import { repositorioDeTeste } from '../testes/repositorio';
import { App } from './App';

// A casca que demora a baixar: o teste a segura e a solta.
const casca = vi.hoisted(() => {
  let soltar: () => void = () => undefined;
  const chegou = new Promise<void>((resolver) => {
    soltar = resolver;
  });
  return {
    chegou,
    soltar: () => {
      soltar();
    },
  };
});

vi.mock('./fio/CascaDoFio', async () => {
  await casca.chegou;
  return { CascaDoFio: () => <p>a casca</p> };
});

describe('Shell: a casca baixa à parte', () => {
  afterEach(() => {
    document.getElementById('carregamento')?.remove();
  });

  it('enquanto ela não chega a tela de carregamento do index.html fica, também depois do prazo da rede de segurança', async () => {
    document.body.insertAdjacentHTML('afterbegin', '<div id="carregamento" role="status"></div>');
    const tela = document.getElementById('carregamento');
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/';
    render(<App abrir={() => Promise.resolve(repo)} />);
    // A rede de segurança do ProvedorRepositorio dispara 0,6 s depois de o banco abrir.
    await new Promise((resolver) => setTimeout(resolver, 900));
    expect(screen.queryByText('a casca')).toBeNull();
    expect(tela).toBeInTheDocument();
    expect(tela).not.toHaveAttribute('data-saindo');

    casca.soltar();
    expect(await screen.findByText('a casca')).toBeInTheDocument();
  });
});
