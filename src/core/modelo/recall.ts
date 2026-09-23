// Recall: Erro, Cartão, Revisão (Parte 1 §5.3, D9, D10; Parte 2 §10.4–10.5).
import { z } from 'zod';
import { camposComuns, DataCivil, Id, Instante, TextoCurto, TextoLongo } from './comum';

export const ResultadoErro = z.enum(['errou', 'acertou_inseguro']);
export type ResultadoErro = z.infer<typeof ResultadoErro>;

export const CausaErro = z.enum(['lacuna', 'leitura', 'confusao', 'literalidade']);
export type CausaErro = z.infer<typeof CausaErro>;

export const StatusErro = z.enum(['aberto', 'com_cartao', 'resolvido', 'descartado']);
export type StatusErro = z.infer<typeof StatusErro>;

export const Erro = z.strictObject({
  ...camposComuns,
  // Os dois únicos campos obrigatórios (D9).
  resultado: ResultadoErro,
  oQueFoi: z.string().trim().min(1).max(2_000),
  // Complemento opcional.
  fraseCorreta: z.string().trim().max(2_000).optional(),
  disciplinaId: Id.optional(),
  pontoId: Id.optional(),
  fonte: z
    .strictObject({
      banca: TextoCurto.optional(),
      prova: TextoCurto.optional(),
      ano: z.int().min(1900).max(2100).optional(),
      numero: z.string().max(20).optional(),
    })
    .optional(),
  respostaDada: TextoLongo.optional(),
  respostaCorreta: TextoLongo.optional(),
  justificativa: TextoLongo.optional(),
  conviccao: z.int().min(1).max(3).optional(),
  causa: CausaErro.optional(),
  causaSugerida: CausaErro.optional(),
  acaoRecomendada: TextoCurto.optional(),
  status: StatusErro,
  sessaoId: Id.optional(),
  dispositivoId: Id.optional(),
  precedenteId: Id.optional(),
  notaId: Id.optional(),
  historicoCausa: z
    .array(
      z.strictObject({
        em: Instante,
        sugerida: CausaErro.optional(),
        confirmada: CausaErro.optional(),
      }),
    )
    .optional(),
});
export type Erro = z.infer<typeof Erro>;

export const EstadoCartao = z.enum(['ativo', 'suspenso', 'arquivado']);
export type EstadoCartao = z.infer<typeof EstadoCartao>;

export const Caixa = z.int().min(1).max(6);

export const Cartao = z.strictObject({
  ...camposComuns,
  frente: z.string().max(5_000),
  /**
   * Verso próprio. `null` = usa a frase correta do erro de origem
   * (suposição 3 da Parte 1: mesmo dado até o usuário editar o verso).
   */
  verso: z.string().max(20_000).nullable(),
  origemTipo: z.enum(['erro', 'dispositivo', 'nota', 'precedente', 'manual']),
  origemId: Id.optional(),
  erroId: Id.optional(),
  pontoId: Id.optional(),
  estado: EstadoCartao,
  motivoSuspensao: TextoCurto.optional(),
  caixa: Caixa,
  proximaRevisao: DataCivil,
  ultimaRevisao: Instante.optional(),
  /** Marcador "texto-base alterado" (F6). */
  textoBaseAlterado: z.boolean().optional(),
});
export type Cartao = z.infer<typeof Cartao>;

export const RespostaRevisao = z.enum(['errei', 'dificil', 'facil']);
export type RespostaRevisao = z.infer<typeof RespostaRevisao>;

/** Revisão é append-only (D10): nunca atualizada nem excluída. */
export const Revisao = z.strictObject({
  ...camposComuns,
  cartaoId: Id,
  em: Instante,
  data: DataCivil,
  resposta: RespostaRevisao,
  caixaAntes: Caixa,
  caixaDepois: Caixa,
  proximaAntes: DataCivil,
  proximaDepois: DataCivil,
  atrasoDias: z.int().min(0),
  duracaoMs: z.int().min(0).optional(),
});
export type Revisao = z.infer<typeof Revisao>;
