// Carga sintética (F0, atividade 1.8): `npm run carga`.
// Mede no fake-indexeddb (Node); a medição no navegador real entra no E2E do backup.
import { gerarCarga } from '../src/testes/carga';
import { repositorioDeTeste } from '../src/testes/repositorio';

/** Limiares em ms (mediana de 5 execuções). */
const LIMIARES = {
  paginaRecente: 50,
  filaDoDia: 100,
  porIndiceSimples: 50,
  contagem: 200,
};

async function mediana(fn: () => Promise<unknown>, vezes = 5): Promise<number> {
  const tempos: number[] = [];
  for (let i = 0; i < vezes; i++) {
    const t = performance.now();
    await fn();
    tempos.push(performance.now() - t);
  }
  tempos.sort((a, b) => a - b);
  return tempos[Math.floor(vezes / 2)] ?? Infinity;
}

describe('carga sintética de 10 mil registros', () => {
  it('grava e consulta dentro dos limiares', async () => {
    const { repo } = await repositorioDeTeste();
    const t0 = performance.now();
    const total = await gerarCarga(repo);
    const tempoCarga = performance.now() - t0;
    expect(total).toBe(10_000);

    const u = repo.ctx.usuarioId;
    const erros = repo.colecao('erros');
    const cartoes = repo.colecao('cartoes');
    const medidas = {
      paginaRecente: await mediana(() =>
        erros.listarPagina({ indice: '[usuarioId+criadoEm]', ordem: 'desc', limite: 50 }),
      ),
      filaDoDia: await mediana(() =>
        cartoes.listarPagina({
          indice: '[usuarioId+estado+proximaRevisao]',
          de: [u, 'ativo', ''],
          ate: [u, 'ativo', '2026-06-01'],
          limite: 200,
        }),
      ),
      porIndiceSimples: await mediana(() =>
        repo.colecao('revisoes').listarPagina({ indice: 'usuarioId', de: u, ate: u, limite: 50 }),
      ),
      contagem: await mediana(() =>
        cartoes.contar({
          indice: '[usuarioId+estado+proximaRevisao]',
          de: [u, 'ativo', ''],
          ate: [u, 'ativo', '2026-06-01'],
        }),
      ),
    };
    process.stdout.write(
      `Carga sintética (ms): ${JSON.stringify({ carga: Math.round(tempoCarga), ...medidas }, (_, v: unknown) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v))}\n`,
    );
    for (const [nome, ms] of Object.entries(medidas)) {
      expect(ms, nome).toBeLessThan(LIMIARES[nome as keyof typeof LIMIARES]);
    }
  });
});
