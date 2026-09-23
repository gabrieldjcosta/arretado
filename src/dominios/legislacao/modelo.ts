import { Propagacao } from "@core/comum/modelo";
import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/**
 * Norma em duas camadas (D12): o **conteúdo** (Norma, Versão, Dispositivo) é compartilhável;
 * as **anotações** (Marcação, Estrela, "lido até") são sempre pessoais. No MVP tudo é pessoal.
 */
export const EscopoDeNorma = z.enum(["pessoal", "catalogo"]);
export type EscopoDeNorma = z.infer<typeof EscopoDeNorma>;

export const EsquemaNorma = EsquemaEntidadeBase.extend({
  tituloCurto: z.string(),
  escopo: EscopoDeNorma,
  tituloOficial: z.string().optional(),
  referencia: z.string().optional(),
  tipo: z.string().optional(),
  esfera: z.string().optional(),
  epigrafe: z.string().optional(),
  ementa: z.string().optional(),
  preambulo: z.string().optional(),
  disciplinaIds: z.array(z.string()),
  /** Habilita "verificar atualização" (D16). Gravada desde a F2, usada na F6. */
  urlOficial: z.string().nullable(),
  versaoVigenteId: z.string().nullable(),
  origemNoCatalogoId: z.string().nullable(),
  curadorId: z.string().nullable(),
  ultimaVerificacaoEm: z.string().nullable(),
  /** Retomada de leitura, não métrica (§3): endereço do último dispositivo lido. */
  lidoAte: z.string().nullable(),
});
export type Norma = z.infer<typeof EsquemaNorma>;

export const OrigemDaVersao = z.enum(["htmlColado", "url", "arquivo", "textoPuro", "edicaoManual"]);
export type OrigemDaVersao = z.infer<typeof OrigemDaVersao>;

export const EsquemaVersaoDeNorma = EsquemaEntidadeBase.extend({
  normaId: z.string(),
  textoNormalizado: z.string(),
  capturadaEm: z.string(),
  origemDaVersao: OrigemDaVersao,
  hash: z.string(),
  status: z.enum(["rascunho", "vigente", "arquivada"]),
  dataDeVigencia: z.string().nullable(),
  fonteId: z.string().nullable(),
  /** Usada pela pré-checagem da F6: a nota de vigência mais recente detectada (lei + ano). */
  notaDeVigenciaMaisRecente: z.object({ lei: z.string(), ano: z.number().int() }).nullable(),
  resultadoDaComparacao: z.string().nullable(),
  /** Versão do adaptador que produziu esta versão (§13.3), para reprocessar quando ele melhorar. */
  versaoDoAdaptador: z.string().nullable(),
});
export type VersaoDeNorma = z.infer<typeof EsquemaVersaoDeNorma>;

/** Tipos de Dispositivo — nó único da árvore, estrutural ou normativo (D11). */
export const TipoDeDispositivo = z.enum([
  "parte",
  "livro",
  "titulo",
  "capitulo",
  "secao",
  "subsecao",
  "nome",
  "preambulo",
  "ementa",
  "artigo",
  "caput",
  "paragrafo",
  "inciso",
  "alinea",
  "item",
  "anexo",
]);
export type TipoDeDispositivo = z.infer<typeof TipoDeDispositivo>;

export const StatusDeDispositivo = z.enum([
  "vigente",
  "revogado",
  "eficaciaCessada",
  "renumerado",
  "novoNestaVersao",
]);
export type StatusDeDispositivo = z.infer<typeof StatusDeDispositivo>;

/** Confiança da classificação: publicar exige zero conflito; "a confirmar" aceita-se em lote (§10.6). */
export const Confianca = z.enum(["alta", "media", "aConfirmar", "conflito"]);
export type Confianca = z.infer<typeof Confianca>;

export const EsquemaNotaDeVigencia = z.object({
  texto: z.string(),
  lei: z.string().optional(),
  ano: z.number().int().optional(),
  link: z.string().optional(),
});
export type NotaDeVigencia = z.infer<typeof EsquemaNotaDeVigencia>;

/**
 * Dispositivo: nó único da árvore, com endereço canônico estável e sufixo (`art9A`,
 * `art5.par2.incIII.alB`). Nunca é excluído — recebe status (D11). O texto vive na Versão.
 */
export const EsquemaDispositivo = EsquemaEntidadeBase.extend({
  normaId: z.string(),
  endereco: z.string(),
  categoria: z.enum(["estrutural", "normativo"]),
  tipo: TipoDeDispositivo,
  ordem: z.number().int(),
  paiId: z.string().nullable(),
  rotulo: z.string().optional(),
  status: StatusDeDispositivo,
  notasDeVigencia: z.array(EsquemaNotaDeVigencia),
  confianca: Confianca,
  /** Quando `status` é "renumerado": o endereço anterior, para reancorar marcações (§10.6). */
  renumeradoDe: z.string().nullable(),
});
export type Dispositivo = z.infer<typeof EsquemaDispositivo>;

