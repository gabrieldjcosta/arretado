// Por que errei (ideia 7 da prancha "Fio que ensina"): depois de guardar a Frase, a pessoa pode dizer, em um
// toque, de onde veio o erro. É opcional e vive só neste aparelho, por pessoa, ao lado do estado do Fio (sem
// esquema e sem sincronização; a causa de verdade mora no Erro do esquema v6, e esta anotação passa para lá quando
// o caderno de erros nascer). O mesmo erro nunca vira três: a última resposta vale.
import type { CausaErro } from '../../../core/modelo';

/** As três respostas do toque: o que a pessoa diz, e a causa do Erro que ela nomeia. */
export const PORQUES: readonly { causa: CausaErro; texto: string; completo: string }[] = [
  { causa: 'confusao', texto: 'confundi', completo: 'confundi com outro artigo' },
  { causa: 'lacuna', texto: 'não lembrava', completo: 'não lembrava' },
  { causa: 'leitura', texto: 'li rápido', completo: 'li rápido demais' },
];

const chave = (usuarioId: string) => `arretado:fio:causas:v1:${usuarioId}`;
const memoria = new Map<string, string>();

/** As causas anotadas, por Frase; sem armazenamento vale a memória da página. */
export function lerCausas(usuarioId: string): Record<string, CausaErro> {
  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(chave(usuarioId));
  } catch {
    /* sem armazenamento */
  }
  bruto ??= memoria.get(chave(usuarioId)) ?? null;
  if (bruto === null) return {};
  try {
    const lido = JSON.parse(bruto) as Record<string, unknown>;
    const validas = new Set<string>(PORQUES.map((p) => p.causa));
    return Object.fromEntries(
      Object.entries(lido).filter(([, v]) => typeof v === 'string' && validas.has(v)),
    ) as Record<string, CausaErro>;
  } catch {
    return {};
  }
}

export function anotarPorQue(usuarioId: string, fraseId: string, causa: CausaErro): void {
  const texto = JSON.stringify({ ...lerCausas(usuarioId), [fraseId]: causa });
  memoria.set(chave(usuarioId), texto);
  try {
    window.localStorage.setItem(chave(usuarioId), texto);
  } catch {
    /* só a memória */
  }
}
