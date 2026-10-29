import { criarEncontro, type OfertaDaChegada } from './encontro';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const oferta = (): OfertaDaChegada => ({
  medirPe: () => ({ x: 10, y: 20, raio: 4 }),
  receber: vi.fn(),
});

describe('o encontro da luz com o Zé (M3b)', () => {
  it('a oferta que já está lá responde na hora', async () => {
    const encontro = criarEncontro();
    const minha = oferta();
    encontro.oferecer(minha);
    const resposta = await encontro.esperar(600, new AbortController().signal);
    expect(resposta).toBe(minha);
    // Não ficou relógio nenhum esperando.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('quem espera é respondido quando a oferta chega, antes do prazo', async () => {
    const encontro = criarEncontro();
    const espera = encontro.esperar(600, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(400);
    const minha = oferta();
    encontro.oferecer(minha);
    expect(await espera).toBe(minha);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sem oferta no prazo, a resposta é nenhuma', async () => {
    const encontro = criarEncontro();
    const espera = encontro.esperar(600, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(599);
    let respondeu = false;
    void espera.then(() => {
      respondeu = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(respondeu).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await espera).toBeNull();
  });

  it('o sinal que aborta encerra a espera sem oferta e solta o relógio', async () => {
    const encontro = criarEncontro();
    const controle = new AbortController();
    const espera = encontro.esperar(600, controle.signal);
    controle.abort();
    expect(await espera).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    // Um sinal que já abortou nem começa a esperar.
    expect(await encontro.esperar(600, controle.signal)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a oferta retirada não responde mais a quem pergunta depois', async () => {
    const encontro = criarEncontro();
    const retirar = encontro.oferecer(oferta());
    retirar();
    const espera = encontro.esperar(600, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(600);
    expect(await espera).toBeNull();
  });

  it('retirar uma oferta antiga não tira a nova (o StrictMode oferece duas vezes)', async () => {
    const encontro = criarEncontro();
    const primeira = oferta();
    const retirarPrimeira = encontro.oferecer(primeira);
    retirarPrimeira();
    const segunda = oferta();
    encontro.oferecer(segunda);
    // Retirar de novo a primeira (já retirada) não mexe na segunda.
    retirarPrimeira();
    expect(await encontro.esperar(600, new AbortController().signal)).toBe(segunda);
  });

  it('várias esperas recebem a mesma oferta', async () => {
    const encontro = criarEncontro();
    const sinal = new AbortController().signal;
    const duas = [encontro.esperar(600, sinal), encontro.esperar(600, sinal)];
    const minha = oferta();
    encontro.oferecer(minha);
    expect(await Promise.all(duas)).toEqual([minha, minha]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
