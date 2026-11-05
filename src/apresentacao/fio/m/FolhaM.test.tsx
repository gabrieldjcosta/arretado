import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { FolhaM } from './FolhaM';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** O jsdom não tem o PointerEvent com `clientY` em todo lugar: um MouseEvent com o nome do evento basta ao React. */
function ponteiro(alvo: Element, tipo: 'pointerdown' | 'pointermove' | 'pointerup', y: number) {
  fireEvent(alvo, new MouseEvent(tipo, { clientY: y, bubbles: true }));
}

/** O quadro (`#conteudo`) com um botão que abre a folha, o aviso (região viva) e a folha. */
function Exemplo({ aoFechar, comFuncao = false }: { aoFechar?: () => void; comFuncao?: boolean }) {
  const [aberta, setAberta] = useState(false);
  const fecharDoPai = () => {
    setAberta(false);
    aoFechar?.();
  };
  return (
    <main id="conteudo">
      <button
        type="button"
        onClick={() => {
          setAberta(true);
        }}
      >
        Abrir
      </button>
      <nav aria-label="Lugares">
        <button type="button">Agora</button>
      </nav>
      <div role="status">aviso</div>
      <FolhaM aberta={aberta} aoFechar={fecharDoPai} idDoTitulo="t-folha" classeDoCorpo="m-teste">
        {comFuncao ? (
          (fechar) => (
            <>
              <h2 id="t-folha">Título</h2>
              <button
                type="button"
                className="m-acao"
                onClick={() => {
                  void fechar().then(() => {
                    document.body.dataset.depois = 'sim';
                  });
                }}
              >
                Fazer
              </button>
            </>
          )
        ) : (
          <>
            <h2 id="t-folha">Título</h2>
            <p>Corpo da folha</p>
            <button type="button" className="m-acao">
              Fazer
            </button>
            <button type="button" data-fechar>
              Agora não
            </button>
          </>
        )}
      </FolhaM>
    </main>
  );
}

/** Abre a folha pelo botão e devolve o véu (o `dialog`) e o corpo. */
async function abrir() {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
  const veu = await screen.findByRole('dialog', { name: 'Título' });
  const corpo = veu.querySelector<HTMLElement>('.m-corpo');
  if (!corpo) throw new Error('a folha não tem corpo');
  return { veu, corpo };
}

