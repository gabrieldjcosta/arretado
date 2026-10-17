import type { Disciplina, Edital } from '../../core/modelo';
import type { EntradaDoIndice } from '../../dominios/acervo/esquemas';

function chave(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

/**
 * O edital do plano que tem normas vinculadas no índice do acervo: alguma disciplina dele casa,
 * pelo nome, com a disciplina de uma norma do índice. Sem edital, ou com edital que o acervo não
 * conhece (importado, por exemplo), não há atalho. Havendo mais de um, vale o de versão mais nova.
 */
export function editalComNormasNoAcervo(
  editais: readonly Edital[],
  disciplinas: readonly Disciplina[],
  itens: readonly EntradaDoIndice[],
): Edital | undefined {
  const doAcervo = new Set(
    itens
      .filter((i) => i.tipo === 'norma')
      .flatMap((i) => i.vinculos.map((v) => chave(v.disciplina))),
  );
  const casam = editais
    .filter((e) => e.excluidoEm === null)
    .filter((e) =>
      disciplinas.some(
        (d) => d.excluidoEm === null && d.editalId === e.id && doAcervo.has(chave(d.nome)),
      ),
    );
  return casam.sort(
    (a, b) => b.versao - a.versao || b.atualizadoEm.localeCompare(a.atualizadoEm),
  )[0];
}
