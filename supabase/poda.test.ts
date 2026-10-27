// @vitest-environment node
// Poda do log remoto (F4-B, B5; plano §3), em PGlite: o que sai, o que fica, o ponto da poda e a
// reversão. A convergência dos aparelhos depois da poda está em `convergencia.test.ts`.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PRELUDIO } from './prelude-supabase';

const PASTA = path.join(import.meta.dirname, 'migrations');
const ARQUIVOS = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const MIGRACOES = ARQUIVOS.map((f) => readFileSync(path.join(PASTA, f), 'utf8'));
const ARQUIVO_B5 = '20261026000000_f4b_poda';
const DOWN = readFileSync(
  path.join(import.meta.dirname, 'rollback', `${ARQUIVO_B5}.down.sql`),
  'utf8',
);

const AP = (n: number) => `0199a6c4-0000-7000-8000-0000000000e${String(n)}`;
const ID = (n: number) => `0199a6c4-0000-7000-8000-${String(n).padStart(12, '0')}`;
const ts = (n: number) => `1790000${String(n).padStart(6, '0')}-000000-0000000a`;

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

let db: PGlite;
let usuarios = 0;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDIO);
  for (const sql of MIGRACOES) await db.exec(sql);
}, 60_000);

afterAll(async () => {
  await db.close();
});

