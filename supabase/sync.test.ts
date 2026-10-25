// @vitest-environment node
// Teste da sincronização remota (F4-B, B1): `enviar_lote`, posse e privilégios, em PGlite.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { ENTIDADES, NOMES_COLECOES } from '../src/core/modelo';
import { PRELUDIO } from './prelude-supabase';

const PASTA = path.join(import.meta.dirname, 'migrations');
const ARQUIVOS = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const MIGRACOES = ARQUIVOS.map((f) => readFileSync(path.join(PASTA, f), 'utf8'));

const ARQUIVO_B1 = '20261025000000_f4b_sincronizacao';
const DOWN = readFileSync(
  path.join(import.meta.dirname, 'rollback', `${ARQUIVO_B1}.down.sql`),
  'utf8',
);

const A = '0199a6c4-0000-7000-8000-00000000000a';
const B = '0199a6c4-0000-7000-8000-00000000000b';
const C = '0199a6c4-0000-7000-8000-00000000000c'; // sem aceite
const AP1 = '0199a6c4-0000-7000-8000-0000000000e1';
const AP2 = '0199a6c4-0000-7000-8000-0000000000e2';
const ID = (n: number) => `0199a6c4-0000-7000-8000-${String(n).padStart(12, '0')}`;
const ts = (n: number) => `17900000000${String(n).padStart(2, '0')}-000000-0000000a`;

type Entrada = {
  ts: string;
  colecao: string;
  registro_id: string;
  operacao: 'gravar' | 'atualizar' | 'remover' | 'acervo-adesao';
  dados?: Record<string, unknown>;
  removidos?: string[];
  base_ts?: string | null;
};
interface Resposta {
  seq_max: number;
  divergentes: { colecao: string; registro_id: string; ts_servidor: string | null }[];
}

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(PRELUDIO);
  for (const sql of MIGRACOES) await db.exec(sql);
  await db.exec(`insert into auth.users values ('${A}'), ('${B}'), ('${C}');`);
  // A e B liberadas pelo dono do serviço; C nunca é.
  await db.exec(
    `update arretado.perfis set sincronizacao_liberada = true where usuario_id in ('${A}', '${B}')`,
  );
  for (const dono of [A, B]) {
    await db.exec('begin');
    await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${dono}'`);
    await db.exec("select arretado.aceitar_sincronizacao('v4:sincronizar')");
    await db.exec('commit');
  }
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

function enviar(usuario: string, aparelho: string, entradas: Entrada[], versao = 9) {
  return como(usuario, async () => {
    const r = await db.query<{ enviar_lote: Resposta }>(
      'select arretado.enviar_lote($1, $2::smallint, $3::jsonb)',
      [aparelho, versao, JSON.stringify(entradas)],
    );
    return r.rows[0]!.enviar_lote;
  });
}

const erro = (n: number, dono: string, extra: Record<string, unknown> = {}) => ({
  id: ID(n),
  usuarioId: dono,
  oQueFoi: 'x',
  ...extra,
});

async function estado(dono: string, id: string) {
  const r = await db.query<{
    dados: Record<string, unknown>;
    ts_logico: string;
    excluido: boolean;
  }>(
    `select dados, ts_logico, excluido_em is not null as excluido from arretado.registros
      where usuario_id = $1 and id = $2`,
    [dono, id],
  );
  return r.rows[0];
}
async function contarAlteracoes(usuario: string) {
  const r = await db.query<{ n: number }>(
    `select count(*)::int as n from arretado.alteracoes where usuario_id = $1`,
    [usuario],
  );
  return r.rows[0]!.n;
}

