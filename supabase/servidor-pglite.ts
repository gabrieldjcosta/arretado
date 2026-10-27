// "Servidor" de sincronização dos testes: o SQL real das migrações em PGlite, chamado como o cliente
// o chama (papel `authenticated`, dono = `request.jwt.claim.sub`). Os testes de convergência ligam
// vários aparelhos (bancos locais) a ele; nada aqui toca o Supabase real.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  FalhaDeSincronizacao,
  type EntradaRecebida,
  type RegistroRemoto,
  type RespostaDePosse,
  type ServidorDeSincronizacao,
} from '../src/core/sincronizacao';
import { PRELUDIO } from './prelude-supabase';

const PASTA = path.join(import.meta.dirname, 'migrations');

export interface BancoRemoto {
  db: PGlite;
  /** Cria o usuário no Auth, libera e registra o aceite da sincronização. */
  criarUsuario(uid: string, opcoes?: { liberado?: boolean; aceite?: boolean }): Promise<void>;
  /** O servidor visto por um aparelho logado como `uid`; `falhas` simula rede/recusa nas próximas chamadas. */
  servidorDe(uid: string): ServidorDeSincronizacao & { falhas: (FalhaDeSincronizacao | null)[] };
}

export async function criarBancoRemoto(): Promise<BancoRemoto> {
  const db = new PGlite();
  await db.exec(PRELUDIO);
  for (const f of readdirSync(PASTA)
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync(path.join(PASTA, f), 'utf8'));
  }

  const como = async <T>(uid: string, fn: () => Promise<T>): Promise<T> => {
    await db.exec('begin');
    try {
      await db.exec(`set local role authenticated; set local request.jwt.claim.sub = '${uid}'`);
      const r = await fn();
      await db.exec('commit');
      return r;
    } catch (erro) {
      await db.exec('rollback');
      throw erro;
    }
  };

  return {
    db,
    async criarUsuario(uid, { liberado = true, aceite = true } = {}) {
      await db.exec(`insert into auth.users values ('${uid}')`);
      if (liberado) {
        await db.exec(
          `update arretado.perfis set sincronizacao_liberada = true where usuario_id = '${uid}'`,
        );
      }
      if (aceite)
        await como(uid, () => db.query("select arretado.aceitar_sincronizacao('v4:sincronizar')"));
    },
    servidorDe(uid) {
      const falhas: (FalhaDeSincronizacao | null)[] = [];
      const chamar = async <T>(fn: () => Promise<T>): Promise<T> => {
        if (falhas.length > 0) {
          const f = falhas.shift();
          throw f ?? new FalhaDeSincronizacao('Sem conexão.', false);
        }
        try {
          return await como(uid, fn);
        } catch (erro) {
          // 4xx do servidor (dado recusado) é definitivo; o resto repete.
          const motivo = erro instanceof Error ? erro.message : String(erro);
          throw new FalhaDeSincronizacao(motivo, /check|inválid|violates/.test(motivo));
        }
      };
      return {
        falhas,
        enviarLote: (aparelhoId, versaoEsquema, entradas) =>
          chamar(async () => {
            const r = await db.query<{ r: unknown }>(
              'select arretado.enviar_lote($1::uuid, $2::smallint, $3::jsonb) as r',
              [aparelhoId, versaoEsquema, JSON.stringify(entradas)],
            );
            return r.rows[0]?.r as never;
          }),
        puxarLog: (depoisDe, limite, operacao) =>
          chamar(async () => {
            const r = await db.query<EntradaRecebida>(
              `select seq::float8 as seq, aparelho_id, ts, colecao, registro_id, operacao, dados, removidos,
                      base_ts, divergente, versao_esquema::int as versao_esquema
                 from arretado.alteracoes
                where seq > $1 and ($3::text is null or operacao = $3)
                order by seq limit $2`,
              [depoisDe, limite, operacao ?? null],
            );
            return r.rows;
          }),
        lerRegistro: (colecao, id) =>
          chamar(async () => {
            const r = await db.query<RegistroRemoto>(
              `select colecao, id, ts_logico, dados, excluido_em::text as excluido_em
                 from arretado.registros where colecao = $1 and id = $2::uuid`,
              [colecao, id],
            );
            return r.rows[0] ?? null;
          }),
        instantaneoInicio: () =>
          chamar(async () => {
            const r = await db.query<{ v: number }>(
              'select arretado.instantaneo_inicio()::float8 as v',
            );
            return r.rows[0]?.v ?? 0;
          }),
        puxarRegistros: (depois, limite) =>
          chamar(async () => {
            const r = await db.query<RegistroRemoto>(
              `select colecao, id, ts_logico, dados, excluido_em::text as excluido_em
                 from arretado.registros
                where ($1::text is null or (colecao, id) > ($1::text, $2::uuid))
                order by colecao, id limit $3`,
              [depois?.colecao ?? null, depois?.id ?? null, limite],
            );
            return r.rows;
          }),
        registrarSincronia: (aparelhoId, seq, versao) =>
          chamar(async () => {
            await db.query(
              'select arretado.registrar_sincronia($1::uuid, $2::bigint, $3::smallint)',
              [aparelhoId, seq, versao],
            );
          }),
        pontoDaPoda: () =>
          chamar(async () => {
            const r = await db.query<{ v: number }>('select arretado.ponto_da_poda()::float8 as v');
            return r.rows[0]?.v ?? 0;
          }),
        pedirPosse: (aparelhoId, forcar) =>
          chamar(async () => {
            const r = await db.query<{ v: RespostaDePosse }>(
              'select arretado.pedir_posse($1::uuid, $2::boolean) as v',
              [aparelhoId, forcar],
            );
            return r.rows[0]?.v ?? { concedida: false, aparelho_id: aparelhoId };
          }),
        soltarPosse: (aparelhoId) =>
          chamar(async () => {
            await db.query('select arretado.soltar_posse($1::uuid)', [aparelhoId]);
          }),
      };
    },
  };
}
