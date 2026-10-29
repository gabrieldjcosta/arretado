import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { simularMovimento } from '../../../testes/movimento';
import { escolhaRecente, marcarEscolha } from './escolha';
import { tracar } from './tracar';
import { TracoDeSelecao } from './TracoDeSelecao';

describe('a intenção de escolher', () => {
  it('conta só por um instante, e cada item tem a sua', () => {
    marcarEscolha('intencao:a', 1000);
    expect(escolhaRecente('intencao:a', 1000)).toBe(true);
    expect(escolhaRecente('intencao:a', 2200)).toBe(true);
    expect(escolhaRecente('intencao:a', 2201)).toBe(false);
    expect(escolhaRecente('intencao:b', 1000)).toBe(false);
  });

  it('não é consumida: o item remontado e o novo a veem', () => {
    marcarEscolha('intencao:c', 0);
    expect(escolhaRecente('intencao:c', 10)).toBe(true);
    expect(escolhaRecente('intencao:c', 20)).toBe(true);
  });
});

/** O jsdom não tem layout nem animações: o item ganha tamanho e o elemento ganha `animate`. */
function prepararAmbiente() {
  const tamanhos = ['offsetWidth', 'offsetHeight'] as const;
  const originais = tamanhos.map((nome) =>
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, nome),
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 80,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 44,
  });
  const animacoes: {
    keyframes: unknown;
    opcoes: unknown;
    terminar: () => void;
    cancel: ReturnType<typeof vi.fn>;
  }[] = [];
  Object.assign(window.SVGElement.prototype, {
    getTotalLength: () => 300,
    getPointAtLength: (comprimento: number) => ({ x: comprimento, y: 3 }),
    animate(keyframes: unknown, opcoes: unknown) {
      let aoTerminar: () => void = () => undefined;
      const cancel = vi.fn();
      animacoes.push({
        keyframes,
        opcoes,
        cancel,
        terminar: () => {
          aoTerminar();
        },
      });
      return {
        cancel,
        addEventListener: (_tipo: string, ouvinte: () => void) => {
          aoTerminar = ouvinte;
        },
      };
    },
  });
  return {
    animacoes,
    desfazer: () => {
      tamanhos.forEach((nome, i) => {
        const original = originais[i];
        if (original) Object.defineProperty(HTMLElement.prototype, nome, original);
        else Reflect.deleteProperty(HTMLElement.prototype, nome);
      });
      for (const nome of ['getTotalLength', 'getPointAtLength', 'animate']) {
        Reflect.deleteProperty(window.SVGElement.prototype, nome);
      }
    },
  };
}

function itemComTraco() {
  const item = document.createElement('button');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  item.append(svg);
  document.body.append(item);
  return { item, svg };
}

