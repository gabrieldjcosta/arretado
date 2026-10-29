import { createRef } from 'react';
import { render } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import type { ControleDoZe } from '../../componentes/ze/controle';
import { Ze } from '../../componentes/ze/Ze';
import { desenharOZe } from './entrada-do-ze';

const COMPRIMENTO = 800;

/** O jsdom não mede traços: o contorno tem 800 de comprimento e anda 0,1 unidade em x a cada unidade de traço. */
function medirOContorno() {
  Object.assign(window.SVGElement.prototype, {
    getTotalLength: () => COMPRIMENTO,
    getPointAtLength: (comprimento: number) => ({ x: comprimento / 10, y: 200 }),
  });
}

beforeEach(() => {
  simularMovimento('normal');
  medirOContorno();
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
  Reflect.deleteProperty(window.SVGElement.prototype, 'getTotalLength');
  Reflect.deleteProperty(window.SVGElement.prototype, 'getPointAtLength');
});

function montar() {
  const ref = createRef<ControleDoZe>();
  const vista = render(<Ze ref={ref} />);
  const ze = ref.current;
  if (!ze) throw new Error('sem controle');
  const el = (seletor: string) => vista.container.querySelector<SVGElement>(seletor);
  const opacidade = (seletor: string) => el(seletor)?.style.opacity;
  const pena = () => ({
    visivel: el('.z-pena')?.getAttribute('visibility') === 'visible',
    lugar: el('.z-pena')?.getAttribute('transform'),
  });
  return { ...vista, ze, el, opacidade, pena };
}

