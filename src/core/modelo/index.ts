// Registro único das entidades: dirige o banco local, o pacote de backup e a validação.
import type { z } from 'zod';
import * as B from './biblioteca';
import * as L from './legislacao';
import * as P from './plano';
import * as R from './recall';
import * as S from './sistema';

export * from './comum';
export * from './biblioteca';
export * from './legislacao';
export * from './plano';
export * from './recall';
export * from './sistema';

/** Módulos do pacote de backup (exportação por módulo, Parte 2 §12.1). */
export const MODULOS = [
  'sistema',
  'plano',
  'execucao',
  'recall',
  'legislacao',
  'catalogo',
  'precedentes',
  'notas',
  'inteligencia',
  'calendario',
  'suporte',
] as const;
export type Modulo = (typeof MODULOS)[number];

interface DefinicaoEntidade {
  esquema: z.ZodType<{ id: string; usuarioId: string }>;
  /** Módulo do pacote; `null` = só local (auditoria), nunca exportado. */
  modulo: Modulo | null;
  /** Índices secundários no formato Dexie (a chave primária é sempre `id`). */
  indices: string[];
  /** Registros nunca atualizados nem excluídos (D10). */
  appendOnly?: boolean;
  /** Versão do esquema local em que a coleção nasceu (padrão 1); pacote anterior não a traz. */
  desdeVersao?: number;
}

