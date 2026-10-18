// Log de lote por referência (F4-A, pacote AL; plano f4a-contas.md §9). A adesão a um item do
// acervo grava a árvore (dispositivos e textos) nas tabelas como sempre, mas no log entra uma só
// entrada `acervo-adesao` com a referência (item, versão, hash) e o que torna os registros
// reprodutíveis: a base dos ids, o primeiro carimbo e o instante. O conteúdo vem da fonte do
// acervo (arquivos imutáveis por hash); sem ela, reconstruir é Problema explícito.
import { z } from 'zod';
import { ENTIDADES, Id, Instante, TsLogico, type RegistroDe } from '../modelo';
import { lerCarimbo } from '../ids';
import type { Alteracao } from './banco';
import type { Dados } from './colecao';

export const OPERACAO_ADESAO = 'acervo-adesao';

export const ReferenciaDeAcervo = z.strictObject({
  itemId: z.string().min(1).max(128),
  versao: z.int().min(1),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  normaId: Id,
  versaoId: Id,
  /** Base dos ids derivados: dispositivo `k` = `idDoLote(base, k)`, texto `k` = `idDoLote(base, n + k)`. */
  base: Id,
  /** Carimbo do primeiro registro; os seguintes avançam o contador (`carimboDoLote`). */
  tsBase: TsLogico,
  /** `criadoEm` e `atualizadoEm` de todos os registros do lote. */
  instante: Instante,
  /** Número de nós do item: `n` dispositivos e `n` textos. */
  quantidade: z.int().min(0),
});
export type ReferenciaDeAcervo = z.infer<typeof ReferenciaDeAcervo>;

/** Dados de domínio do lote, na ordem dos nós; ids e campos comuns são derivados da referência. */
export interface ConteudoDoLote {
  dispositivos: Dados<'dispositivos'>[];
  textos: Dados<'textosDispositivo'>[];
}

/** Devolve o conteúdo do item referenciado (já conferido pelo hash) ou `undefined` se não houver. */
export type Reidratador = (ref: ReferenciaDeAcervo) => ConteudoDoLote | undefined;

/** A fonte do item referenciado não está disponível (ou não confere): nada é inventado. */
export class FonteDoLoteAusente extends Error {
  readonly itemId: string;
  readonly versao: number;
  readonly hash: string;
  constructor(ref: Pick<ReferenciaDeAcervo, 'itemId' | 'versao' | 'hash'>) {
    super(
      `O histórico usa o item "${ref.itemId}" (versão ${String(ref.versao)}) do acervo, mas a fonte dele não está disponível.`,
    );
    this.name = 'FonteDoLoteAusente';
    this.itemId = ref.itemId;
    this.versao = ref.versao;
    this.hash = ref.hash;
  }
}

const MAXIMO_NO_LOTE = 2 ** 24;

/** Parte fixa dos ids de uma base (FNV-1a 64 da base, 37 bits). */
function marcaDaBase(base: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < base.length; i++) {
    h ^= BigInt(base.charCodeAt(i));
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h & ((1n << 37n) - 1n);
}

/**
 * Id do `k`-ésimo registro do lote: o início da base (tempo e versão do UUIDv7) e, na segunda
 * metade, variante `10`, um bit 1, `k` em 24 bits e a marca da base. Único no lote, em ordem de
 * `k` e sem colidir com ids sequenciais (o bit 1 fica acima de qualquer contador).
 */
export function idDoLote(base: string, k: number): string {
  if (!Number.isInteger(k) || k < 0 || k >= MAXIMO_NO_LOTE) {
    throw new Error(`Índice fora do lote: ${String(k)}`);
  }
  const fim = (0b101n << 61n) | (BigInt(k) << 37n) | marcaDaBase(base);
  const hex = fim.toString(16).padStart(16, '0');
  return `${base.slice(0, 19)}${hex.slice(0, 4)}-${hex.slice(4)}`;
}

