// Recepção (F4-B, B3; plano §5): puxa o log do servidor acima do cursor e aplica cada entrada ao
// banco local. Nunca sobrescreve em silêncio: a entrada só avança o registro quando parte da versão
// que este aparelho conhece; senão vira Conflito (`aplicacao.reconciliar`) e o registro local fica.
import type { NomeColecao } from '../modelo';
import { Id, TsLogico } from '../modelo';
import {
  montarRegistrosDoLote,
  OPERACAO_ADESAO,
  ReferenciaDeAcervo,
  type Alteracao,
  type Reidratador,
  type Repositorio,
} from '../persistencia';
import {
  APARELHO_DO_SERVIDOR,
  adotarRegistro,
  ehColecao,
  reconciliar,
  registrarNoLog,
  validarRegistro,
  type DadosDaAplicacao,
} from './aplicacao';
import { conflitoAberto } from './conflitos';
import type { ContextoDeEnvio } from './envio';
import { temEntrada, ultimoTsDoRegistro } from './log-local';
import { CAMPOS_DE_CARIMBO, ehSoLocal, soCamposDoAparelho } from './politica';
import type { EntradaRecebida, RegistroRemoto, ServidorDeSincronizacao } from './tipos';

/** `meta`: último `seq` do log do servidor já tratado por este aparelho (cursor de recepção). */
export const CHAVE_SEQ_RECEBIDO = 'sync.ultimoSeqRecebido';
/** `meta`: entradas recebidas que não puderam ser aplicadas (dado inválido, fonte do acervo ausente). */
export const CHAVE_QUARENTENA_RECEBIDOS = 'sync.quarentenaRecebidos';
/** `meta`: o app é mais antigo que uma entrada; a recepção espera a atualização. */
export const CHAVE_PARADA_POR_VERSAO = 'sync.paradaPorVersao';
/** `meta`: o log sozinho não bastou; falta uma recarga completa a partir de `registros`. */
export const CHAVE_RECARGA_NECESSARIA = 'sync.recargaNecessaria';

export const TAMANHO_DA_PAGINA = 200;
const MAX_NA_QUARENTENA = 200;

export interface ContextoDeRecepcao extends ContextoDeEnvio {
  /** Prepara a fonte do acervo para reidratar as adesões recebidas (mesma peça de `migrar-para-conta`). */
  prepararReidratacao?: (log: readonly Alteracao[]) => Promise<Reidratador>;
  /** Versão do app; a quarentena por esquema só é tentada de novo quando ela muda. */
  versaoApp?: string;
}

export interface EntradaRecebidaEmQuarentena {
  seq: number;
  colecao: string;
  registroId: string;
  motivo: string;
  em: string;
  /** A fonte do acervo pode voltar: a recepção tenta de novo nas próximas rodadas. */
  retentavel: boolean;
  /** Só nas recusas do esquema: a versão do app que recusou; tenta de novo quando for outra. */
  versaoApp?: string;
  /** A entrada, para tentar de novo; ausente quando veio da recarga (que relê o estado do servidor). */
  entrada?: EntradaRecebida;
}

export interface ResultadoDaRecepcao {
  aplicadas: number;
  conflitos: number;
  ignoradas: number;
  quarentena: number;
  /** O app é mais antigo que uma entrada: parou nela até atualizar (nada se perde). */
  paradaPorVersao: boolean;
  /** O log não bastou para algum registro; a recarga completa resolve. */
  precisaRecarga: boolean;
}

export function resultadoVazioDaRecepcao(): ResultadoDaRecepcao {
  return {
    aplicadas: 0,
    conflitos: 0,
    ignoradas: 0,
    quarentena: 0,
    paradaPorVersao: false,
    precisaRecarga: false,
  };
}

export async function lerSeqRecebido(repo: Repositorio): Promise<number> {
  const v = (await repo.db.meta.get(CHAVE_SEQ_RECEBIDO))?.valor;
  return typeof v === 'number' ? v : 0;
}