describe('enviar_lote', () => {
  it('grava no log e no estado; devolve o maior seq', async () => {
    const r = await enviar(A, AP1, [
      { ts: ts(1), colecao: 'erros', registro_id: ID(1), operacao: 'gravar', dados: erro(1, A) },
    ]);
    expect(r.divergentes).toEqual([]);
    expect(r.seq_max).toBeGreaterThan(0);
    expect((await estado(A, ID(1)))?.ts_logico).toBe(ts(1));
  });

  it('é idempotente: o mesmo lote duas vezes dá o mesmo resultado', async () => {
    const lote: Entrada[] = [
      { ts: ts(2), colecao: 'erros', registro_id: ID(2), operacao: 'gravar', dados: erro(2, A) },
    ];
    const antes = await enviar(A, AP1, lote);
    const n = await contarAlteracoes(A);
    const depois = await enviar(A, AP1, lote);
    expect(depois).toEqual(antes);
    expect(await contarAlteracoes(A)).toBe(n);
  });

  it('atualizar com base_ts correto avança e aplica campos e remoções', async () => {
    await enviar(A, AP1, [
      {
        ts: ts(3),
        colecao: 'erros',
        registro_id: ID(3),
        operacao: 'gravar',
        dados: erro(3, A, { nota: 'a', extra: 1 }),
      },
      {
        ts: ts(4),
        colecao: 'erros',
        registro_id: ID(3),
        operacao: 'atualizar',
        base_ts: ts(3),
        dados: { nota: 'b' },
        removidos: ['extra'],
      },
    ]);
    const e = await estado(A, ID(3));
    expect(e?.ts_logico).toBe(ts(4));
    expect(e?.dados).toEqual(erro(3, A, { nota: 'b' }));
  });

  it('base_ts diferente não avança o estado, marca o log e avisa', async () => {
    await enviar(A, AP1, [
      { ts: ts(5), colecao: 'erros', registro_id: ID(5), operacao: 'gravar', dados: erro(5, A) },
      {
        ts: ts(6),
        colecao: 'erros',
        registro_id: ID(5),
        operacao: 'atualizar',
        base_ts: ts(5),
        dados: { nota: 'do aparelho 1' },
      },
    ]);
    const r = await enviar(A, AP2, [
      {
        ts: ts(7),
        colecao: 'erros',
        registro_id: ID(5),
        operacao: 'atualizar',
        base_ts: ts(5), // o aparelho 2 não viu a edição ts(6)
        dados: { nota: 'do aparelho 2' },
      },
    ]);
    expect(r.divergentes).toEqual([{ colecao: 'erros', registro_id: ID(5), ts_servidor: ts(6) }]);
    const e = await estado(A, ID(5));
    expect(e?.ts_logico).toBe(ts(6));
    expect(e?.dados.nota).toBe('do aparelho 1');
    const marcada = await db.query(
      `select 1 from arretado.alteracoes where ts = $1 and divergente`,
      [ts(7)],
    );
    expect(marcada.rows).toHaveLength(1);
  });

  it('remover deixa lápide (excluido_em) e mantém a última versão', async () => {
    await enviar(A, AP1, [
      { ts: ts(8), colecao: 'erros', registro_id: ID(8), operacao: 'gravar', dados: erro(8, A) },
      {
        ts: ts(9),
        colecao: 'erros',
        registro_id: ID(8),
        operacao: 'remover',
        base_ts: ts(8),
      },
    ]);
    const e = await estado(A, ID(8));
    expect(e?.excluido).toBe(true);
    expect(e?.ts_logico).toBe(ts(9));
    expect(e?.dados).toEqual(erro(8, A));
  });

  it('acervo-adesao entra no log e não cria linha de estado', async () => {
    const r = await enviar(A, AP1, [
      {
        ts: ts(10),
        colecao: 'normas',
        registro_id: ID(10),
        operacao: 'acervo-adesao',
        dados: { itemId: 'cf88', versao: '1', hash: 'abc' },
      },
    ]);
    expect(r.divergentes).toEqual([]);
    expect(await estado(A, ID(10))).toBeUndefined();
    const log = await db.query(`select 1 from arretado.alteracoes where ts = $1`, [ts(10)]);
    expect(log.rows).toHaveLength(1);
  });

  it('toda coleção exportável de ENTIDADES passa por enviar_lote', async () => {
    const exportaveis = NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo !== null);
    const entradas: Entrada[] = exportaveis.map((colecao, i) => ({
      ts: `17900000001${String(i).padStart(2, '0')}-000000-0000000a`,
      colecao,
      registro_id: ID(1000 + i),
      operacao: 'gravar',
      dados: { id: ID(1000 + i), usuarioId: A },
    }));
    const r = await enviar(A, AP1, entradas);
    expect(r.divergentes).toEqual([]);
    const n = await db.query<{ n: number }>(
      `select count(distinct colecao)::int as n from arretado.registros
        where usuario_id = $1 and id = any($2::uuid[])`,
      [A, entradas.map((e) => e.registro_id)],
    );
    expect(n.rows[0]!.n).toBe(exportaveis.length);
  });

  it('recusa coleção com nome inválido e lote grande demais', async () => {
    await expect(
      enviar(A, AP1, [
        {
          ts: ts(11),
          colecao: 'x; drop table',
          registro_id: ID(11),
          operacao: 'gravar',
          dados: erro(11, A),
        },
      ]),
    ).rejects.toThrow(/check/);
    const grande = Array.from({ length: 501 }, (_, i) => ({
      ts: ts(12),
      colecao: 'erros',
      registro_id: ID(2000 + i),
      operacao: 'gravar' as const,
      dados: erro(2000 + i, A),
    }));
    await expect(enviar(A, AP1, grande)).rejects.toThrow(/grande demais/);
  });

  it('lote com entrada inválida desfaz o lote inteiro', async () => {
    const antes = await contarAlteracoes(A);
    await expect(
      enviar(A, AP1, [
        {
          ts: ts(13),
          colecao: 'erros',
          registro_id: ID(13),
          operacao: 'gravar',
          dados: erro(13, A),
        },
        {
          ts: 'ruim',
          colecao: 'erros',
          registro_id: ID(14),
          operacao: 'gravar',
          dados: erro(14, A),
        },
      ]),
    ).rejects.toThrow();
    expect(await contarAlteracoes(A)).toBe(antes);
    expect(await estado(A, ID(13))).toBeUndefined();
  });

  it('exige sessão e aceite; B não toca em dado de A', async () => {
    await expect(
      enviar(C, AP1, [
        {
          ts: ts(15),
          colecao: 'erros',
          registro_id: ID(15),
          operacao: 'gravar',
          dados: erro(15, C),
        },
      ]),
    ).rejects.toThrow(/sincronização não aceita/);
    await expect(
      db.query(`select arretado.enviar_lote($1, 9::smallint, '[]'::jsonb)`, [AP1]),
    ).rejects.toThrow(/permission denied|sem sessão/);
    // B grava no mesmo (colecao, id) de A: a chave é por dono, então é outro registro e o de A fica.
    await enviar(B, AP1, [
      { ts: ts(16), colecao: 'erros', registro_id: ID(1), operacao: 'gravar', dados: erro(1, B) },
    ]);
    expect((await estado(A, ID(1)))?.dados.usuarioId).toBe(A);
    expect((await estado(B, ID(1)))?.dados.usuarioId).toBe(B);
    const vistoPorB = await como(B, () =>
      db.query(`select count(*)::int as n from arretado.registros where usuario_id = $1`, [A]),
    );
    expect(vistoPorB.rows[0]).toEqual({ n: 0 });
  });
});

