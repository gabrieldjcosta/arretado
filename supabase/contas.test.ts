// @vitest-environment node
// Testes da F4-A (A2): perfis, convites, gancho de cadastro, bucket de cópias e reversão.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PRELUDIO } from './prelude-supabase';

const PASTA = path.join(import.meta.dirname, 'migrations');
const MIGRACOES = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(path.join(PASTA, f), 'utf8'));
const DOWN = readFileSync(
  path.join(import.meta.dirname, 'rollback', '20261014020000_f4a_contas.down.sql'),
  'utf8',
);
const UP = readFileSync(path.join(PASTA, '20261014020000_f4a_contas.sql'), 'utf8');

const A = '0199a6c4-0000-7000-8000-00000000000a';
const B = '0199a6c4-0000-7000-8000-00000000000b';
const C = '0199a6c4-0000-7000-8000-00000000000c';

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDIO);
  for (const sql of MIGRACOES) await db.exec(sql);
  await db.exec(`
    insert into arretado.convites (email) values ('a@exemplo.com'), ('b@exemplo.com');
    insert into auth.users (id, email) values
      ('${A}', 'A@Exemplo.com'), ('${B}', 'b@exemplo.com'), ('${C}', 'c@exemplo.com');
  `);
}, 60_000);

afterAll(async () => {
  await db.close();
});

async function como<T>(
  papel: 'anon' | 'authenticated' | 'supabase_auth_admin',
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

async function recusado(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    return (e as { message: string }).message;
  }
  return 'aceitou';
}

async function contar(sql: string): Promise<number> {
  const r = await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`);
  return r.rows[0]?.n ?? -1;
}

describe('perfis', () => {
  it('cada conta nasce com perfil; e-mail convidado liga beta e marca o convite como usado', async () => {
    const r = await db.query<{ usuario_id: string; beta: boolean; direito_ia: boolean }>(
      'select usuario_id, beta, direito_ia from arretado.perfis order by usuario_id',
    );
    expect(r.rows).toEqual([
      { usuario_id: A, beta: true, direito_ia: false },
      { usuario_id: B, beta: true, direito_ia: false },
      { usuario_id: C, beta: false, direito_ia: false },
    ]);
    expect(await contar('arretado.convites where usado_em is not null')).toBe(2);
  });

  it('A lê só o próprio perfil', async () => {
    const n = await como('authenticated', A, () => contar('arretado.perfis'));
    expect(n).toBe(1);
    const outro = await como('authenticated', A, () =>
      contar(`arretado.perfis where usuario_id = '${B}'`),
    );
    expect(outro).toBe(0);
  });

  it('anônimo não lê perfil', async () => {
    const msg = await como('anon', null, () => recusado(() => contar('arretado.perfis')));
    expect(msg).toMatch(/permission denied/);
  });

  it('o cliente não altera direito, beta nem cria ou apaga perfil', async () => {
    for (const sql of [
      `update arretado.perfis set direito_ia = true where usuario_id = '${A}'`,
      `update arretado.perfis set beta = true where usuario_id = '${C}'`,
      `delete from arretado.perfis where usuario_id = '${A}'`,
      `insert into arretado.perfis (usuario_id) values ('${C}')`,
    ]) {
      const msg = await como('authenticated', A, () => recusado(() => db.exec(sql)));
      expect(msg).toMatch(/permission denied/);
    }
  });

  it('aceitar_termos grava só no próprio perfil e valida a versão', async () => {
    await db.exec('begin');
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${A}'`);
    await db.exec(`select arretado.aceitar_termos('v3')`);
    await db.exec('reset role');
    const r = await db.query<{ usuario_id: string; termos_versao: string | null }>(
      'select usuario_id, termos_versao from arretado.perfis where termos_versao is not null',
    );
    await db.exec('rollback');
    expect(r.rows).toEqual([{ usuario_id: A, termos_versao: 'v3' }]);

    const invalida = await como('authenticated', A, () =>
      recusado(() => db.exec(`select arretado.aceitar_termos('')`)),
    );
    expect(invalida).toMatch(/versão inválida/);
    const semSessao = await como('authenticated', null, () =>
      recusado(() => db.exec(`select arretado.aceitar_termos('v3')`)),
    );
    expect(semSessao).toMatch(/sem sessão/);
    const anon = await como('anon', null, () =>
      recusado(() => db.exec(`select arretado.aceitar_termos('v3')`)),
    );
    expect(anon).toMatch(/permission denied/);
  });

  it('excluir a conta apaga o perfil em cascata', async () => {
    await db.exec('begin');
    await db.exec(
      `insert into auth.users (id, email) values ('0199a6c4-0000-7000-8000-0000000000d1', 'x@exemplo.com')`,
    );
    await db.exec(`delete from auth.users where id = '0199a6c4-0000-7000-8000-0000000000d1'`);
    const n = await contar(
      `arretado.perfis where usuario_id = '0199a6c4-0000-7000-8000-0000000000d1'`,
    );
    await db.exec('rollback');
    expect(n).toBe(0);
  });
});