export function dadosDaAplicacao(
  repo: Repositorio,
  ctx: ContextoDeEnvio,
  tocadas: Set<NomeColecao>,
): DadosDaAplicacao {
  return {
    db: repo.db,
    usuarioId: ctx.usuarioId,
    aparelhoId: ctx.aparelhoId,
    agora: ctx.agora ?? repo.ctx.agora,
    novoId: repo.ctx.novoId,
    observar: (ts) => {
      repo.ctx.relogio.observar(ts);
    },
    tocadas,
  };
}

/** Um evento por coleção tocada, depois de confirmar (a tela relê; o envio não recomeça por isto). */
export function emitirTocadas(repo: Repositorio, tocadas: Set<NomeColecao>): void {
  for (const colecao of tocadas) repo.eventos.emitir('registro.lote', { colecao, quantidade: 0 });
  tocadas.clear();
}

export async function anotarQuarentena(
  x: DadosDaAplicacao,
  e: { seq: number; colecao: string; registro_id: string; entrada?: EntradaRecebida },
  motivo: string,
  retentavel = false,
  versaoApp?: string,
): Promise<void> {
  const atual = (await x.db.meta.get(CHAVE_QUARENTENA_RECEBIDOS))?.valor;
  const lista = Array.isArray(atual) ? (atual as EntradaRecebidaEmQuarentena[]) : [];
  const semEla = lista.filter(
    (q) => !(q.seq === e.seq && q.colecao === e.colecao && q.registroId === e.registro_id),
  );
  semEla.push({
    seq: e.seq,
    colecao: e.colecao,
    registroId: e.registro_id,
    motivo: motivo.slice(0, 300),
    em: x.agora().toISOString(),
    retentavel,
    ...(versaoApp === undefined ? {} : { versaoApp }),
    ...(e.entrada ? { entrada: e.entrada } : {}),
  });
  await x.db.meta.put({
    chave: CHAVE_QUARENTENA_RECEBIDOS,
    valor: semEla.slice(-MAX_NA_QUARENTENA),
  });
}

export async function lerQuarentenaDeRecebidos(
  repo: Repositorio,
): Promise<EntradaRecebidaEmQuarentena[]> {
  const v = (await repo.db.meta.get(CHAVE_QUARENTENA_RECEBIDOS))?.valor;
  return Array.isArray(v) ? (v as EntradaRecebidaEmQuarentena[]) : [];
}

type Desfecho = 'aplicada' | 'ignorada' | 'conflito' | 'quarentena';

type Passo =
  | {
      tipo: 'fim';
      desfecho: Desfecho;
      motivo?: string;
      precisaRecarga?: boolean;
      /** Recusa do esquema deste app: tenta de novo quando o app mudar de versão. */
      porEsquema?: boolean;
    }
  | { tipo: 'precisa-estado' };

/** Remove de `dados` o que não deve entrar por uma entrada de outro aparelho (campos só deste aparelho). */
function semCamposLocais(nome: NomeColecao, dados: Record<string, unknown>, local: unknown) {
  const manter = local ? soCamposDoAparelho(nome, local as Record<string, unknown>) : {};
  return { ...dados, ...manter };
}