export const ENTIDADES = {
  // sistema
  usuarios: { esquema: S.Usuario, modulo: 'sistema', indices: ['usuarioId'] },
  aparelhos: { esquema: S.Aparelho, modulo: 'sistema', indices: ['usuarioId'] },
  preferencias: { esquema: S.Preferencias, modulo: 'sistema', indices: ['usuarioId'] },
  fontes: { esquema: S.Fonte, modulo: 'sistema', indices: ['usuarioId'] },
  anexos: { esquema: S.Anexo, modulo: 'sistema', indices: ['usuarioId', 'hash'] },
  tags: { esquema: S.Tag, modulo: 'sistema', indices: ['usuarioId', '[usuarioId+nome]'] },
  vinculos: {
    esquema: S.Vinculo,
    modulo: 'sistema',
    indices: ['usuarioId', '[tipoA+idA]', '[tipoB+idB]'],
  },
  // plano
  concursos: { esquema: P.Concurso, modulo: 'plano', indices: ['usuarioId'] },
  fasesPrazos: {
    esquema: P.FasePrazo,
    modulo: 'plano',
    indices: ['usuarioId', 'concursoId', '[usuarioId+dataInicio]'],
  },
  editais: { esquema: P.Edital, modulo: 'plano', indices: ['usuarioId', 'concursoId'] },
  disciplinas: { esquema: P.Disciplina, modulo: 'plano', indices: ['usuarioId', 'editalId'] },
  pontos: {
    esquema: P.Ponto,
    modulo: 'plano',
    indices: ['usuarioId', 'disciplinaId', 'editalId', '[usuarioId+faixa]'],
  },
  // execução
  dias: { esquema: P.Dia, modulo: 'execucao', indices: ['usuarioId', '[usuarioId+data]'] },
  sessoes: {
    esquema: P.Sessao,
    modulo: 'execucao',
    indices: ['usuarioId', 'pontoId', '[usuarioId+data]', '[usuarioId+estado]'],
  },
  // recall
  erros: {
    esquema: R.Erro,
    modulo: 'recall',
    indices: [
      'usuarioId',
      'pontoId',
      'disciplinaId',
      'dispositivoId',
      '[usuarioId+criadoEm]',
      '[usuarioId+status]',
    ],
  },
  cartoes: {
    esquema: R.Cartao,
    modulo: 'recall',
    indices: ['usuarioId', 'erroId', 'pontoId', '[usuarioId+estado+proximaRevisao]'],
  },
  revisoes: {
    esquema: R.Revisao,
    modulo: 'recall',
    indices: ['usuarioId', 'cartaoId', '[usuarioId+em]'],
    appendOnly: true,
  },
  frases: {
    esquema: R.Frase,
    modulo: 'recall',
    indices: [
      'usuarioId',
      'erroId',
      'disciplinaId',
      'pontoId',
      'trecho.dispositivoId',
      '[usuarioId+criadoEm]',
      '[usuarioId+estado+proximaRevisao]',
    ],
    desdeVersao: 6,
  },
  revisoesFrase: {
    esquema: R.RevisaoDeFrase,
    modulo: 'recall',
    indices: ['usuarioId', 'fraseId', '[usuarioId+em]'],
    appendOnly: true,
    desdeVersao: 6,
  },
  // legislação
  normas: { esquema: L.Norma, modulo: 'legislacao', indices: ['usuarioId', 'escopo'] },
  versoesNorma: {
    esquema: L.VersaoDeNorma,
    modulo: 'legislacao',
    indices: ['usuarioId', 'normaId', '[normaId+status]'],
  },
  dispositivos: {
    esquema: L.Dispositivo,
    modulo: 'legislacao',
    indices: ['usuarioId', 'normaId', 'paiId', '[normaId+endereco]', '[normaId+ordem]'],
  },
  textosDispositivo: {
    esquema: L.TextoDeDispositivo,
    modulo: 'legislacao',
    indices: ['usuarioId', 'versaoId', '[versaoId+dispositivoId]'],
  },
  marcacoes: {
    esquema: L.Marcacao,
    modulo: 'legislacao',
    indices: ['usuarioId', 'normaId', 'dispositivoId'],
  },
  estrelas: {
    esquema: L.Estrela,
    modulo: 'legislacao',
    indices: ['usuarioId', 'normaId', 'alvoId', 'pacoteId'],
  },
  leituras: {
    esquema: L.Leitura,
    modulo: 'legislacao',
    indices: ['usuarioId', '[usuarioId+normaId]'],
    desdeVersao: 2,
  },
  vinculosDisciplina: {
    esquema: L.VinculoDeDisciplina,
    modulo: 'legislacao',
    indices: ['usuarioId', 'normaId', 'disciplinaId'],
    desdeVersao: 4,
  },
  pendenciasReleitura: {
    esquema: L.PendenciaDeReleitura,
    modulo: 'legislacao',
    indices: ['usuarioId', 'normaId', 'referenciaId'],
    desdeVersao: 5,
  },
  // catálogo
  pacotesIncidencia: { esquema: L.PacoteDeIncidencia, modulo: 'catalogo', indices: ['usuarioId'] },
  adesoes: { esquema: L.Adesao, modulo: 'catalogo', indices: ['usuarioId', 'pacoteId'] },
  // biblioteca e inteligência
  precedentes: {
    esquema: B.Precedente,
    modulo: 'precedentes',
    indices: ['usuarioId', 'disciplinaId'],
  },
  notas: { esquema: B.Nota, modulo: 'notas', indices: ['usuarioId', 'disciplinaId'] },
  achados: { esquema: B.Achado, modulo: 'inteligencia', indices: ['usuarioId', 'status'] },
  eventosCalendario: {
    esquema: B.EventoDeCalendario,
    modulo: 'calendario',
    indices: ['usuarioId', '[usuarioId+data]'],
  },
  // suporte
  relatos: {
    esquema: S.RelatoDeProblema,
    modulo: 'suporte',
    indices: ['usuarioId', '[usuarioId+data]', 'status'],
  },
  // só local
  logsImportacao: { esquema: S.LogDeImportacao, modulo: null, indices: ['usuarioId', 'em'] },
  snapshots: { esquema: S.Snapshot, modulo: null, indices: ['usuarioId', 'criadoEm'] },
  espacos: { esquema: S.Espaco, modulo: null, indices: ['usuarioId'] },
} as const satisfies Record<string, DefinicaoEntidade>;

export type NomeColecao = keyof typeof ENTIDADES;
export const NOMES_COLECOES = Object.keys(ENTIDADES) as NomeColecao[];

/** Tipo do registro de uma coleção. */
export type RegistroDe<N extends NomeColecao> = z.infer<(typeof ENTIDADES)[N]['esquema']>;

export function colecoesDoModulo(modulo: Modulo): NomeColecao[] {
  return NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo === modulo);
}

/** Versão do esquema local em que a coleção nasceu. */
export function versaoDeOrigem(nome: NomeColecao): number {
  const def: DefinicaoEntidade = ENTIDADES[nome];
  return def.desdeVersao ?? 1;
}

/** Coleções que existiam na versão do esquema indicada. */
export function colecoesNaVersao(versao: number): NomeColecao[] {
  return NOMES_COLECOES.filter((n) => versaoDeOrigem(n) <= versao);
}

export function eAppendOnly(nome: NomeColecao): boolean {
  const def: DefinicaoEntidade = ENTIDADES[nome];
  return def.appendOnly === true;
}
