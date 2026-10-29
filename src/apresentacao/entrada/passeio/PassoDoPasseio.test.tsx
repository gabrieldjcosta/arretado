import { act, render, screen } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import type { Roteiro } from './estado';
import { PassoDoPasseio } from './PassoDoPasseio';
import { PASSOS } from './passos';

const primeira: Roteiro = { revisao: false, origem: 'boas' };

function montar(indice: number, roteiro: Roteiro = primeira) {
  const props = {
    roteiro,
    idTitulo: 'titulo',
    idProgresso: 'progresso',
    aoSeguir: vi.fn(),
    aoVoltar: vi.fn(),
    aoPular: vi.fn(),
  };
  const tela = render(<PassoDoPasseio indice={indice} {...props} />);
  const ir = (novo: number) => {
    tela.rerender(<PassoDoPasseio indice={novo} {...props} />);
  };
  const conteudo = () => tela.container.querySelector<HTMLElement>('.passo-conteudo');
  const titulo = () => screen.getByRole('heading', { level: 2 }).textContent;
  return { ...tela, props, ir, conteudo, titulo };
}

describe('um passo do Passeio (D-D10)', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no movimento normal o conteúdo sai em 160 ms para um lado e o seguinte entra do outro', () => {
    simularMovimento('normal');
    const { ir, conteudo, titulo } = montar(0);
    expect(conteudo()).toHaveAttribute('data-fase', 'parado');
    ir(1);
    expect(conteudo()).toHaveAttribute('data-fase', 'saindo');
    expect(conteudo()).toHaveAttribute('data-sentido', 'avanca');
    expect(titulo()).toBe('Hoje');
    act(() => {
      vi.advanceTimersByTime(159);
    });
    expect(titulo()).toBe('Hoje');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(titulo()).toBe('Trilha');
    expect(conteudo()).toHaveAttribute('data-fase', 'entrou');
    ir(0);
    expect(conteudo()).toHaveAttribute('data-sentido', 'volta');
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(titulo()).toBe('Hoje');
  });

  it('o texto de progresso, o rótulo do botão, os pontos e o traço sob a aba trocam junto com o conteúdo', () => {
    simularMovimento('normal');
    const { ir, container } = montar(2);
    ir(3);
    expect(screen.getByText('Passo 3 de 4')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(screen.getByText('Passo 4 de 4')).toBeInTheDocument();
    expect(container.querySelector<HTMLElement>('.passo-traco')?.style.transform).toBe(
      'translateX(300%)',
    );
    expect(container.querySelectorAll('.passo-pontos i[data-estado="feito"]')).toHaveLength(3);
  });

  it('dois pedidos seguidos antes dos 160 ms mostram só o último', () => {
    simularMovimento('normal');
    const { ir, titulo } = montar(0);
    ir(1);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    ir(2);
    act(() => {
      vi.advanceTimersByTime(159);
    });
    expect(titulo()).toBe('Hoje');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(titulo()).toBe('Fixar');
  });

  it('o Calmo também espera os 160 ms (o deslocamento é do CSS, que no Calmo só esmaece)', () => {
    simularMovimento('calmo');
    const { ir, conteudo, titulo } = montar(0);
    ir(1);
    expect(conteudo()).toHaveAttribute('data-fase', 'saindo');
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(titulo()).toBe('Trilha');
  });

  it('com movimento reduzido o passo troca na hora', () => {
    simularMovimento('reduzido');
    const { ir, conteudo, titulo } = montar(0);
    ir(1);
    expect(titulo()).toBe('Trilha');
    expect(conteudo()).toHaveAttribute('data-fase', 'parado');
  });

  it('cada passo novo põe o foco no título; o Zé olha para o cartão (parado no reduzido)', () => {
    simularMovimento('calmo');
    const { ir, titulo, container } = montar(0);
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    expect(container.querySelector<HTMLElement>('.z-olhos')?.style.transform).toBe(
      'translate(-3px,2px)',
    );
    ir(1);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(titulo()).toBe('Trilha');
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('cada passo novo volta ao topo: quem rolou para alcançar o "Seguir" não chega ao passo seguinte no meio dele', () => {
    simularMovimento('calmo');
    const { ir, container } = montar(0);
    const tela = container.querySelector<HTMLElement>('.chegada-tela');
    const corpo = container.querySelector<HTMLElement>('.chegada-corpo');
    if (tela === null || corpo === null)
      throw new Error('as duas áreas que rolam não foram achadas');
    tela.scrollTop = 400;
    corpo.scrollTop = 300;
    ir(1);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(tela.scrollTop).toBe(0);
    expect(corpo.scrollTop).toBe(0);
  });

  it('o Zé do reduzido não se mexe', () => {
    simularMovimento('reduzido');
    const { container } = montar(0);
    expect(container.querySelector<HTMLElement>('.z-olhos')?.style.transform).toBe('none');
  });

  it('o rótulo do "Voltar" depende de onde o passeio abriu; o do último passo, de ser refeito', () => {
    simularMovimento('reduzido');
    const dasBoasVindas = montar(0);
    expect(screen.getByRole('button', { name: 'Voltar às boas-vindas' })).toBeInTheDocument();
    dasBoasVindas.unmount();

    const daConta = montar(0, { revisao: true, origem: 'passo' });
    expect(screen.getByRole('button', { name: 'Voltar ao app' })).toBeInTheDocument();
    daConta.unmount();

    const meio = montar(1);
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    meio.unmount();

    const ultimo = montar(PASSOS.length - 1);
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    ultimo.unmount();

    montar(PASSOS.length - 1, { revisao: true, origem: 'boas' });
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();
  });

  it('os três botões chamam o que a Chegada pediu, na ordem do DOM: pular, seguir, voltar', () => {
    simularMovimento('reduzido');
    const { props } = montar(1);
    const botoes = screen.getAllByRole('button');
    expect(botoes.map((b) => b.textContent)).toEqual(['Pular o passeio', 'Seguir', 'Voltar']);
    botoes[0]?.click();
    botoes[1]?.click();
    botoes[2]?.click();
    expect(props.aoPular).toHaveBeenCalledTimes(1);
    expect(props.aoSeguir).toHaveBeenCalledTimes(1);
    expect(props.aoVoltar).toHaveBeenCalledTimes(1);
  });

  it('um índice fora dos quatro menus não desenha nada', () => {
    simularMovimento('reduzido');
    const { container } = montar(9);
    expect(container).toBeEmptyDOMElement();
  });
});