/**
 * Redação anterior: sub-registro do dispositivo **nesta versão**, nunca entidade (§5.4).
 * Guardada e oculta por padrão (D14).
 */
export const EsquemaRedacaoAnterior = z.object({
  texto: z.string(),
  nota: z.string().optional(),
  /** Como foi identificada: tachado do HTML ou heurística sobre texto puro (D13). */
  deteccao: z.enum(["tachado", "heuristica"]),
  confirmadaPorHumano: z.boolean(),
});
export type RedacaoAnterior = z.infer<typeof EsquemaRedacaoAnterior>;

/**
 * Texto de um dispositivo numa versão. Tabela própria (chave `[versaoId+dispositivoId]`) para que
 * o leitor carregue texto sob demanda, por dispositivo, e abra norma de 2 mil dispositivos em < 1 s.
 */
export const EsquemaTextoDeDispositivo = z.object({
  versaoId: z.string(),
  dispositivoId: z.string(),
  normaId: z.string(),
  texto: z.string(),
  redacoesAnteriores: z.array(EsquemaRedacaoAnterior),
});
export type TextoDeDispositivo = z.infer<typeof EsquemaTextoDeDispositivo>;

/** Marcação pessoal (grifo ou nota), ancorada por trecho + deslocamentos, reancorável (§10.6). */
export const EsquemaMarcacao = EsquemaEntidadeBase.extend({
  dispositivoId: z.string(),
  versaoId: z.string(),
  tipo: z.enum(["grifo", "nota"]),
  trecho: z.string(),
  inicio: z.number().int(),
  fim: z.number().int(),
  cor: z.enum(["1", "2", "3"]).nullable(),
  nota: z.string().optional(),
  status: z.enum(["valida", "reancorada", "pendente"]),
});
export type Marcacao = z.infer<typeof EsquemaMarcacao>;

/**
 * Estrela: favorito estrutural da Legislação, com herança por bloco (D15). Marcar um nó propaga aos
 * descendentes como `herdada`; desmarcar um artigo dentro de nó estrelado cria uma `excecaoNegativa`.
 */
export const EsquemaEstrela = EsquemaEntidadeBase.extend({
  normaId: z.string(),
  /** Dispositivo ou nó estrutural — ambos são Dispositivo (D11). */
  alvoId: z.string(),
  propagacao: Propagacao,
  /** O nó que propagou ou o pacote de incidência que a trouxe (F7). */
  propagadoDe: z.string().nullable(),
});
export type Estrela = z.infer<typeof EsquemaEstrela>;

/**
 * Estado efetivo da estrela num dispositivo: direta ∨ herdada ∨ de pacote, salvo exceção negativa
 * (D15). Uma exceção negativa vence qualquer herança, mas não apaga uma estrela direta.
 */
export function estrelaEfetiva(estrelas: readonly Estrela[]): boolean {
  if (estrelas.some((e) => e.propagacao === "direta")) return true;
  if (estrelas.some((e) => e.propagacao === "excecaoNegativa")) return false;
  return estrelas.some((e) => e.propagacao === "herdada" || e.propagacao === "pacote");
}

/**
 * Ordenação de endereços com sufixo: 9 < 9-A < 10 (D11). Compara segmento a segmento,
 * separando a parte numérica da alfabética.
 */
export function compararEnderecos(a: string, b: string): number {
  const segmentosA = a.split(".");
  const segmentosB = b.split(".");
  for (let i = 0; i < Math.max(segmentosA.length, segmentosB.length); i++) {
    const diferenca = compararSegmento(segmentosA[i] ?? "", segmentosB[i] ?? "");
    if (diferenca !== 0) return diferenca;
  }
  return 0;
}

const PARTES_DO_SEGMENTO = /^([a-z]*)(\d*)(.*)$/i;

function compararSegmento(a: string, b: string): number {
  const [, prefixoA = "", numeroA = "", sufixoA = ""] = PARTES_DO_SEGMENTO.exec(a) ?? [];
  const [, prefixoB = "", numeroB = "", sufixoB = ""] = PARTES_DO_SEGMENTO.exec(b) ?? [];
  if (prefixoA !== prefixoB) return prefixoA < prefixoB ? -1 : 1;
  if (numeroA !== numeroB) return Number(numeroA || 0) - Number(numeroB || 0);
  if (sufixoA !== sufixoB) return sufixoA < sufixoB ? -1 : 1;
  return 0;
}
