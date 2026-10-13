// Vínculos de disciplina de uma norma: a escolha do usuário ao trazê-la do acervo e o "Mudar
// disciplina" depois. Os vínculos não são reescritos pela atualização 6a (só os trechos seguem a
// renumeração), então a escolha sobrevive a ela.
import type { Repositorio } from '../../core/persistencia';
import type { EntradaDoIndice } from './esquemas';

/** Escolha sem disciplina: o vínculo fica sem `disciplinaId` nem sugestão ("Sem disciplina"). */
export const OUTROS = 'Outros';

/** Nome comparável: sem acento, caixa nem espaço sobrando. */
const comparavel = (nome: string): string =>
  nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** As disciplinas que o índice sugere para o item, sem repetição: o padrão do seletor. */
export function disciplinasSugeridas(entrada: Pick<EntradaDoIndice, 'vinculos'>): string[] {
  return [...new Set(entrada.vinculos.map((v) => v.disciplina))];
}

/**
 * Substitui os vínculos da norma pelos `nomes`. Subtítulo e trecho do índice acompanham o nome que
 * continua; nome que o usuário tem como disciplina vira `disciplinaId`, o resto fica como sugestão.
 * Chamar dentro de uma transação quando a norma acabou de ser criada.
 */
export async function definirVinculos(
  repo: Repositorio,
  normaId: string,
  nomes: readonly string[],
  sugeridos: EntradaDoIndice['vinculos'] = [],
  origem: 'importacao' | 'manual' = 'manual',
): Promise<void> {
  const unicos = [...new Map(nomes.map((n) => [comparavel(n), n.trim()])).values()].filter(
    (n) => n !== '',
  );
  const vinculos = repo.colecao('vinculosDisciplina');
  const antigos = await vinculos.todosDoUsuario();
  for (const v of antigos.filter((a) => a.normaId === normaId && a.excluidoEm == null)) {
    await vinculos.excluir(v.id);
  }
  if (unicos.length === 0) return;
  const disciplinas = await repo.colecao('disciplinas').todosDoUsuario();
  const porNome = new Map(disciplinas.map((d) => [comparavel(d.nome), d.id]));
  const itens = unicos.flatMap((nome) => {
    if (comparavel(nome) === comparavel(OUTROS)) return [{ dados: { normaId } }];
    const disciplinaId = porNome.get(comparavel(nome));
    const doIndice = sugeridos.filter((s) => comparavel(s.disciplina) === comparavel(nome));
    // Um vínculo por entrada do índice (cada uma pode ter subtítulo e trecho); sem entrada, um só.
    return (doIndice.length > 0 ? doIndice : [undefined]).map((s) => ({
      dados: {
        normaId,
        sugestao: nome,
        ...(disciplinaId === undefined ? {} : { disciplinaId }),
        ...(s?.subtitulo === undefined ? {} : { subtitulo: s.subtitulo }),
        ...(s?.trecho === undefined ? {} : { trecho: s.trecho }),
      },
    }));
  });
  await vinculos.criarLote(itens, { origem });
}

/** Nomes das disciplinas de uma norma hoje ("Outros" não entra: é a ausência de nomes). */
export async function disciplinasDaNorma(repo: Repositorio, normaId: string): Promise<string[]> {
  const [vinculos, disciplinas] = await Promise.all([
    repo.colecao('vinculosDisciplina').todosDoUsuario(),
    repo.colecao('disciplinas').todosDoUsuario(),
  ]);
  const nomeDe = new Map(disciplinas.map((d) => [d.id, d.nome]));
  const nomes = vinculos
    .filter((v) => v.normaId === normaId && v.excluidoEm == null)
    .map(
      (v) => (v.disciplinaId === undefined ? undefined : nomeDe.get(v.disciplinaId)) ?? v.sugestao,
    )
    .filter((n): n is string => n !== undefined);
  return [...new Set(nomes)];
}

/** "Mudar disciplina": troca os vínculos, mantendo subtítulo e trecho dos nomes que ficam. */
export async function mudarDisciplinas(
  repo: Repositorio,
  normaId: string,
  nomes: readonly string[],
): Promise<void> {
  await repo.transacao(async () => {
    const [vinculos, disciplinas] = await Promise.all([
      repo.colecao('vinculosDisciplina').todosDoUsuario(),
      repo.colecao('disciplinas').todosDoUsuario(),
    ]);
    const nomeDe = new Map(disciplinas.map((d) => [d.id, d.nome]));
    const atuais: EntradaDoIndice['vinculos'] = vinculos
      .filter((v) => v.normaId === normaId && v.excluidoEm == null)
      .flatMap((v) => {
        const disciplina =
          (v.disciplinaId === undefined ? undefined : nomeDe.get(v.disciplinaId)) ?? v.sugestao;
        return disciplina === undefined
          ? []
          : [
              {
                disciplina,
                ...(v.subtitulo === undefined ? {} : { subtitulo: v.subtitulo }),
                ...(v.trecho === undefined ? {} : { trecho: v.trecho }),
              },
            ];
      });
    await definirVinculos(repo, normaId, nomes, atuais, 'manual');
  });
}
