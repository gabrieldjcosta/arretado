import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import { Ze } from './Ze';
import type { ControleDoZe } from './controle';
import { caminhoDoOlho, CORPO, FLOR } from './geometria';

/** O jsdom não mede traços: o contorno ganha um comprimento. */
function medirOContorno(comprimento = 800) {
  Object.assign(window.SVGElement.prototype, { getTotalLength: () => comprimento });
  return () => Reflect.deleteProperty(window.SVGElement.prototype, 'getTotalLength');
}

const olhos = (raiz: ParentNode) =>
  [...raiz.querySelectorAll('.z-pupila')].map((o) => o.getAttribute('d'));

describe('Ze (D-D10)', () => {
  it('é decorativo e não tem boca: contorno aberto, dois olhos, bochechas e a flor', () => {
    const { container } = render(<Ze />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '22 10 196 240');
    expect(svg).toHaveClass('ze');
    expect(svg).not.toHaveAttribute('role');
    expect(svg?.querySelector('title, desc, text')).toBeNull();
    // As quatro camadas do traço (brilho, faixa de dia, faixa de noite e linha) desenham o mesmo contorno.
    const camadas = [...container.querySelectorAll('.z-tr')];
    expect(camadas).toHaveLength(4);
    for (const camada of camadas) expect(camada.getAttribute('d')).toBe(CORPO.d);
    expect(container.querySelectorAll('.z-olho')).toHaveLength(2);
    expect(container.querySelectorAll('.z-bc ellipse')).toHaveLength(2);
    expect(container.querySelectorAll('.z-flor circle')).toHaveLength(2);
    // Olhos retos, sem inclinação: nenhum grupo leva rotação.
    for (const olho of container.querySelectorAll('.z-olho')) {
      expect(olho.getAttribute('transform')).not.toMatch(/rotate|skew/);
    }
  });

  it('o tamanho entra no atributo que o CSS lê para escolher a espessura', () => {
    const { container } = render(
      <>
        <Ze />
        <Ze tamanho="medio" className="passo" />
        <Ze tamanho="minimo" />
      </>,
    );
    const [grande, medio, minimo] = [...container.querySelectorAll('svg')];
    expect(grande).toHaveAttribute('data-tamanho', 'grande');
    expect(medio).toHaveAttribute('data-tamanho', 'medio');
    expect(medio).toHaveClass('ze', 'passo');
    expect(minimo).toHaveAttribute('data-tamanho', 'minimo');
  });

  it('cada Zé leva filtros e degradê com ids próprios, e todo url(#id) aponta para um deles', () => {
    const { container } = render(
      <>
        <Ze />
        <Ze humor="contente" />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    // O degradê do miolo e seis filtros (halo da flor, olho, noite, brilho, bochecha e dia): sete por Zé.
    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(14);
    const usados = [...container.querySelectorAll('[filter], [fill^="url("]')].map(
      (el) =>
        /url\(#([^)]+)\)/.exec(el.getAttribute('filter') ?? el.getAttribute('fill') ?? '')?.[1],
    );
    for (const id of usados) expect(ids).toContain(id);
  });

  it('desenha o humor do primeiro render e abaixo de 72 px o rosto é neutro', () => {
    const { container } = render(
      <>
        <Ze humor="contente" />
        <Ze humor="contente" tamanho="pequeno" />
        <Ze humor="piscadela" />
      </>,
    );
    const [contente, pequeno, piscadela] = [...container.querySelectorAll('svg')].map(olhos);
    expect(contente).toEqual([caminhoDoOlho(1), caminhoDoOlho(1)]);
    expect(pequeno).toEqual([caminhoDoOlho(0), caminhoDoOlho(0)]);
    expect(piscadela).toEqual([caminhoDoOlho(0), caminhoDoOlho(1)]);
  });

  it('o humor novo passa pelo controle: na hora no movimento reduzido', () => {
    const { container, rerender } = render(<Ze />);
    expect(olhos(container)).toEqual([caminhoDoOlho(0), caminhoDoOlho(0)]);
    rerender(<Ze humor="contente" />);
    expect(olhos(container)).toEqual([caminhoDoOlho(1), caminhoDoOlho(1)]);
    // Força das bochechas do contente: a máxima.
    expect(container.querySelector('.z-bc')).toHaveAttribute('opacity', '1');
  });

  it('o halo dos olhos (de noite) cresce com o arco: a cápsula fica nítida e o olho feliz brilha', () => {
    const halos = (raiz: ParentNode) =>
      [...raiz.querySelectorAll('.z-oh')].map((halo) => halo.getAttribute('opacity'));
    const { container, rerender } = render(<Ze humor="piscadela" />);
    expect(halos(container)).toEqual(['0', '0.5']);
    rerender(<Ze humor="contente" />);
    expect(halos(container)).toEqual(['0.5', '0.5']);
    rerender(<Ze humor="neutro" />);
    expect(halos(container)).toEqual(['0', '0']);
  });

  it('o filtro do halo dos olhos tem região fixa em volta do olho, e não a caixa do traço', () => {
    // Pela caixa do traço (fina no arco, de largura zero na cápsula) o desfoque era cortado numa faixa reta
    // ou o filtro desligava; é a diferença deliberada em relação ao mockup (revisão do #341).
    const { container } = render(<Ze />);
    const halo = container.querySelector('.z-oh');
    const id = /url\(#([^)]+)\)/.exec(halo?.getAttribute('filter') ?? '')?.[1] ?? '';
    const filtro = container.querySelector(`filter[id="${id}"]`);
    expect(filtro).not.toBeNull();
    expect(filtro?.getAttribute('filterUnits')).toBe('userSpaceOnUse');
    expect(['x', 'y', 'width', 'height'].map((a) => filtro?.getAttribute(a))).toEqual([
      '-40',
      '-40',
      '80',
      '80',
    ]);
  });

  it('entrega o controle por ref e o solta ao sair', () => {
    const ref = createRef<ControleDoZe>();
    const { container, unmount } = render(<Ze ref={ref} />);
    expect(ref.current?.svg).toBe(container.querySelector('svg'));
    expect(ref.current?.corpo).toBe(container.querySelector('.z-linha'));
    unmount();
    expect(ref.current).toBeNull();
  });
});

describe('o controle do Zé: o traço, a luz e as partes', () => {
  function montar() {
    const ref = createRef<ControleDoZe>();
    const resultado = render(<Ze ref={ref} />);
    const controle = ref.current;
    if (!controle) throw new Error('sem controle');
    return { ...resultado, controle };
  }

  it('desenha o contorno pelo comprimento, nas quatro camadas ao mesmo tempo', () => {
    const desfazer = medirOContorno(800);
    const { container, controle } = montar();
    const camadas = [...container.querySelectorAll<SVGPathElement>('.z-tr')];

    controle.prepararTraco();
    for (const c of camadas) {
      expect(c.style.strokeDasharray).toBe('800 800');
      expect(c.style.strokeDashoffset).toBe('800');
    }
    controle.tracar(0.25);
    for (const c of camadas) expect(c.style.strokeDashoffset).toBe('600');
    controle.tracar(1);
    for (const c of camadas) expect(c.style.strokeDashoffset).toBe('0');
    controle.tracoPronto();
    for (const c of camadas) {
      expect(c.style.strokeDasharray).toBe('');
      expect(c.style.strokeDashoffset).toBe('');
    }
    desfazer();
  });

  it('o brilho acende enquanto a luz traça e assenta ao apagar', () => {
    simularMovimento('normal');
    const { container, controle } = montar();
    const svg = container.querySelector('svg');
    controle.acender(true);
    expect(svg).toHaveAttribute('data-acesa');
    controle.acender(false);
    expect(svg).not.toHaveAttribute('data-acesa');
  });

  it('no Calmo e no movimento reduzido o néon fica no repouso: acender não acende', () => {
    for (const modo of ['calmo', 'reduzido'] as const) {
      simularMovimento(modo);
      const { container, controle, unmount } = montar();
      controle.acender(true);
      expect(container.querySelector('svg')).not.toHaveAttribute('data-acesa');
      unmount();
    }
  });

  it('mostra as partes uma a uma e volta tudo ao natural', () => {
    simularMovimento('normal');
    const { container, controle } = montar();
    controle.ocultarTudo();
    expect(container.querySelector<SVGElement>('.z-linha')?.style.opacity).toBe('0');
    expect(container.querySelector<SVGElement>('.z-miolo')?.style.opacity).toBe('0');
    expect(container.querySelector<SVGElement>('.z-flor')?.style.opacity).toBe('0');
    controle.mostrar('flor');
    expect(container.querySelector<SVGElement>('.z-flor')?.style.opacity).toBe('');
    controle.florEscala(0.55);
    expect(container.querySelector('.z-flor')?.getAttribute('transform')).toMatch(/scale\(0\.55\)/);
    controle.olhoEscala(0, 0.55);
    expect(container.querySelector('.z-olho')?.getAttribute('transform')).toMatch(
      /scale\(0\.55 0\.55\)/,
    );
    controle.acender(true);

    controle.tudoVisivel();
    for (const el of container.querySelectorAll<SVGElement>(
      '.z-tr, .z-miolo, .z-olho, .z-flor, .z-bochechas',
    )) {
      expect(el.style.opacity).toBe('');
    }
    expect(container.querySelector('.z-flor')).not.toHaveAttribute('transform');
    expect(container.querySelector('.z-olho')?.getAttribute('transform')).toMatch(/scale\(1 1\)/);
    expect(container.querySelector('svg')).not.toHaveAttribute('data-acesa');
  });

  it('olha de lado uma vez; no movimento reduzido os olhos ficam parados', () => {
    const { container, controle } = montar();
    controle.olhar(3);
    expect(container.querySelector<SVGElement>('.z-olhos')?.style.transform).toBe('none');
    simularMovimento('normal');
    controle.olhar(3);
    expect(container.querySelector<SVGElement>('.z-olhos')?.style.transform).toBe(
      'translate(3px,0px)',
    );
  });

  it('a luz da caneta passa pelos pontos do desenho e some ao apagar; o Zé inteiro a apaga', () => {
    const { container, controle } = montar();
    const pena = container.querySelector('.z-pena');
    expect(pena).toHaveAttribute('visibility', 'hidden');
    expect(pena?.querySelectorAll('circle')).toHaveLength(2);
    controle.pena({ x: 84.123456, y: 230 });
    expect(pena).toHaveAttribute('visibility', 'visible');
    expect(pena).toHaveAttribute('transform', 'translate(84.12 230)');
    controle.pena(null);
    expect(pena).toHaveAttribute('visibility', 'hidden');
    controle.pena({ x: 156, y: 230 });
    controle.tudoVisivel();
    expect(pena).toHaveAttribute('visibility', 'hidden');
  });

  describe('onde o pé esquerdo está na tela (a luz da Abertura pousa nele)', () => {
    const geometria = { getScreenCTM: vi.fn(), getPointAtLength: vi.fn() };
    beforeEach(() => {
      Object.assign(window.SVGElement.prototype, geometria);
      geometria.getPointAtLength.mockReturnValue({ x: 84, y: 230 });
    });
    afterEach(() => {
      Reflect.deleteProperty(window.SVGElement.prototype, 'getScreenCTM');
      Reflect.deleteProperty(window.SVGElement.prototype, 'getPointAtLength');
      geometria.getScreenCTM.mockReset();
      geometria.getPointAtLength.mockReset();
    });

    it('é o começo do traço levado à janela, com o raio da luz da caneta na mesma escala', () => {
      geometria.getScreenCTM.mockReturnValue({ a: 0.5, b: 0, c: 0, d: 0.5, e: 100, f: 40 });
      const { controle } = montar();
      expect(controle.peNaTela()).toEqual({ x: 142, y: 155, raio: FLOR.r * 0.5 });
    });

    it('sem tela (o desenho não está desenhado) ou com a página já fora do ar, não há pé a medir', () => {
      const { controle } = montar();
      geometria.getScreenCTM.mockReturnValue(null);
      expect(controle.peNaTela()).toBeNull();
      geometria.getScreenCTM.mockImplementation(() => {
        throw new DOMException('documento inativo', 'InvalidStateError');
      });
      expect(controle.peNaTela()).toBeNull();
      geometria.getScreenCTM.mockImplementation(() => {
        throw new Error('outro erro');
      });
      expect(() => controle.peNaTela()).toThrow('outro erro');
    });

    it('sem svg ligado, nulo', () => {
      geometria.getScreenCTM.mockReturnValue({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      const { controle, unmount } = montar();
      unmount();
      expect(controle.peNaTela()).toBeNull();
    });
  });

  it('sem svg ligado, nada quebra', () => {
    const { controle, unmount } = montar();
    unmount();
    expect(controle.comprimento()).toBe(0);
    expect(() => {
      controle.prepararTraco();
      controle.tracar(0.5);
      controle.humor('contente');
      controle.piscar();
      controle.ocultarTudo();
      controle.tudoVisivel();
    }).not.toThrow();
    expect(controle.svg).toBeNull();
  });
});

describe('o controle do Zé: o que anda só anda no movimento normal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function montar(humor?: 'contente') {
    const ref = createRef<ControleDoZe>();
    const resultado = render(<Ze ref={ref} humor={humor ?? 'neutro'} />);
    const controle = ref.current;
    if (!controle) throw new Error('sem controle');
    const escalaY = () =>
      Number(
        /scale\([\d.]+ ([\d.]+)\)/.exec(
          resultado.container.querySelector('.z-olho')?.getAttribute('transform') ?? '',
        )?.[1],
      );
    return { ...resultado, controle, escalaY };
  }

  it('o humor passa em 200 ms: os olhos viram arco e as bochechas esquentam', () => {
    simularMovimento('normal');
    const { container, controle, rerender } = montar();
    controle.humor('contente');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const meio = olhos(container)[0];
    expect(meio).not.toBe(caminhoDoOlho(0));
    expect(meio).not.toBe(caminhoDoOlho(1));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(olhos(container)).toEqual([caminhoDoOlho(1), caminhoDoOlho(1)]);
    expect(container.querySelector('.z-bc')).toHaveAttribute('opacity', '1');
    rerender(<Ze humor="contente" />);
  });

  it('o piscar fecha os olhos até 12% da altura e abre em 160 ms; o olho contente já está fechado', () => {
    simularMovimento('normal');
    const { controle, escalaY } = montar();
    controle.piscar();
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(escalaY()).toBeLessThan(0.3);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(escalaY()).toBe(1);

    controle.humor('contente');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    controle.piscar();
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(escalaY()).toBe(1);
  });

  it('a piscadela fecha o olho direito em arco por 0,56 s e volta à cápsula', async () => {
    simularMovimento('normal');
    const { container, controle } = montar();
    const feita = controle.piscadela();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(olhos(container)).toEqual([caminhoDoOlho(0), caminhoDoOlho(1)]);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await feita;
    expect(olhos(container)).toEqual([caminhoDoOlho(0), caminhoDoOlho(0)]);
  });

  it('um humor novo no meio do piscar não deixa o olho fechado', () => {
    simularMovimento('normal');
    const { controle, escalaY } = montar();
    controle.piscar();
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(escalaY()).toBeLessThan(1);
    controle.humor('atento');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // O humor atento tem os olhos mais altos (1,12), abertos.
    expect(escalaY()).toBeCloseTo(1.12, 2);
  });

  it('no movimento reduzido e no Calmo os olhos não piscam', async () => {
    for (const modo of ['reduzido', 'calmo'] as const) {
      simularMovimento(modo);
      const { container, controle, unmount } = montar();
      controle.piscar();
      await controle.piscadela();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(olhos(container)).toEqual([caminhoDoOlho(0), caminhoDoOlho(0)]);
      unmount();
    }
  });

  it('a luz da flor pisca 3 vezes de 0,46 s e volta ao natural; o Calmo esmaece uma vez; o reduzido não pisca', async () => {
    simularMovimento('normal');
    const { container, controle } = montar();
    const luz = container.querySelector<SVGElement>('.z-luz');
    const opacidades: number[] = [];
    const feita = controle.piscarFlor(3);
    for (let ms = 0; ms < 1400; ms += 40) {
      act(() => {
        vi.advanceTimersByTime(40);
      });
      opacidades.push(Number(luz?.style.opacity || 1));
    }
    await feita;
    // Apaga até 12% três vezes (três mínimos) e termina sem estilo nenhum.
    const minimos = opacidades.filter(
      (o, i) => o < 0.2 && (opacidades[i - 1] ?? 1) >= o && (opacidades[i + 1] ?? 1) > o,
    );
    expect(minimos.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...opacidades)).toBeLessThan(0.2);
    expect(luz?.style.opacity).toBe('');

    simularMovimento('calmo');
    const calma = controle.piscarFlor(3);
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(Number(luz?.style.opacity)).toBeLessThan(0.2);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    await calma;
    expect(luz?.style.opacity).toBe('');

    simularMovimento('reduzido');
    await controle.piscarFlor(3);
    expect(luz?.style.opacity).toBe('');
  });

  it('parar a flor devolve a luz inteira e cancela o que faltava', async () => {
    simularMovimento('normal');
    const { container, controle } = montar();
    const luz = container.querySelector<SVGElement>('.z-luz');
    const feita = controle.piscarFlor(3);
    act(() => {
      vi.advanceTimersByTime(230);
    });
    expect(luz?.style.opacity).not.toBe('');
    controle.pararFlor();
    expect(luz?.style.opacity).toBe('');
    act(() => {
      vi.advanceTimersByTime(40);
    });
    await feita;
    expect(luz?.style.opacity).toBe('');
  });
});

describe('o Zé em cores forçadas e nos dois mundos', () => {
  it('a faixa e o halo dos olhos de cada mundo existem e o CSS escolhe a do tema', () => {
    const { container } = render(<Ze />);
    // O CSS mostra `.z-d` de dia e `.z-n` à noite; as duas camadas estão no desenho.
    expect(container.querySelectorAll('.z-banda.z-d')).toHaveLength(1);
    expect(container.querySelectorAll('.z-banda.z-n')).toHaveLength(1);
    expect(container.querySelectorAll('.z-oh.z-n')).toHaveLength(2);
  });
});