async function aplicarAdesao(
  x: DadosDaAplicacao,
  e: EntradaRecebida,
  reidratar: Reidratador | undefined,
): Promise<Passo> {
  const ref = ReferenciaDeAcervo.safeParse(e.dados);
  if (!ref.success)
    return { tipo: 'fim', desfecho: 'quarentena', motivo: 'referência de adesão inválida' };
  if (ref.data.normaId !== e.registro_id) {
    return { tipo: 'fim', desfecho: 'quarentena', motivo: 'adesão com norma diferente da entrada' };
  }
  if (await temEntrada(x.db, 'dispositivos', e.registro_id, e.ts)) {
    return { tipo: 'fim', desfecho: 'ignorada' };
  }
  const conteudo = reidratar?.(ref.data);
  if (!conteudo) {
    return {
      tipo: 'fim',
      desfecho: 'quarentena',
      motivo: `fonte do item "${ref.data.itemId}" do acervo indisponível`,
      precisaRecarga: false,
    };
  }
  let montados;
  try {
    montados = montarRegistrosDoLote(ref.data, x.usuarioId, conteudo);
  } catch (erro) {
    return {
      tipo: 'fim',
      desfecho: 'quarentena',
      motivo: erro instanceof Error ? erro.message : 'lote inválido',
    };
  }
  // Não pisa no que a pessoa já tem: só entram os que faltam (o lote é determinístico por `base`).
  const dispositivos = x.db.tabela('dispositivos');
  const textos = x.db.tabela('textosDispositivo');
  const faltamD = (await dispositivos.bulkGet(montados.dispositivos.map((r) => r.id))).map(
    (r) => r === undefined,
  );
  const faltamT = (await textos.bulkGet(montados.textos.map((r) => r.id))).map(
    (r) => r === undefined,
  );
  await dispositivos.bulkAdd(montados.dispositivos.filter((_, i) => faltamD[i]));
  await textos.bulkAdd(montados.textos.filter((_, i) => faltamT[i]));
  await x.db.alteracoes.add({
    ts: e.ts,
    aparelhoId: e.aparelho_id,
    usuarioId: x.usuarioId,
    colecao: 'dispositivos',
    registroId: e.registro_id,
    operacao: OPERACAO_ADESAO,
    dados: { ...ref.data },
  });
  x.observar(e.ts);
  x.tocadas.add('dispositivos');
  x.tocadas.add('textosDispositivo');
  return { tipo: 'fim', desfecho: 'aplicada' };
}

/** Decide e aplica uma entrada de outro aparelho. Roda dentro de uma transação (sem rede). */
async function decidir(
  x: DadosDaAplicacao,
  ctx: ContextoDeRecepcao,
  e: EntradaRecebida,
  estado: RegistroRemoto | null | undefined,
  reidratar: Reidratador | undefined,
): Promise<Passo> {
  const ignorada: Passo = { tipo: 'fim', desfecho: 'ignorada' };
  if (e.aparelho_id === ctx.aparelhoId || e.divergente) return ignorada;
  if (!ehColecao(e.colecao)) {
    return {
      tipo: 'fim',
      desfecho: 'quarentena',
      motivo: `coleção desconhecida: ${e.colecao.slice(0, 40)}`,
    };
  }
  const nome = e.colecao;
  if (ehSoLocal(nome)) return ignorada;
  if (!TsLogico.safeParse(e.ts).success || !Id.safeParse(e.registro_id).success) {
    return { tipo: 'fim', desfecho: 'quarentena', motivo: 'carimbo ou id inválido' };
  }
  if (e.operacao === OPERACAO_ADESAO) return aplicarAdesao(x, e, reidratar);

  const { db } = x;
  const id = e.registro_id;
  if (await temEntrada(db, nome, id, e.ts)) return ignorada;

  const local = (await db.tabela(nome).get(id)) as Record<string, unknown> | undefined;
  const ultima = await ultimoTsDoRegistro(db, nome, id);
  const livre = ultima === (e.base_ts ?? null) && !(await conflitoAberto(db, nome, id));

  if (!livre) {
    // Cadeia diferente da do servidor: precisa do estado atual lá para decidir (rede, fora da transação).
    if (estado === undefined) return { tipo: 'precisa-estado' };
    if (estado === null) {
      return {
        tipo: 'fim',
        desfecho: 'quarentena',
        motivo: 'o servidor não tem o registro desta entrada',
      };
    }
    const r = await reconciliar(x, nome, estado, e.aparelho_id);
    return { tipo: 'fim', desfecho: r.desfecho, motivo: r.motivo };
  }

  if (e.operacao === 'remover') {
    if (local) await db.tabela(nome).delete(id);
    await registrarNoLog(x, {
      ts: e.ts,
      aparelhoId: e.aparelho_id,
      colecao: nome,
      registroId: id,
      operacao: 'remover',
    });
    return { tipo: 'fim', desfecho: 'aplicada' };
  }

  if (e.operacao === 'gravar') {
    const v = validarRegistro(nome, e.dados, x.usuarioId, id);
    if (!v.ok)
      return {
        tipo: 'fim',
        desfecho: 'quarentena',
        motivo: v.motivo,
        porEsquema: v.esquema === true,
      };
    await adotarRegistro(x, nome, v.registro, local);
    await registrarNoLog(x, {
      ts: e.ts,
      aparelhoId: e.aparelho_id,
      colecao: nome,
      registroId: id,
      operacao: 'gravar',
      dados: v.registro,
    });
    return { tipo: 'fim', desfecho: 'aplicada' };
  }

  // atualizar: parte do registro que a entrada diz ter visto; sem ele aqui o log não basta.
  if (!local) {
    return {
      tipo: 'fim',
      desfecho: 'quarentena',
      motivo: 'atualização de registro que este aparelho não tem',
      precisaRecarga: true,
    };
  }
  const dados = e.dados ?? {};
  const mesclado: Record<string, unknown> = semCamposLocais(nome, { ...local, ...dados }, local);
  for (const k of e.removidos ?? [])
    if (!CAMPOS_DE_CARIMBO.includes(k)) Reflect.deleteProperty(mesclado, k);
  const v = validarRegistro(nome, mesclado, x.usuarioId, id);
  if (!v.ok)
    return {
      tipo: 'fim',
      desfecho: 'quarentena',
      motivo: v.motivo,
      porEsquema: v.esquema === true,
    };
  await db.tabela(nome).put(v.registro as never);
  await registrarNoLog(x, {
    ts: e.ts,
    aparelhoId: e.aparelho_id,
    colecao: nome,
    registroId: id,
    operacao: 'atualizar',
    dados,
    removidos: e.removidos,
  });
  return { tipo: 'fim', desfecho: 'aplicada' };
}

