// Plano e Execução: Concurso, FasePrazo, Edital, Disciplina, Ponto, Dia, Sessão, Tarefa de estudo
// (Parte 1 §5.3; Parte 2 §10.1–10.3; F3, esquema v7).
import { z } from 'zod';
import { camposComuns, DataCivil, Id, Instante, TextoCurto, TextoLongo } from './comum';

export const Concurso = z.strictObject({
  ...camposComuns,
  nome: TextoCurto,
  banca: TextoCurto,
  orgao: TextoCurto.optional(),
  cargo: TextoCurto.optional(),
  carreira: TextoCurto.optional(),
  status: z.enum(['planejado', 'ativo', 'encerrado']).optional(),
  /** Concurso que alimenta o Hoje; no máximo um por usuário. */
  ativo: z.boolean().optional(),
});
export type Concurso = z.infer<typeof Concurso>;

export const FasePrazo = z.strictObject({
  ...camposComuns,
  concursoId: Id,
  titulo: TextoCurto,
  tipo: z.enum(['fase', 'prazo']),
  dataInicio: DataCivil,
  dataFim: DataCivil.optional(),
  descricao: TextoLongo.optional(),
  lembreteDias: z.int().min(0).max(365).optional(),
  concluido: z.boolean().optional(),
  fonte: TextoCurto.optional(),
  historicoDatas: z
    .array(
      z.strictObject({
        em: Instante,
        antes: z.strictObject({ dataInicio: DataCivil, dataFim: DataCivil.optional() }),
        depois: z.strictObject({ dataInicio: DataCivil, dataFim: DataCivil.optional() }),
      }),
    )
    .optional(),
});
export type FasePrazo = z.infer<typeof FasePrazo>;

export const Edital = z.strictObject({
  ...camposComuns,
  concursoId: Id.optional(),
  titulo: TextoCurto,
  versao: z.int().min(1),
  publicadoEm: DataCivil.optional(),
  editalAnteriorId: Id.optional(),
  fonte: TextoCurto.optional(),
});
export type Edital = z.infer<typeof Edital>;

export const Disciplina = z.strictObject({
  ...camposComuns,
  nome: TextoCurto,
  editalId: Id.optional(),
  ordem: z.number().optional(),
});
export type Disciplina = z.infer<typeof Disciplina>;

export const Faixa = z.enum(['altissima', 'alta', 'media', 'extra']);
export type Faixa = z.infer<typeof Faixa>;

export const OrigemPrioridade = z.enum(['manual', 'achado', 'adesao', 'importacao']);

export const Ponto = z.strictObject({
  ...camposComuns,
  titulo: TextoCurto,
  codigo: z.string().max(50).optional(),
  disciplinaId: Id.optional(),
  editalId: Id.optional(),
  faixa: Faixa.optional(),
  /** Só para desempate manual (Parte 2 §10.2). */
  prioridade: z.number().optional(),
  /** Único status manual; os demais são derivados. */
  adiadoAte: DataCivil.optional(),
  motivoAdiamento: TextoCurto.optional(),
  pontoOrigemId: Id.optional(),
  foraDoEditalAtual: z.boolean().optional(),
  novoNestaVersao: z.boolean().optional(),
  metaQuestoes: z.int().min(1).optional(),
  dependeDe: z.array(Id).optional(),
  /** Pontos importados do Ciclo Obrigatório na F1 não são editáveis. */
  somenteLeitura: z.boolean().optional(),
  logPrioridade: z
    .array(
      z.strictObject({
        em: Instante,
        antes: z.strictObject({ faixa: Faixa.optional(), prioridade: z.number().optional() }),
        depois: z.strictObject({ faixa: Faixa.optional(), prioridade: z.number().optional() }),
        origem: OrigemPrioridade,
        origemId: Id.optional(),
        motivo: TextoCurto.optional(),
      }),
    )
    .optional(),
});
export type Ponto = z.infer<typeof Ponto>;

export const Dia = z.strictObject({
  ...camposComuns,
  data: DataCivil,
  fechadoEm: Instante.optional(),
  pontoId: Id.optional(),
  resultadoPonto: z.enum(['concluido', 'continuar', 'adiado']).optional(),
  motivo: TextoCurto.optional(),
});
export type Dia = z.infer<typeof Dia>;

/**
 * Do que se trata uma ação ou sessão (F3, v7). `revisao` = cartões/frases vencidos; `leitura` = a
 * leitura salva (norma); `tarefa` = Tarefa de estudo; `ponto` = ponto do programa; `livre` = a pessoa
 * escolheu sem sugestão. O `id` aponta para o item quando houver; o `rotulo` é o texto mostrado.
 */
