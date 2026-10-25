import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repositorioDeTeste } from '../../testes/repositorio';
import { registrarConsentimento } from '../preferencias';
import { iniciarSincronizacao } from './iniciar';
import type { ServidorDeSincronizacao } from './tipos';

// Capturado antes do relógio falso, para dar voltas reais.
const setTimeoutReal = globalThis.setTimeout;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
});

async function cenario() {
  const { repo } = await repositorioDeTeste();
  const conta = servidorFalso();
  const identidade = (await repo.db.meta.get('identidade'))?.valor as { usuarioId: string };
  return { repo, conta, usuarioId: identidade.usuarioId };
}

describe('iniciarSincronizacao', () => {
  it('sem o aceite da sincronização não envia nada', async () => {
    const { repo, conta, usuarioId } = await cenario();
    const s = await iniciarSincronizacao({
      repo,
      servidor: conta.servidor,
      usuarioId,
    });
    await avancar(60_000);
    s.pedir();
    await avancar(60_000);
    expect(conta.lotesRecebidos).toHaveLength(0);
  });

  it('com o aceite envia o que ficou pendente e o que for gravado depois', async () => {
    const { repo, conta, usuarioId } = await cenario();
    await registrarConsentimento(repo, 'sincronizar');
    const terminou = vi.fn();
    const s = await iniciarSincronizacao({
      repo,
      servidor: conta.servidor,
      usuarioId,
      aoTerminar: terminou,
    });
    await avancar(10_000);
    expect(conta.lotesRecebidos.length).toBeGreaterThan(0);
    const antes = conta.lotesRecebidos.length;
    await alterarAlgo(repo);
    await avancar(10_000);
    expect(conta.lotesRecebidos.length).toBeGreaterThan(antes);
    expect(terminou).toHaveBeenCalled();
    s.parar();
  });

  it('parar cancela envios futuros', async () => {
    const { repo, conta, usuarioId } = await cenario();
    await registrarConsentimento(repo, 'sincronizar');
    const s = await iniciarSincronizacao({
      repo,
      servidor: conta.servidor,
      usuarioId,
    });
    await avancar(10_000);
    s.parar();
    const antes = conta.lotesRecebidos.length;
    await alterarAlgo(repo);
    await avancar(60_000);
    expect(conta.lotesRecebidos).toHaveLength(antes);
  });
});

async function alterarAlgo(repo: Awaited<ReturnType<typeof cenario>>['repo']) {
  await registrarConsentimento(repo, 'backup-nuvem');
}

/** Avança o relógio falso e dá voltas reais para o IndexedDB falso terminar o que o timer iniciou. */
async function avancar(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 20; i += 1) await new Promise<void>((r) => setTimeoutReal(r, 0));
}

function servidorFalso() {
  const lotesRecebidos: unknown[][] = [];
  const servidor: ServidorDeSincronizacao = {
    enviarLote: (_aparelho, _versao, entradas) => {
      lotesRecebidos.push(entradas);
      return Promise.resolve({ seq_max: lotesRecebidos.length, divergentes: [] });
    },
  };
  return { servidor, lotesRecebidos };
}