async function como<T>(usuario: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('begin');
  try {
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${usuario}'`);
    const r = await fn();
    await db.exec('commit');
    return r;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

async function novoUsuario(): Promise<string> {
  usuarios += 1;
  const uid = `0199a6c4-0000-7000-8000-0000000a${String(usuarios).padStart(4, '0')}`;
  await db.exec(`insert into auth.users values ('${uid}')`);
  await db.exec(
    `update arretado.perfis set sincronizacao_liberada = true where usuario_id = '${uid}'`,
  );
  await como(uid, () => db.query("select arretado.aceitar_sincronizacao('v4:sincronizar')"));
  return uid;
}

type Entrada = Record<string, unknown>;

const enviar = (uid: string, aparelho: string, entradas: Entrada[]) =>
  como(uid, () =>
    db.query('select arretado.enviar_lote($1, 9::smallint, $2::jsonb)', [
      aparelho,
      JSON.stringify(entradas),
    ]),
  );

const registrar = (uid: string, aparelho: string, seq: number) =>
  como(uid, () =>
    db.query('select arretado.registrar_sincronia($1, $2, 9::smallint)', [aparelho, seq]),
  );

const numero = async (uid: string, sql: string) =>
  como(uid, async () => Number((await db.query<{ v: string }>(sql)).rows[0]?.v ?? 0));

const pontoDaPoda = (uid: string) => numero(uid, 'select arretado.ponto_da_poda() as v');
const instantaneo = (uid: string) => numero(uid, 'select arretado.instantaneo_inicio() as v');

async function podar(guarda = '30 days', ausencia = '90 days'): Promise<number> {
  const r = await db.query<{ v: string }>(
    'select arretado.podar_sincronizacao($1::interval, $2::interval) as v',
    [guarda, ausencia],
  );
  return Number(r.rows[0]?.v ?? 0);
}

interface Linha {
  seq: number;
  operacao: string;
  dias: number;
}

async function logDe(uid: string): Promise<Linha[]> {
  const r = await db.query<Linha>(
    `select seq::int as seq, operacao, extract(day from now() - recebido_em)::int as dias
       from arretado.alteracoes where usuario_id = $1 order by seq`,
    [uid],
  );
  return r.rows;
}

async function estadoDe(uid: string) {
  return (
    await db.query<{ dados: unknown; excluido_em: unknown }>(
      `select colecao, id, ts_logico, dados, excluido_em from arretado.registros
        where usuario_id = $1 order by colecao, id`,
      [uid],
    )
  ).rows;
}

const gravar = (uid: string, n: number, t: number) => ({
  ts: ts(t),
  colecao: 'erros',
  registro_id: ID(n),
  operacao: 'gravar',
  dados: { id: ID(n), usuarioId: uid, oQueFoi: `v${String(t)}` },
});

describe('podar_sincronizacao (plano §3)', () => {
  it.each(Array.from({ length: 12 }, (_, i) => i + 1))(
    'semente %i: só sai o velho que todos os aparelhos ativos receberam; estado intacto',
    async (semente) => {
      const sorteio = gerador(semente);
      const sorteie = (n: number) => Math.floor(sorteio() * n);
      const uid = await novoUsuario();
      const aparelhos = [AP(1), AP(2), AP(3)];
      let t = 0;
      const ultimoTs = new Map<number, number>();
      for (let lote = 0; lote < 12; lote++) {
        const aparelho = aparelhos[sorteie(3)] ?? AP(1);
        const entradas: Entrada[] = [];
        for (let i = 0; i < 1 + sorteie(4); i++) {
          t += 1;
          const n = 1 + sorteie(6);
          const base = ultimoTs.get(n);
          if (sorteio() < 0.15) {
            entradas.push({
              ts: ts(t),
              colecao: 'adesoes',
              registro_id: ID(900 + t),
              operacao: 'acervo-adesao',
              dados: { itemId: 'x' },
            });
          } else if (base === undefined) {
            entradas.push(gravar(uid, n, t));
            ultimoTs.set(n, t);
          } else {
            entradas.push({
              ts: ts(t),
              colecao: 'erros',
              registro_id: ID(n),
              operacao: 'atualizar',
              dados: { oQueFoi: `v${String(t)}` },
              base_ts: ts(base),
            });
            ultimoTs.set(n, t);
          }
        }
        await enviar(uid, aparelho, entradas);
      }
      const log = await logDe(uid);
      // Idades sorteadas por entrada (0–59 dias); aparelhos vistos há 0–119 dias.
      for (const l of log) {
        await db.query(
          `update arretado.alteracoes set recebido_em = now() - $2::int * interval '1 day' where seq = $1`,
          [l.seq, sorteie(60)],
        );
      }
      const vistos = new Map<string, { seq: number; dias: number }>();
      for (const ap of aparelhos) {
        if (sorteio() < 0.2) continue; // aparelho que nunca registrou não segura nada
        const seq = log[sorteie(log.length)]?.seq ?? 0;
        await registrar(uid, ap, seq);
        const dias = sorteie(120);
        await db.query(
          `update arretado.aparelhos_sync set visto_em = now() - $3::int * interval '1 day'
            where usuario_id = $1 and aparelho_id = $2`,
          [uid, ap, dias],
        );
        vistos.set(ap, { seq, dias });
      }
      const antes = await logDe(uid);
      const estadoAntes = await estadoDe(uid);

      await podar();

      const ativos = [...vistos.values()].filter((v) => v.dias < 90);
      const corte = ativos.length === 0 ? -1 : Math.min(...ativos.map((v) => v.seq));
      const deveSair = (l: Linha) =>
        l.seq <= corte && l.dias >= 30 && l.operacao !== 'acervo-adesao';
      expect(await logDe(uid)).toEqual(antes.filter((l) => !deveSair(l)));
      expect(await estadoDe(uid)).toEqual(estadoAntes);
      const saidas = antes.filter(deveSair).map((l) => l.seq);
      expect(await pontoDaPoda(uid)).toBe(saidas.length === 0 ? 0 : Math.max(...saidas));
      expect(await instantaneo(uid)).toBeGreaterThanOrEqual(await pontoDaPoda(uid));

      // Repetir a poda não muda nada.
      const depois = await logDe(uid);
      await podar();
      expect(await logDe(uid)).toEqual(depois);
    },
    30_000,
  );

  it('log todo podado: o instantâneo não recua abaixo do ponto da poda', async () => {
    const uid = await novoUsuario();
    await enviar(uid, AP(1), [gravar(uid, 1, 1), gravar(uid, 2, 2)]);
    const maior = await instantaneo(uid);
    await registrar(uid, AP(1), maior);
    await db.query(
      `update arretado.alteracoes set recebido_em = now() - interval '40 days' where usuario_id = $1`,
      [uid],
    );
    await podar();
    expect(await logDe(uid)).toEqual([]);
    expect(await pontoDaPoda(uid)).toBe(maior);
    expect(await instantaneo(uid)).toBe(maior);
    // Um aparelho novo registra o que recebeu (o instantâneo) sem cair abaixo do ponto.
    await registrar(uid, AP(2), maior);
    const r = await db.query<{ v: string }>(
      'select ultimo_seq_recebido as v from arretado.aparelhos_sync where aparelho_id = $1 and usuario_id = $2',
      [AP(2), uid],
    );
    expect(Number(r.rows[0]?.v)).toBe(maior);
  });

  it('lápide com mais de 90 dias fica só com id e dono', async () => {
    const uid = await novoUsuario();
    await enviar(uid, AP(1), [gravar(uid, 1, 1)]);
    await enviar(uid, AP(1), [
      { ts: ts(2), colecao: 'erros', registro_id: ID(1), operacao: 'remover', base_ts: ts(1) },
    ]);
    await podar();
    expect((await estadoDe(uid))[0]).toMatchObject({ dados: { oQueFoi: 'v1' } });
    await db.query(
      `update arretado.registros set excluido_em = now() - interval '91 days' where usuario_id = $1`,
      [uid],
    );
    await podar();
    const [lapide] = await estadoDe(uid);
    expect(lapide).toMatchObject({ dados: { id: ID(1), usuarioId: uid }, ts_logico: ts(2) });
    expect(lapide?.excluido_em).not.toBeNull();
  });

  it('o cliente não roda a poda nem lê a tabela da poda; cada conta vê só o seu ponto', async () => {
    const uid = await novoUsuario();
    const outro = await novoUsuario();
    await expect(
      como(uid, () => db.query('select arretado.podar_sincronizacao()')),
    ).rejects.toThrow(/permission denied/);
    await expect(como(uid, () => db.query('select * from arretado.poda_sync'))).rejects.toThrow(
      /permission denied/,
    );
    await db.query(`insert into arretado.poda_sync (usuario_id, podado_ate) values ($1, 77)`, [
      outro,
    ]);
    expect(await pontoDaPoda(uid)).toBe(0);
    expect(await pontoDaPoda(outro)).toBe(77);
  });
});

describe('reversão (B5)', () => {
  async function foto(d: PGlite) {
    const q = async (sql: string) => (await d.query<Record<string, unknown>>(sql)).rows;
    return {
      tabelas: await q(`select relname, relacl::text as acl, relrowsecurity, relforcerowsecurity
        from pg_class where relnamespace = 'arretado'::regnamespace and relkind = 'r' order by 1`),
      funcoes: await q(`select proname, pg_get_function_identity_arguments(oid) as args, prosecdef,
        proacl::text as acl, prosrc from pg_proc where pronamespace = 'arretado'::regnamespace
        order by 1, 2`),
    };
  }

  it('o down devolve o esquema anterior e o up volta a aplicar com o mesmo resultado', async () => {
    const d = new PGlite();
    try {
      await d.exec(PRELUDIO);
      const i = ARQUIVOS.findIndex((f) => f.startsWith(ARQUIVO_B5));
      for (const sql of MIGRACOES.slice(0, i)) await d.exec(sql);
      const antes = await foto(d);
      await d.exec(MIGRACOES[i] ?? '');
      const comB5 = await foto(d);
      expect(comB5).not.toEqual(antes);
      await d.exec(DOWN);
      expect(await foto(d)).toEqual(antes);
      await d.exec(MIGRACOES[i] ?? '');
      expect(await foto(d)).toEqual(comB5);
    } finally {
      await d.close();
    }
  }, 60_000);
});
