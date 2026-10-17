// Itens que a pessoa acrescenta ao catálogo no passo das matérias: validação pura e linhas de importação.
import { chaveDeNome } from '../../../dominios/catalogo';
import type { LinhaPonto } from '../../../integracoes/pontos/csv';
import type { Acrescentos } from './rascunho';

export const ACRESCENTOS_VAZIOS: Acrescentos = { disciplinas: [], assuntos: [] };

/** Texto limpo para entrar, ou o aviso curto do motivo de não entrar. */
export function validarNome(
  texto: string,
  existentes: readonly string[],
): { texto: string } | { aviso: string } {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo) return { aviso: 'Escreva o nome antes de acrescentar.' };
  const chave = chaveDeNome(limpo);
  if (existentes.some((e) => chaveDeNome(e) === chave)) return { aviso: 'Isso já está na lista.' };
  return { texto: limpo };
}

/** Linhas dos acréscimos de matérias marcadas; sem `codigo` e sem `faixa`. */
export function linhasDosAcrescentos(
  a: Acrescentos,
  desmarcadas: ReadonlySet<string>,
): LinhaPonto[] {
  return a.assuntos
    .filter((x) => !desmarcadas.has(chaveDeNome(x.disciplina)))
    .map((x) => ({ disciplina: x.disciplina, titulo: x.titulo }));
}