describe('instantaneo_inicio e registrar_sincronia', () => {
  it('devolve o maior seq do dono e guarda o último recebido por aparelho', async () => {
    const seq = await como(A, async () => {
      const r = await db.query<{ instantaneo_inicio: string }>(
        'select arretado.instantaneo_inicio()',
      );
      return Number(r.rows[0]!.instantaneo_inicio);
    });
    expect(seq).toBeGreaterThan(0);
    await como(A, () =>
      db.query('select arretado.registrar_sincronia($1, $2, 9::smallint)', [AP2, seq]),
    );
    await como(A, () =>
      db.query('select arretado.registrar_sincronia($1, $2, 9::smallint)', [AP2, 1]),
    );
    const r = await como(A, () =>
      db.query<{ ultimo_seq_recebido: string }>(
        'select ultimo_seq_recebido from arretado.aparelhos_sync where aparelho_id = $1',
        [AP2],
      ),
    );
    expect(Number(r.rows[0]!.ultimo_seq_recebido)).toBe(seq); // nunca recua
    const deB = await como(B, () => db.query('select * from arretado.aparelhos_sync'));
    expect(deB.rows).toEqual([]);
  });
});

describe('posse de aparelho (D17)', () => {
  const pedir = (usuario: string, aparelho: string, forcar = false) =>
    como(usuario, async () => {
      const r = await db.query<{ pedir_posse: { concedida: boolean; aparelho_id: string } }>(
        'select arretado.pedir_posse($1, $2)',
        [aparelho, forcar],
      );
      return r.rows[0]!.pedir_posse;
    });

  it('sem dono, concede; o dono renova; o outro aparelho ativo recebe pergunta', async () => {
    expect((await pedir(A, AP1)).concedida).toBe(true);
    expect((await pedir(A, AP1)).concedida).toBe(true);
    const outro = await pedir(A, AP2);
    expect(outro.concedida).toBe(false);
    expect(outro.aparelho_id).toBe(AP1);
  });

  it('forçar assume; soltar libera sem pergunta; dono parado há 60 s perde', async () => {
    expect((await pedir(A, AP2, true)).concedida).toBe(true);
    await como(A, () => db.query('select arretado.soltar_posse($1)', [AP2]));
    expect((await pedir(A, AP1)).concedida).toBe(true);
    await db.exec(
      `update arretado.posse_aparelho set atualizado_em = now() - interval '61 seconds'
        where usuario_id = '${A}'`,
    );
    expect((await pedir(A, AP2)).concedida).toBe(true);
    await db.exec(
      `update arretado.posse_aparelho set ate = now() - interval '1 second' where usuario_id = '${A}'`,
    );
    expect((await pedir(A, AP1)).concedida).toBe(true);
  });

  it('cada conta tem a sua posse e o cliente não escreve na tabela', async () => {
    expect((await pedir(B, AP1)).concedida).toBe(true);
    await expect(
      como(A, () => db.query(`update arretado.posse_aparelho set aparelho_id = $1`, [AP2])),
    ).rejects.toThrow(/permission denied/);
    const vistaPorB = await como(B, () =>
      db.query<{ usuario_id: string }>('select usuario_id from arretado.posse_aparelho'),
    );
    expect(vistaPorB.rows.map((r) => r.usuario_id)).toEqual([B]);
  });

  it('sem aceite da sincronização não há posse', async () => {
    await expect(pedir(C, AP1)).rejects.toThrow(/sincronização não aceita/);
  });
});