describe('a folha que sobe (abrirFolha e fecharFolha do mockup)', () => {
  it('fechada não existe; aberta é um diálogo modal, nomeado pelo título, no quadro, com a alça e a classe do corpo', async () => {
    render(<Exemplo />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const { veu, corpo } = await abrir();
    expect(veu).toHaveAttribute('aria-modal', 'true');
    expect(veu).toHaveClass('m-folha');
    expect(veu.parentElement).toHaveAttribute('id', 'conteudo');
    expect(corpo).toHaveClass('m-corpo', 'm-teste');
    expect(corpo.querySelector('button.m-alca')).toHaveAccessibleName('Fechar');
  });

  it('fecha por Escape, pela alça, pelo véu e por um botão com data-fechar; tocar no corpo não fecha', async () => {
    const aoFechar = vi.fn();
    render(<Exemplo aoFechar={aoFechar} />);
    const { corpo } = await abrir();

    fireEvent.click(corpo);
    fireEvent.click(screen.getByText('Corpo da folha'));
    expect(aoFechar).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    await vi.waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await vi.waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(2);
    });

    const { veu } = await abrir();
    fireEvent.click(veu);
    await vi.waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(3);
    });

    const { corpo: ultimo } = await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    await vi.waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(4);
    });
    expect(ultimo.isConnected).toBe(false);
  });

  it('o conteúdo pode pedir para fechar: a folha desce e só depois chama quem a abriu, uma vez', async () => {
    const aoFechar = vi.fn();
    delete document.body.dataset.depois;
    render(<Exemplo aoFechar={aoFechar} comFuncao />);
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Fazer' }));
    await vi.waitFor(() => {
      expect(document.body.dataset.depois).toBe('sim');
    });
    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    delete document.body.dataset.depois;
  });

  it('o foco vai ao botão de ação um instante depois de abrir e volta a quem abriu quando ela se vai', async () => {
    vi.useFakeTimers();
    render(<Exemplo />);
    const abridor = screen.getByRole('button', { name: 'Abrir' });
    abridor.focus();
    fireEvent.click(abridor);
    expect(screen.getByRole('dialog', { name: 'Título' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole('button', { name: 'Fazer' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abridor).toHaveFocus();
  });

  it('o foco só volta a quem abriu depois de o quadro deixar de ser inerte (dentro de um `inert` o navegador não dá foco)', async () => {
    vi.useFakeTimers();
    render(<Exemplo />);
    const abridor = screen.getByRole('button', { name: 'Abrir' });
    // O jsdom não implementa o `inert`; o navegador não foca o que está dentro de um.
    const focar = abridor.focus.bind(abridor);
    vi.spyOn(abridor, 'focus').mockImplementation((opcoes) => {
      if (!abridor.closest('[inert]')) focar(opcoes);
    });
    abridor.focus();
    fireEvent.click(abridor);
    expect(abridor).toHaveAttribute('inert');
    act(() => {
      vi.advanceTimersByTime(60);
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abridor).not.toHaveAttribute('inert');
    expect(abridor).toHaveFocus();
  });

  it('enquanto aberta, o resto do quadro fica inerte (o aviso, que é região viva, não); ao fechar, volta', async () => {
    render(<Exemplo />);
    const abridor = screen.getByRole('button', { name: 'Abrir' });
    const nav = screen.getByRole('navigation', { name: 'Lugares' });
    const aviso = screen.getByRole('status');
    await abrir();
    expect(abridor).toHaveAttribute('inert');
    expect(nav).toHaveAttribute('inert');
    expect(aviso).not.toHaveAttribute('inert');
    expect(screen.getByRole('dialog')).not.toHaveAttribute('inert');
    fireEvent.keyDown(document, { key: 'Escape' });
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(abridor).not.toHaveAttribute('inert');
    expect(nav).not.toHaveAttribute('inert');
  });

  it('o Tab dá a volta dentro da folha, para a frente e para trás', async () => {
    render(<Exemplo />);
    await abrir();
    const alca = screen.getByRole('button', { name: 'Fechar' });
    const ultimo = screen.getByRole('button', { name: 'Agora não' });
    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(alca).toHaveFocus();
    fireEvent.keyDown(alca, { key: 'Tab', shiftKey: true });
    expect(ultimo).toHaveFocus();
  });

  it('puxar o corpo para baixo mais de 90 px fecha; menos que isso, a mola o devolve', async () => {
    const aoFechar = vi.fn();
    render(<Exemplo aoFechar={aoFechar} />);
    const { corpo } = await abrir();

    ponteiro(corpo, 'pointerdown', 100);
    ponteiro(corpo, 'pointermove', 140);
    expect(corpo.style.transform).toBe('translateY(40px)');
    ponteiro(corpo, 'pointerup', 140);
    await vi.waitFor(() => {
      expect(corpo.style.transform).toBe('');
    });
    expect(aoFechar).not.toHaveBeenCalled();

    ponteiro(corpo, 'pointerdown', 100);
    ponteiro(corpo, 'pointermove', 220);
    ponteiro(corpo, 'pointerup', 220);
    await vi.waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
  });

  it('a puxada não começa em botão nem com o corpo rolado', async () => {
    render(<Exemplo />);
    const { corpo } = await abrir();
    const parado = corpo.style.transform;
    ponteiro(screen.getByRole('button', { name: 'Fazer' }), 'pointerdown', 100);
    ponteiro(corpo, 'pointermove', 220);
    expect(corpo.style.transform).toBe(parado);
    corpo.scrollTop = 30;
    ponteiro(corpo, 'pointerdown', 100);
    ponteiro(corpo, 'pointermove', 220);
    expect(corpo.style.transform).toBe(parado);
  });
});