describe('convites e gancho de cadastro', () => {
  it('o cliente não lê nem escreve convites', async () => {
    for (const papel of ['anon', 'authenticated'] as const) {
      const lendo = await como(papel, A, () => recusado(() => contar('arretado.convites')));
      expect(lendo).toMatch(/permission denied/);
      const gravando = await como(papel, A, () =>
        recusado(() => db.exec(`insert into arretado.convites (email) values ('z@exemplo.com')`)),
      );
      expect(gravando).toMatch(/permission denied/);
    }
  });

  it('o gancho aceita e-mail convidado (sem diferenciar maiúsculas) e recusa o resto', async () => {
    const chamar = (email: unknown) =>
      como('supabase_auth_admin', null, async () => {
        const r = await db.query<{ r: Record<string, unknown> }>(
          'select arretado.hook_antes_de_criar_usuario($1::jsonb) as r',
          [JSON.stringify({ user: { email } })],
        );
        return r.rows[0]?.r;
      });
    expect(await chamar('A@EXEMPLO.com')).toEqual({});
    expect(await chamar('intruso@exemplo.com')).toMatchObject({ error: { http_code: 403 } });
    expect(await chamar('')).toMatchObject({ error: { http_code: 403 } });
    expect(await chamar(null)).toMatchObject({ error: { http_code: 403 } });
  });

  it('só o papel do Auth executa o gancho', async () => {
    for (const papel of ['anon', 'authenticated'] as const) {
      const msg = await como(papel, A, () =>
        recusado(() => db.exec(`select arretado.hook_antes_de_criar_usuario('{}'::jsonb)`)),
      );
      expect(msg).toMatch(/permission denied/);
    }
  });
});

describe('exclusões', () => {
  it('o cliente não lê nem grava', async () => {
    const msg = await como('authenticated', A, () =>
      recusado(() => db.exec('insert into arretado.exclusoes default values')),
    );
    expect(msg).toMatch(/permission denied/);
  });
});

describe('bucket de cópias', () => {
  const objeto = (dono: string, arquivo: string) =>
    `insert into storage.objects (bucket_id, name, owner) values ('backups', '${dono}/${arquivo}', '${dono}')`;

  beforeAll(async () => {
    await db.exec('begin');
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${A}'`);
    await db.exec(objeto(A, 'a.arretado'));
    await db.exec('commit');
    await db.exec('begin');
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${B}'`);
    await db.exec(objeto(B, 'b.arretado'));
    await db.exec('commit');
  });

  it('é privado e limita o tamanho', async () => {
    const r = await db.query<{ public: boolean; file_size_limit: number }>(
      `select public, file_size_limit::int as file_size_limit from storage.buckets where id = 'backups'`,
    );
    expect(r.rows[0]).toEqual({ public: false, file_size_limit: 52428800 });
  });

  it('cada conta enxerga e apaga só a própria pasta', async () => {
    expect(await como('authenticated', A, () => contar('storage.objects'))).toBe(1);
    const apagados = await como('authenticated', A, async () => {
      await db.exec(`delete from storage.objects where name like '${B}/%'`);
      return contar('storage.objects');
    });
    expect(apagados).toBe(1);
    expect(await contar('storage.objects')).toBe(2);
  });

  it('não grava na pasta de outra conta nem fora de pasta', async () => {
    const outra = await como('authenticated', A, () => recusado(() => db.exec(objeto(B, 'x'))));
    expect(outra).toMatch(/row-level security/);
    const solta = await como('authenticated', A, () =>
      recusado(() =>
        db.exec(
          `insert into storage.objects (bucket_id, name) values ('backups', 'solto.arretado')`,
        ),
      ),
    );
    expect(solta).toMatch(/row-level security/);
  });

  it('não sobrescreve (sem política de update) e anônimo não vê nada', async () => {
    const mudou = await como('authenticated', A, async () => {
      await db.exec(`update storage.objects set name = '${A}/novo' where name = '${A}/a.arretado'`);
      return contar(`storage.objects where name = '${A}/novo'`);
    });
    expect(mudou).toBe(0);
    expect(await como('anon', null, () => contar('storage.objects'))).toBe(0);
  });
});

describe('conferência no projeto real', () => {
  it('o SQL de verificação roda e devolve o resultado esperado', async () => {
    const outro = new PGlite();
    try {
      await outro.exec(PRELUDIO);
      for (const sql of MIGRACOES) await outro.exec(sql);
      const sql = readFileSync(
        path.join(import.meta.dirname, 'verificacao-f4a-remota.sql'),
        'utf8',
      );
      const resultados = await outro.exec(sql);
      const linhas = resultados.flatMap((r) => r.rows) as { teste: string; obtido: string }[];
      expect(linhas.map((l) => [l.teste.slice(0, 2), l.obtido.split(' ')[0]])).toEqual([
        ['01', '1'],
        ['02', '0'],
        ['03', 'recusado'],
        ['04', 'recusado'],
        ['05', 'recusado'],
        ['06', 'recusado'],
        ['07', 'recusado'],
      ]);
    } finally {
      await outro.close();
    }
  }, 60_000);
});

describe('reversão', () => {
  it('o down remove tudo da A2 e o up volta a aplicar', async () => {
    const outro = new PGlite();
    try {
      await outro.exec(PRELUDIO);
      for (const sql of MIGRACOES) await outro.exec(sql);
      await outro.exec(DOWN);
      const restos = await outro.query<{ n: number }>(`
        select (
          (select count(*) from pg_tables where schemaname = 'arretado'
             and tablename in ('perfis','convites','exclusoes'))
          + (select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace
             where s.nspname = 'arretado'
               and p.proname in ('criar_perfil','aceitar_termos','hook_antes_de_criar_usuario'))
          + (select count(*) from storage.buckets where id = 'backups')
          + (select count(*) from pg_policies where schemaname = 'storage')
        )::int as n`);
      expect(restos.rows[0]?.n).toBe(0);
      await outro.exec(UP);
      expect(
        (await outro.query<{ n: number }>('select count(*)::int as n from arretado.perfis')).rows[0]
          ?.n,
      ).toBe(0);
    } finally {
      await outro.close();
    }
  }, 60_000);
});
