// Recarga completa (F4-B, B3; plano §1): aparelho novo, ou aparelho que perdeu o fio do log. Baixa o
// estado em `registros` (que é o checkpoint do servidor), em páginas e retomável, e o reconcilia com
// o que o aparelho já tem: o que falta entra, o que é igual passa, o que diverge vira Conflito.
import type { NomeColecao } from '../modelo';
import { OPERACAO_ADESAO, type Repositorio } from '../persistencia';
import { APARELHO_DO_SERVIDOR, ehColecao, reconciliar } from './aplicacao';
import {
  anotarQuarentena,
  CHAVE_RECARGA_NECESSARIA,
  CHAVE_SEQ_RECEBIDO,
  dadosDaAplicacao,
  emitirTocadas,
  lerSeqRecebido,
  resultadoVazioDaRecepcao,
  TAMANHO_DA_PAGINA,
  tratarEntradaDeAdesao,
  type ContextoDeRecepcao,
  type ResultadoDaRecepcao,
} from './receber';
import { ehSoLocal } from './politica';
import type { ChaveDeRegistro, ServidorDeSincronizacao } from './tipos';

/** `meta`: andamento da recarga em curso (some ao terminar); permite retomar depois de uma queda. */
export const CHAVE_RECARGA = 'sync.recarga';
export const TAMANHO_DA_PAGINA_DE_REGISTROS = 500;

interface AndamentoDaRecarga {
  /** Maior `seq` do log lido ANTES de baixar `registros`: depois dele o log incremental completa. */
  seqCorte: number;
  fase: 'adesoes' | 'registros';
  adesoesDepoisDe: number;
  depois: ChaveDeRegistro | null;
}

export async function recargaEmAndamento(repo: Repositorio): Promise<boolean> {
  return (await repo.db.meta.get(CHAVE_RECARGA)) !== undefined;
}

/** Este aparelho nunca recebeu do servidor: a primeira rodada é uma recarga. */
export async function primeiraRecepcao(repo: Repositorio): Promise<boolean> {
  return (await repo.db.meta.get(CHAVE_SEQ_RECEBIDO)) === undefined;
}

export async function recargaNecessaria(repo: Repositorio): Promise<boolean> {
  return (
    (await repo.db.meta.get(CHAVE_RECARGA_NECESSARIA))?.valor === true ||
    (await recargaEmAndamento(repo)) ||
    (await primeiraRecepcao(repo))
  );
}

export async function recarregarDaConta(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
): Promise<ResultadoDaRecepcao> {
  const { db } = repo;
  const resultado = resultadoVazioDaRecepcao();
  const tocadas = new Set<NomeColecao>();
  try {
    let andamento = (await db.meta.get(CHAVE_RECARGA))?.valor as AndamentoDaRecarga | undefined;
    if (!andamento) {
      andamento = {
        seqCorte: await servidor.instantaneoInicio(),
        fase: 'adesoes',
        adesoesDepoisDe: 0,
        depois: null,
      };
      await db.meta.put({ chave: CHAVE_RECARGA, valor: andamento });
    }
    const guardar = () => db.meta.put({ chave: CHAVE_RECARGA, valor: andamento });

    // 1) Adesões do acervo: não têm linha em `registros`; vêm do log e se refazem pela fonte.
    while (andamento.fase === 'adesoes') {
      const pagina = await servidor.puxarLog(
        andamento.adesoesDepoisDe,
        TAMANHO_DA_PAGINA,
        OPERACAO_ADESAO,
      );
      for (const e of pagina) {
        const d = await tratarEntradaDeAdesao(repo, servidor, ctx, e, tocadas);
        if (d.desfecho === 'aplicada') resultado.aplicadas += 1;
        else if (d.desfecho === 'quarentena') resultado.quarentena += 1;
        else resultado.ignoradas += 1;
        andamento.adesoesDepoisDe = e.seq;
        await guardar();
      }
      if (pagina.length < TAMANHO_DA_PAGINA) {
        andamento.fase = 'registros';
        await guardar();
      }
    }

    // 2) Estado atual de cada registro, por chave, em páginas.
    for (;;) {
      const pagina = await servidor.puxarRegistros(
        andamento.depois,
        TAMANHO_DA_PAGINA_DE_REGISTROS,
      );
      if (pagina.length === 0) break;
      const efeitos = new Set<NomeColecao>();
      const x = dadosDaAplicacao(repo, ctx, efeitos);
      const ultimo = pagina.at(-1);
      await db.transaction('rw', db.tables, async () => {
        for (const r of pagina) {
          if (!ehColecao(r.colecao)) {
            await anotarQuarentena(
              x,
              { seq: 0, colecao: r.colecao, registro_id: r.id },
              'coleção desconhecida',
            );
            resultado.quarentena += 1;
            continue;
          }
          if (ehSoLocal(r.colecao)) continue;
          const d = await reconciliar(x, r.colecao, r, APARELHO_DO_SERVIDOR);
          if (d.desfecho === 'aplicada') resultado.aplicadas += 1;
          else if (d.desfecho === 'conflito') resultado.conflitos += 1;
          else if (d.desfecho === 'ignorada') resultado.ignoradas += 1;
          else {
            await anotarQuarentena(
              x,
              { seq: 0, colecao: r.colecao, registro_id: r.id },
              d.motivo ?? 'registro recusado',
            );
            resultado.quarentena += 1;
          }
          x.observar(r.ts_logico);
        }
        if (ultimo) {
          andamento.depois = { colecao: ultimo.colecao, id: ultimo.id };
          await guardar();
        }
      });
      for (const c of efeitos) tocadas.add(c);
      if (pagina.length < TAMANHO_DA_PAGINA_DE_REGISTROS) break;
    }

    // 3) Pronto: o log incremental continua de onde o estado foi lido.
    await db.transaction('rw', db.meta, async () => {
      if ((await lerSeqRecebido(repo)) < andamento.seqCorte || (await primeiraRecepcao(repo))) {
        await db.meta.put({ chave: CHAVE_SEQ_RECEBIDO, valor: andamento.seqCorte });
      }
      await db.meta.delete(CHAVE_RECARGA);
      await db.meta.delete(CHAVE_RECARGA_NECESSARIA);
    });
    return resultado;
  } finally {
    emitirTocadas(repo, tocadas);
  }
}
