// Sequência que dobra (Gabriel, 05/11/2026). Dia sem estudo vira descanso e o total de dias de estudo nunca
// diminui: aqui só há contagem do que a pessoa fez, nunca de falta, de atraso nem de "dias seguidos". Domínio puro.
import { dataCivil, somarDias } from '../../core/datas';
import type { Repositorio } from '../../core/persistencia';

/** Quantos Dias o fio mostra, hoje incluído. */
export const DIAS_NO_FIO = 14;

export interface DiaDoFio {
  data: string;
  /** `estudo` = teve Sessão ou Revisão; `descanso` = não teve (nunca é falta). */
  estado: 'estudo' | 'descanso';
}

export interface SequenciaDoFio {
  /** Dias distintos com estudo, desde sempre: só cresce. */
  total: number;
  /** Os últimos `DIAS_NO_FIO` Dias, do mais antigo ao de hoje. */
  dias: readonly DiaDoFio[];
  /** Hoje ainda sem estudo: a tela diz que o fio espera. */
  hojeEmDescanso: boolean;
}

/** `undefined` = sem estudo nenhum ainda: não há o que dizer. */
export async function sequenciaDoFio(repo: Repositorio): Promise<SequenciaDoFio | undefined> {
  const [sessoes, revisoes, revisoesFrase] = await Promise.all([
    repo.colecao('sessoes').todosDoUsuario(),
    repo.colecao('revisoes').todosDoUsuario(),
    repo.colecao('revisoesFrase').todosDoUsuario(),
  ]);
  const estudou = new Set<string>();
  // Registro excluído também conta: apagar uma Sessão ou uma Revisão não desfaz o dia que a pessoa estudou, e é isso
  // que sustenta a promessa de que o total nunca diminui.
  for (const r of [...sessoes, ...revisoes, ...revisoesFrase]) estudou.add(r.data);
  if (estudou.size === 0) return undefined;
  const hoje = dataCivil(repo.ctx.agora());
  const dias = Array.from({ length: DIAS_NO_FIO }, (_, i) => {
    const data = somarDias(hoje, i - (DIAS_NO_FIO - 1));
    return { data, estado: estudou.has(data) ? ('estudo' as const) : ('descanso' as const) };
  });
  return { total: estudou.size, dias, hojeEmDescanso: !estudou.has(hoje) };
}

/** A frase da tela: o total e, com hoje em descanso, o fio que espera. Sem dívida. */
export function fraseDaSequencia(s: Pick<SequenciaDoFio, 'total' | 'hojeEmDescanso'>): string {
  const n =
    s.total === 1 ? '1 dia de estudo no caminho.' : `${String(s.total)} dias de estudo no caminho.`;
  return s.hojeEmDescanso ? `${n} O fio te espera, sem pressa.` : n;
}
