// Divergências devolvidas pelo envio (F4-B, B3): o servidor recusou avançar um registro porque o
// estado dele é outro. Este aparelho tem uma edição que o servidor não aceitou: abre o Conflito
// agora, com a versão de lá, sem esperar a puxada (e sem nunca trocar o registro local).
import type { NomeColecao } from '../modelo';
import type { Repositorio } from '../persistencia';
import { APARELHO_DO_SERVIDOR, ehColecao, reconciliar } from './aplicacao';
import { dadosDaAplicacao, emitirTocadas, type ContextoDeRecepcao } from './receber';
import { ehSoLocal } from './politica';
import type { DivergenciaNoServidor, ServidorDeSincronizacao } from './tipos';

export async function registrarDivergencias(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
  divergentes: readonly DivergenciaNoServidor[],
): Promise<number> {
  const { db } = repo;
  const vistos = new Set<string>();
  const tocadas = new Set<NomeColecao>();
  let conflitos = 0;
  try {
    for (const d of divergentes) {
      const chave = `${d.colecao}/${d.registro_id}`;
      if (vistos.has(chave) || !ehColecao(d.colecao) || ehSoLocal(d.colecao)) continue;
      vistos.add(chave);
      const nome = d.colecao;
      const estado = await servidor.lerRegistro(nome, d.registro_id);
      // Sem linha no servidor não há versão de lá para mostrar (ex.: remoção de algo que nunca subiu).
      if (!estado) continue;
      const x = dadosDaAplicacao(repo, ctx, tocadas);
      const r = await db.transaction('rw', db.tables, () =>
        reconciliar(x, nome, estado, APARELHO_DO_SERVIDOR, { forcarConflito: true }),
      );
      if (r.desfecho === 'conflito') conflitos += 1;
    }
    return conflitos;
  } finally {
    emitirTocadas(repo, tocadas);
  }
}
