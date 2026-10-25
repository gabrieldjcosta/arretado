// @vitest-environment node
// Teste de RLS (F0, atividade 4.2): a migração roda num Postgres local (PGlite) com um
// prelúdio que imita o Supabase (esquema auth, auth.uid(), papéis anon/authenticated).
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PRELUDIO } from './prelude-supabase';

const PASTA = path.join(import.meta.dirname, 'migrations');
const MIGRACOES = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(path.join(PASTA, f), 'utf8'));

const A = '0199a6c4-0000-7000-8000-00000000000a';
const B = '0199a6c4-0000-7000-8000-00000000000b';
const TS = '1790000000000-000000-0000000a';
const APARELHO = '0199a6c4-0000-7000-8000-0000000000ee';

let db: PGlite;

// O boot do PGlite passa dos 10 s padrão no Windows sob carga (solucao-de-problemas.md).
beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDIO);
  for (const sql of MIGRACOES) await db.exec(sql);
  await db.exec(`insert into auth.users values ('${A}'), ('${B}');`);
}, 60_000);

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

/** Grava um Erro pelo único caminho de escrita: a função de envio. */
function erro(id: string, dono: string) {
  const dados = { id, usuarioId: dono, oQueFoi: 'x' };
  return db.query(`select arretado.enviar_lote($1, 9::smallint, $2::jsonb)`, [
    APARELHO,
    JSON.stringify([{ ts: TS, colecao: 'erros', registro_id: id, operacao: 'gravar', dados }]),
  ]);
}

/** Escrita direta na tabela: o cliente não tem mais esse privilégio. */
function erroDireto(id: string, dono: string) {
  return db.query(
    `insert into arretado.registros (colecao, id, usuario_id, ts_logico, atualizado_em, dados)
     values ('erros', $1, $2, $3, now(), $4::jsonb)`,
    [id, dono, TS, JSON.stringify({ id, usuarioId: dono })],
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
      await db.exec("select arretado.aceitar_sincronizacao('v4:sincronizar')");
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

  it('A não grava registro em nome de B (nem direto, nem pela função)', async () => {
    await expect(
      como('authenticated', A, () => erroDireto('0199a6c4-0000-7000-8000-0000000000a2', A)),
    ).rejects.toThrow(/permission denied/);
    await expect(
      como('authenticated', A, () => erro('0199a6c4-0000-7000-8000-0000000000a2', B)),
    ).rejects.toThrow(/check/);
  });

  it('A não altera nem apaga registro, nem os próprios, direto na tabela', async () => {
    await expect(
      como('authenticated', A, () =>
        db.query(`update arretado.registros set excluido_em = now() where id = '${ID_B}'`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      como('authenticated', A, () =>
        db.query(`delete from arretado.registros where id = '${ID_B}'`),
      ),
    ).rejects.toThrow(/permission denied/);
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
        db.query(`select arretado.enviar_lote($1, 9::smallint, $2::jsonb)`, [
          APARELHO,
          JSON.stringify([
            {
              ts: TS,
              colecao: 'erros',
              registro_id: '0199a6c4-0000-7000-8000-0000000000a3',
              operacao: 'gravar',
              dados: { id: 'outro', usuarioId: A },
            },
          ]),
        ]),
      ),
    ).rejects.toThrow(/check/);
  });

  it('anônimo não lê nem grava dado pessoal', async () => {
    await expect(como('anon', null, () => contar('arretado.registros'))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      como('anon', null, () => erroDireto('0199a6c4-0000-7000-8000-0000000000c1', A)),
    ).rejects.toThrow(/permission denied/);
  });

  it('log de alterações: cada um lê o seu, ninguém escreve direto, altera ou apaga', async () => {
    const inserir = (dono: string) =>
      db.query(
        `insert into arretado.alteracoes (usuario_id, aparelho_id, ts, colecao, registro_id, operacao)
         values ($1, $1, $2, 'erros', $1, 'gravar')`,
        [dono, TS],
      );
    expect(await como('authenticated', A, () => contar('arretado.alteracoes'))).toBe(1);
    await expect(como('authenticated', A, () => inserir(A))).rejects.toThrow(/permission denied/);
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

describe('lints dos advisors do Supabase (atividade 4.3)', () => {
  it('toda função security definer tem search_path vazio e nenhuma é executável por anon ou public', async () => {
    const r = await db.query(`
      select p.proname from pg_proc p
       where p.pronamespace = 'arretado'::regnamespace and p.prosecdef
         and (not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c
                          where c = 'search_path=""')
              or has_function_privilege('anon', p.oid, 'execute')
              or exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                          where a.grantee = 0))`);
    expect(r.rows).toEqual([]);
  });

  it('nenhuma tabela tem duas políticas permissivas para o mesmo papel e ação', async () => {
    const r = await db.query(`
      select p.tablename, r.papel, a.acao
      from pg_policies p
      cross join unnest(p.roles) as r(papel)
      cross join unnest(case when p.cmd = 'ALL'
        then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd] end) as a(acao)
      where p.schemaname = 'arretado' and p.permissive = 'PERMISSIVE'
      group by 1, 2, 3 having count(*) > 1`);
    expect(r.rows).toEqual([]);
  });

  it('toda chave estrangeira tem índice que começa pelas suas colunas', async () => {
    const r = await db.query(`
      select c.conrelid::regclass::text as tabela, c.conname
      from pg_constraint c
      where c.contype = 'f' and c.connamespace = 'arretado'::regnamespace
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey)`);
    expect(r.rows).toEqual([]);
  });
});
