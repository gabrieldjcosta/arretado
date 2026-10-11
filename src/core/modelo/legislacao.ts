// Legislação e Catálogo (Parte 1 §5.2–5.3, D11–D15). Só modelo em F0; interface em F2 e F7.
import { z } from 'zod';
import { camposComuns, DataCivil, Id, Instante, TextoCurto, TextoLongo } from './comum';

// ── Camada de conteúdo (compartilhável quando no Catálogo) ──────────────────

export const EscopoNorma = z.enum(['pessoal', 'catalogo']);

export const Norma = z.strictObject({
  ...camposComuns,
  tituloCurto: TextoCurto,
  escopo: EscopoNorma,
  tituloOficial: TextoCurto.optional(),
  referencia: TextoCurto.optional(),
  tipo: TextoCurto.optional(),
  esfera: z.enum(['federal', 'estadual', 'municipal', 'internacional']).optional(),
  /** Espécie (esquema v4): ausente = norma; `sumulas` e `teses` são coleções (Peças 4 e 5 do acervo). */
  especie: z.enum(['norma', 'sumulas', 'teses']).optional(),
  /** Item do acervo de que a norma veio (esquema v4): id estável, versão e hash aderidos. */
  origemAcervo: z
    .strictObject({
      id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
      versao: z.int().min(1),
      hash: z.string().regex(/^[0-9a-f]{64}$/),
    })
    .optional(),
  epigrafe: TextoLongo.optional(),
  ementa: TextoLongo.optional(),
  preambulo: TextoLongo.optional(),
  disciplinaIds: z.array(Id).optional(),
  /** Habilita "verificar atualização" (D16). */
  urlOficial: z.url({ protocol: /^https?$/ }).optional(),
  fonteConsultadaEm: DataCivil.optional(),
  versaoVigenteId: Id.optional(),
  origemCatalogoId: Id.optional(),
  curadorId: Id.optional(),
});
export type Norma = z.infer<typeof Norma>;

/** Nota de vigência ("(Redação dada pela Lei nº …, de 2019)"), fora do texto; lei e ano quando há. */
const NotaVigencia = z.strictObject({
  texto: z.string().max(2_000),
  lei: TextoCurto.optional(),
  ano: z.int().min(1800).max(2100).optional(),
  link: z.url({ protocol: /^https?$/ }).optional(),
});

export const VersaoDeNorma = z.strictObject({
  ...camposComuns,
  normaId: Id,
  status: z.enum(['rascunho', 'vigente', 'arquivada']),
  capturadaEm: Instante,
  origemEntrada: z.enum(['html', 'url', 'arquivo', 'texto', 'edicao_manual']),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  dataVigencia: DataCivil.optional(),
  fonte: TextoCurto.optional(),
  notaVigenciaMaisRecente: z
    .strictObject({ lei: TextoCurto, ano: z.int().min(1800).max(2100) })
    .optional(),
  /** Notas da norma inteira, entre a epígrafe e a ementa ("(Vide Decreto nº 6.049, de 2007)"; F2, 9.2). */
  notasDaNorma: z.array(NotaVigencia).optional(),
  versaoAdaptador: z.string().max(50).optional(),
  anexoFonteId: Id.optional(),
});
export type VersaoDeNorma = z.infer<typeof VersaoDeNorma>;

export const TipoDispositivo = z.enum([
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'subsecao',
  'nome',
  'preambulo',
  'ementa',
  'artigo',
  'caput',
  'paragrafo',
  'inciso',
  'alinea',
  'item',
  // Súmula (esquema v4, Peça 4 do acervo): um enunciado numerado; normativo, filho direto da coleção.
  'sumula',
  // Tese institucional (Peça 5 do acervo): enunciado numerado, filho de um nó de área.
  'tese',
  'anexo',
  // Trecho com numeração própria aberto por título solto (ADCT da CF); estrutural (8.4).
  'bloco',
]);
export type TipoDispositivo = z.infer<typeof TipoDispositivo>;

/**
 * Nó único da árvore da norma (D11). Nunca excluído: recebe status. Exceção (F2, 9.2): o de um
 * rascunho nunca publicado, que nada referencia, é apagado ao descartar o rascunho ou ao refazer a
 * árvore pela fonte.
 */
export const Dispositivo = z.strictObject({
  ...camposComuns,
  normaId: Id,
  /** Endereço canônico estável, ex.: `tit2.cap1.sec1`, `art9A`, `art5.par2.incIII.alB`. */
  endereco: z.string().regex(/^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$/),
  categoria: z.enum(['estrutural', 'normativo']),
  tipo: TipoDispositivo,
  ordem: z.number(),
  paiId: Id.optional(),
  rotulo: TextoCurto.optional(),
  /**
   * `vetado` (F2, 8.10, esquema v3): "(VETADO)" sozinho no texto; mantém o endereço e o texto.
   * Antes da v3 ia gravado `vigente`, com o texto "(VETADO)" (a norma gravada antes fica assim).
   */
  status: z.enum(['vigente', 'revogado', 'eficacia_cessada', 'renumerado', 'novo', 'vetado']),
  renumeradoDe: z.string().max(200).optional(),
  confianca: z.enum(['alta', 'media', 'a_confirmar']),
});
export type Dispositivo = z.infer<typeof Dispositivo>;

const Trecho = z.strictObject({
  texto: z.string(),
  tachado: z.boolean().optional(),
  enfase: z.boolean().optional(),
  link: z.url({ protocol: /^https?$/ }).optional(),
});

