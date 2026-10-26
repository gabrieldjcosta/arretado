// Poda do log local (B5, plano §3): propriedade com gerador de semente fixa (falha reprodutível).
import 'fake-indexeddb/auto';
import type { NomeColecao } from '../modelo';
import { camposMinimos } from '../modelo/fabrica';
import { reconstruirDoLog, Repositorio, type Alteracao } from '../persistencia';
import { CHAVE_SEQ_ENVIADO } from './envio';
import { ultimoTsDoRegistro } from './log-local';
import { CHAVE_PODA_LOCAL, compactarLog, podarLogLocal } from './poda-local';
import { sincroniza } from './politica';

function gerador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIA = 24 * 60 * 60 * 1000;
const INICIO = Date.parse('2026-06-01T00:00:00.000Z');
const APARELHOS = ['aaaaaaaa', 'bbbbbbbb'];
const COLECOES: NomeColecao[] = ['erros', 'preferencias', 'usuarios', 'dispositivos'];
const carimbo = (ms: number, n: number, ap: string) =>
  `${String(ms).padStart(13, '0')}-${String(n).padStart(6, '0')}-${ap}`;

/** Log aleatório coerente: `atualizar` e `remover` só sobre registro vivo, carimbos crescentes por aparelho. */
function logAleatorio(semente: number, tamanho = 120): Alteracao[] {
  const sorteio = gerador(semente);
  const sorteie = <T>(xs: readonly T[]): T => xs[Math.floor(sorteio() * xs.length)] as T;
  const vivos = new Map<string, NomeColecao>();
  const log: Alteracao[] = [];
  let ms = INICIO;
  for (let seq = 1; seq <= tamanho; seq++) {
    ms += Math.floor(sorteio() * 2 * DIA);
    const aparelho = sorteie(APARELHOS);
    const base = { seq, ts: carimbo(ms, seq, aparelho), aparelhoId: aparelho, usuarioId: 'u' };
    const acao = sorteio();
    const ids = [...vivos.keys()];
    if (acao < 0.3 || ids.length === 0) {
      const colecao = sorteie(COLECOES);
      const id = `r${String(seq)}`;
      vivos.set(id, colecao);
      log.push({ ...base, colecao, registroId: id, operacao: 'gravar', dados: { id, n: seq } });
    } else if (acao < 0.85) {
      const id = sorteie(ids);
      const colecao = vivos.get(id) as NomeColecao;
      // Em preferências, metade das edições é só de aparência (não sincroniza).
      const campo = colecao === 'preferencias' && sorteio() < 0.5 ? 'tema' : `c${String(seq % 3)}`;
      const removidos = sorteio() < 0.2 ? ['c0'] : undefined;
      log.push({
        ...base,
        colecao,
        registroId: id,
        operacao: 'atualizar',
        dados: { [campo]: seq },
        ...(removidos ? { removidos } : {}),
      });
    } else {
      const id = sorteie(ids);
      const colecao = vivos.get(id) as NomeColecao;
      vivos.delete(id);
      log.push({ ...base, colecao, registroId: id, operacao: 'remover' });
    }
  }
  return log;
}

function aplicar(log: readonly Alteracao[], { apagar, trocar }: ReturnType<typeof compactarLog>) {
  const fora = new Set(apagar);
  const novas = new Map(trocar.map((a) => [a.seq, a]));
  return log.filter((a) => !fora.has(a.seq ?? -1)).map((a) => novas.get(a.seq) ?? a);
}

/** O `base_ts` que o próximo envio usaria para cada registro. */
function bases(log: readonly Alteracao[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of log) if (sincroniza(a)) m.set(`${a.colecao}/${a.registroId}`, a.ts);
  return m;
}

