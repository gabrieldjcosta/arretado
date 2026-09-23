// Carregadores estáveis (fora dos componentes) para useDados.
import type { Repositorio } from '../../core/persistencia';
import { contarVencidos, maiorFilaProjetada, vencemAmanha } from '../../dominios/recall/servico';

export async function resumoDoRecall(repo: Repositorio) {
  const [vencidos, maiorFila] = await Promise.all([contarVencidos(repo), maiorFilaProjetada(repo)]);
  return { vencidos, maiorFila };
}

export const vencidosHoje = (repo: Repositorio) => contarVencidos(repo);
export const amanha = (repo: Repositorio) => vencemAmanha(repo);

/** Pontos e disciplinas para vínculo opcional (vazios até a importação dos pontos). */
export async function pontosEDisciplinas(repo: Repositorio) {
  const u = repo.ctx.usuarioId;
  const [pontos, disciplinas] = await Promise.all([
    repo.colecao('pontos').listarPagina({ indice: 'usuarioId', de: u, ate: u, limite: 200 }),
    repo.colecao('disciplinas').listarPagina({ indice: 'usuarioId', de: u, ate: u, limite: 200 }),
  ]);
  return { pontos: pontos.itens, disciplinas: disciplinas.itens };
}
