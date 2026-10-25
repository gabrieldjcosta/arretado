// Recall: Erro, Frase, Cartão, Revisão (Parte 1 §5.3, D9, D10, D25; Parte 2 §10.4–10.5; T22).
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
  /** Opcional na captura desde a v6 (D25); o serviço grava `errou` quando não informado. */
  resultado: ResultadoErro,
  /** Opcional desde a v6 (D25): a frase correta é o único campo obrigatório da captura. */
  oQueFoi: z.string().trim().min(1).max(2_000).optional(),
  /** Espelho do texto da Frase de origem `erro` (compatibilidade; a Frase é a fonte, T22). */
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

/** Como a Frase nasceu (T22). `ia` fica reservada à A2: sempre por proposta aceita (R4). */
export const OrigemFrase = z.enum(['erro', 'trecho', 'manual', 'ia']);
export type OrigemFrase = z.infer<typeof OrigemFrase>;

export const EstadoFrase = z.enum(['ativa', 'arquivada']);
export type EstadoFrase = z.infer<typeof EstadoFrase>;

/** Intervalo `[inicio, fim)` em caracteres de um texto. */
export const Intervalo = z
  .strictObject({ inicio: z.int().min(0), fim: z.int().min(0) })
  .refine((i) => i.fim > i.inicio, 'Intervalo vazio.');
export type Intervalo = z.infer<typeof Intervalo>;

/**
 * O que a pessoa quer lembrar (D25, T22; esquema v6). Curta e sua. Disciplina e ponto são
 * facultativos. `trecho` é o link de volta à fonte (Frases 3): dispositivo e intervalo do texto.
 */
export const Frase = z.strictObject({
  ...camposComuns,
  texto: z.string().trim().min(1).max(2_000),
  disciplinaId: Id.optional(),
  pontoId: Id.optional(),
  origemTipo: OrigemFrase,
  erroId: Id.optional(),
  trecho: z
    .strictObject({
      dispositivoId: Id,
      versaoId: Id.optional(),
      texto: z.string().max(5_000),
      inicio: z.int().min(0),
      fim: z.int().min(0),
    })
    .optional(),
  /** Link de volta a um resumo (Nota): intervalo do texto do corpo, como estava ao enviar (F3-C). */
  trechoDeNota: z
    .strictObject({
      notaId: Id,
      texto: z.string().max(5_000),
      inicio: z.int().min(0),
      fim: z.int().min(0),
    })
    .optional(),
  /** Link de volta a um precedente: intervalo do texto dele, como estava ao enviar (F3-C, v8). */
  trechoDePrecedente: z
    .strictObject({
      precedenteId: Id,
      texto: z.string().max(5_000),
      inicio: z.int().min(0),
      fim: z.int().min(0),
    })
    .optional(),
  estado: EstadoFrase,
  proximaRevisao: DataCivil,
  ultimaRevisao: Instante.optional(),
});
export type Frase = z.infer<typeof Frase>;

export const RespostaFrase = z.enum(['li', 'de_novo']);
export type RespostaFrase = z.infer<typeof RespostaFrase>;

/** Revisão de frase (Revisar frases, Frases 2): append-only, como a do cartão (D10). */
export const RevisaoDeFrase = z.strictObject({
  ...camposComuns,
  fraseId: Id,
  em: Instante,
  data: DataCivil,
  resposta: RespostaFrase,
  proximaAntes: DataCivil,
  proximaDepois: DataCivil,
  atrasoDias: z.int().min(0),
  duracaoMs: z.int().min(0).optional(),
});
export type RevisaoDeFrase = z.infer<typeof RevisaoDeFrase>;

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
  /** `frase` e `ia` desde a v6 (T22); `ia` reservada à A2. */
  origemTipo: z.enum(['erro', 'dispositivo', 'nota', 'precedente', 'manual', 'frase', 'ia']),
  origemId: Id.optional(),
  erroId: Id.optional(),
  /** Frase de origem (v6). */
  fraseId: Id.optional(),
  /** Ausente = `pergunta` (frente × verso). `lacuna`: a frente esconde os `ocultos` (v6). */
  tipo: z.enum(['pergunta', 'lacuna']).optional(),
  /** Trechos escondidos do texto da lacuna (oclusão; um ou vários). */
  ocultos: z.array(Intervalo).max(50).optional(),
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
  /** Quanta certeza havia antes de ver a resposta: 1 chutando, 2 acho que sei, 3 tenho certeza (AP-02). */
  certeza: z.int().min(1).max(3).optional(),
});
export type Revisao = z.infer<typeof Revisao>;
