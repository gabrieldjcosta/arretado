// Erros vinculados a dispositivos da norma (F2, 11.3, filtro "com erros"). A composição fica na
// apresentação: o domínio da Legislação não importa o do Recall (CLAUDE.md, camadas); aqui só se
// lê o índice `dispositivoId` da coleção `erros`, que o `Erro` já tinha.
import type { Repositorio } from '../../core/persistencia';
import { todos } from '../../dominios/legislacao/consultas';

/**
 * Os dispositivos da norma (`indiceDe`) com ao menos um erro vinculado. O erro descartado não conta:
 * o filtro serve para estudar, e quem descartou o erro já o deu por encerrado. Lido a cada vez que o
 * filtro é aplicado (outra aba pode ter registrado um erro).
 */
export async function dispositivosComErro(
  repo: Repositorio,
  indiceDe: ReadonlyMap<string, number>,
): Promise<Set<string>> {
  // Sem faixa: o índice inteiro, que só tem os erros que têm `dispositivoId`.
  const erros = await todos(repo.colecao('erros'), { indice: 'dispositivoId' });
  const ids = new Set<string>();
  for (const erro of erros) {
    if (erro.dispositivoId !== undefined && erro.status !== 'descartado') {
      if (indiceDe.has(erro.dispositivoId)) ids.add(erro.dispositivoId);
    }
  }
  return ids;
}
