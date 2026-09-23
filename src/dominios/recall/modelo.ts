import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/** Resultado ≠ causa (D9): "acertei sem certeza" é resultado, não diagnóstico. */
export const Resultado = z.enum(["errou", "acertoInseguro"]);
export type Resultado = z.infer<typeof Resultado>;

/** Causa é opcional e sugerível; nunca trava a captura (D9). */
export const Causa = z.enum(["lacuna", "leitura", "confusao", "literalidade"]);
export type Causa = z.infer<typeof Causa>;

/**
 * Erro. **Exatamente dois campos obrigatórios** (D9): `resultado` e `oQueFoi`.
 * Todo o resto é "completar depois". `fraseCorreta` é um dado com três usos: verso do cartão,
 * item da lista passiva e o próprio enunciado correto.
 */
export const EsquemaErro = EsquemaEntidadeBase.extend({
  resultado: Resultado,
  oQueFoi: z.string().min(1),
  fraseCorreta: z.string().optional(),
  disciplinaId: z.string().nullable(),
  pontoId: z.string().nullable(),
  sessaoId: z.string().nullable(),
  dispositivoId: z.string().nullable(),
  fonteId: z.string().nullable(),
  respostaDada: z.string().optional(),
  respostaCorreta: z.string().optional(),
  justificativa: z.string().optional(),
  conviccao: z.enum(["nenhuma", "pouca", "media", "alta"]).optional(),
  causa: Causa.optional(),
  causaSugerida: Causa.optional(),
  acaoRecomendada: z.string().optional(),
  status: z.enum(["aberto", "comCartao", "resolvido", "descartado"]),
  /** Marcado quando o texto-base de um dispositivo vinculado mudou (F6, §8.2 nº 7). */
  textoBaseAlterado: z.boolean(),
});
export type Erro = z.infer<typeof EsquemaErro>;

/**
 * Completude é **derivada**, não armazenada (§5.3): sinaliza "completar depois" sem obrigar nada.
 * É "completo" quando o erro tem a frase correta e pelo menos ponto ou disciplina.
 */
export function completude(erro: Erro): "rapido" | "completo" {
  const temFrase = Boolean(erro.fraseCorreta?.trim());
  const temVinculo = Boolean(erro.pontoId ?? erro.disciplinaId);
  return temFrase && temVinculo ? "completo" : "rapido";
}

/** Cartão nunca é automático (D10). O verso nasce igual à frase correta e depois é independente. */
export const EsquemaCartao = EsquemaEntidadeBase.extend({
  frente: z.string().min(1),
  verso: z.string(),
  origemDoCartao: z.enum(["erro", "trecho", "manual"]),
  erroId: z.string().nullable(),
  pontoId: z.string().nullable(),
  dispositivoId: z.string().nullable(),
  estado: z.enum(["ativo", "suspenso", "arquivado"]),
  caixa: z.number().int().min(1).max(6),
  proximaRevisao: z.string(),
  textoBaseAlterado: z.boolean(),
});
export type Cartao = z.infer<typeof EsquemaCartao>;

/** Revisão é append-only: é o histórico que permitirá avaliar o algoritmo na F8 (D10). */
export const EsquemaRevisao = EsquemaEntidadeBase.extend({
  cartaoId: z.string(),
  em: z.string(),
  resultado: z.enum(["errei", "dificil", "facil"]),
  caixaAntes: z.number().int().min(1).max(6),
  caixaDepois: z.number().int().min(1).max(6),
});
export type Revisao = z.infer<typeof EsquemaRevisao>;