describe('enviar_lote: reenvio, forma da entrada e limites', () => {
  /** Entrada fora do contrato (o tipo `Entrada` não deixa escrever isto à mão). */
  const torta = (e: Record<string, unknown>) => e as unknown as Entrada;

  it('reenviar um lote cuja entrada divergiu devolve a mesma divergência', async () => {
    await enviar(A, AP1, [
      { ts: ts(20), colecao: 'erros', registro_id: ID(20), operacao: 'gravar', dados: erro(20, A) },
      {
        ts: ts(21),
        colecao: 'erros',
        registro_id: ID(20),
        operacao: 'atualizar',
        base_ts: ts(20),
        dados: { nota: 'a' },
      },
    ]);
    const lote: Entrada[] = [
      {
        ts: ts(22),
        colecao: 'erros',
        registro_id: ID(20),
        operacao: 'atualizar',
        base_ts: ts(20),
        dados: { nota: 'b' },
      },
    ];
    const primeira = await enviar(A, AP2, lote);
    expect(primeira.divergentes).toHaveLength(1);
    // A resposta se perdeu e o aparelho manda de novo: precisa saber do Conflito outra vez.
    expect((await enviar(A, AP2, lote)).divergentes).toEqual(primeira.divergentes);
  });

  it('reenviar entradas já aplicadas, depois de outro aparelho escrever por cima, não muda nada', async () => {
    const lote: Entrada[] = [
      { ts: ts(30), colecao: 'erros', registro_id: ID(30), operacao: 'gravar', dados: erro(30, A) },
      {
        ts: ts(31),
        colecao: 'erros',
        registro_id: ID(30),
        operacao: 'atualizar',
        base_ts: ts(30),
        dados: { nota: 'a' },
      },
    ];
    await enviar(A, AP1, lote);
    await enviar(A, AP2, [
      {
        ts: ts(32),
        colecao: 'erros',
        registro_id: ID(30),
        operacao: 'atualizar',
        base_ts: ts(31),
        dados: { nota: 'b' },
      },
    ]);
    const n = await contarAlteracoes(A);
    expect((await enviar(A, AP1, lote)).divergentes).toEqual([]);
    expect(await contarAlteracoes(A)).toBe(n);
    const e = await estado(A, ID(30));
    expect(e?.ts_logico).toBe(ts(32));
    expect(e?.dados.nota).toBe('b');
  });

  it('dados precisa ser objeto; atualizar só com remoção funciona; removidos não apaga id nem dono', async () => {
    for (const dados of [[1, 2], 'texto', null, 42]) {
      await expect(
        enviar(A, AP1, [
          torta({ ts: ts(40), colecao: 'erros', registro_id: ID(40), operacao: 'gravar', dados }),
        ]),
      ).rejects.toThrow(/forma inválida/);
    }
    await enviar(A, AP1, [
      {
        ts: ts(41),
        colecao: 'erros',
        registro_id: ID(41),
        operacao: 'gravar',
        dados: erro(41, A, { nota: 'a', outra: 'b' }),
      },
    ]);
    await enviar(A, AP1, [
      torta({
        ts: ts(42),
        colecao: 'erros',
        registro_id: ID(41),
        operacao: 'atualizar',
        base_ts: ts(41),
        dados: null,
        removidos: ['outra'],
      }),
    ]);
    expect((await estado(A, ID(41)))?.dados).toEqual(erro(41, A, { nota: 'a' }));
    const seguinte = { ts: ts(43), colecao: 'erros', registro_id: ID(41), base_ts: ts(42) };
    await expect(
      enviar(A, AP1, [torta({ ...seguinte, operacao: 'atualizar', removidos: ['id'] })]),
    ).rejects.toThrow(/check/);
    await expect(
      enviar(A, AP1, [torta({ ...seguinte, operacao: 'atualizar', removidos: 'nota' })]),
    ).rejects.toThrow(/forma inválida/);
  });

  it('nome de coleção inválido não entra nem no log (acervo-adesao e remover sem linha)', async () => {
    for (const operacao of ['acervo-adesao', 'remover'] as const) {
      await expect(
        enviar(A, AP1, [
          {
            ts: ts(50),
            colecao: "x'; --",
            registro_id: ID(50),
            operacao,
            dados: { itemId: 'cf88' },
          },
        ]),
      ).rejects.toThrow(/check/);
    }
  });

  it('o limite de 1 MiB vale para o estado, não só para a entrada', async () => {
    const grande = 'x'.repeat(600_000);
    await enviar(A, AP1, [
      {
        ts: ts(60),
        colecao: 'erros',
        registro_id: ID(60),
        operacao: 'gravar',
        dados: erro(60, A, { texto: grande }),
      },
    ]);
    await expect(
      enviar(A, AP1, [
        {
          ts: ts(61),
          colecao: 'erros',
          registro_id: ID(60),
          operacao: 'atualizar',
          base_ts: ts(60),
          dados: { outro: grande },
        },
      ]),
    ).rejects.toThrow(/registros_dados_tamanho/);
  });
});

