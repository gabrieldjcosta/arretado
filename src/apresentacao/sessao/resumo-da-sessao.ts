// O resumo curto do que ficou de uma Sessão encerrada (texto de tela do fluxo de encerrar).
import type { Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { notasPendentes } from '../../dominios/sessao/estacionamento';
import { rotuloDaAtividade } from './atividades';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/**
 * Quantos Erros foram guardados durante a Sessão: os criados entre o começo e o fim dela, pelo "Errei"
 * das questões ou pelo registro comum (só o "Errei" grava `sessaoId`). Lê só essa faixa do índice.
 */
export async function errosDaSessao(
  repo: Repositorio,
  sessao: Pick<Sessao, 'inicio' | 'fim'>,
): Promise<number> {
  const pagina = await repo.colecao('erros').listarPagina({
    indice: '[usuarioId+criadoEm]',
    de: [repo.ctx.usuarioId, sessao.inicio],
    ate: [repo.ctx.usuarioId, sessao.fim ?? '\uffff'],
    limite: 500,
    cursor: null,
  });
  return pagina.itens.length;
}

const tempo = (segundos: number | undefined) => {
  if (segundos === undefined) return undefined;
  const min = Math.round(segundos / 60);
  return min < 1 ? 'Menos de 1 min' : `${String(min)} min`;
};

/** O resumo em linhas curtas; só entra o que houve. As anotações são as que seguem por resolver. */
export function linhasDoResumo(
  sessao: Pick<
    Sessao,
    'duracaoSegundos' | 'atividade' | 'questoesFeitas' | 'questoesAcertadas' | 'estacionamento'
  >,
  erros: number,
): string[] {
  const t = tempo(sessao.duracaoSegundos);
  const feitas = sessao.questoesFeitas ?? 0;
  const notas = notasPendentes(sessao).length;
  const certa = feitas === 1 ? 'certa' : 'certas';
  const entra = erros === 1 ? 'entra' : 'entram';
  return [
    [t, sessao.atividade ? rotuloDaAtividade(sessao.atividade) : undefined]
      .filter(Boolean)
      .join(' · '),
    feitas > 0
      ? `${String(sessao.questoesAcertadas ?? 0)} de ${plural(feitas, 'questão', 'questões')} ${certa}`
      : '',
    erros > 0
      ? `${plural(erros, 'erro guardado', 'erros guardados')}: ${entra} nas suas revisões`
      : '',
    notas > 0 ? `${plural(notas, 'anotação guardada', 'anotações guardadas')} para depois` : '',
  ].filter(Boolean);
}
