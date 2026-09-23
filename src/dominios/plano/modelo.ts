import { EsquemaEntidadeBase } from "@core/persistencia/modelo";
import { z } from "zod";

/** Concurso: vários ao mesmo tempo é o caso normal (§5.3). */
export const EsquemaConcurso = EsquemaEntidadeBase.extend({
  nome: z.string(),
  banca: z.string(),
  orgao: z.string().optional(),
  cargo: z.string().optional(),
  carreira: z.string().optional(),
  status: z.enum(["previsto", "inscricoesAbertas", "emAndamento", "encerrado"]).optional(),
});
export type Concurso = z.infer<typeof EsquemaConcurso>;

/** Fases e prazos do concurso; substituem o Evento para tudo que é do concurso (suposição 4). */
export const EsquemaFasePrazo = EsquemaEntidadeBase.extend({
  concursoId: z.string(),
  titulo: z.string(),
  tipo: z.enum(["fase", "prazo"]),
  data: z.string().nullable(),
  dataFim: z.string().nullable(),
  descricao: z.string().optional(),
  lembreteDiasAntes: z.number().int().nullable(),
  concluido: z.boolean(),
  fonteId: z.string().nullable(),
});
export type FasePrazo = z.infer<typeof EsquemaFasePrazo>;

/** Evento de calendário restrito a simulado, marco e outro (prova e prazos são FasePrazo). */
export const EsquemaEventoDeCalendario = EsquemaEntidadeBase.extend({
  concursoId: z.string().nullable(),
  titulo: z.string(),
  tipo: z.enum(["simulado", "marco", "outro"]),
  data: z.string(),
  observacao: z.string().optional(),
});
export type EventoDeCalendario = z.infer<typeof EsquemaEventoDeCalendario>;

export const EsquemaEdital = EsquemaEntidadeBase.extend({
  concursoId: z.string().nullable(),
  titulo: z.string(),
  ano: z.number().int().optional(),
  url: z.string().optional(),
  fonteId: z.string().nullable(),
});
export type Edital = z.infer<typeof EsquemaEdital>;

export const EsquemaDisciplina = EsquemaEntidadeBase.extend({
  nome: z.string(),
  ordem: z.number().int(),
  editalId: z.string().nullable(),
});
export type Disciplina = z.infer<typeof EsquemaDisciplina>;

/** Faixa de prioridade do Ponto. Alterações ficam no log de alterações, com a origem (D10, §5.3). */
export const Faixa = z.enum(["altissima", "alta", "media", "baixa"]);
export type Faixa = z.infer<typeof Faixa>;

/**
 * Ponto do edital: eixo de vinculação opcional (§1). O status é **derivado** (§2.3 nº 9);
 * o único estado manual é `adiado`.
 */
export const EsquemaPonto = EsquemaEntidadeBase.extend({
  disciplinaId: z.string(),
  titulo: z.string(),
  faixa: Faixa,
  ordem: z.number().int(),
  editalId: z.string().nullable(),
  adiadoAte: z.string().nullable(),
  /** Por que a faixa está como está: "manual" ou "achado:<id>" (F7). */
  origemDaFaixa: z.string(),
  somenteLeitura: z.boolean(),
});
export type Ponto = z.infer<typeof EsquemaPonto>;
