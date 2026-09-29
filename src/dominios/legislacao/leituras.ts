// Onde o usuário parou em cada norma (F2, 9.7; Parte 2 §10.6, Leitor, "Lido até", e §9.2,
// Biblioteca › Normas): um registro `Leitura` por norma. A posição (`posicaoId`, o dispositivo no
// alto da tela) o leitor grava sozinho, ao parar de rolar e ao sair; o "lido até" (`lidoAteId`) só
// muda por ação do usuário, nunca por rolagem.
import type { Leitura } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';

/** Quando a norma foi lida por último: `ultimaLeituraEm`, ou a gravação, se o campo falta. */
export const lidaEm = (leitura: Leitura): string => leitura.ultimaLeituraEm ?? leitura.atualizadoEm;

/**
 * A mais recente. Há mais de uma leitura da mesma norma só se dois aparelhos criaram cada um a sua
 * (sincronização, F4) ou por mesclagem de backup; vale a última usada.
 */
function maisRecente(leituras: readonly Leitura[]): Leitura | undefined {
  let escolhida: Leitura | undefined;
  for (const leitura of leituras) {
    if (!escolhida || lidaEm(leitura) > lidaEm(escolhida)) escolhida = leitura;
  }
  return escolhida;
}

function leiturasDaNorma(repo: Repositorio, normaId: string) {
  const chave = [repo.ctx.usuarioId, normaId];
  return todos(repo.colecao('leituras'), { indice: '[usuarioId+normaId]', de: chave, ate: chave });
}

/** A leitura da norma, se o usuário já a abriu. */
export async function obterLeitura(
  repo: Repositorio,
  normaId: string,
): Promise<Leitura | undefined> {
  return maisRecente(await leiturasDaNorma(repo, normaId));
}

/** Cria a leitura da norma ou altera a que existe, numa transação (duas abas não criam duas). */
function gravar(
  repo: Repositorio,
  normaId: string,
  campos: Pick<Leitura, 'posicaoId'> | Pick<Leitura, 'lidoAteId'>,
): Promise<Leitura> {
  return repo.transacao(async () => {
    const atual = maisRecente(await leiturasDaNorma(repo, normaId));
    const dados = { ...campos, ultimaLeituraEm: repo.ctx.agora().toISOString() };
    return atual
      ? repo.colecao('leituras').atualizar(atual.id, dados)
      : repo.colecao('leituras').criar({ normaId, ...dados });
  });
}

/** Guarda o dispositivo no alto da tela: o leitor volta a ele. Não mexe no "lido até". */
export function gravarPosicao(
  repo: Repositorio,
  normaId: string,
  posicaoId: string,
): Promise<Leitura> {
  return gravar(repo, normaId, { posicaoId });
}

/**
 * Marca o "lido até" no dispositivo que o usuário escolheu: avança ou retrocede, porque é sempre
 * ação dele. Não mexe na posição.
 */
export function marcarLidoAte(
  repo: Repositorio,
  normaId: string,
  dispositivoId: string,
): Promise<Leitura> {
  return gravar(repo, normaId, { lidoAteId: dispositivoId });
}

/** A leitura de cada norma do usuário (a mais recente, se houver duas), para a Biblioteca. */
export async function leiturasPorNorma(repo: Repositorio): Promise<Map<string, Leitura>> {
  const usuarioId = repo.ctx.usuarioId;
  const leituras = await todos(repo.colecao('leituras'), {
    indice: 'usuarioId',
    de: usuarioId,
    ate: usuarioId,
  });
  const porNorma = new Map<string, Leitura>();
  for (const leitura of leituras) {
    const anterior = porNorma.get(leitura.normaId);
    if (!anterior || lidaEm(leitura) > lidaEm(anterior)) porNorma.set(leitura.normaId, leitura);
  }
  return porNorma;
}
