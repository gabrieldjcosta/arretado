// O que mostrar em "Comece por aqui" depois de criar o plano: o primeiro ponto de faixa
// altíssima que veio das linhas escolhidas (ou o primeiro ponto) e a matéria dele.
import type { Ponto } from '../../../core/modelo';
import type { PacoteLido } from '../../../core/pacote';
import type { LinhaPonto } from '../../../integracoes/pontos/csv';

export interface PlanoCriado {
  ponto?: Ponto;
  materia?: string;
}

export function planoCriado(pacote: PacoteLido, linhas: readonly LinhaPonto[]): PlanoCriado {
  // Os registros vêm do pacote montado por `prepararPontos`: os tipos se perdem no formato do pacote.
  const pontos = (pacote.registros.get('pontos') ?? []) as Ponto[];
  const primeiro =
    pontos.find((p) => p.faixa === 'altissima' && linhas.some((l) => l.titulo === p.titulo)) ??
    pontos[0];
  if (!primeiro) return {};
  const materia = (pacote.registros.get('disciplinas') ?? []).find(
    (d) => d.id === primeiro.disciplinaId,
  )?.nome;
  return { ponto: primeiro, ...(typeof materia === 'string' ? { materia } : {}) };
}
