// Retorno depois de uma pausa (F3-A, pacote A3b). Domínio puro: só lê o Repositório. Sem dívida
// (nada de "atrasado" nem contagem de pendências) e sem sequência quebrada (nada de "dias seguidos").
import { dataCivil, diferencaEmDias } from '../../core/datas';
import type { Repositorio } from '../../core/persistencia';

/** A partir de quantos dias sem atividade o Hoje dá as boas-vindas de volta. */
export const DIAS_PARA_RETORNO = 2;

export interface SituacaoDeRetorno {
  /** Dias civis desde a última atividade; só para escolher o tom, nunca mostrado como cobrança. */
  diasFora: number;
  /** Próximo passo que a pessoa mesma deixou na última Sessão encerrada com um. */
  proximoPasso?: string;
  /** Rótulo do alvo dessa Sessão (para a retomada). */
  alvoRotulo?: string;
}

/**
 * `undefined` = não há o que dizer: sem histórico, atividade hoje ou ontem. Atividade = Sessão
 * (qualquer estado, inclusive interrompida) ou Revisão de cartão/frase.
 */
export async function situacaoDeRetorno(repo: Repositorio): Promise<SituacaoDeRetorno | undefined> {
  const [sessoes, revisoes, revisoesFrase] = await Promise.all([
    repo.colecao('sessoes').todosDoUsuario(),
    repo.colecao('revisoes').todosDoUsuario(),
    repo.colecao('revisoesFrase').todosDoUsuario(),
  ]);
  const datas = [...sessoes.map((s) => s.data), ...revisoes.map((r) => r.data)];
  for (const r of revisoesFrase) datas.push(r.data);
  const ultima = datas.sort().at(-1);
  if (!ultima) return undefined;
  const diasFora = diferencaEmDias(ultima, dataCivil(repo.ctx.agora()));
  if (diasFora < DIAS_PARA_RETORNO) return undefined;
  const deixou = sessoes
    .filter((s) => s.estado === 'encerrada' && s.proximoPasso)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
  return {
    diasFora,
    ...(deixou?.proximoPasso ? { proximoPasso: deixou.proximoPasso } : {}),
    ...(deixou?.alvo?.rotulo ? { alvoRotulo: deixou.alvo.rotulo } : {}),
  };
}
