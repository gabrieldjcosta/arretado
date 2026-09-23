// Precedentes, Notas, Inteligência e Calendário (Parte 2 §10.7–10.10). Só modelo em F0.
import { z } from 'zod';
import { camposComuns, DataCivil, Id, TextoCurto, TextoLongo } from './comum';

export const Precedente = z.strictObject({
  ...camposComuns,
  tituloTese: z.string().trim().min(1).max(5_000),
  escopo: z.enum(['nacional', 'internacional']),
  tribunal: TextoCurto.optional(),
  disciplinaId: Id.optional(),
  tipo: z
    .enum([
      'acordao',
      'sumula',
      'sumula_vinculante',
      'tese_repercussao_geral',
      'tese_repetitivo',
      'opiniao_consultiva',
      'outro',
    ])
    .optional(),
  numero: z.string().max(100).optional(),
  data: DataCivil.optional(),
  relator: TextoCurto.optional(),
  fonteOficial: z.url({ protocol: /^https?$/ }).optional(),
  fatos: TextoLongo.optional(),
  questaoJuridica: TextoLongo.optional(),
  fundamentos: TextoLongo.optional(),
  conclusao: TextoLongo.optional(),
  tratados: TextoLongo.optional(),
  statusLeitura: z.enum(['nao_lido', 'lido', 'para_revisar']).optional(),
  relevanteRevisao: z.boolean().optional(),
  textoOriginal: TextoLongo.optional(),
  traducao: TextoLongo.optional(),
  versaoResumida: TextoLongo.optional(),
});
export type Precedente = z.infer<typeof Precedente>;

export const Nota = z.strictObject({
  ...camposComuns,
  titulo: TextoCurto,
  tipo: z.enum(['resumo', 'esquema', 'anotacao']),
  conteudo: TextoLongo,
  disciplinaId: Id.optional(),
  tema: TextoCurto.optional(),
  fonte: TextoCurto.optional(),
});
export type Nota = z.infer<typeof Nota>;

export const Achado = z.strictObject({
  ...camposComuns,
  banca: TextoCurto,
  concursoEdicao: TextoCurto.optional(),
  disciplinaId: Id.optional(),
  tipo: z.enum([
    'padrao_cobranca',
    'norma_mais_cobrada',
    'artigo_mais_cobrado',
    'precedente_recorrente',
    'autor_teoria',
    'armadilha',
    'sinal_alerta',
    'novidade_normativa',
    'alteracao_edital',
  ]),
  descricao: TextoLongo,
  confianca: z.enum(['baixa', 'media', 'alta']),
  fonte: TextoCurto.optional(),
  data: DataCivil.optional(),
  consequenciaSugerida: TextoCurto.optional(),
  status: z.enum(['novo', 'aceito', 'aceito_sem_aplicacao', 'descartado']),
});
export type Achado = z.infer<typeof Achado>;

/** Só simulado/marco/outro; prova e prazos vivem em FasePrazo (suposição 4). */
export const EventoDeCalendario = z.strictObject({
  ...camposComuns,
  tipo: z.enum(['simulado', 'marco', 'outro']),
  titulo: TextoCurto,
  data: DataCivil,
  concursoId: Id.optional(),
  descricao: TextoLongo.optional(),
});
export type EventoDeCalendario = z.infer<typeof EventoDeCalendario>;
