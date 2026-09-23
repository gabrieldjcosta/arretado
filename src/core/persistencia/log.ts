import type { NomeColecao } from '../modelo';
import type { Alteracao } from './banco';

export type Estado = Map<NomeColecao, Map<string, Record<string, unknown>>>;

/** Reconstrói o estado aplicando o log em ordem (prova de que o log basta para sync e auditoria). */
export function reconstruirDoLog(alteracoes: Iterable<Alteracao>): Estado {
  const estado: Estado = new Map();
  for (const a of alteracoes) {
    let colecao = estado.get(a.colecao);
    if (!colecao) {
      colecao = new Map();
      estado.set(a.colecao, colecao);
    }
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
