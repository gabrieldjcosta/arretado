import { simularMovimento } from '../../../testes/movimento';
import {
  ESPACO_ENTRE_PISCADAS_MS,
  ESPERA_SEGUINTE_DA_LUZ_MS,
  iniciarLuzDaMao,
  iniciarPiscadas,
  PRIMEIRA_ESPERA_DA_LUZ_MS,
  PRIMEIRA_RAJADA_MS,
  RAJADAS,
  RODADAS_DA_LUZ,
} from './vida-do-ze';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Os instantes (ms desde o começo) em que o Zé piscou, com o relógio falso andando até `ate`. */
function instantesDasPiscadas(ate: number) {
  const piscar = vi.fn();
  const instantes: number[] = [];
  const inicio = Date.now();
  piscar.mockImplementation(() => instantes.push(Date.now() - inicio));
  const parar = iniciarPiscadas(() => ({ piscar }));
  vi.advanceTimersByTime(ate);
  parar();
  return instantes;
}

describe('as piscadas dos dois olhos (contrato §9)', () => {
  it('a primeira rajada vem aos 2,2 s, antes disso o Zé não pisca', () => {
    simularMovimento('normal');
    expect(PRIMEIRA_RAJADA_MS).toBe(2200);
    expect(instantesDasPiscadas(PRIMEIRA_RAJADA_MS - 1)).toEqual([]);
    expect(instantesDasPiscadas(PRIMEIRA_RAJADA_MS)[0]).toBe(PRIMEIRA_RAJADA_MS);
  });

  it('as rajadas são de 2, 2, 3, 2, 3 piscadas, uma a cada 0,34 s, na ordem fixa e sem sorteio', () => {
    simularMovimento('normal');
    expect(RAJADAS.map(([, piscadas]) => piscadas)).toEqual([2, 2, 3, 2, 3]);
    expect(ESPACO_ENTRE_PISCADAS_MS).toBe(340);
    const instantes = instantesDasPiscadas(60_000);
    // Separa as rajadas pelos vãos: dentro de uma, 340 ms; entre uma e outra, bem mais.
    const rajadas: number[][] = [];
    for (const instante of instantes) {
      const ultima = rajadas.at(-1);
      if (ultima && instante - (ultima.at(-1) ?? 0) === ESPACO_ENTRE_PISCADAS_MS) {
        ultima.push(instante);
      } else {
        rajadas.push([instante]);
      }
    }
    expect(rajadas.slice(0, 6).map((r) => r.length)).toEqual([2, 2, 3, 2, 3, 2]);
    expect(rajadas[0]?.[0]).toBe(2200);
  });

  it('nunca passa de 3 piscadas por segundo (WCAG 2.3.1)', () => {
    simularMovimento('normal');
    const instantes = instantesDasPiscadas(120_000);
    expect(instantes.length).toBeGreaterThan(10);
    for (const [i, instante] of instantes.entries()) {
      const naJanela = instantes.slice(i).filter((outro) => outro - instante < 1000);
      expect(naJanela.length).toBeLessThanOrEqual(3);
    }
  });

  it('só no movimento normal: o Calmo e o reduzido não piscam', () => {
    for (const movimento of ['calmo', 'reduzido'] as const) {
      simularMovimento(movimento);
      expect(instantesDasPiscadas(60_000)).toEqual([]);
    }
  });

  it('quem cancela para as piscadas que faltam', () => {
    simularMovimento('normal');
    const piscar = vi.fn();
    const parar = iniciarPiscadas(() => ({ piscar }));
    vi.advanceTimersByTime(PRIMEIRA_RAJADA_MS);
    const ateAgora = piscar.mock.calls.length;
    parar();
    vi.advanceTimersByTime(60_000);
    expect(piscar).toHaveBeenCalledTimes(ateAgora);
  });
});