export const TipoDeAlvo = z.enum(['revisao', 'leitura', 'tarefa', 'ponto', 'livre']);
export type TipoDeAlvo = z.infer<typeof TipoDeAlvo>;

export const AlvoDeAcao = z.strictObject({
  tipo: TipoDeAlvo,
  id: Id.optional(),
  rotulo: TextoCurto.optional(),
});
export type AlvoDeAcao = z.infer<typeof AlvoDeAcao>;

/** De onde veio a Próxima ação que originou a Sessão (cópia do que foi mostrado; não é recalculado). */
export const OrigemDaAcao = z.strictObject({
  tipo: z.enum(['revisao_vencida', 'leitura_salva', 'tarefa', 'escolha_propria', 'sessao_curta']),
  razao: TextoCurto.optional(),
});
export type OrigemDaAcao = z.infer<typeof OrigemDaAcao>;

/** Anotação rápida de distração durante a Sessão (Estacionamento); nunca interrompe o estudo. */
export const NotaDeEstacionamento = z.strictObject({
  texto: z.string().trim().min(1).max(500),
  em: Instante,
  /** Resolvida ou descartada depois da Sessão; ausente = ainda no estacionamento. */
  resolvidaEm: Instante.optional(),
});
export type NotaDeEstacionamento = z.infer<typeof NotaDeEstacionamento>;

export const Sessao = z.strictObject({
  ...camposComuns,
  tipo: z.enum(['estudo', 'livre', 'simulado']),
  pontoId: Id.optional(),
  data: DataCivil,
  inicio: Instante,
  fim: Instante.optional(),
  estado: z.enum(['ativa', 'pausada', 'interrompida', 'encerrada']),
  pausas: z.array(z.strictObject({ inicio: Instante, fim: Instante.optional() })),
  duracaoSegundos: z.int().min(0).optional(),
  questoesFeitas: z.int().min(0).optional(),
  questoesAcertadas: z.int().min(0).optional(),
  anotacao: TextoCurto.optional(),
  /** F3 (v7), tudo opcional: Sessão antiga continua válida. O que se vai estudar. */
  alvo: AlvoDeAcao.optional(),
  /** Até onde ler nesta Sessão ("até o art. 15"); texto livre, nunca obrigatório. */
  fronteira: TextoCurto.optional(),
  /** Próximo passo pequeno, pedido ao fechar (pré-preenchido); alimenta a Próxima ação seguinte. */
  proximoPasso: TextoCurto.optional(),
  /** Estacionamento de distração: anotações da Sessão, em ordem de criação. */
  estacionamento: z.array(NotaDeEstacionamento).max(200).optional(),
  origemDaAcao: OrigemDaAcao.optional(),
  /** Tarefa de estudo que a Sessão trabalha (opcional). */
  tarefaId: Id.optional(),
  /** Temporizador opcional escolhido para esta Sessão; informativo, nunca bloqueia nem mede aprendizado. */
  temporizadorMin: z.int().min(1).max(240).optional(),
  conteudosAcessados: z
    .array(z.strictObject({ tipo: z.enum(['norma', 'nota', 'precedente']), id: Id, em: Instante }))
    .optional(),
});
export type Sessao = z.infer<typeof Sessao>;

export const EstadoDaTarefa = z.enum(['aberta', 'feita', 'adiada', 'dividida']);
export type EstadoDaTarefa = z.infer<typeof EstadoDaTarefa>;

/**
 * Tarefa de estudo (F3-B, esquema v7): passo pequeno e concreto ("ler arts. 10 a 13"), manual ou
 * sugerida por regra explicável. Não concluída fica na fila, sem atraso punitivo; `dividida` = virou
 * filhas (`paiId` nelas). Entidade do módulo `plano`.
 */
export const TarefaDeEstudo = z.strictObject({
  ...camposComuns,
  titulo: TextoCurto,
  pontoId: Id.optional(),
  fonte: z
    .strictObject({
      tipo: z.enum(['norma', 'dispositivo', 'precedente', 'nota']),
      id: Id,
      rotulo: TextoCurto.optional(),
    })
    .optional(),
  estado: EstadoDaTarefa,
  /** Tarefa de que esta foi dividida. */
  paiId: Id.optional(),
  /** Posição na fila (reordenar); menor primeiro. */
  ordem: z.number(),
  estimativaMin: z.int().min(1).max(600).optional(),
  autoria: z.enum(['manual', 'sugerida']),
  /** Por que foi sugerida (regra explicável); só em `autoria` `sugerida`. */
  razao: TextoCurto.optional(),
  adiadaAte: DataCivil.optional(),
  concluidaEm: Instante.optional(),
});
export type TarefaDeEstudo = z.infer<typeof TarefaDeEstudo>;