/** Texto de um dispositivo numa versão; carregado sob demanda (Parte 1 §5.1). */
export const TextoDeDispositivo = z.strictObject({
  ...camposComuns,
  versaoId: Id,
  dispositivoId: Id,
  normaId: Id,
  trechos: z.array(Trecho),
  notasVigencia: z.array(NotaVigencia).optional(),
  /** De onde veio o texto (tese: encontro e PDF; súmula: DJ e página oficial). */
  procedencia: z
    .strictObject({ rotulo: TextoCurto, data: DataCivil.optional(), link: NotaVigencia.shape.link })
    .optional(),
  redacoesAnteriores: z
    .array(
      z.strictObject({
        trechos: z.array(Trecho),
        nota: z.string().max(2_000).optional(),
        origemDeteccao: z.enum(['tachado', 'heuristica']),
        confirmada: z.boolean(),
      }),
    )
    .optional(),
});
export type TextoDeDispositivo = z.infer<typeof TextoDeDispositivo>;

// ── Camada de anotações pessoais ────────────────────────────────────────────

export const Marcacao = z.strictObject({
  ...camposComuns,
  normaId: Id,
  dispositivoId: Id,
  versaoId: Id,
  tipo: z.enum(['grifo', 'nota']),
  cor: z.int().min(1).max(3).optional(),
  nota: TextoLongo.optional(),
  ancora: z.strictObject({
    texto: z.string().max(5_000),
    inicio: z.int().min(0),
    fim: z.int().min(0),
  }),
  status: z.enum(['valida', 'reancorada', 'pendente']),
});
export type Marcacao = z.infer<typeof Marcacao>;

/**
 * Onde o usuário parou numa norma (F2, 9.1). Pessoal, por isso fora de Norma, que é conteúdo (D12).
 * Um registro por norma; "lido até" só avança por ação do usuário ou do modo foco (11.8).
 */
export const Leitura = z.strictObject({
  ...camposComuns,
  normaId: Id,
  /** Último dispositivo lido. */
  lidoAteId: Id.optional(),
  /** Dispositivo no topo da tela ao sair (retomar a leitura). */
  posicaoId: Id.optional(),
  ultimaLeituraEm: Instante.optional(),
});
export type Leitura = z.infer<typeof Leitura>;

/**
 * Estrela com origem (D15): direta, herdada de nó, de pacote ou exceção negativa. Só a direta e a
 * exceção são gravadas (11.2; a de pacote, na F7): a herdada é calculada (`estrelaEfetiva`).
 */
export const Estrela = z.strictObject({
  ...camposComuns,
  normaId: Id,
  alvoId: Id,
  origemTipo: z.enum(['direta', 'herdada', 'pacote', 'excecao']),
  herdadaDeId: Id.optional(),
  pacoteId: Id.optional(),
});
export type Estrela = z.infer<typeof Estrela>;

/**
 * Vínculo de uma norma a uma disciplina (esquema v4, D7): uma norma pode ter vários, cada um com
 * subtítulo e trecho opcionais ("CDC — Crimes das relações de consumo", arts. 61 a 80). Sem
 * `disciplinaId` é "sem disciplina"; `sugestao` guarda o nome que o acervo sugeriu.
 */
export const VinculoDeDisciplina = z.strictObject({
  ...camposComuns,
  normaId: Id,
  disciplinaId: Id.optional(),
  sugestao: TextoCurto.optional(),
  subtitulo: TextoCurto.optional(),
  trecho: z
    .strictObject({
      inicioEndereco: z.string().max(200),
      fimEndereco: z.string().max(200),
    })
    .optional(),
});
export type VinculoDeDisciplina = z.infer<typeof VinculoDeDisciplina>;

// ── Curadoria (F7) ──────────────────────────────────────────────────────────

export const PacoteDeIncidencia = z.strictObject({
  ...camposComuns,
  titulo: TextoCurto,
  carreira: TextoCurto.optional(),
  concursoAlvo: TextoCurto.optional(),
  versao: z.int().min(1),
  descricao: TextoLongo.optional(),
  normaIds: z.array(Id).optional(),
  estrelas: z.array(z.strictObject({ normaId: Id, dispositivoId: Id })).optional(),
  prioridades: z
    .array(
      z.strictObject({
        pontoRef: TextoCurto,
        faixa: z.enum(['altissima', 'alta', 'media', 'extra']),
      }),
    )
    .optional(),
  fonte: TextoCurto.optional(),
  publicadoEm: Instante.optional(),
});
export type PacoteDeIncidencia = z.infer<typeof PacoteDeIncidencia>;

export const Adesao = z.strictObject({
  ...camposComuns,
  pacoteId: Id.optional(),
  normaCatalogoId: Id.optional(),
  tipo: z.enum(['total', 'parcial']),
  normaIds: z.array(Id).optional(),
  versaoAderida: z.int().min(1),
  receberAtualizacoes: z.boolean(),
});
export type Adesao = z.infer<typeof Adesao>;

/**
 * Pendência de releitura (esquema v5, Peça 6a do acervo): o que perdeu o endereço quando uma
 * versão nova do acervo foi aplicada. Guarda o endereço antigo e o que apontava para ele; a
 * estrela, o erro, o vínculo, o "lido até" e a posição são resolvidos pelo usuário relendo o trecho.
 */
export const PendenciaDeReleitura = z.strictObject({
  ...camposComuns,
  normaId: Id,
  /** A versão que passou a ser a vigente e fez o endereço sumir. */
  versaoId: Id,
  tipo: z.enum(['estrela', 'erro', 'vinculo', 'lido_ate', 'posicao']),
  enderecoAntigo: z.string().max(200),
  rotulo: TextoCurto.optional(),
  /** O registro que apontava para o endereço (estrela, erro, vínculo ou leitura). */
  referenciaId: Id.optional(),
  resolvidaEm: Instante.optional(),
});
export type PendenciaDeReleitura = z.infer<typeof PendenciaDeReleitura>;
