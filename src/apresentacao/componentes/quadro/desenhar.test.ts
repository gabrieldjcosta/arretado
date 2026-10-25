import { PARTES } from './cena';
import {
  desenharParte,
  limpar,
  pintarAte,
  pintarParte,
  posicaoDaCaneta,
  REPOUSO_DA_CANETA,
  type Camadas,
} from './desenhar';

const NS = 'http://www.w3.org/2000/svg';
const parte = (id: string) => {
  const achada = PARTES.find((p) => p.id === id);
  if (!achada) throw new Error(`parte ${id}`);
  return achada;
};

function novasCamadas(): Camadas {
  const svg = document.createElementNS(NS, 'svg');
  const grupo = () => svg.appendChild(document.createElementNS(NS, 'g'));
  return { lavis: grupo(), tracos: grupo(), caneta: grupo() };
}

describe('pintar o quadro parado', () => {
  it('pintarAte põe só as partes já feitas, com a caneta largada', () => {
    const c = novasCamadas();
    pintarAte(c, 0);
    expect(c.tracos.children).toHaveLength(0);
    pintarAte(c, 2);
    // O chão e o tronco (o aro e o núcleo); o tubo é oco, sem aguada.
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(3);
    expect(c.lavis.children).toHaveLength(0);
    expect(c.caneta.getAttribute('transform')).toBe(REPOUSO_DA_CANETA);
  });

  it('a flor leva aguada de cal e o miolo; o calango, o olho', () => {
    const c = novasCamadas();
    pintarParte(c, parte('flor-da-coroa'));
    expect(c.lavis.querySelectorAll('.quadro-lavis-cal')).toHaveLength(1);
    expect(c.tracos.querySelectorAll('.quadro-miolo')).toHaveLength(1);
    pintarParte(c, parte('calango'));
    const olho = c.tracos.querySelector('.quadro-olho');
    expect(olho?.getAttribute('stroke-width')).toBe('2.8');
    expect(olho?.getAttribute('d')).toMatch(/h0$/);
  });

  it('o papel de cor vira classe e a largura vira atributo', () => {
    const c = novasCamadas();
    pintarParte(c, parte('tronco'));
    const [aro, nucleo] = [...c.tracos.querySelectorAll('.quadro-fio')];
    expect(aro).toHaveClass('quadro-cor-vidro');
    expect(aro?.getAttribute('stroke-width')).toBe('1.6');
    expect(nucleo).toHaveClass('quadro-cor-nucleo');
    expect(nucleo?.getAttribute('stroke-width')).toBe('3.4');
  });

  it('a ponta do núcleo é um ponto liso; na parte de hoje é maior e leva a marca atrás', () => {
    const c = novasCamadas();
    pintarParte(c, parte('braco-direito'));
    expect(c.tracos.querySelectorAll('.quadro-ponto')).toHaveLength(1);
    expect(c.tracos.querySelector('.quadro-ponto')?.getAttribute('r')).toBe('4');
    expect(c.tracos.querySelector('.quadro-hoje')).toBeNull();
    expect(c.tracos.querySelector('.quadro-marca')).toBeNull();

    limpar(c);
    pintarParte(c, parte('braco-direito'), true);
    const hoje = c.tracos.querySelector('.quadro-hoje');
    expect(hoje).toHaveClass('quadro-ponto');
    expect([hoje?.getAttribute('cx'), hoje?.getAttribute('cy'), hoje?.getAttribute('r')]).toEqual([
      '200',
      '98',
      '5.5',
    ]);
    // A marca vem antes do ponto, para ficar sob ele.
    expect(hoje?.previousElementSibling).toHaveClass('quadro-marca');
  });

  it('limpar esvazia o papel e larga a caneta', () => {
    const c = novasCamadas();
    pintarAte(c, 5);
    c.caneta.setAttribute('transform', posicaoDaCaneta(10, 20));
    limpar(c);
    expect(c.lavis.children).toHaveLength(0);
    expect(c.tracos.children).toHaveLength(0);
    expect(c.caneta.getAttribute('transform')).toBe(REPOUSO_DA_CANETA);
  });

  it('a ponta da caneta andando vai para onde se pede', () => {
    expect(posicaoDaCaneta(10.04, 20)).toBe(
      'translate(10 20) scale(0.38) rotate(65) translate(-60 -262)',
    );
  });

  it('largada, a caneta fica quase deitada e menor do que andando, como nas pranchas', () => {
    expect(REPOUSO_DA_CANETA).toBe('translate(214 183) scale(0.3) rotate(84) translate(-60 -262)');
  });
});

