// O resumo curto do que ficou de uma Sessão encerrada (texto de tela do fluxo de encerrar).
import type { Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { rotuloDaAtividade } from './atividades';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** Quantos erros foram guardados durante a Sessão (cada um já virou uma Frase para as revisões). */
export async function errosDaSessao(repo: Repositorio, sessaoId: string): Promise<number> {
  const pagina = await repo.colecao('erros').listarPagina({
    indice: '[usuarioId+criadoEm]',
    de: [repo.ctx.usuarioId, ''],
    ate: [repo.ctx.usuarioId, '￿'],
    ordem: 'desc',
    limite: 500,
    cursor: null,
    filtro: (e) => e.sessaoId === sessaoId,
  });
  return pagina.itens.length;
}

const tempo = (segundos: number | undefined) => {
  if (segundos === undefined) return undefined;
  const min = Math.round(segundos / 60);
  return min < 1 ? 'Menos de 1 min' : `${String(min)} min`;
};

/** O resumo em linhas curtas; só entra o que houve. */
export function linhasDoResumo(sessao: Sessao, erros: number): string[] {
  const t = tempo(sessao.duracaoSegundos);
  const feitas = sessao.questoesFeitas ?? 0;
  const notas = sessao.estacionamento?.length ?? 0;
  return [
    [t, sessao.atividade ? rotuloDaAtividade(sessao.atividade) : undefined]
      .filter(Boolean)
      .join(' · '),
    feitas > 0
      ? `${String(sessao.questoesAcertadas ?? 0)} de ${plural(feitas, 'questão', 'questões')} certas`
      : '',
    erros > 0
      ? `${plural(erros, 'erro guardado', 'erros guardados')}: entram nas suas revisões`
      : '',
    notas > 0 ? `${plural(notas, 'anotação guardada', 'anotações guardadas')} para depois` : '',
  ].filter(Boolean);
}
