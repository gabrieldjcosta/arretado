// Identidade, suporte e auditoria: Usuário, Aparelho, Fonte, Anexo, Tag, Vínculo,
// LogDeImportação, Snapshot, RelatoDeProblema, Preferências, Espaço (Parte 1 §5.3, §7).
import { z } from 'zod';
import { camposComuns, DataCivil, Id, Instante, TextoCurto } from './comum';

export const Usuario = z.strictObject({
  ...camposComuns,
  nomeExibicao: TextoCurto.optional(),
  email: z.email().optional(),
  provedor: z.enum(['google']).optional(),
  carreira: TextoCurto.optional(),
  consentimentos: z.array(
    z.strictObject({ versaoPolitica: z.string().max(20), aceitoEm: Instante }),
  ),
});
export type Usuario = z.infer<typeof Usuario>;

export const Aparelho = z.strictObject({
  ...camposComuns,
  nome: TextoCurto,
  plataforma: z.string().max(200),
  ultimaSincronizacao: Instante.optional(),
  posseAte: Instante.optional(),
  versaoEsquemaLocal: z.int().min(1).optional(),
});
export type Aparelho = z.infer<typeof Aparelho>;

export const Fonte = z.strictObject({
  ...camposComuns,
  tipo: z.enum(['url', 'livro', 'curso', 'prova', 'outro']),
  titulo: TextoCurto,
  url: z.url({ protocol: /^https?$/ }).optional(),
  consultadaEm: DataCivil.optional(),
});
export type Fonte = z.infer<typeof Fonte>;

export const Anexo = z.strictObject({
  ...camposComuns,
  nomeArquivo: TextoCurto,
  tipoMime: z.string().max(200),
  tamanho: z.int().min(0),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
});
export type Anexo = z.infer<typeof Anexo>;

export const Tag = z.strictObject({
  ...camposComuns,
  nome: z.string().trim().min(1).max(60),
});
export type Tag = z.infer<typeof Tag>;

export const TipoItem = z.enum([
  'ponto',
  'norma',
  'dispositivo',
  'nota',
  'precedente',
  'erro',
  'cartao',
  'achado',
  'tag',
  'anexo',
]);
export type TipoItem = z.infer<typeof TipoItem>;

/** Vínculo N:N genérico (Parte 1 §5.1). Nenhum vínculo é obrigatório. */
export const Vinculo = z.strictObject({
  ...camposComuns,
  tipoA: TipoItem,
  idA: Id,
  tipoB: TipoItem,
  idB: Id,
  /** Vínculo herdado de um nó estrutural (igual à estrela). */
  herdadoDeId: Id.optional(),
});
export type Vinculo = z.infer<typeof Vinculo>;

export const ModoImportacao = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);
export type ModoImportacao = z.infer<typeof ModoImportacao>;

export const LogDeImportacao = z.strictObject({
  ...camposComuns,
  em: Instante,
  modo: ModoImportacao,
  hashPacote: z.string().regex(/^[0-9a-f]{64}$/),
  contagens: z.record(
    z.string(),
    z.strictObject({
      criados: z.int().min(0),
      atualizados: z.int().min(0),
      ignorados: z.int().min(0),
      conflitos: z.int().min(0),
      excluidos: z.int().min(0),
    }),
  ),
  snapshotId: Id.optional(),
  espacoId: Id.optional(),
  resultado: z.enum(['concluida', 'desfeita', 'falhou']),
  descricao: z.string().max(500).optional(),
});
export type LogDeImportacao = z.infer<typeof LogDeImportacao>;

export const Snapshot = z.strictObject({
  ...camposComuns,
  motivo: z.enum(['importacao', 'migracao', 'manual', 'rollback']),
  tamanho: z.int().min(0),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  versaoEsquema: z.int().min(1),
});
export type Snapshot = z.infer<typeof Snapshot>;

/** Relato de Problema (D23): 1 por dia, descrição obrigatória, sem dados de estudo. */
export const RelatoDeProblema = z.strictObject({
  ...camposComuns,
  data: DataCivil,
  descricao: z.string().trim().min(1).max(2_000),
  tela: z.string().max(200),
  versaoApp: z.string().max(50),
  aparelhoId: Id,
  status: z.enum(['aguardando_envio', 'enviado', 'respondido']),
  resposta: z.string().max(2_000).optional(),
});
export type RelatoDeProblema = z.infer<typeof RelatoDeProblema>;

export const Tema = z.enum(['sistema', 'claro', 'escuro']);
export type Tema = z.infer<typeof Tema>;

export const COTA_DIARIA_PADRAO = 10;
export const COTA_DIARIA_MIN = 5;
export const COTA_DIARIA_MAX = 100;

export const Preferencias = z.strictObject({
  ...camposComuns,
  tema: Tema,
  fonteLeitura: z.enum(['serifa', 'sem_serifa']),
  tamanhoFonte: z.int().min(12).max(32),
  mostrarRedacoesAnteriores: z.boolean(),
  /**
   * Destaque automático de condicionantes e prazos no leitor (F2, 9.8). Opcional: ausente é
   * desligado, e o registro e o pacote anteriores à 9.8 continuam válidos (sem migração).
   */
  destacarCondicionantesEPrazos: z.boolean().optional(),
  /**
   * Régua de leitura (redesign, fatia 4): realça a linha sob o dedo, o cursor ou o foco, sem mover o
   * texto. Opcional: ausente é desligada; o registro e o pacote anteriores continuam válidos.
   */
  reguaDeLeitura: z.boolean().optional(),
  /**
   * Lente do modo foco (palco): 'cartao' (um artigo por vez) ou 'corrido'. Opcional: ausente é
   * 'cartao'; grava ao escolher no foco. Registro e pacote anteriores continuam válidos.
   */
  lenteDoFoco: z.enum(['cartao', 'corrido']).optional(),
  /**
   * Espiada dos vizinhos no cartão do foco. Opcional: ausente é desligada (vizinhos sem texto).
   */
  espiadaDosVizinhos: z.boolean().optional(),
  /**
   * Cartões por vez no Recall (redesign, fatia 3). Opcional: ausente é 10 (`COTA_DIARIA_PADRAO`); o
   * registro e o pacote anteriores continuam válidos (sem migração). A fila nunca é cortada.
   */
  cotaDiaria: z.int().min(COTA_DIARIA_MIN).max(COTA_DIARIA_MAX).optional(),
  horaFechamento: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  modulosDesabilitados: z.array(z.string().max(40)),
  retencaoSnapshots: z.int().min(5).max(100),
});
export type Preferencias = z.infer<typeof Preferencias>;

/** Espaço separado do modo 7 de importação: um banco local isolado. */
export const Espaco = z.strictObject({
  ...camposComuns,
  nome: TextoCurto,
  nomeBanco: z.string().max(200),
  hashPacote: z.string().regex(/^[0-9a-f]{64}$/),
});
export type Espaco = z.infer<typeof Espaco>;
