// Precedentes, Notas, Inteligência e Calendário (Parte 2 §10.7–10.10). Só modelo em F0.
import { z } from 'zod';
import { camposComuns, DataCivil, Id, TextoCurto, TextoLongo } from './comum';

/** Rótulo de um trecho-chave: o que ele é dentro do precedente (F3-C). */
export const RotuloDoTrecho = z.enum(['tese', 'ementa', 'ratio', 'dispositivo_da_decisao']);
export type RotuloDoTrecho = z.infer<typeof RotuloDoTrecho>;

/**
 * Trecho-chave (esquema v8): intervalo marcado no texto do precedente. `texto` é o que estava no
 * intervalo ao marcar (a âncora para reancorar quando o texto é corrigido).
 */
export const TrechoChave = z.strictObject({
  id: Id,
  rotulo: RotuloDoTrecho,
  texto: z.string().max(5_000),
  inicio: z.int().min(0),
  fim: z.int().min(0),
  status: z.enum(['valida', 'reancorada', 'pendente']),
});
export type TrechoChave = z.infer<typeof TrechoChave>;

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
  /** Trechos-chave do texto (`textoOriginal`); a tese é o exibido por padrão (v8). */
  trechosChave: z.array(TrechoChave).max(50).optional(),
  /** Favorito, discreto: só a Biblioteca o mostra (v8). */
  favorito: z.boolean().optional(),
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

/**
 * Vínculo de um trecho-chave (ou do precedente todo) a um dispositivo de uma norma (v8). O
 * `dispositivoId` é estável entre versões da norma; sem o endereço na versão nova, o vínculo fica
 * `pendente` e entra em "Para reler" (como a estrela). `endereco` guarda o endereço para exibir.
 */
export const VinculoPrecedenteDispositivo = z.strictObject({
  ...camposComuns,
  precedenteId: Id,
  trechoId: Id.optional(),
  normaId: Id,
  dispositivoId: Id,
  endereco: z.string().max(200),
  status: z.enum(['valida', 'pendente']),
});
export type VinculoPrecedenteDispositivo = z.infer<typeof VinculoPrecedenteDispositivo>;

export const TipoDeVinculoEntrePrecedentes = z.enum(['relacionado', 'cita', 'supera']);
export type TipoDeVinculoEntrePrecedentes = z.infer<typeof TipoDeVinculoEntrePrecedentes>;

/** Uma ponta do vínculo: um Precedente do usuário ou um dispositivo do acervo (súmula, tese). */
export const PontaDeVinculo = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('precedente'), id: Id }),
  z.strictObject({ tipo: z.literal('dispositivo'), id: Id, normaId: Id }),
]);
export type PontaDeVinculo = z.infer<typeof PontaDeVinculo>;

/**
 * Vínculo entre precedentes (v8): `de` → `para`, com tipo (`supera`: o de `de` supera o de
 * `para`). Navegável nos dois sentidos pelos índices `deId` e `paraId` (cópias de `de.id` e
 * `para.id`). Os trechos-chave das duas pontas são opcionais.
 */
export const VinculoEntrePrecedentes = z
  .strictObject({
    ...camposComuns,
    de: PontaDeVinculo,
    para: PontaDeVinculo,
    deId: Id,
    paraId: Id,
    tipoDeVinculo: TipoDeVinculoEntrePrecedentes,
    deTrechoId: Id.optional(),
    paraTrechoId: Id.optional(),
  })
  .refine((v) => v.deId === v.de.id && v.paraId === v.para.id, 'deId e paraId seguem as pontas.');
export type VinculoEntrePrecedentes = z.infer<typeof VinculoEntrePrecedentes>;
