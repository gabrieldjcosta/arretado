// Plano e Execução: Concurso, FasePrazo, Edital, Disciplina, Ponto, Dia, Sessão (Parte 1 §5.3; Parte 2 §10.1–10.3).
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
  conteudosAcessados: z
    .array(z.strictObject({ tipo: z.enum(['norma', 'nota', 'precedente']), id: Id, em: Instante }))
    .optional(),
});
export type Sessao = z.infer<typeof Sessao>;