describe('tracar (o traço de seleção)', () => {
  let ambiente: ReturnType<typeof prepararAmbiente>;

  beforeEach(() => {
    ambiente = prepararAmbiente();
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
    ambiente.desfazer();
    document.body.replaceChildren();
  });

  it('com movimento reduzido não desenha nada', () => {
    const { svg } = itemComTraco();
    tracar(svg, 'reduzido')();
    expect(svg.childNodes).toHaveLength(0);
    expect(svg.hasAttribute('data-ativo')).toBe(false);
    expect(ambiente.animacoes).toHaveLength(0);
  });

  it('item sem tamanho (escondido) não desenha', () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 0,
    });
    const { svg } = itemComTraco();
    tracar(svg, 'normal');
    expect(svg.childNodes).toHaveLength(0);
  });

  it('Calmo: o contorno inteiro só aparece e esmaece, sem andar', () => {
    const { svg } = itemComTraco();
    tracar(svg, 'calmo');
    expect(svg).toHaveAttribute('data-ativo');
    expect(svg).toHaveAttribute('width', '86');
    expect(svg).toHaveAttribute('height', '50');
    expect(svg.querySelectorAll('rect')).toHaveLength(1);
    expect(svg.querySelectorAll('circle')).toHaveLength(0);
    // Calmo não tem néon (D-D10): nem o grupo gêmeo nem o filtro.
    expect(svg.querySelector('.traco-neon')).toBeNull();
    expect(svg.querySelector('filter')).toBeNull();
    expect(ambiente.animacoes).toHaveLength(1);
    expect(ambiente.animacoes[0]?.opcoes).toMatchObject({ duration: 380 });

    ambiente.animacoes[0]?.terminar();
    expect(svg.childNodes).toHaveLength(0);
    expect(svg.hasAttribute('data-ativo')).toBe(false);
  });

  it('item com borda: o <svg> sobe a espessura dela para o fio rodear a borda toda', () => {
    const sem = itemComTraco();
    tracar(sem.svg, 'calmo');
    expect(sem.svg.style.left).toBe('-3px');
    expect(sem.svg.style.top).toBe('-3px');

    const com = itemComTraco();
    Object.defineProperty(com.item, 'clientLeft', { value: 2 });
    Object.defineProperty(com.item, 'clientTop', { value: 2 });
    tracar(com.svg, 'calmo');
    expect(com.svg.style.left).toBe('-5px');
    expect(com.svg.style.top).toBe('-5px');
  });

  it('Normal: o fio se desenha em 240 ms com a ponta à frente, espera e some', async () => {
    const { svg } = itemComTraco();
    tracar(svg, 'normal');
    const fio = svg.querySelector<SVGRectElement>('rect:not(.traco-neon)');
    const ponta = svg.querySelector('circle');
    expect(fio?.style.strokeDasharray).toBe('300');
    expect(fio?.style.strokeDashoffset).toBe('300');
    expect(ponta).not.toBeNull();

    await vi.advanceTimersByTimeAsync(100);
    const andado = Number(fio?.style.strokeDashoffset);
    expect(andado).toBeLessThan(300);
    expect(andado).toBeGreaterThan(0);
    expect(Number(ponta?.getAttribute('cx'))).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(200);
    // O fio fechou, a ponta saiu e o conjunto começa a sumir: 260 ms, depois de esperar 120.
    expect(fio?.style.strokeDashoffset).toBe('0');
    expect(svg.querySelector('circle')).toBeNull();
    expect(ambiente.animacoes).toHaveLength(1);
    expect(ambiente.animacoes[0]?.opcoes).toMatchObject({
      duration: 260,
      delay: 120,
      fill: 'forwards',
    });

    ambiente.animacoes[0]?.terminar();
    expect(svg.childNodes).toHaveLength(0);
    expect(svg.hasAttribute('data-ativo')).toBe(false);
  });

  it('Normal: o néon é o mesmo contorno, mais largo, sob o fio, e anda com ele (D-D10)', async () => {
    const { svg } = itemComTraco();
    tracar(svg, 'normal');
    const [neon, fio] = svg.querySelectorAll<SVGRectElement>('rect');
    expect(neon).toHaveClass('traco-neon');
    expect(fio).not.toHaveClass('traco-neon');
    // Mesma geometria do fio; vem antes dele no documento, então é pintado por baixo.
    for (const atributo of ['x', 'y', 'width', 'height', 'rx', 'ry']) {
      expect(neon?.getAttribute(atributo)).toBe(fio?.getAttribute(atributo));
    }
    expect(neon?.style.strokeDasharray).toBe('300');
    expect(neon?.style.strokeDashoffset).toBe('300');

    await vi.advanceTimersByTimeAsync(100);
    expect(neon?.style.strokeDashoffset).toBe(fio?.style.strokeDashoffset);
    expect(Number(neon?.style.strokeDashoffset)).toBeLessThan(300);

    await vi.advanceTimersByTimeAsync(200);
    expect(neon?.style.strokeDashoffset).toBe('0');
    // O néon some com o <svg> todo (260 ms), que é o que o fio também faz: nada de animação própria.
    expect(ambiente.animacoes).toHaveLength(1);
  });

  it('o filtro do néon tem região fixa em volta do item e desfoque de 2,4', () => {
    const { svg } = itemComTraco();
    tracar(svg, 'normal');
    const neon = svg.querySelector('.traco-neon');
    const filtro = svg.querySelector('defs > filter');
    expect(filtro).not.toBeNull();
    expect(neon?.getAttribute('filter')).toBe(`url(#${filtro?.id ?? ''})`);
    // Região em unidades do <svg> (item de 80 × 44, mais 3 de margem de cada lado, mais 12 de folga):
    // a caixa de um contorno fino é a do item e cortaria o brilho.
    expect(filtro).toHaveAttribute('filterUnits', 'userSpaceOnUse');
    expect(filtro).toHaveAttribute('x', '-12');
    expect(filtro).toHaveAttribute('y', '-12');
    expect(filtro).toHaveAttribute('width', '110');
    expect(filtro).toHaveAttribute('height', '74');
    expect(filtro?.querySelector('feGaussianBlur')).toHaveAttribute('stdDeviation', '2.4');
  });

  it('dois traços ao mesmo tempo não repartem o id do filtro', () => {
    const a = itemComTraco();
    const b = itemComTraco();
    tracar(a.svg, 'normal');
    tracar(b.svg, 'normal');
    const idA = a.svg.querySelector('filter')?.id;
    const idB = b.svg.querySelector('filter')?.id;
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });

  it('o néon e o filtro saem junto com o traço', async () => {
    const { svg } = itemComTraco();
    const cancelar = tracar(svg, 'normal');
    expect(svg.querySelector('.traco-neon')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(50);
    cancelar();
    expect(svg.querySelector('.traco-neon')).toBeNull();
    expect(svg.querySelector('filter')).toBeNull();
    expect(svg.childNodes).toHaveLength(0);
  });

  it('quem chama pode cancelar no meio, e o <svg> volta a ficar vazio', async () => {
    const { svg } = itemComTraco();
    const cancelar = tracar(svg, 'normal');
    await vi.advanceTimersByTimeAsync(50);
    cancelar();
    expect(svg.childNodes).toHaveLength(0);
    expect(svg.hasAttribute('data-ativo')).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(ambiente.animacoes).toHaveLength(0);
  });

  it('a página que recarrega no meio do traço (documento inativo) o encerra sem lançar', async () => {
    const { svg } = itemComTraco();
    tracar(svg, 'normal');
    await vi.advanceTimersByTimeAsync(50);
    Object.assign(window.SVGElement.prototype, {
      getPointAtLength: () => {
        throw new DOMException('The element is in an inactive document.', 'InvalidStateError');
      },
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(svg.childNodes).toHaveLength(0);
    expect(svg.hasAttribute('data-ativo')).toBe(false);
    expect(ambiente.animacoes).toHaveLength(0);
  });

  it('um erro que não é de documento inativo continua sendo erro', async () => {
    const { svg } = itemComTraco();
    tracar(svg, 'normal');
    Object.assign(window.SVGElement.prototype, {
      getPointAtLength: () => {
        throw new TypeError('geometria quebrada');
      },
    });
    await expect(vi.advanceTimersByTimeAsync(1000)).rejects.toThrow('geometria quebrada');
  });

  it.each(['getTotalLength', 'getPointAtLength'])(
    'a página que recarrega antes do primeiro quadro (%s) o encerra sem lançar',
    (medida) => {
      const { svg } = itemComTraco();
      Object.assign(window.SVGElement.prototype, {
        [medida]: () => {
          throw new DOMException('The element is in an inactive document.', 'InvalidStateError');
        },
      });
      const cancelar = tracar(svg, 'normal');
      expect(svg.childNodes).toHaveLength(0);
      expect(svg.hasAttribute('data-ativo')).toBe(false);
      expect(cancelar).not.toThrow();
    },
  );

  it('um erro de medida que não é de documento inativo também continua sendo erro', () => {
    const { svg } = itemComTraco();
    Object.assign(window.SVGElement.prototype, {
      getTotalLength: () => {
        throw new TypeError('geometria quebrada');
      },
    });
    expect(() => tracar(svg, 'normal')).toThrow('geometria quebrada');
  });
});

describe('TracoDeSelecao', () => {
  let ambiente: ReturnType<typeof prepararAmbiente>;

  beforeEach(() => {
    ambiente = prepararAmbiente();
    simularMovimento('calmo');
  });

  afterEach(() => {
    ambiente.desfazer();
  });

  const Aba = ({ chave, ativo }: { chave: string; ativo: boolean }) => (
    <button type="button">
      Aba
      <TracoDeSelecao chave={chave} ativo={ativo} />
    </button>
  );

  it('é decorativo e fica vazio enquanto ninguém escolhe', () => {
    const { container } = render(<Aba chave="aba:1" ativo={false} />);
    const svg = container.querySelector('svg.traco-sel');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.childNodes).toHaveLength(0);
  });

  it('o item que já abre escolhido, sem toque, não desenha (a página só abriu)', () => {
    render(<Aba chave="aba:2" ativo />);
    expect(ambiente.animacoes).toHaveLength(0);
  });

  it('desenha quando a pessoa toca e o item passa a ser o escolhido', async () => {
    const usuario = userEvent.setup();
    const { container, rerender } = render(<Aba chave="aba:3" ativo={false} />);
    await usuario.click(container.querySelector('button') as HTMLElement);
    rerender(<Aba chave="aba:3" ativo />);
    expect(ambiente.animacoes).toHaveLength(1);
    expect(container.querySelector('svg.traco-sel rect')).not.toBeNull();
  });

  it('muda de rota sem toque (voltar do navegador): não desenha', () => {
    const { rerender } = render(<Aba chave="aba:4" ativo={false} />);
    rerender(<Aba chave="aba:4" ativo />);
    expect(ambiente.animacoes).toHaveLength(0);
  });

  it('a barra que se remonta já nasce escolhida: o toque de há pouco basta', () => {
    marcarEscolha('aba:5');
    render(<Aba chave="aba:5" ativo />);
    expect(ambiente.animacoes).toHaveLength(1);
  });

  it('com movimento reduzido, nem o toque faz desenhar', () => {
    simularMovimento('reduzido');
    marcarEscolha('aba:6');
    const { container } = render(<Aba chave="aba:6" ativo />);
    expect(ambiente.animacoes).toHaveLength(0);
    expect(container.querySelector('svg.traco-sel')?.childNodes).toHaveLength(0);
  });

  it('trocar a aba no meio do desenho o cancela', async () => {
    marcarEscolha('aba:7');
    const { container, rerender } = render(<Aba chave="aba:7" ativo />);
    expect(container.querySelector('svg.traco-sel rect')).not.toBeNull();
    await act(async () => {
      rerender(<Aba chave="aba:7" ativo={false} />);
      await Promise.resolve();
    });
    expect(container.querySelector('svg.traco-sel')?.childNodes).toHaveLength(0);
  });
});