/** Carimbo do `k`-ésimo registro: o contador avança `k` a partir da base, transbordando o ms. */
export function carimboDoLote(tsBase: string, k: number): string {
  const { ms, contador, aparelho } = lerCarimbo(tsBase);
  const total = contador + k;
  const novoMs = ms + Math.floor(total / 1_000_000);
  const novoContador = total % 1_000_000;
  return `${String(novoMs).padStart(13, '0')}-${String(novoContador).padStart(6, '0')}-${aparelho}`;
}

/** A referência de uma entrada `acervo-adesao` (validada). */
export function referenciaDe(entrada: Alteracao): ReferenciaDeAcervo {
  const r = ReferenciaDeAcervo.safeParse(entrada.dados);
  if (!r.success)
    throw new Error(`Entrada de lote do acervo inválida (seq ${String(entrada.seq)}).`);
  return r.data;
}

/** Ids dos registros do lote, sem precisar da fonte (desfazer, auditoria). */
export function idsDoLote(ref: ReferenciaDeAcervo): { dispositivos: string[]; textos: string[] } {
  const n = ref.quantidade;
  return {
    dispositivos: Array.from({ length: n }, (_, k) => idDoLote(ref.base, k)),
    textos: Array.from({ length: n }, (_, k) => idDoLote(ref.base, n + k)),
  };
}

function validar<N extends 'dispositivos' | 'textosDispositivo'>(
  nome: N,
  r: unknown,
): RegistroDe<N> {
  const res = ENTIDADES[nome].esquema.safeParse(r);
  if (!res.success) throw new Error(`Registro do lote inválido em ${nome}: ${res.error.message}`);
  return res.data as RegistroDe<N>;
}

/**
 * Registros completos do lote, como a adesão os gravou (mesma validação de `criarLote`). O dono
 * é o da entrada: a cópia para a conta (que troca o `usuarioId` do log) continua coerente.
 */
export function montarRegistrosDoLote(
  ref: ReferenciaDeAcervo,
  usuarioId: string,
  conteudo: ConteudoDoLote,
): { dispositivos: RegistroDe<'dispositivos'>[]; textos: RegistroDe<'textosDispositivo'>[] } {
  const n = ref.quantidade;
  if (conteudo.dispositivos.length !== n || conteudo.textos.length !== n) {
    throw new Error(`O conteúdo do item "${ref.itemId}" não confere com o lote do histórico.`);
  }
  const comuns = (k: number) => ({
    id: idDoLote(ref.base, k),
    usuarioId,
    criadoEm: ref.instante,
    atualizadoEm: ref.instante,
    tsLogico: carimboDoLote(ref.tsBase, k),
    origem: 'importacao' as const,
    excluidoEm: null,
  });
  return {
    dispositivos: conteudo.dispositivos.map((d, k) =>
      validar('dispositivos', { ...d, ...comuns(k) }),
    ),
    textos: conteudo.textos.map((t, k) => validar('textosDispositivo', { ...t, ...comuns(n + k) })),
  };
}

/** Registros de uma entrada `acervo-adesao`, reidratados pela fonte. */
export function registrosDoLote(
  entrada: Alteracao,
  reidratar?: Reidratador,
): { dispositivos: RegistroDe<'dispositivos'>[]; textos: RegistroDe<'textosDispositivo'>[] } {
  const ref = referenciaDe(entrada);
  const conteudo = reidratar?.(ref);
  if (!conteudo) throw new FonteDoLoteAusente(ref);
  return montarRegistrosDoLote(ref, entrada.usuarioId, conteudo);
}

/** Referências de lote num log (itens a buscar na fonte antes de reconstruir). */
export function referenciasNoLog(alteracoes: Iterable<Alteracao>): ReferenciaDeAcervo[] {
  const refs: ReferenciaDeAcervo[] = [];
  for (const a of alteracoes) if (a.operacao === OPERACAO_ADESAO) refs.push(referenciaDe(a));
  return refs;
}
