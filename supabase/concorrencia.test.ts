// @vitest-environment node
// Corrida do `seq` com conexões reais (F4-B, B3). O PGlite tem uma conexão só e não reproduz a
// corrida; aqui vários `psql` enviam lotes ao mesmo tempo para a mesma conta enquanto um leitor
// incremental (`seq > último`) acompanha, como o aparelho faz ao puxar. Se um lote com `seq` menor
// confirmasse depois de um maior, o leitor pularia entradas para sempre. A trava por conta de
// `enviar_lote` impede isso. Só roda com um Postgres de teste à mão:
//
//   PGHOST=localhost PGPORT=5432 PGUSER=postgres ARRETADO_PG_TESTE=1 \
//     npx vitest run --project unidade supabase/concorrencia.test.ts
//
// A conexão vem das variáveis PG* do `psql`. O teste cria e remove um banco próprio
// (`arretado_conc_<pid>`), com papéis `anon`/`authenticated`: não use um servidor com dados.
// Controle feito à mão em 25/10/2026 (Postgres 16, 8 conexões × 25 lotes × 5 entradas): com a trava
// 0 de 1000 entradas puladas; sem ela, 20% a 26% puladas.
import { execFileSync, spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { PRELUDIO } from './prelude-supabase';

const LIGADO = process.env.ARRETADO_PG_TESTE === '1';
const PASTA = path.join(import.meta.dirname, 'migrations');
const DONO = '0199a6c4-0000-7000-8000-0000000000aa';
const ESCRITORES = 8;
const LOTES = 25;
const POR_LOTE = 5;

function psql(banco: string, args: string[], entrada?: string): string {
  return execFileSync('psql', ['-d', banco, '-v', 'ON_ERROR_STOP=1', '-qAt', ...args], {
    input: entrada,
    encoding: 'utf8',
  });
}

const id = (n: number) => `0199a6c4-0000-7000-8000-${String(n).padStart(12, '0')}`;
const comoDono = `begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${DONO}', true);`;

function roteiroDoEscritor(indice: number): string {
  const aparelho = id(1000 + indice);
  const linhas: string[] = [];
  for (let l = 0; l < LOTES; l++) {
    const entradas = Array.from({ length: POR_LOTE }, (_, k) => {
      const n = indice * 100_000 + l * POR_LOTE + k + 1;
      return {
        ts: `${String(1_790_000_000_000 + n).padStart(13, '0')}-000000-0000000a`,
        colecao: 'erros',
        registro_id: id(n),
        operacao: 'gravar',
        dados: { id: id(n), usuarioId: DONO },
        base_ts: null,
      };
    });
    const json = JSON.stringify(entradas).replaceAll("'", "''");
    linhas.push(
      `${comoDono} select arretado.enviar_lote('${aparelho}', 10::smallint, '${json}'::jsonb); commit;`,
    );
  }
  return linhas.join('\n');
}

describe.skipIf(!LIGADO)('corrida do seq com conexões reais', () => {
  const nome = `arretado_conc_${String(process.pid)}`;
  const url = nome;

  beforeAll(() => {
    const admin = 'postgres';
    psql(admin, ['-c', `drop database if exists ${nome}`]);
    psql(admin, ['-c', `create database ${nome}`]);
    // Os papéis são do servidor inteiro: se já existem (outra rodada), o prelúdio não os recria.
    const papeis = psql(url, ['-c', "select count(*) from pg_roles where rolname = 'anon'"]).trim();
    psql(url, [], papeis === '0' ? PRELUDIO : PRELUDIO.replace(/create role [^;]*;/g, ''));
    for (const f of readdirSync(PASTA)
      .filter((n) => n.endsWith('.sql'))
      .sort()) {
      psql(url, ['-f', path.join(PASTA, f)]);
    }
    psql(
      url,
      [],
      `insert into auth.users values ('${DONO}');
       update arretado.perfis set sincronizacao_liberada = true, sincronizacao_aceita_em = now()
        where usuario_id = '${DONO}';`,
    );
  }, 120_000);

  afterAll(() => {
    psql('postgres', ['-c', `drop database if exists ${nome}`]);
  });

  it('o leitor incremental vê todas as entradas, mesmo com envios simultâneos', async () => {
    const escritores = Array.from({ length: ESCRITORES }, (_, i) => {
      const filho = spawn('psql', ['-d', url, '-v', 'ON_ERROR_STOP=1', '-qAt'], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });
      let erro = '';
      filho.stderr.on('data', (d: Buffer) => (erro += d.toString()));
      const fim = new Promise<void>((resolve, reject) => {
        filho.on('close', (codigo) => {
          if (codigo === 0) resolve();
          else reject(new Error(`escritor ${String(i)} saiu com ${String(codigo)}: ${erro}`));
        });
      });
      filho.stdin.end(roteiroDoEscritor(i));
      return fim;
    });

    // Leitor: o que o aparelho faz ao puxar (`seq > último`), repetido enquanto os envios correm.
    let cursor = 0;
    const vistos = new Set<number>();
    const estado = { correndo: true };
    const leitor = (async () => {
      while (estado.correndo) {
        const saida = psql(
          url,
          [],
          `${comoDono} select seq from arretado.alteracoes where seq > ${String(cursor)} order by seq; commit;`,
        );
        for (const linha of saida.split('\n')) {
          if (!/^\d+$/.test(linha)) continue;
          const seq = Number(linha);
          vistos.add(seq);
          cursor = Math.max(cursor, seq);
        }
        await new Promise((r) => setTimeout(r, 5));
      }
    })();

    await Promise.all(escritores);
    estado.correndo = false;
    await leitor;

    const todas = psql(url, [], 'select seq from arretado.alteracoes order by seq')
      .split('\n')
      .filter((l) => /^\d+$/.test(l))
      .map(Number);
    expect(todas).toHaveLength(ESCRITORES * LOTES * POR_LOTE);
    // Uma última leitura incremental completa o que a rodada anterior ainda não tinha visto.
    const puladas = todas.filter((s) => !vistos.has(s) && s <= cursor);
    expect(puladas).toEqual([]);
  }, 120_000);
});
