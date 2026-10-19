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
    // O chão e o tronco; só o tronco leva aguada.
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(2);
    expect(c.lavis.querySelectorAll('.quadro-lavis-vidro')).toHaveLength(1);
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

  it('o papel de cor vira classe e a largura vira atributo; a opacidade só quando há', () => {
    const c = novasCamadas();
    pintarParte(c, parte('espinhos'));
    const [nervuras, espinhos] = [...c.tracos.querySelectorAll('.quadro-fio')];
    expect(nervuras).toHaveClass('quadro-cor-vidro');
    expect(nervuras?.getAttribute('opacity')).toBe('0.55');
    expect(espinhos?.hasAttribute('opacity')).toBe(false);
    expect(espinhos?.getAttribute('stroke-width')).toBe('1.8');
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

  it('a ponta da caneta deitada vai para onde se pede', () => {
    expect(posicaoDaCaneta(10.04, 20)).toBe(
      'translate(10 20) scale(0.6) translate(-32 -200) rotate(65 32 200)',
    );
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
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(2);
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
    expect(c.tracos.querySelectorAll('.quadro-fio')).toHaveLength(2);
    expect(c.tracos.querySelector('[style]')).toBeNull();
    const aguada = c.lavis.querySelector('.quadro-lavis-vidro');
    expect(aguada).not.toBeNull();
    expect(aguada?.hasAttribute('opacity')).toBe(false);
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

      const bicho = desenharParte(c, parte('calango'), 'calmo', new AbortController().signal);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await bicho).toBe(true);
      expect(c.tracos.querySelectorAll('.quadro-olho')).toHaveLength(1);
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
});
