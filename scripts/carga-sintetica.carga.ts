// Carga sintética (F0, atividade 1.8; F2, 9.4): `npm run carga`.
// Mede no fake-indexeddb (Node); a medição no navegador real entra no E2E do backup e no do leitor
// (9.6).
import { abrirNorma, lerJanela } from '../src/dominios/legislacao/leitor';
import { criarRascunho, publicarVersao } from '../src/dominios/legislacao/servico';
import { gerarCarga } from '../src/testes/carga';
import { blocosDeNormaSintetica } from '../src/testes/norma-sintetica';
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

/**
 * Leitura da norma (F2, 9.4), em ms (mediana de 5): abrir (norma, versão e a árvore inteira, sem
 * textos) com a primeira janela de textos; e uma janela de 100 textos no meio e no fim. O limiar
 * da entrega é 1 s para abrir; a janela, que o leitor pede a cada rolagem, tem limiar próprio.
 */
const LIMIARES_LEITURA = {
  abertura: 1_000,
  janelaNoMeio: 200,
  janelaNoFim: 200,
};

describe('carga sintética da leitura: norma de 5 mil dispositivos', () => {
  it('abre e lê por janela dentro dos limiares, com os 10 mil registros ao lado', async () => {
    const { repo } = await repositorioDeTeste();
    await gerarCarga(repo);
    const t0 = performance.now();
    const { versao } = await criarRascunho(repo, {
      blocos: blocosDeNormaSintetica(5_000),
      origemEntrada: 'html',
    });
    const { norma } = await publicarVersao(repo, versao.id);
    const tempoGravar = performance.now() - t0;

    const aberta = await abrirNorma(repo, norma.id);
    const total = aberta.nos.length;
    expect(total).toBeGreaterThanOrEqual(5_000);
    const janela = (inicio: number) => lerJanela(repo, aberta, { inicio, quantidade: 100 });
    const lidos = await janela(total - 100);
    expect(lidos).toHaveLength(100);
    expect(lidos.every((item) => item.texto !== undefined)).toBe(true);

    const medidas = {
      abertura: await mediana(async () => {
        const a = await abrirNorma(repo, norma.id);
        await lerJanela(repo, a, { inicio: 0, quantidade: 50 });
      }),
      janelaNoMeio: await mediana(() => janela(Math.floor(total / 2))),
      janelaNoFim: await mediana(() => janela(total - 100)),
    };
    process.stdout.write(
      `Carga da leitura (ms; ${String(total)} dispositivos): ${JSON.stringify({ gravarEPublicar: Math.round(tempoGravar), ...medidas }, (_, v: unknown) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v))}\n`,
    );
    for (const [nome, ms] of Object.entries(medidas)) {
      expect(ms, nome).toBeLessThan(LIMIARES_LEITURA[nome as keyof typeof LIMIARES_LEITURA]);
    }
  });
});
