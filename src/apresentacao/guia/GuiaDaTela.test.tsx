import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { GuiaDaTela } from './GuiaDaTela';
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

  it('aparece na primeira abertura do Hoje e "Entendi" o fecha', async () => {
    const usuario = await abrir('#/');
    expect(
      await screen.findByRole('heading', { name: 'O que cada opção faz' }),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('heading', { name: 'O que cada opção faz' })).toBeNull();
  });

  it('não volta depois de visto e reabre pelo menu Ajuda', async () => {
    localStorage.setItem('arretado.guia.hoje', '2');
    const usuario = await abrir('#/');
    await screen.findByRole('heading', { name: 'Hoje' });
    expect(screen.queryByRole('heading', { name: 'O que cada opção faz' })).toBeNull();
    await usuario.click(screen.getByRole('button', { name: 'Ajuda' }));
    await usuario.click(screen.getByRole('button', { name: 'O que cada opção faz' }));
    expect(
      await screen.findByRole('heading', { name: 'O que cada opção faz' }),
    ).toBeInTheDocument();
  });

  it('sair da tela sem o cartão ter sido visto não gasta o guia', async () => {
    const usuario = await abrir('#/');
    await screen.findByRole('heading', { name: 'O que cada opção faz' });
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

describe('Guia › visto pela janela', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.querySelectorAll('dialog').forEach((d) => {
      d.remove();
    });
    localStorage.clear();
  });

  it('com um diálogo aberto por cima, só vale como visto depois que ele fecha', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private fn: (e: { isIntersecting: boolean }[]) => void) {}
        observe() {
          this.fn([{ isIntersecting: true }]);
        }
        disconnect() {}
      },
    );
    const folha = document.createElement('dialog');
    folha.setAttribute('open', '');
    document.body.append(folha);
    render(<GuiaDaTela tela="recall" />);
    vi.advanceTimersByTime(3500);
    expect(localStorage.getItem('arretado.guia.recall')).toBeNull();
    folha.remove();
    vi.advanceTimersByTime(1500);
    expect(localStorage.getItem('arretado.guia.recall')).toBe('2');
  });
});
