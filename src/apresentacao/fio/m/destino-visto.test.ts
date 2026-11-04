import { destinoJaVisto, esquecerDestinoVisto, marcarDestinoVisto } from './destino-visto';

const CHAVE = 'arretado:fio:destino-visto:v1';

beforeEach(() => {
  esquecerDestinoVisto();
});

afterEach(() => {
  vi.restoreAllMocks();
  esquecerDestinoVisto();
});

describe('a primeira visita ao Destino', () => {
  it('num aparelho novo ainda não foi vista; abrir o Destino a marca e guarda no aparelho', () => {
    expect(destinoJaVisto()).toBe(false);
    marcarDestinoVisto();
    expect(destinoJaVisto()).toBe(true);
    expect(window.localStorage.getItem(CHAVE)).toBe('1');
  });

  it('lembra de uma visita anterior que o aparelho guardou', () => {
    window.localStorage.setItem(CHAVE, '1');
    // O que se leu uma vez fica na memória da página: só `esquecer` (os testes e o E2E) apaga.
    esquecerDestinoVisto();
    window.localStorage.setItem(CHAVE, '1');
    expect(destinoJaVisto()).toBe(true);
  });

  it('esquecer volta a entrada: apaga a marca do aparelho e a da página', () => {
    marcarDestinoVisto();
    esquecerDestinoVisto();
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
    expect(destinoJaVisto()).toBe(false);
  });

  it('sem armazenamento (janela privada) a visita vale só enquanto a aba está aberta', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(destinoJaVisto()).toBe(false);
    expect(() => {
      marcarDestinoVisto();
    }).not.toThrow();
    expect(destinoJaVisto()).toBe(true);
  });
});
