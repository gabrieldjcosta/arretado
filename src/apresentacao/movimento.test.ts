import { restaurarMovimento, simularMovimento } from '../testes/movimento';
import {
  curva,
  documentoInativo,
  esperar,
  movimentoAgora,
  movimentoDoPerfil,
  suave,
} from './movimento';

describe('documentoInativo', () => {
  it('reconhece o erro do navegador que mede um SVG de página que já saiu', () => {
    expect(documentoInativo(new DOMException('inactive document', 'InvalidStateError'))).toBe(true);
  });

  it('o resto é erro de verdade', () => {
    expect(documentoInativo(new TypeError('x'))).toBe(false);
    expect(documentoInativo(new DOMException('x', 'NotFoundError'))).toBe(false);
    expect(documentoInativo('InvalidStateError')).toBe(false);
    expect(documentoInativo(undefined)).toBe(false);
  });
});

describe('movimentoAgora (A caneta que desenha)', () => {
  it('o movimento reduzido do sistema vence qualquer perfil', () => {
    simularMovimento('normal');
    expect(movimentoAgora()).toBe('normal');
    simularMovimento('reduzido');
    document.documentElement.dataset.perfil = 'guiado';
    expect(movimentoAgora()).toBe('reduzido');
  });

  it('só o perfil Calmo acalma os toques; sem perfil, Guiado e Leitura andam por inteiro', () => {
    simularMovimento('normal');
    expect(document.documentElement.dataset.perfil).toBeUndefined();
    expect(movimentoAgora()).toBe('normal');
    for (const perfil of ['guiado', 'leitura']) {
      document.documentElement.dataset.perfil = perfil;
      expect(movimentoAgora()).toBe('normal');
    }
    document.documentElement.dataset.perfil = 'calmo';
    expect(movimentoAgora()).toBe('calmo');
  });

  it('é lido na hora de usar: a preferência do sistema pode mudar com o app aberto', () => {
    simularMovimento('normal');
    expect(movimentoAgora()).toBe('normal');
    simularMovimento('reduzido');
    expect(movimentoAgora()).toBe('reduzido');
  });

  it('movimentoDoPerfil decide pelo perfil dado, sem ler o documento', () => {
    simularMovimento('normal');
    document.documentElement.dataset.perfil = 'calmo';
    expect(movimentoDoPerfil(undefined)).toBe('normal');
    expect(movimentoDoPerfil('guiado')).toBe('normal');
    expect(movimentoDoPerfil('calmo')).toBe('calmo');
    simularMovimento('reduzido');
    expect(movimentoDoPerfil('calmo')).toBe('reduzido');
  });

  it('sem matchMedia, não mexe em nada', () => {
    const guardado = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Reflect.deleteProperty(window, 'matchMedia');
    try {
      expect(movimentoAgora()).toBe('reduzido');
    } finally {
      if (guardado) Object.defineProperty(window, 'matchMedia', guardado);
      restaurarMovimento();
    }
  });
});

describe('curvas', () => {
  it('suave vai de 0 a 1 passando por 0,5 no meio', () => {
    expect(suave(0)).toBe(0);
    expect(suave(0.5)).toBeCloseTo(0.5);
    expect(suave(1)).toBeCloseTo(1);
  });

  it('a curva do app começa em 0, termina em 1, nunca recua e sai na frente', () => {
    expect(curva(0)).toBe(0);
    expect(curva(1)).toBeCloseTo(1, 5);
    expect(curva(-1)).toBe(0);
    expect(curva(2)).toBeCloseTo(1, 5);
    let anterior = 0;
    for (let p = 0.05; p <= 1.0001; p += 0.05) {
      const valor = curva(p);
      expect(valor).toBeGreaterThanOrEqual(anterior);
      anterior = valor;
    }
    expect(curva(0.25)).toBeGreaterThan(0.25);
    expect(curva(0.5)).toBeGreaterThan(0.5);
  });
});

describe('esperar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('espera o tempo pedido', async () => {
    vi.useFakeTimers();
    let passou = false;
    void esperar(100, new AbortController().signal).then(() => {
      passou = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(passou).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(passou).toBe(true);
  });

  it('resolve na hora se o sinal abortar, ou se já nasceu abortado', async () => {
    vi.useFakeTimers();
    const controle = new AbortController();
    let passou = false;
    void esperar(10_000, controle.signal).then(() => {
      passou = true;
    });
    controle.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(passou).toBe(true);
    await expect(esperar(10_000, controle.signal)).resolves.toBeUndefined();
  });
});
