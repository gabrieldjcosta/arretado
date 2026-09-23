// Gerador de carga sintética (atividade 1.8): volume realista de um ano de uso intenso.
import { camposMinimos } from '../core/modelo/fabrica';
import type { NomeColecao } from '../core/modelo';
import type { Repositorio } from '../core/persistencia';

export const DISTRIBUICAO: Partial<Record<NomeColecao, number>> = {
  pontos: 500,
  erros: 3_000,
  cartoes: 2_000,
  revisoes: 4_000,
  dispositivos: 400,
  sessoes: 100,
};

const CAUSAS = ['lacuna', 'leitura', 'confusao', 'literalidade'] as const;

function dataCivil(base: Date, dias: number): string {
  return new Date(base.getTime() + dias * 86_400_000).toISOString().slice(0, 10);
}

/** Grava a distribuição no repositório em lotes; devolve o total gravado. */
export async function gerarCarga(repo: Repositorio, escala = 1): Promise<number> {
  const base = new Date('2026-01-01T12:00:00.000Z');
  const ref = repo.ctx.novoId();
  let total = 0;
  for (const [nome, quantidade] of Object.entries(DISTRIBUICAO) as [NomeColecao, number][]) {
    const n = Math.round(quantidade * escala);
    const lote: unknown[] = [];
    for (let i = 0; i < n; i++) {
      const instante = new Date(base.getTime() + i * 3_600_000).toISOString();
      const especificos: Record<string, unknown> = { ...camposMinimos(nome, ref) };
      if (nome === 'erros') {
        especificos.oQueFoi = `Erro sintético ${String(i)}`;
        especificos.causa = CAUSAS[i % 4];
      }
      if (nome === 'cartoes') {
        especificos.caixa = (i % 6) + 1;
        especificos.proximaRevisao = dataCivil(base, i % 400);
        especificos.estado = i % 10 === 0 ? 'suspenso' : 'ativo';
      }
      if (nome === 'dispositivos') {
        especificos.endereco = `art${String(i + 1)}`;
        especificos.ordem = i + 1;
      }
      lote.push({
        ...especificos,
        id: repo.ctx.novoId(),
        usuarioId: repo.ctx.usuarioId,
        criadoEm: instante,
        atualizadoEm: instante,
        tsLogico: repo.ctx.relogio.tick(),
        origem: 'sistema',
        excluidoEm: null,
      });
    }
    for (let i = 0; i < lote.length; i += 1_000) {
      total += await repo.colecao(nome).gravarLote(lote.slice(i, i + 1_000));
    }
  }
  return total;
}
