import { criarAgendador } from './agendador';

describe('criarAgendador', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('junta pedidos próximos num só envio depois do atraso', async () => {
    const executar = vi.fn().mockResolvedValue(undefined);
    const a = criarAgendador({ executar, atrasoMs: 5_000 });
    a.pedir();
    a.pedir();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(executar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(executar).toHaveBeenCalledTimes(1);
    a.parar();
  });

  it('falha repete com espera que dobra até o teto e zera ao dar certo', async () => {
    const executar = vi
      .fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue(undefined);
    const a = criarAgendador({ executar, atrasoMs: 10, esperaInicialMs: 100, maxEsperaMs: 150 });
    a.pedir();
    await vi.advanceTimersByTimeAsync(10);
    expect(executar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100); // 1ª espera
    expect(executar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(149); // 2ª espera: 200 limitada a 150
    expect(executar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(executar).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(executar).toHaveBeenCalledTimes(3); // deu certo: não repete sozinho
    a.parar();
  });

  it('pedido durante a rodada gera uma nova; parar cancela tudo', async () => {
    let soltar: () => void = () => undefined;
    const executar = vi.fn(
      () =>
        new Promise<void>((resolver) => {
          soltar = resolver;
        }),
    );
    const a = criarAgendador({ executar, atrasoMs: 10 });
    a.pedir();
    await vi.advanceTimersByTimeAsync(10);
    a.pedir(); // durante a rodada
    soltar();
    await vi.advanceTimersByTimeAsync(10);
    expect(executar).toHaveBeenCalledTimes(2);
    a.parar();
    soltar();
    a.pedir();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(executar).toHaveBeenCalledTimes(2);
  });
});