describe('aceite, trava e sincronia', () => {
  it('aceitar_sincronizacao guarda a versão do texto aceito e recusa versão vazia', async () => {
    const r = await db.query<{ sincronizacao_versao: string }>(
      'select sincronizacao_versao from arretado.perfis where usuario_id = $1',
      [A],
    );
    expect(r.rows[0]?.sincronizacao_versao).toBe('v4:sincronizar');
    await expect(
      como(A, () => db.query("select arretado.aceitar_sincronizacao('')")),
    ).rejects.toThrow(/versão inválida/);
  });

  it('instantaneo_inicio é volátil: depois de esperar a trava precisa de instantâneo novo', async () => {
    const r = await db.query<{ provolatile: string }>(
      `select provolatile from pg_proc
        where proname = 'instantaneo_inicio' and pronamespace = 'arretado'::regnamespace`,
    );
    expect(r.rows[0]?.provolatile).toBe('v');
  });

  it('as funções que ordenam o log e a posse pegam a mesma trava da conta', async () => {
    // O PGlite tem uma conexão só e não reproduz a corrida; este teste só impede que a trava suma.
    const r = await db.query<{ proname: string }>(
      `select proname from pg_proc
        where pronamespace = 'arretado'::regnamespace
          and prosrc like '%pg_advisory_xact_lock(hashtextextended(eu::text, 0))%'
        order by proname`,
    );
    expect(r.rows.map((x) => x.proname)).toEqual([
      'enviar_lote',
      'instantaneo_inicio',
      'pedir_posse',
    ]);
  });

  it('registrar_sincronia não aceita seq acima do maior que existe', async () => {
    await como(A, () =>
      db.query('select arretado.registrar_sincronia($1, $2, 9::smallint)', [AP1, 999_999_999]),
    );
    const r = await como(A, () =>
      db.query<{ recebido: string; maximo: string }>(
        `select ultimo_seq_recebido::text as recebido,
                (select max(seq)::text from arretado.alteracoes where usuario_id = $2) as maximo
           from arretado.aparelhos_sync where aparelho_id = $1`,
        [AP1, A],
      ),
    );
    expect(Number(r.rows[0]!.recebido)).toBeLessThanOrEqual(Number(r.rows[0]!.maximo));
  });
});

