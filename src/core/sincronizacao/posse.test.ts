import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarPosse, type EstadoDePosse } from './posse';
import { FalhaDeSincronizacao, type RespostaDePosse } from './tipos';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Servidor de posse em memória com a regra de `pedir_posse`: dono parado há 60 s perde sem pergunta. */
function servidorDePosse() {
  let dono: { aparelhoId: string; sinalEm: number } | null = null;
  const chamadas: { aparelhoId: string; forcar: boolean }[] = [];
  let semRede = false;
  return {
    chamadas,
    get dono() {
      return dono?.aparelhoId ?? null;
    },
    cairRede(valor: boolean) {
      semRede = valor;
    },
    pedirPosse(aparelhoId: string, forcar: boolean): Promise<RespostaDePosse> {
      chamadas.push({ aparelhoId, forcar });
      if (semRede) return Promise.reject(new FalhaDeSincronizacao('sem rede', false));
      const agora = Date.now();
      const atual = dono;
      const livre = !atual || atual.aparelhoId === aparelhoId || agora - atual.sinalEm > 60_000;
      if (!atual || livre || forcar) {
        dono = { aparelhoId, sinalEm: agora };
        return Promise.resolve({ concedida: true, aparelho_id: aparelhoId });
      }
      return Promise.resolve({
        concedida: false,
        aparelho_id: atual.aparelhoId,
        ultimo_sinal: new Date(atual.sinalEm).toISOString(),
      });
    },
    soltarPosse(aparelhoId: string): Promise<void> {
      if (dono?.aparelhoId === aparelhoId) dono = null;
      return Promise.resolve();
    },
  };
}

function controle(servidor: ReturnType<typeof servidorDePosse>, aparelhoId: string) {
  const estados: EstadoDePosse[] = [];
  const posse = criarPosse({
    servidor,
    aparelhoId,
    aoMudar: (e) => estados.push(e),
    visivel: () => true,
  });
  return { posse, estados };
}

describe('posse de aparelho (D17)', () => {
  it('quem só tem um aparelho recebe a posse sem ver nada e a renova a cada 30 s', async () => {
    const servidor = servidorDePosse();
    const { posse, estados } = controle(servidor, 'A');
    await expect(posse.pedir()).resolves.toEqual({ tipo: 'minha' });
    await vi.advanceTimersByTimeAsync(90_000);
    expect(servidor.chamadas.filter((c) => c.aparelhoId === 'A')).toHaveLength(4);
    expect(estados).toEqual([{ tipo: 'minha' }]); // renovação não repete o aviso
    posse.parar();
  });

  it('com o outro aparelho em uso, fica de leitura; "passar para cá" assume e o outro perde na renovação', async () => {
    const servidor = servidorDePosse();
    const a = controle(servidor, 'A');
    await a.posse.pedir();
    const b = controle(servidor, 'B');
    await expect(b.posse.pedir()).resolves.toMatchObject({ tipo: 'de-outro', aparelhoId: 'A' });

    await expect(b.posse.pedir(true)).resolves.toEqual({ tipo: 'minha' });
    expect(servidor.dono).toBe('B');
    // A renova em até 30 s, descobre que perdeu e vira só leitura.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(a.posse.estado()).toMatchObject({ tipo: 'de-outro', aparelhoId: 'B' });
    a.posse.parar();
    b.posse.parar();
  });

  it('antes de ceder a posse, descarrega o que tem pendente', async () => {
    const servidor = servidorDePosse();
    const descarregou = vi.fn(() => Promise.resolve());
    const a = criarPosse({
      servidor,
      aparelhoId: 'A',
      aoMudar: () => undefined,
      antesDePerder: descarregou,
      visivel: () => true,
    });
    await a.pedir();
    await servidor.pedirPosse('B', true);
    await a.pedir();
    expect(descarregou).toHaveBeenCalledTimes(1);
    expect(a.estado()).toMatchObject({ tipo: 'de-outro' });
    a.parar();
  });

  it('dono parado há mais de 60 s perde sem pergunta', async () => {
    const servidor = servidorDePosse();
    await servidor.pedirPosse('A', false);
    await vi.advanceTimersByTimeAsync(61_000);
    const b = controle(servidor, 'B');
    await expect(b.posse.pedir()).resolves.toEqual({ tipo: 'minha' });
    b.posse.parar();
  });

  it('sem rede: quem tinha a posse segue editando; quem não tinha fica "sem confirmação" (Q1)', async () => {
    const servidor = servidorDePosse();
    const a = controle(servidor, 'A');
    await a.posse.pedir();
    servidor.cairRede(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(a.posse.estado()).toEqual({ tipo: 'minha' });
    const b = controle(servidor, 'B');
    await expect(b.posse.pedir()).resolves.toEqual({ tipo: 'sem-confirmacao' });
    a.posse.parar();
    b.posse.parar();
  });

  it('soltar devolve a posse e o próximo pedido reconquista sem pergunta', async () => {
    const servidor = servidorDePosse();
    const a = controle(servidor, 'A');
    await a.posse.pedir();
    await a.posse.soltar();
    expect(a.posse.estado()).toEqual({ tipo: 'parada' });
    const b = controle(servidor, 'B');
    await expect(b.posse.pedir()).resolves.toEqual({ tipo: 'minha' });
    a.posse.parar();
    b.posse.parar();
  });

  it('depois de parar, não pede mais', async () => {
    const servidor = servidorDePosse();
    const a = controle(servidor, 'A');
    await a.posse.pedir();
    a.posse.parar();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(servidor.chamadas).toHaveLength(1);
  });
});
