// Carregadores estáveis (fora dos componentes) para useDados.
import type { RegistroDe } from '../../core/modelo';
import type { Pagina, Repositorio } from '../../core/persistencia';
import { cotaDiaria, obterPreferencias } from '../../core/preferencias';
import {
  contarVencidos,
  diasComRevisao,
  maiorFilaProjetada,
  vencemAmanha,
} from '../../dominios/recall/servico';

export async function resumoDoRecall(repo: Repositorio) {
  const [vencidos, maiorFila, dias, amanha, preferencias, erros] = await Promise.all([
    contarVencidos(repo),
    maiorFilaProjetada(repo),
    diasComRevisao(repo),
    vencemAmanha(repo),
    obterPreferencias(repo),
    repo.colecao('erros').contar(),
  ]);
  return {
    vencidos,
    maiorFila,
    dias,
    amanha,
    cota: cotaDiaria(preferencias),
    primeiroUso: erros === 0,
  };
}

export const vencidosHoje = (repo: Repositorio) => contarVencidos(repo);
export const amanha = (repo: Repositorio) => vencemAmanha(repo);

async function todas<N extends 'pontos' | 'disciplinas'>(repo: Repositorio, nome: N) {
  const u = repo.ctx.usuarioId;
  const itens: RegistroDe<N>[] = [];
  let cursor: string | null = null;
  do {
    const p: Pagina<RegistroDe<N>> = await repo
      .colecao(nome)
      .listarPagina({ indice: 'usuarioId', de: u, ate: u, limite: 200, cursor });
    itens.push(...p.itens);
    cursor = p.proximoCursor;
  } while (cursor && itens.length < 5_000);
  return itens;
}

/** Pontos e disciplinas para vínculo opcional (vazios até a importação dos pontos). */
export async function pontosEDisciplinas(repo: Repositorio) {
  const [pontos, disciplinas] = await Promise.all([
    todas(repo, 'pontos'),
    todas(repo, 'disciplinas'),
  ]);
  return { pontos, disciplinas };
}