describe('reversão (B1)', () => {
  async function foto(d: PGlite) {
    const q = async (sql: string) => (await d.query<Record<string, unknown>>(sql)).rows;
    return {
      colunas: await q(`select table_name, column_name, data_type, is_nullable, column_default
        from information_schema.columns where table_schema = 'arretado' order by 1, 2`),
      restricoes: await q(`select conrelid::regclass::text as tabela, conname,
        pg_get_constraintdef(oid) as def from pg_constraint
        where connamespace = 'arretado'::regnamespace order by 1, 2`),
      indices: await q(`select tablename, indexname, indexdef from pg_indexes
        where schemaname = 'arretado' order by 1, 2`),
      politicas: await q(`select tablename, policyname, cmd, roles::text as roles, qual, with_check
        from pg_policies where schemaname = 'arretado' order by 1, 2`),
      tabelas: await q(`select relname, relacl::text as acl, relrowsecurity, relforcerowsecurity
        from pg_class where relnamespace = 'arretado'::regnamespace and relkind = 'r' order by 1`),
      funcoes: await q(`select proname, pg_get_function_identity_arguments(oid) as args, prosecdef,
        proacl::text as acl from pg_proc where pronamespace = 'arretado'::regnamespace order by 1, 2`),
    };
  }

  it('o down devolve o esquema anterior e o up volta a aplicar com o mesmo resultado', async () => {
    const d = new PGlite();
    try {
      await d.exec(PRELUDIO);
      const i = ARQUIVOS.findIndex((f) => f.startsWith(ARQUIVO_B1));
      for (const sql of MIGRACOES.slice(0, i)) await d.exec(sql);
      const antes = await foto(d);
      await d.exec(MIGRACOES[i]!);
      const comB1 = await foto(d);
      expect(comB1).not.toEqual(antes);
      await d.exec(DOWN);
      expect(await foto(d)).toEqual(antes);
      await d.exec(MIGRACOES[i]!);
      expect(await foto(d)).toEqual(comB1);
    } finally {
      await d.close();
    }
  }, 60_000);
});

describe('trava por conta (sincronizacao_liberada)', () => {
  it('conta que aceitou mas não foi liberada é recusada; o cliente não liga a trava', async () => {
    await como(C, () => db.query("select arretado.aceitar_sincronizacao('v4:sincronizar')"));
    await expect(
      enviar(C, AP1, [
        {
          ts: ts(20),
          colecao: 'erros',
          registro_id: ID(20),
          operacao: 'gravar',
          dados: erro(20, C),
        },
      ]),
    ).rejects.toThrow(/não liberada/);
    await expect(
      como(C, () =>
        db.query('update arretado.perfis set sincronizacao_liberada = true where usuario_id = $1', [
          C,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
