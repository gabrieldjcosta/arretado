import type { NomeColecao } from '../modelo';
import type { Alteracao } from './banco';
import {
  idsDoLote,
  OPERACAO_ADESAO,
  referenciaDe,
  registrosDoLote,
  type Reidratador,
} from './lote-acervo';

export type Estado = Map<NomeColecao, Map<string, Record<string, unknown>>>;

function colecaoDe(estado: Estado, nome: NomeColecao): Map<string, Record<string, unknown>> {
  let colecao = estado.get(nome);
  if (!colecao) {
    colecao = new Map();
    estado.set(nome, colecao);
  }
  return colecao;
}

/**
 * Reconstrói o estado aplicando o log em ordem (prova de que o log basta para sync e auditoria).
 * Entrada `acervo-adesao` (AL) reidrata a árvore do item pela fonte do acervo (`reidratar`); sem a
 * fonte, lança `FonteDoLoteAusente` em vez de inventar estado.
 */
export function reconstruirDoLog(alteracoes: Iterable<Alteracao>, reidratar?: Reidratador): Estado {
  const estado: Estado = new Map();
  for (const a of alteracoes) {
    if (a.operacao === OPERACAO_ADESAO) {
      const { dispositivos, textos } = registrosDoLote(a, reidratar);
      const d = colecaoDe(estado, 'dispositivos');
      for (const r of dispositivos) d.set(r.id, { ...r });
      const t = colecaoDe(estado, 'textosDispositivo');
      for (const r of textos) t.set(r.id, { ...r });
      continue;
    }
    const colecao = colecaoDe(estado, a.colecao);
    switch (a.operacao) {
      case 'gravar':
        colecao.set(a.registroId, { ...a.dados });
        break;
      case 'atualizar': {
        const atual = colecao.get(a.registroId);
        if (!atual)
          throw new Error(
            `Log inconsistente: atualização de ${a.colecao}/${a.registroId} inexistente`,
          );
        const novo = { ...atual, ...a.dados };
        for (const k of a.removidos ?? []) Reflect.deleteProperty(novo, k);
        colecao.set(a.registroId, novo);
        break;
      }
      case 'remover':
        colecao.delete(a.registroId);
        break;
    }
  }
  return estado;
}

/**
 * O que desfaz a entrada `seq`: para cada registro que ela tocou, o registro de antes (`null` =
 * não existia). A adesão por referência toca os registros do lote (ids derivados, sem a fonte); o
 * estado de antes de uma edição num registro do lote vem da referência, reidratada pela fonte.
 */
export function desfazerAlteracao(
  alteracoes: readonly Alteracao[],
  seq: number,
  reidratar?: Reidratador,
): Map<NomeColecao, Map<string, Record<string, unknown> | null>> {
  const alvo = alteracoes.find((a) => a.seq === seq);
  if (!alvo) throw new Error(`Entrada ${String(seq)} fora do log.`);
  const tocados: [NomeColecao, string][] = [];
  if (alvo.operacao === OPERACAO_ADESAO) {
    const ids = idsDoLote(referenciaDe(alvo));
    for (const id of ids.dispositivos) tocados.push(['dispositivos', id]);
    for (const id of ids.textos) tocados.push(['textosDispositivo', id]);
  } else {
    tocados.push([alvo.colecao, alvo.registroId]);
  }
  const antes = reconstruirDoLog(
    alteracoes.filter((a) => a.seq !== undefined && a.seq < seq),
    reidratar,
  );
  const saida = new Map<NomeColecao, Map<string, Record<string, unknown> | null>>();
  for (const [nome, id] of tocados) {
    let m = saida.get(nome);
    if (!m) {
      m = new Map();
      saida.set(nome, m);
    }
    m.set(id, antes.get(nome)?.get(id) ?? null);
  }
  return saida;
}