/**
 * Trata uma entrada e avança o cursor na mesma transação (cair no meio repete a entrada, que é
 * idempotente). Quando precisa do estado do servidor, busca-o fora da transação e tenta de novo.
 */
async function tratar(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
  e: EntradaRecebida,
  tocadas: Set<NomeColecao>,
  avancarCursor = true,
): Promise<{ desfecho: Desfecho; precisaRecarga: boolean }> {
  const { db } = repo;
  let reidratar: Reidratador | undefined;
  if (
    e.operacao === OPERACAO_ADESAO &&
    e.aparelho_id !== ctx.aparelhoId &&
    !e.divergente &&
    ctx.prepararReidratacao
  ) {
    const como: Alteracao = {
      ts: e.ts,
      aparelhoId: e.aparelho_id,
      usuarioId: ctx.usuarioId,
      colecao: 'dispositivos',
      registroId: e.registro_id,
      operacao: OPERACAO_ADESAO,
      ...(e.dados ? { dados: e.dados } : {}),
    };
    reidratar = await ctx.prepararReidratacao([como]);
  }

  let estado: RegistroRemoto | null | undefined;
  for (;;) {
    const efeitos = new Set<NomeColecao>();
    const x = dadosDaAplicacao(repo, ctx, efeitos);
    const r = await db.transaction('rw', db.tables, async () => {
      const passo = await decidir(x, ctx, e, estado, reidratar);
      if (passo.tipo === 'precisa-estado') return passo;
      if (passo.desfecho === 'quarentena') {
        await anotarQuarentena(
          x,
          { ...e, entrada: e },
          passo.motivo ?? 'entrada recusada',
          e.operacao === OPERACAO_ADESAO || passo.porEsquema === true,
          passo.porEsquema === true ? (ctx.versaoApp ?? '') : undefined,
        );
      }
      if (avancarCursor) await db.meta.put({ chave: CHAVE_SEQ_RECEBIDO, valor: e.seq });
      if (passo.precisaRecarga) await db.meta.put({ chave: CHAVE_RECARGA_NECESSARIA, valor: true });
      return passo;
    });
    if (r.tipo === 'precisa-estado') {
      estado = await servidor.lerRegistro(e.colecao, e.registro_id);
      continue;
    }
    for (const c of efeitos) tocadas.add(c);
    return { desfecho: r.desfecho, precisaRecarga: r.precisaRecarga === true };
  }
}

