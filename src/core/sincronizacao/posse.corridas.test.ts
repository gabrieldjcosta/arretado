// Corridas na posse (criarPosse) e a descarga antes de ceder, apontadas na revisão do PR #299.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarPosse, type EstadoDePosse } from './posse';
import type { RespostaDePosse } from './tipos';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Servidor cujas respostas o teste solta na ordem que quiser. */
function servidorControlado() {
  const fila: { aparelhoId: string; forcar: boolean; resolver: (r: RespostaDePosse) => void }[] =
    [];
  let dono: string | null = null;
  return {
    fila,
    get dono() {
      return dono;
    },
    pedirPosse(aparelhoId: string, forcar: boolean): Promise<RespostaDePosse> {
      return new Promise((resolver) => {
        // O servidor decide na hora da chegada; só a resposta atrasa.
        const livre = dono === null || dono === aparelhoId;
        let r: RespostaDePosse;
        if (livre || forcar) {
          dono = aparelhoId;
          r = { concedida: true, aparelho_id: aparelhoId };
        } else {
          r = { concedida: false, aparelho_id: dono ?? '', ultimo_sinal: new Date().toISOString() };
        }
        fila.push({
          aparelhoId,
          forcar,
          resolver: () => {
            resolver(r);
          },
        });
      });
    },
    soltarPosse(aparelhoId: string): Promise<void> {
      if (dono === aparelhoId) dono = null;
      return Promise.resolve();
    },
  };
}

describe('posse: corridas', () => {
  it('resposta atrasada da renovação desfaz o "Passar a editar aqui" e trava a escrita por até 30 s', async () => {
    const servidor = servidorControlado();
    const estados: EstadoDePosse[] = [];
    const antesDePerder = vi.fn(() => Promise.resolve());
    const b = criarPosse({
      servidor,
      aparelhoId: 'B',
      aoMudar: (e) => estados.push(e),
      antesDePerder,
      visivel: () => true,
    });
    // A tem a posse e está em uso.
    const posseDeA = servidor.pedirPosse('A', false);
    servidor.fila.pop()?.resolver({ concedida: true, aparelho_id: 'A' });
    await posseDeA;

    // 1) Renovação periódica de B sai (sem forçar) e a resposta demora.
    const renovacao = b.pedir();
    expect(servidor.fila).toHaveLength(1);
    // 2) A pessoa toca "Passar a editar aqui": chamada forçada sai em paralelo e responde primeiro.
    const forcada = b.pedir(true);
    expect(servidor.fila).toHaveLength(2);
    servidor.fila[1]?.resolver({ concedida: true, aparelho_id: 'B' });
    await expect(forcada).resolves.toEqual({ tipo: 'minha' });
    expect(servidor.dono).toBe('B');

    // 3) Agora chega a resposta antiga ("A é o dono"), já desatualizada.
    servidor.fila[0]?.resolver({
      concedida: false,
      aparelho_id: 'A',
      ultimo_sinal: '2026-10-25T12:00:00.000Z',
    });
    await renovacao;

    // O servidor diz que B é o dono, mas o cliente voltou a "de-outro" e disparou antesDePerder.
    expect(servidor.dono).toBe('B');
    expect(b.estado()).toEqual({ tipo: 'minha' });
    expect(antesDePerder).not.toHaveBeenCalled();
    b.parar();
  });

  it('soltar (aba oculta) com pedido em voo deixa o cliente em "parada" enquanto o servidor concedeu', async () => {
    const servidor = servidorControlado();
    let visivel = true;
    const a = criarPosse({
      servidor,
      aparelhoId: 'A',
      aoMudar: () => undefined,
      visivel: () => visivel,
      ocultaMs: 1_000,
    });
    const primeiro = a.pedir();
    servidor.fila.pop()?.resolver({ concedida: true, aparelho_id: 'A' });
    await primeiro;
    expect(a.estado()).toEqual({ tipo: 'minha' });

    // Aba some; 1 s depois o `soltar` dispara. A pessoa volta antes de o servidor responder ao soltar?
    // Aqui o soltar resolve, mas a visibilidade volta e um `pedir` sai; a ordem das respostas é livre.
    visivel = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1_000);
    // soltar() já rodou: servidor sem dono, estado 'parada'. Volta à vista: pedir sai e é concedido.
    visivel = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(servidor.fila).toHaveLength(1);
    servidor.fila[0]?.resolver({ concedida: true, aparelho_id: 'A' });
    await vi.advanceTimersByTimeAsync(0);
    expect(a.estado()).toEqual({ tipo: 'minha' });
    a.parar();
  });
});

// ── antesDePerder espera o envio: pedir(true) durante uma rodada faz a próxima sair na hora ──────
import { criarAgendador } from './agendador';

describe('agendador: pedir(true) com rodada em andamento', () => {
  it('a próxima rodada sai assim que a atual termina, sem o atraso de juntar', async () => {
    let terminarRodada: () => void = () => undefined;
    let rodadas = 0;
    const agendador = criarAgendador({
      executar: () =>
        new Promise<void>((resolver) => {
          rodadas += 1;
          terminarRodada = () => {
            resolver();
          };
        }),
    });
    agendador.pedir(true); // rodada 1 em andamento (digamos, puxando o log)
    await vi.advanceTimersByTimeAsync(0);
    expect(rodadas).toBe(1);

    agendador.pedir(true); // "antes de perder": o pendente precisa subir já
    terminarRodada();
    await vi.advanceTimersByTimeAsync(0);
    expect(rodadas).toBe(2);
    agendador.parar();
  });

  it('pedir() comum durante a rodada ainda espera o atraso', async () => {
    let terminarRodada: () => void = () => undefined;
    let rodadas = 0;
    const agendador = criarAgendador({
      executar: () =>
        new Promise<void>((resolver) => {
          rodadas += 1;
          terminarRodada = () => {
            resolver();
          };
        }),
    });
    agendador.pedir(true);
    await vi.advanceTimersByTimeAsync(0);
    agendador.pedir();
    terminarRodada();
    await vi.advanceTimersByTimeAsync(0);
    expect(rodadas).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(rodadas).toBe(2);
    agendador.parar();
  });
});
