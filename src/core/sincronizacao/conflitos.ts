// Conflitos (F4-B, B3; plano §5): duas versões do mesmo registro nunca se sobrepõem em silêncio.
// Funções puras e consultas à tabela interna `conflitos`; quem decide a escolha é a pessoa (B4, UI).
import type { BancoArretado, Conflito } from '../persistencia';
import { iguais } from '../util/json-canonico';
import { CAMPOS_DE_CARIMBO } from './politica';

type Registro = Record<string, unknown>;

/** Campos que só trocam a cada edição, sem significar mudança de conteúdo. */
const IGNORADOS = new Set<string>(CAMPOS_DE_CARIMBO);

/** As duas versões dizem o mesmo (ignorados os carimbos)? Então não há o que a pessoa decidir. */
export function equivalentes(a: Registro, b: Registro): boolean {
  const limpa = (r: Registro) =>
    Object.fromEntries(Object.entries(r).filter(([k]) => !IGNORADOS.has(k)));
  return iguais(limpa(a), limpa(b));
}

/**
 * Campos em que as versões diferem, em ordem alfabética (para destacar na tela). Um lado nulo
 * (apagado) não tem campos: devolve todos os do outro lado.
 */
export function camposDiferentes(minha: Registro | null, deles: Registro | null): string[] {
  const chaves = new Set([...Object.keys(minha ?? {}), ...Object.keys(deles ?? {})]);
  return [...chaves].filter((k) => !IGNORADOS.has(k) && !iguais(minha?.[k], deles?.[k])).sort();
}

export async function conflitoAberto(
  db: BancoArretado,
  colecao: string,
  registroId: string,
): Promise<Conflito | undefined> {
  return db.conflitos
    .where('[colecao+registroId]')
    .equals([colecao, registroId])
    .filter((c) => c.resolvidoEm === undefined)
    .first();
}

/** Conflitos sem resolução, do mais antigo ao mais novo. */
export async function listarConflitos(db: BancoArretado): Promise<Conflito[]> {
  const abertos = await db.conflitos.filter((c) => c.resolvidoEm === undefined).toArray();
  return abertos.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

export async function contarConflitos(db: BancoArretado): Promise<number> {
  return db.conflitos.filter((c) => c.resolvidoEm === undefined).count();
}