/** Trata só uma entrada de adesão do acervo (a recarga as lê à parte, sem mexer no cursor do log). */
export function tratarEntradaDeAdesao(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
  e: EntradaRecebida,
  tocadas: Set<NomeColecao>,
): Promise<{ desfecho: Desfecho; precisaRecarga: boolean }> {
  return tratar(repo, servidor, ctx, e, tocadas, false);
}

function contar(
  resultado: ResultadoDaRecepcao,
  d: { desfecho: Desfecho; precisaRecarga: boolean },
) {
  if (d.desfecho === 'aplicada') resultado.aplicadas += 1;
  else if (d.desfecho === 'ignorada') resultado.ignoradas += 1;
  else if (d.desfecho === 'conflito') resultado.conflitos += 1;
  else resultado.quarentena += 1;
  if (d.precisaRecarga) resultado.precisaRecarga = true;
}

/** Tenta de novo as adesões que esperavam a fonte do acervo (voltou a rede, o app foi atualizado). */
async function retentarQuarentena(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
  resultado: ResultadoDaRecepcao,
  tocadas: Set<NomeColecao>,
): Promise<void> {
  const lista = await lerQuarentenaDeRecebidos(repo);
  // Adesão do acervo: tenta a cada rodada (a fonte pode ter voltado). Recusa do esquema: só quando o app mudou.
  const aTentar = lista.filter((q) =>
    !q.retentavel
      ? false
      : q.versaoApp === undefined
        ? ctx.prepararReidratacao !== undefined
        : ctx.versaoApp !== undefined && q.versaoApp !== ctx.versaoApp,
  );
  if (aTentar.length === 0) return;
  const restante = lista.filter((q) => !aTentar.includes(q));
  const ainda: EntradaRecebidaEmQuarentena[] = [];
  for (const q of aTentar) {
    if (!q.entrada) continue;
    // O cursor já passou desta entrada: não anda de novo.
    const d = await tratar(repo, servidor, ctx, q.entrada, tocadas, false);
    if (d.desfecho === 'quarentena')
      ainda.push(q.versaoApp === undefined ? q : { ...q, versaoApp: ctx.versaoApp ?? '' });
    else contar(resultado, d);
  }
  await repo.db.meta.put({ chave: CHAVE_QUARENTENA_RECEBIDOS, valor: [...restante, ...ainda] });
}

/**
 * Puxa e aplica o log do servidor acima do cursor. Falha de rede propaga (o agendador repete); o
 * cursor só anda depois de cada entrada ser tratada. Entrada de um app mais novo para a recepção.
 */
export async function receberNovidades(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
): Promise<ResultadoDaRecepcao> {
  const resultado = resultadoVazioDaRecepcao();
  const tocadas = new Set<NomeColecao>();
  try {
    await retentarQuarentena(repo, servidor, ctx, resultado, tocadas);
    for (;;) {
      const cursor = await lerSeqRecebido(repo);
      const pagina = await servidor.puxarLog(cursor, TAMANHO_DA_PAGINA);
      for (const e of pagina) {
        if (e.seq <= (await lerSeqRecebido(repo))) continue;
        const deOutro = e.aparelho_id !== ctx.aparelhoId && !e.divergente;
        if (deOutro && e.versao_esquema !== null && e.versao_esquema > ctx.versaoEsquema) {
          await repo.db.meta.put({
            chave: CHAVE_PARADA_POR_VERSAO,
            valor: { seq: e.seq, versao: e.versao_esquema },
          });
          resultado.paradaPorVersao = true;
          return resultado;
        }
        contar(resultado, await tratar(repo, servidor, ctx, e, tocadas));
      }
      if (pagina.length < TAMANHO_DA_PAGINA) break;
    }
    await repo.db.meta.delete(CHAVE_PARADA_POR_VERSAO);
    return resultado;
  } finally {
    emitirTocadas(repo, tocadas);
  }
}

export { APARELHO_DO_SERVIDOR };
