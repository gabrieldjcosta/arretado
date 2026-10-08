// Filtros do leitor (F2, 11.3; Parte 2 §10.6, Filtros): mostrar só os estrelados, os com grifo ou
// nota, os com erro vinculado ou um trecho da norma (de um dispositivo a outro, ou um bloco), sempre
// mantendo os nós de contexto: o que está acima de cada achado (o título e o capítulo, o caput do
// inciso) continua à vista, para o achado não ficar solto. A conta é pura, sobre a árvore aberta
// (`NormaAberta.nos`); o leitor guarda o resultado quando o filtro é aplicado.
import type { EstadoDaEstrela } from './estrelas';
import type { NoDaLeitura } from './leitor';

/** O que o filtro procura. Sem filtro é "tudo" e não passa por aqui. */
export type CriterioDoFiltro =
  | { tipo: 'estrelados' }
  | { tipo: 'marcados' }
  | { tipo: 'com_erros' }
  /**
   * Do nó `de` ao `ate` (índices em `NormaAberta.nos`, em qualquer ordem), com tudo o que está
   * dentro do último. Um bloco (título, capítulo, seção) é `de === ate`.
   */
  | { tipo: 'trecho'; de: number; ate: number };

/** De onde vêm os dados dos três primeiros critérios (lidos fora, pelo leitor). */
export interface FontesDoFiltro {
  /** O estado de cada nó (`estrelasEfetivas`): só o `estrelado` conta. */
  estrelas: ReadonlyMap<string, EstadoDaEstrela>;
  /** Os dispositivos com ao menos um grifo ou uma nota. */
  marcados: ReadonlySet<string>;
  /** Os dispositivos com ao menos um erro vinculado. */
  comErros: ReadonlySet<string>;
}

export interface ResultadoDoFiltro {
  /** Os nós que casam (índices em `nos`). */
  casados: ReadonlySet<number>;
  /** Os que casam mais os de contexto: o que o leitor desenha. */
  visiveis: ReadonlySet<number>;
}

/** O último nó do que está dentro de `indice` (ele mesmo, se não tem filhos). */
export function fimDaSubarvore(nos: readonly NoDaLeitura[], indice: number): number {
  const nivel = nos[indice]?.nivel;
  if (nivel === undefined) return indice;
  let fim = indice;
  while ((nos[fim + 1]?.nivel ?? -1) > nivel) fim++;
  return fim;
}

/** Os nós do filtro e o contexto deles. */
export function aplicarFiltro(
  nos: readonly NoDaLeitura[],
  indiceDe: ReadonlyMap<string, number>,
  criterio: CriterioDoFiltro,
  fontes: FontesDoFiltro,
): ResultadoDoFiltro {
  const casados = new Set<number>();
  if (criterio.tipo === 'trecho') {
    const de = Math.max(0, Math.min(criterio.de, criterio.ate));
    const ate = Math.min(nos.length - 1, fimDaSubarvore(nos, Math.max(criterio.de, criterio.ate)));
    for (let i = de; i <= ate; i++) casados.add(i);
  } else {
    nos.forEach(({ dispositivo }, indice) => {
      if (casa(criterio, dispositivo.id, fontes)) casados.add(indice);
    });
  }

  // O contexto: os ancestrais de cada achado, parando no primeiro já incluído (os de cima também
  // já estão). O limite de passos protege de um ciclo no `paiId` (dado corrompido).
  const visiveis = new Set(casados);
  for (const indice of casados) {
    let atual = nos[indice]?.dispositivo.paiId;
    for (let passos = 0; atual !== undefined && passos < 64; passos++) {
      const acima = indiceDe.get(atual);
      if (acima === undefined || visiveis.has(acima)) break;
      visiveis.add(acima);
      atual = nos[acima]?.dispositivo.paiId;
    }
  }
  return { casados, visiveis };
}

function casa(
  criterio: Exclude<CriterioDoFiltro, { tipo: 'trecho' }>,
  id: string,
  fontes: FontesDoFiltro,
): boolean {
  switch (criterio.tipo) {
    case 'estrelados':
      return fontes.estrelas.get(id)?.estrelado === true;
    case 'marcados':
      return fontes.marcados.has(id);
    case 'com_erros':
      return fontes.comErros.has(id);
  }
}

/** Os nomes dos critérios, na frase da tela ("Mostrando só: …"). */
export function nomeDoCriterio(criterio: CriterioDoFiltro, trecho?: string): string {
  switch (criterio.tipo) {
    case 'estrelados':
      return 'estrelados';
    case 'marcados':
      return 'com grifo ou nota';
    case 'com_erros':
      return 'com erro vinculado';
    case 'trecho':
      return trecho ?? 'um trecho';
  }
}
