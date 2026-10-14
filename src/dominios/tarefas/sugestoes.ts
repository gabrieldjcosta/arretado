// Sugestões determinísticas de tarefa (F3-B, pacote B4). Regras explicáveis, sem IA: cada sugestão
// traz o "por quê". Ordem fixa das regras; dentro de cada uma, a faixa e a ordem do programa.
import type { DataCivil, Disciplina, Ponto, TarefaDeEstudo } from '../../core/modelo';

export type RegraDeSugestao = 'revisao_vencida' | 'erro_recorrente' | 'prioridade' | 'esquecida';

export interface Sugestao {
  /** Estável: serve para dispensar ("Não agora") e para não repetir uma tarefa já criada. */
  chave: string;
  regra: RegraDeSugestao;
  titulo: string;
  pontoId?: string;
  /** Por que foi sugerida, em palavras simples. */
  razao: string;
}

/** Dias sem Sessão numa matéria até ela ser lembrada (só se a pessoa já estudou nela). */
export const DIAS_ESQUECIDA = 14;

/** O que a regra precisa saber da atividade de um ponto (quem chama calcula; ver `dominios/pontos`). */
export interface AtividadeDoPonto {
  sessoesEncerradas: number;
  errosAbertos: number;
  cartoesVencidos: number;
}

const PESO: Record<string, number> = { altissima: 4, alta: 3, media: 2, extra: 1 };
const PESO_ALTA = 3;
const peso = (p: Ponto) => (p.faixa ? (PESO[p.faixa] ?? 0) : 0);

export interface EntradaDeSugestoes {
  hoje: DataCivil;
  disciplinas: readonly Disciplina[];
  pontos: readonly Ponto[];
  atividade: ReadonlyMap<string, AtividadeDoPonto>;
  /** Data (YYYY-MM-DD) da última Sessão encerrada por matéria. */
  ultimaSessaoPorMateria: ReadonlyMap<string, string>;
  tarefas: readonly TarefaDeEstudo[];
}

const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** Pura: devolve todas as sugestões possíveis, na ordem em que seriam mostradas. */
export function sugerirTarefas(e: EntradaDeSugestoes): Sugestao[] {
  const nomeDe = new Map(e.disciplinas.map((d) => [d.id, d.nome]));
  const ordemDe = new Map(e.disciplinas.map((d, i) => [d.id, d.ordem ?? i]));
  const pontos = e.pontos
    .filter((p) => p.excluidoEm === null)
    .sort(
      (a, b) =>
        peso(b) - peso(a) ||
        (ordemDe.get(a.disciplinaId ?? '') ?? 0) - (ordemDe.get(b.disciplinaId ?? '') ?? 0) ||
        (a.prioridade ?? 0) - (b.prioridade ?? 0),
    );
  const emUso = new Set(
    e.tarefas
      .filter((t) => t.excluidoEm === null && (t.estado === 'aberta' || t.estado === 'adiada'))
      .map((t) => `${t.pontoId ?? ''}|${t.titulo}`),
  );
  const saida: Sugestao[] = [];
  const empurrar = (s: Sugestao) => {
    if (emUso.has(`${s.pontoId ?? ''}|${s.titulo}`)) return;
    if (saida.some((x) => x.chave === s.chave)) return;
    saida.push(s);
  };
  const ativos = pontos.filter((p) => p.adiadoAte === undefined || p.adiadoAte <= e.hoje);

  for (const p of ativos) {
    const a = e.atividade.get(p.id);
    if (a && a.cartoesVencidos > 0) {
      empurrar({
        chave: `revisao:${p.id}`,
        regra: 'revisao_vencida',
        titulo: `Revisar ${plural(a.cartoesVencidos, 'cartão', 'cartões')} de ${p.titulo}`,
        pontoId: p.id,
        razao: `${plural(a.cartoesVencidos, 'cartão vencido', 'cartões vencidos')} neste ponto.`,
      });
    }
  }
  for (const p of ativos) {
    const a = e.atividade.get(p.id);
    if (a && a.errosAbertos >= 2) {
      empurrar({
        chave: `erros:${p.id}`,
        regra: 'erro_recorrente',
        titulo: `Rever os erros de ${p.titulo}`,
        pontoId: p.id,
        razao: `Você registrou ${plural(a.errosAbertos, 'erro aberto', 'erros abertos')} neste ponto.`,
      });
    }
  }
  for (const p of ativos) {
    const a = e.atividade.get(p.id) ?? SEM;
    if (p.faixa && peso(p) >= PESO_ALTA && a.sessoesEncerradas === 0) {
      empurrar({
        chave: `prioridade:${p.id}`,
        regra: 'prioridade',
        titulo: `Começar ${p.titulo}`,
        pontoId: p.id,
        razao: `Faixa ${faixaPorExtenso(p)} e ainda sem sessão neste ponto.`,
      });
    }
  }
  for (const d of e.disciplinas) {
    const ultima = e.ultimaSessaoPorMateria.get(d.id);
    if (ultima === undefined || diasEntre(ultima, e.hoje) < DIAS_ESQUECIDA) continue;
    const primeiro =
      ativos.find(
        (p) => p.disciplinaId === d.id && (e.atividade.get(p.id)?.sessoesEncerradas ?? 0) === 0,
      ) ?? ativos.find((p) => p.disciplinaId === d.id);
    if (!primeiro) continue;
    empurrar({
      chave: `esquecida:${d.id}`,
      regra: 'esquecida',
      titulo: `Voltar a ${nomeDe.get(d.id) ?? d.nome}: ${primeiro.titulo}`,
      pontoId: primeiro.id,
      razao: `Faz ${plural(diasEntre(ultima, e.hoje), 'dia', 'dias')} desde a última sessão nesta matéria.`,
    });
  }
  return saida;
}

const SEM: AtividadeDoPonto = { sessoesEncerradas: 0, errosAbertos: 0, cartoesVencidos: 0 };

function faixaPorExtenso(p: Ponto): string {
  return p.faixa === 'altissima' ? 'altíssima' : p.faixa === 'alta' ? 'alta' : (p.faixa ?? '');
}
