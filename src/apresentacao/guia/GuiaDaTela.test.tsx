import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { telaDoGuia } from './memoria';

async function abrir(rota: string) {
  const { repo } = await repositorioDeTeste();
  window.location.hash = rota;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await screen.findByRole('navigation', { name: 'Áreas' });
  return usuario;
}

describe('Guia da primeira abertura', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fica recolhido no topo, marcado como novo; abrir mostra uma dica por cartão', async () => {
    const usuario = await abrir('#/');
    const abrirDicas = await screen.findByRole('button', { name: /O que cada opção faz/ });
    expect(abrirDicas).toHaveAttribute('aria-expanded', 'false');
    expect(abrirDicas).toHaveTextContent('Novo');
    await usuario.click(abrirDicas);
    expect(abrirDicas).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: /Dicas/ })).toBeInTheDocument();
    const cartao = within(screen.getByRole('region', { name: 'O que cada opção faz' }));
    expect(cartao.getByRole('status')).toHaveTextContent(/^1 de \d/);
    await usuario.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(cartao.getByRole('status')).toHaveTextContent(/^2 de \d/);
    expect(localStorage.getItem('arretado.guia.hoje')).not.toBeNull();
  });

  it('depois de aberto some a marca "Novo", mas o cartão continua para reler', async () => {
    localStorage.setItem('arretado.guia.hoje', '5');
    const usuario = await abrir('#/');
    const abrirDicas = await screen.findByRole('button', { name: /O que cada opção faz/ });
    expect(abrirDicas).not.toHaveTextContent('Novo');
    await usuario.click(screen.getByRole('button', { name: 'Ajuda' }));
    await usuario.click(screen.getByRole('button', { name: 'O que cada opção faz' }));
    expect(
      await screen.findByRole('button', { name: /O que cada opção faz/, expanded: true }),
    ).toBeInTheDocument();
  });

  it('sair da tela sem abrir o cartão não gasta o "Novo"', async () => {
    const usuario = await abrir('#/');
    await screen.findByRole('button', { name: /O que cada opção faz/ });
    await usuario.click(screen.getByRole('link', { name: /Biblioteca/ }));
    await screen.findByRole('heading', { name: 'Biblioteca' });
    expect(localStorage.getItem('arretado.guia.hoje')).toBeNull();
  });

  it('cada área tem o seu guia; telas de trabalho não têm', () => {
    expect(telaDoGuia('/')).toBe('hoje');
    expect(telaDoGuia('/plano')).toBe('plano');
    expect(telaDoGuia('/recall/frases')).toBe('recall');
    expect(telaDoGuia('/biblioteca')).toBe('biblioteca');
    expect(telaDoGuia('/biblioteca/normas/x')).toBeUndefined();
    expect(telaDoGuia('/recall/revisar')).toBeUndefined();
  });
});