describe('compactarLog: propriedade (plano §3)', () => {
  it.each(Array.from({ length: 60 }, (_, i) => i + 1))(
    'semente %i: mesmo estado, mesmo base_ts, nada fora do corte, repetir não muda nada',
    (semente) => {
      const log = logAleatorio(semente);
      const sorteio = gerador(semente * 7919);
      const ateSeq = Math.floor(sorteio() * log.length);
      const antesDeMs = INICIO + Math.floor(sorteio() * 240 * DIA);
      const corte = { ateSeq, antesDeMs };

      const passo = compactarLog(log, corte);
      const podado = aplicar(log, passo);

      expect(reconstruirDoLog(podado)).toEqual(reconstruirDoLog(log));
      expect(bases(podado)).toEqual(bases(log));
      const mexidas = new Set([...passo.apagar, ...passo.trocar.map((a) => a.seq)]);
      for (const a of log) {
        if (!mexidas.has(a.seq ?? -1)) continue;
        expect(a.seq).toBeLessThanOrEqual(ateSeq);
        expect(Number(a.ts.slice(0, 13))).toBeLessThan(antesDeMs);
        expect(a.colecao).not.toBe('dispositivos');
      }
      // O maior carimbo continua no log (o relógio lógico reabre a partir dele).
      expect(
        podado
          .map((a) => a.ts)
          .sort()
          .at(-1),
      ).toBe(
        log
          .map((a) => a.ts)
          .sort()
          .at(-1),
      );
      // Repetir a poda não muda nada.
      expect(compactarLog(podado, corte)).toEqual({ apagar: [], trocar: [] });
    },
  );

  it('acervo-adesao e atualizar sem gravar antes ficam intactos', () => {
    const velho = INICIO;
    const base = { aparelhoId: 'aaaaaaaa', usuarioId: 'u' };
    const log: Alteracao[] = [
      {
        ...base,
        seq: 1,
        ts: carimbo(velho, 1, 'aaaaaaaa'),
        colecao: 'dispositivos',
        registroId: 'lote',
        operacao: 'acervo-adesao',
        dados: {},
      },
      {
        ...base,
        seq: 2,
        ts: carimbo(velho, 2, 'aaaaaaaa'),
        colecao: 'leituras',
        registroId: 'l',
        operacao: 'atualizar',
        dados: { a: 1 },
      },
      {
        ...base,
        seq: 3,
        ts: carimbo(velho, 3, 'aaaaaaaa'),
        colecao: 'leituras',
        registroId: 'l',
        operacao: 'atualizar',
        dados: { a: 2 },
      },
    ];
    expect(compactarLog(log, { ateSeq: 99, antesDeMs: velho + DIA })).toEqual({
      apagar: [],
      trocar: [],
    });
  });
});

const DONO = '0199a6c4-0000-7000-8000-0000000000d1';

describe('podarLogLocal (banco de verdade)', () => {
  it('só compacta o que já subiu e tem mais de 30 dias; roda uma vez por dia', async () => {
    const tempo = { ms: Date.parse('2026-07-01T12:00:00.000Z') };
    const agora = () => new Date(tempo.ms);
    const repo = await Repositorio.abrir({
      nomeBanco: `poda-local-${Math.random().toString(36).slice(2)}`,
      usuarioId: DONO,
      agora,
    });
    try {
      const erros = repo.colecao('erros');
      const e = await erros.criar({ ...camposMinimos('erros', DONO), oQueFoi: 'v1' });
      for (let i = 2; i <= 5; i++) await erros.atualizar(e.id, { oQueFoi: `v${String(i)}` });
      const confirmadoAte = (await repo.db.alteracoes.orderBy(':id').last())?.seq ?? 0;
      await repo.db.meta.put({ chave: CHAVE_SEQ_ENVIADO, valor: confirmadoAte });
      tempo.ms += 40 * DIA;
      await erros.atualizar(e.id, { oQueFoi: 'pendente' }); // ainda não subiu
      const antes = await repo.db.alteracoes.toArray();
      const baseAntes = await ultimoTsDoRegistro(repo.db, 'erros', e.id, confirmadoAte + 1);

      const saiu = await podarLogLocal(repo.db, agora);

      const depois = await repo.db.alteracoes.toArray();
      expect(saiu).toBeGreaterThan(0);
      expect(depois.length).toBe(antes.length - saiu);
      expect(reconstruirDoLog(depois)).toEqual(reconstruirDoLog(antes));
      expect(depois.at(-1)).toEqual(antes.at(-1)); // a pendência não foi tocada
      expect(await ultimoTsDoRegistro(repo.db, 'erros', e.id, confirmadoAte + 1)).toBe(baseAntes);
      expect((await repo.db.meta.get(CHAVE_PODA_LOCAL))?.valor).toBe(agora().toISOString());

      // Menos de um dia depois: não roda de novo.
      await repo.db.meta.put({ chave: CHAVE_SEQ_ENVIADO, valor: confirmadoAte + 99 });
      tempo.ms += DIA / 2;
      expect(await podarLogLocal(repo.db, agora)).toBe(0);
    } finally {
      repo.fechar();
    }
  });
});