describe('desenharParte', () => {
  const geometria = {
    getTotalLength: () => 100,
    getPointAtLength: (comprimento: number) => ({ x: comprimento, y: 5 }),
  };

  beforeEach(() => {
    Object.assign(window.SVGElement.prototype, geometria);
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
    for (const nome of Object.keys(geometria)) {
      Reflect.deleteProperty(window.SVGElement.prototype, nome);
    }
  });

  it('com movimento reduzido a parte já aparece pronta, sem esperar nada', async () => {
    const c = novasCamadas();
    pintarAte(c, 1);
    const terminou = await desenharParte(
      c,
      parte('tronco'),
      'reduzido',
      new AbortController().signal,
    );
    expect(terminou).toBe(true);
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(3);
    expect(c.tracos.querySelectorAll('.quadro-hoje')).toHaveLength(1);
    expect(c.caneta.getAttribute('transform')).toBe(REPOUSO_DA_CANETA);
  });

  it('a caneta anda sobre o traço enquanto ele se faz e volta a ser largada', async () => {
    const c = novasCamadas();
    pintarAte(c, 1);
    const sinal = new AbortController().signal;
    let terminou: boolean | undefined;
    void desenharParte(c, parte('tronco'), 'normal', sinal).then((ok) => {
      terminou = ok;
    });

    // Antes de 200 ms a caneta ainda está largada e o tronco ainda nem começou.
    await vi.advanceTimersByTimeAsync(100);
    expect(c.caneta.getAttribute('transform')).toBe(REPOUSO_DA_CANETA);
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(1);

    // No meio do traço: o tronco está no papel, um trecho por subtraço, e a caneta anda.
    await vi.advanceTimersByTimeAsync(450);
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(1 + 3);
    expect(c.caneta.getAttribute('transform')).not.toBe(REPOUSO_DA_CANETA);
    expect(terminou).toBeUndefined();

    await vi.advanceTimersByTimeAsync(3000);
    expect(terminou).toBe(true);
    expect(c.caneta.getAttribute('transform')).toBe(REPOUSO_DA_CANETA);
    // Terminado, o traço é igual ao pintado de uma vez: um traço só, sem pontilhado nem estilo.
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(3);
    expect(c.tracos.querySelector('.quadro-fio[style]')).toBeNull();
  });

  it('a flor brota ao fim do traço e o bicho ganha o olho', async () => {
    const c = novasCamadas();
    const soltas = vi.fn();
    Object.assign(window.SVGElement.prototype, { animate: soltas });
    try {
      const terminou = desenharParte(
        c,
        parte('flor-da-coroa'),
        'calmo',
        new AbortController().signal,
      );
      await vi.advanceTimersByTimeAsync(5000);
      expect(await terminou).toBe(true);
      expect(c.tracos.querySelectorAll('.quadro-miolo')).toHaveLength(1);
      expect(soltas).toHaveBeenCalledOnce();
      // Pronto o traço, a aguada deixa de ser pela metade.
      expect(c.lavis.querySelector('.quadro-lavis-cal')?.hasAttribute('opacity')).toBe(false);

      const bicho = desenharParte(c, parte('calango'), 'calmo', new AbortController().signal);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await bicho).toBe(true);
      expect(c.tracos.querySelectorAll('.quadro-olho')).toHaveLength(1);
    } finally {
      Reflect.deleteProperty(window.SVGElement.prototype, 'animate');
    }
  });

  it('a ponta do núcleo brota com a marca ao fim do traço', async () => {
    const c = novasCamadas();
    const soltas = vi.fn();
    Object.assign(window.SVGElement.prototype, { animate: soltas });
    try {
      const terminou = desenharParte(
        c,
        parte('braco-direito'),
        'calmo',
        new AbortController().signal,
      );
      // Antes do fim do núcleo ainda não há ponto.
      await vi.advanceTimersByTimeAsync(300);
      expect(c.tracos.querySelector('.quadro-ponto')).toBeNull();
      await vi.advanceTimersByTimeAsync(5000);
      expect(await terminou).toBe(true);
      expect(c.tracos.querySelectorAll('.quadro-hoje')).toHaveLength(1);
      expect(c.tracos.querySelectorAll('.quadro-marca')).toHaveLength(1);
      // A marca e o ponto brotam juntos.
      expect(soltas).toHaveBeenCalledTimes(2);
    } finally {
      Reflect.deleteProperty(window.SVGElement.prototype, 'animate');
    }
  });

  it('abortar no meio devolve false e deixa de mexer na caneta', async () => {
    const c = novasCamadas();
    const controle = new AbortController();
    const resultado = desenharParte(c, parte('tronco'), 'normal', controle.signal);
    await vi.advanceTimersByTimeAsync(500);
    controle.abort();
    await vi.advanceTimersByTimeAsync(50);
    const parada = c.caneta.getAttribute('transform');
    await vi.advanceTimersByTimeAsync(3000);
    expect(await resultado).toBe(false);
    expect(c.caneta.getAttribute('transform')).toBe(parada);
  });

  it('a página que recarrega no meio do traço (documento inativo) para sem lançar', async () => {
    const c = novasCamadas();
    const resultado = desenharParte(c, parte('tronco'), 'normal', new AbortController().signal);
    await vi.advanceTimersByTimeAsync(300);
    Object.assign(window.SVGElement.prototype, {
      getPointAtLength: () => {
        throw new DOMException('The element is in an inactive document.', 'InvalidStateError');
      },
    });
    await vi.advanceTimersByTimeAsync(3000);
    expect(await resultado).toBe(false);
  });

  it('um erro que não é de documento inativo continua sendo erro', async () => {
    Object.assign(window.SVGElement.prototype, {
      getPointAtLength: () => {
        throw new TypeError('geometria quebrada');
      },
    });
    void desenharParte(novasCamadas(), parte('tronco'), 'normal', new AbortController().signal);
    await expect(vi.advanceTimersByTimeAsync(3000)).rejects.toThrow('geometria quebrada');
  });
});
