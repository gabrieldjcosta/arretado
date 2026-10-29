import { CAIXA_DO_LOCKUP } from '../../componentes/escrita/geometria';
import { andar, curvaDaViagem, luzNaViagem, pontoDeControle, type Viagem } from './voo';

const VIAGEM: Viagem = {
  de: { x: 200, y: 400 },
  para: { x: 60, y: 30 },
  raioDe: 4,
  raioPara: 1.5,
};

describe('a viagem da luz (M2 do Zé)', () => {
  it('sai do ponto do nome e pousa no ponto do cabeçalho, encolhendo do tamanho de um ao do outro', () => {
    expect(luzNaViagem(VIAGEM, 0)).toEqual({ x: 200, y: 400, raio: 4 });
    const fim = luzNaViagem(VIAGEM, 1);
    expect(fim.x).toBeCloseTo(60, 9);
    expect(fim.y).toBeCloseTo(30, 9);
    expect(fim.raio).toBeCloseTo(1.5, 9);
    expect(luzNaViagem(VIAGEM, 0.5).raio).toBeCloseTo(2.75, 9);
  });

  it('faz um arco: no meio do tempo a luz está fora da reta entre os dois pontos', () => {
    const { de, para } = VIAGEM;
    const meio = luzNaViagem(VIAGEM, 0.5);
    // Distância do ponto à reta de -> para: em linha reta seria 0.
    const dx = para.x - de.x;
    const dy = para.y - de.y;
    const distancia = Math.abs(dy * (meio.x - de.x) - dx * (meio.y - de.y)) / Math.hypot(dx, dy);
    expect(distancia).toBeGreaterThan(10);
  });

  it('o ponto de controle fica ao lado do meio do caminho', () => {
    const controle = pontoDeControle({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(controle).toEqual({ x: 50, y: 25 });
  });

  it('a curva da viagem arranca devagar e assenta: 0 e 1 nas pontas, abaixo da reta no começo', () => {
    expect(curvaDaViagem(0)).toBe(0);
    expect(curvaDaViagem(1)).toBeCloseTo(1, 4);
    expect(curvaDaViagem(0.1)).toBeLessThan(0.1);
    expect(curvaDaViagem(0.9)).toBeGreaterThan(0.9);
  });

  it('a largura da caixa do lockup, de que a Abertura tira a escala da luz, é a de CAIXA_DO_LOCKUP', () => {
    const largura = Number(CAIXA_DO_LOCKUP.split(' ')[2]);
    expect(largura).toBe(1015);
  });
});

describe('andar (o relógio de quadros da viagem)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('chama o quadro de 0 a 1 em `duracao` e termina no 1', async () => {
    const valores: number[] = [];
    const fim = andar(
      100,
      (p) => p,
      (v) => valores.push(v),
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(400);
    await fim;
    expect(valores.length).toBeGreaterThan(2);
    expect(valores[0]).toBe(0);
    expect(valores[valores.length - 1]).toBe(1);
    expect([...valores].sort((a, b) => a - b)).toEqual(valores);
  });

  it('abortado, resolve na hora e não chama mais o quadro', async () => {
    const controle = new AbortController();
    const quadro = vi.fn();
    const fim = andar(1000, (p) => p, quadro, controle.signal);
    await vi.advanceTimersByTimeAsync(50);
    const chamadas = quadro.mock.calls.length;
    controle.abort();
    await fim;
    await vi.advanceTimersByTimeAsync(2000);
    expect(quadro.mock.calls.length).toBe(chamadas);
  });

  it('já abortado, nem começa', async () => {
    const controle = new AbortController();
    controle.abort();
    const quadro = vi.fn();
    await andar(1000, (p) => p, quadro, controle.signal);
    expect(quadro).not.toHaveBeenCalled();
  });
});