describe('a luz amarela da mão (contrato §9: a pessoa demora)', () => {
  const zona = () => document.createElement('div');

  function luz() {
    const piscarFlor = vi.fn(() => Promise.resolve());
    const pararFlor = vi.fn();
    const ze = { piscarFlor, pararFlor };
    return { ze, piscarFlor, pararFlor };
  }

  it('pisca aos 10 s e depois a cada 14 s, no máximo 3 rodadas de 3 piscadas', () => {
    simularMovimento('normal');
    expect([PRIMEIRA_ESPERA_DA_LUZ_MS, ESPERA_SEGUINTE_DA_LUZ_MS, RODADAS_DA_LUZ]).toEqual([
      10_000, 14_000, 3,
    ]);
    const { ze, piscarFlor } = luz();
    const parar = iniciarLuzDaMao(() => ze, zona());
    vi.advanceTimersByTime(9999);
    expect(piscarFlor).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(piscarFlor).toHaveBeenCalledTimes(1);
    expect(piscarFlor).toHaveBeenLastCalledWith(3);
    vi.advanceTimersByTime(13_999);
    expect(piscarFlor).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(piscarFlor).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(14_000);
    expect(piscarFlor).toHaveBeenCalledTimes(3);
    // Acabaram as rodadas: nada mais pisca, por mais tempo que passe.
    vi.advanceTimersByTime(10 * 60_000);
    expect(piscarFlor).toHaveBeenCalledTimes(3);
    parar();
  });

  it.each(['pointerdown', 'keydown', 'scroll'])(
    'um evento de %s zera a espera, mas não as rodadas já feitas',
    (evento) => {
      simularMovimento('normal');
      const raiz = zona();
      const filho = document.createElement('button');
      raiz.append(filho);
      const { ze, piscarFlor } = luz();
      const parar = iniciarLuzDaMao(() => ze, raiz);
      vi.advanceTimersByTime(9000);
      filho.dispatchEvent(new Event(evento, { bubbles: false }));
      vi.advanceTimersByTime(9999);
      expect(piscarFlor).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(piscarFlor).toHaveBeenCalledTimes(1);
      // Depois da primeira rodada, um toque recomeça a contagem de 10 s e a rodada seguinte ainda vale.
      vi.advanceTimersByTime(5000);
      filho.dispatchEvent(new Event(evento, { bubbles: false }));
      vi.advanceTimersByTime(9999);
      expect(piscarFlor).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(piscarFlor).toHaveBeenCalledTimes(2);
      parar();
    },
  );

  it('depois da última rodada, um toque não arma mais nada', () => {
    simularMovimento('normal');
    const raiz = zona();
    const { ze, piscarFlor } = luz();
    const parar = iniciarLuzDaMao(() => ze, raiz);
    vi.advanceTimersByTime(PRIMEIRA_ESPERA_DA_LUZ_MS + 2 * ESPERA_SEGUINTE_DA_LUZ_MS);
    expect(piscarFlor).toHaveBeenCalledTimes(3);
    raiz.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(60_000);
    expect(piscarFlor).toHaveBeenCalledTimes(3);
    parar();
  });

  it('no Calmo a luz também vem (o controle faz o esmaecer), e no reduzido nunca', () => {
    simularMovimento('calmo');
    const calmo = luz();
    const pararCalmo = iniciarLuzDaMao(() => calmo.ze, zona());
    vi.advanceTimersByTime(PRIMEIRA_ESPERA_DA_LUZ_MS);
    expect(calmo.piscarFlor).toHaveBeenCalledTimes(1);
    pararCalmo();

    simularMovimento('reduzido');
    const reduzido = luz();
    const pararReduzido = iniciarLuzDaMao(() => reduzido.ze, zona());
    vi.advanceTimersByTime(10 * 60_000);
    expect(reduzido.piscarFlor).not.toHaveBeenCalled();
    pararReduzido();
  });

  it('quem cancela para o que falta, solta os ouvintes e apaga a luz que estava piscando', () => {
    simularMovimento('normal');
    const raiz = zona();
    const { ze, piscarFlor, pararFlor } = luz();
    const parar = iniciarLuzDaMao(() => ze, raiz);
    vi.advanceTimersByTime(PRIMEIRA_ESPERA_DA_LUZ_MS);
    expect(piscarFlor).toHaveBeenCalledTimes(1);
    parar();
    expect(pararFlor).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(piscarFlor).toHaveBeenCalledTimes(1);
    // Solto o ouvinte, um toque depois não arma relógio nenhum.
    raiz.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(60_000);
    expect(piscarFlor).toHaveBeenCalledTimes(1);
  });
});
