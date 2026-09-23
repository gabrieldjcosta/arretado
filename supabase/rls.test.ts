// @vitest-environment node
// Teste de RLS (F0, atividade 4.2): a migração roda num Postgres local (PGlite) com um
// prelúdio que imita o Supabase (esquema auth, auth.uid(), papéis anon/authenticated).
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { ENTIDADES, NOMES_COLECOES } from '../src/core/modelo';

const PASTA = path.join(import.meta.dirname, 'migrations');
const MIGRACOES = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(path.join(PASTA, f), 'utf8'));

const PRELUDIO = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

const A = '0199a6c4-0000-7000-8000-00000000000a';
const B = '0199a6c4-0000-7000-8000-00000000000b';
const TS = '1790000000000-000000-0000000a';

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDIO);
  for (const sql of MIGRACOES) await db.exec(sql);
  await db.exec(`insert into auth.users values ('${A}'), ('${B}');`);
});

afterAll(async () => {
  await db.close();
});

/** Executa como um papel/usuário, numa transação sempre desfeita. */
async function como<T>(
  papel: 'anon' | 'authenticated',
  usuario: string | null,
  fn: () => Promise<T>,
) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${papel}`);
    if (usuario) await db.exec(`set local request.jwt.claim.sub = '${usuario}'`);
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}

function erro(id: string, dono: string) {
  const dados = JSON.stringify({ id, usuarioId: dono, oQueFoi: 'x' });
  return db.query(
    `insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
     values ('erros', $1, $2, $3, now(), $4::jsonb)`,
    [id, dono, TS, dados],
  );
}

async function contar(sql: string): Promise<number> {
  const r = await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`);
  return r.rows[0]?.n ?? -1;
}

const ID_A = '0199a6c4-0000-7000-8000-0000000000a1';
const ID_B = '0199a6c4-0000-7000-8000-0000000000b1';

describe('RLS do esquema remoto', () => {
  beforeAll(async () => {
    // Dados de A e B gravados cada um pelo próprio dono (confirmados fora da transação desfeita).
    for (const [dono, id] of [
      [A, ID_A],
      [B, ID_B],
    ] as const) {
      await db.exec('begin');
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${dono}'`);
      await erro(id, dono);
      await db.exec('commit');
    }
  });

  it('usuário A só vê os próprios registros', async () => {
    expect(await como('authenticated', A, () => contar('arretado.registros'))).toBe(1);
    const ids = await como('authenticated', A, () =>
      db.query<{ id: string }>('select id from arretado.registros'),
    );
    expect(ids.rows.map((r) => r.id)).toEqual([ID_A]);
  });

  it('A não grava registro em nome de B', async () => {
    await expect(
      como('authenticated', A, () => erro('0199a6c4-0000-7000-8000-0000000000a2', B)),
    ).rejects.toThrow(/row-level security/);
  });

  it('A não altera nem apaga registro de B', async () => {
    const r = await como('authenticated', A, async () => {
      const u = await db.query(
        `update arretado.registros set excluido_em = now() where id = '${ID_B}'`,
      );
      const d = await db.query(`delete from arretado.registros where id = '${ID_B}'`);
      return [u.affectedRows, d.affectedRows];
    });
    expect(r).toEqual([0, 0]);
    expect(
      await como('authenticated', B, () => contar('arretado.registros where excluido_em is null')),
    ).toBe(1);
  });

  it('A não troca o dono de um registro próprio para B', async () => {
    await expect(
      como('authenticated', A, () =>
        db.query(`update arretado.registros set usuario_id = '${B}' where id = '${ID_A}'`),
      ),
    ).rejects.toThrow();
  });

  it('JSON guardado precisa bater com id e dono das colunas', async () => {
    await expect(
      como('authenticated', A, () =>
        db.query(
          `insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
           values ('erros', $1, $2, $3, now(), $4::jsonb)`,
          [
            '0199a6c4-0000-7000-8000-0000000000a3',
            A,
            TS,
            JSON.stringify({ id: 'outro', usuarioId: A }),
          ],
        ),
      ),
    ).rejects.toThrow(/check/);
  });

  it('anônimo não lê nem grava dado pessoal', async () => {
    await expect(como('anon', null, () => contar('arretado.registros'))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      como('anon', null, () => erro('0199a6c4-0000-7000-8000-0000000000c1', A)),
    ).rejects.toThrow(/permission denied/);
  });

  it('log de alterações é append-only e por dono', async () => {
    const inserir = (dono: string) =>
      db.query(
        `insert into arretado.alteracoes (usuario_id, aparelho_id, ts, colecao, registro_id, operacao)
         values ($1, $1, $2, 'erros', $1, 'gravar')`,
        [dono, TS],
      );
    await como('authenticated', A, async () => {
      await inserir(A);
      expect(await contar('arretado.alteracoes')).toBe(1);
    });
    await expect(como('authenticated', A, () => inserir(B))).rejects.toThrow(/row-level security/);
    await expect(
      como('authenticated', A, () =>
        db.query('update arretado.alteracoes set operacao = $1', ['remover']),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      como('authenticated', A, () => db.query('delete from arretado.alteracoes')),
    ).rejects.toThrow(/permission denied/);
  });

  it('catálogo: anônimo lê só o publicado; só curador escreve', async () => {
    await db.exec(`insert into arretado.curadores values ('${A}')`);
    const inserir = (id: string, publicado: boolean) =>
      db.query(
        `insert into arretado.catalogo (colecao, id, curador_id, publicado, ts_logico, atualizado_em, dados)
         values ('normas', $1, $2, $3, $4, now(), $5::jsonb)`,
        [id, A, publicado, TS, JSON.stringify({ id })],
      );
    const pub = '0199a6c4-0000-7000-8000-0000000000d1';
    const rasc = '0199a6c4-0000-7000-8000-0000000000d2';
    await db.exec('begin');
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${A}'`);
    await inserir(pub, true);
    await inserir(rasc, false);
    await db.exec('commit');

    expect(await como('anon', null, () => contar('arretado.catalogo'))).toBe(1);
    expect(await como('authenticated', B, () => contar('arretado.catalogo'))).toBe(1);
    expect(await como('authenticated', A, () => contar('arretado.catalogo'))).toBe(2);
    await expect(
      como('authenticated', B, () => inserir('0199a6c4-0000-7000-8000-0000000000d3', true)),
    ).rejects.toThrow(/row-level security/);
    await expect(
      como('anon', null, () => inserir('0199a6c4-0000-7000-8000-0000000000d4', true)),
    ).rejects.toThrow(/permission denied/);
  });

  it('excluir a conta apaga em cascata todos os dados pessoais', async () => {
    await db.exec('begin');
    await db.exec(`delete from auth.users where id = '${B}'`);
    expect(await contar(`arretado.registros where usuario_id = '${B}'`)).toBe(0);
    await db.exec('rollback');
  });
});

describe('deriva entre modelo local e esquema remoto', () => {
  it('a lista de coleções do remoto é exatamente a das coleções exportáveis', () => {
    const sql = MIGRACOES.join('\n');
    const bloco =
      /create table arretado\.registros \([\s\S]*?check \(colecao in \(([\s\S]*?)\)\)/.exec(
        sql,
      )?.[1] ?? '';
    const noSql = [...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    const exportaveis = NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo !== null).sort();
    expect(noSql).toEqual(exportaveis);
  });
});