const andar = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe('a entrada do Zé: a luz desenha o contorno, a flor brota e o rosto acende (M3b)', () => {
  it('começa com só o contorno por desenhar, o néon aceso e a luz da caneta no pé esquerdo', () => {
    const { ze, el, opacidade, pena } = montar();
    void desenharOZe(ze, { sinal: new AbortController().signal, aoMeio: vi.fn() });
    expect(opacidade('.z-linha')).toBe('');
    expect(el('.z-linha')?.style.strokeDasharray).toBe(
      `${String(COMPRIMENTO)} ${String(COMPRIMENTO)}`,
    );
    expect(el('.z-linha')?.style.strokeDashoffset).toBe(String(COMPRIMENTO));
    for (const escondida of ['.z-miolo', '.z-flor', '.z-bochechas']) {
      expect(opacidade(escondida)).toBe('0');
    }
    expect(el('.z-olho')?.style.opacity).toBe('0');
    expect(el('svg')).toHaveAttribute('data-acesa');
    // O pé esquerdo é onde o traço começa (comprimento 0).
    expect(pena()).toEqual({ visivel: true, lugar: 'translate(0 200)' });
  });

  it('o contorno se desenha em 1,2 s, a luz andando à frente dele, e o texto sobe na metade', async () => {
    const { ze, el, pena } = montar();
    const aoMeio = vi.fn();
    void desenharOZe(ze, { sinal: new AbortController().signal, aoMeio });

    await andar(300);
    const cedo = Number(el('.z-linha')?.style.strokeDashoffset);
    expect(cedo).toBeLessThan(COMPRIMENTO);
    expect(cedo).toBeGreaterThan(0);
    expect(aoMeio).not.toHaveBeenCalled();
    // A luz está onde o traço chegou: o ponto do comprimento já desenhado.
    const lugar = /translate\(([\d.]+) 200\)/.exec(pena().lugar ?? '');
    expect(Number(lugar?.[1]) * 10).toBeCloseTo(COMPRIMENTO - cedo, -1);

    await andar(400);
    expect(aoMeio).toHaveBeenCalledTimes(1);

    await andar(520);
    // Os 1,2 s passaram: o traço está inteiro (sem tracejado) e o néon assenta.
    expect(el('.z-linha')?.style.strokeDasharray).toBe('');
    expect(el('svg')).not.toHaveAttribute('data-acesa');
    expect(aoMeio).toHaveBeenCalledTimes(1);
  });

  it('a luz salta do pé direito à flor, o miolo acende e a flor brota; a luz da caneta se apaga', async () => {
    const { ze, el, opacidade, pena } = montar();
    void desenharOZe(ze, { sinal: new AbortController().signal, aoMeio: vi.fn() });

    await andar(1200 + 130);
    // No meio do salto: o miolo vai acendendo, a luz está no ar e a flor ainda não existe.
    expect(Number(opacidade('.z-miolo'))).toBeGreaterThan(0);
    expect(Number(opacidade('.z-miolo'))).toBeLessThan(1);
    expect(pena().visivel).toBe(true);
    expect(opacidade('.z-flor')).toBe('0');

    await andar(130 + 40);
    // A luz virou a flor: a da caneta se apaga e a flor brota do tamanho pequeno ao inteiro.
    expect(pena().visivel).toBe(false);
    expect(opacidade('.z-miolo')).toBe('');
    expect(opacidade('.z-flor')).toBe('');
    expect(el('.z-flor')?.getAttribute('transform')).toMatch(/scale\(0\.\d+\)/);
    await andar(200);
    expect(el('.z-flor')).not.toHaveAttribute('transform');
  });

  it('os olhos surgem um depois do outro, as bochechas depois deles, e a piscadela fecha', async () => {
    const { ze, opacidade } = montar();
    const fim = desenharOZe(ze, { sinal: new AbortController().signal, aoMeio: vi.fn() });

    // Contorno (1,2 s), salto (0,24 s), flor (0,16 s) e a pausa de 80 ms: o primeiro olho surge.
    await andar(1200 + 240 + 160 + 80 + 60);
    expect(opacidade('.z-olho:nth-of-type(1)')).toBe('');
    expect(opacidade('.z-olho:nth-of-type(2)')).toBe('0');

    await andar(120);
    expect(opacidade('.z-olho:nth-of-type(2)')).toBe('');
    // As bochechas esperam os dois olhos.
    expect(opacidade('.z-bochechas')).toBe('0');
    await andar(140 + 80);
    expect(Number(opacidade('.z-bochechas'))).toBeGreaterThan(0);

    await andar(3500);
    await fim;
  });

  it('dura cerca de 3 s do primeiro quadro ao Zé inteiro, e termina com tudo à vista e a luz apagada', async () => {
    const { ze, el, opacidade, pena } = montar();
    let acabou = false;
    void desenharOZe(ze, { sinal: new AbortController().signal, aoMeio: vi.fn() }).then(() => {
      acabou = true;
    });
    await andar(2850);
    expect(acabou).toBe(false);
    await andar(550);
    expect(acabou).toBe(true);
    for (const parte of ['.z-linha', '.z-miolo', '.z-flor', '.z-bochechas']) {
      expect(opacidade(parte)).toBe('');
    }
    expect(el('.z-olho')?.style.opacity).toBe('');
    expect(el('.z-linha')?.style.strokeDasharray).toBe('');
    expect(el('svg')).not.toHaveAttribute('data-acesa');
    expect(pena().visivel).toBe(false);
  });

  it('abortada no meio, resolve e não mexe mais em nada', async () => {
    const { ze, el, pena } = montar();
    const controle = new AbortController();
    const aoMeio = vi.fn();
    let acabou = false;
    void desenharOZe(ze, { sinal: controle.signal, aoMeio }).then(() => {
      acabou = true;
    });
    await andar(300);
    controle.abort();
    await andar(0);
    expect(acabou).toBe(true);
    const parado = [
      el('.z-linha')?.style.strokeDashoffset,
      pena().lugar,
      el('.z-flor')?.style.opacity,
    ];
    await andar(4000);
    expect([
      el('.z-linha')?.style.strokeDashoffset,
      pena().lugar,
      el('.z-flor')?.style.opacity,
    ]).toEqual(parado);
    expect(aoMeio).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('um sinal que já abortou nem começa a andar (o StrictMode recomeça a entrada do zero)', async () => {
    const { ze, el } = montar();
    const controle = new AbortController();
    controle.abort();
    await desenharOZe(ze, { sinal: controle.signal, aoMeio: vi.fn() });
    // Ficou no começo: tudo escondido, esperando a próxima entrada, que o recomeça.
    expect(el('.z-flor')?.style.opacity).toBe('0');
    expect(el('.z-linha')?.style.strokeDashoffset).toBe(String(COMPRIMENTO));
  });

  it.each(['calmo', 'reduzido'] as const)(
    'no %s o Zé aparece inteiro e parado, na hora, e o texto já pode subir',
    async (movimento) => {
      simularMovimento(movimento);
      const { ze, el, opacidade, pena } = montar();
      const aoMeio = vi.fn();
      await desenharOZe(ze, { sinal: new AbortController().signal, aoMeio });
      expect(aoMeio).toHaveBeenCalledTimes(1);
      for (const parte of ['.z-linha', '.z-miolo', '.z-flor', '.z-bochechas']) {
        expect(opacidade(parte)).toBe('');
      }
      expect(el('.z-linha')?.style.strokeDasharray).toBe('');
      expect(el('svg')).not.toHaveAttribute('data-acesa');
      expect(pena().visivel).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('sem comprimento medido (o contorno não tem tela) o Zé também aparece inteiro, sem andar', async () => {
    Object.assign(window.SVGElement.prototype, { getTotalLength: () => 0 });
    const { ze, opacidade } = montar();
    const aoMeio = vi.fn();
    await desenharOZe(ze, { sinal: new AbortController().signal, aoMeio });
    expect(aoMeio).toHaveBeenCalledTimes(1);
    expect(opacidade('.z-flor')).toBe('');
  });
});
