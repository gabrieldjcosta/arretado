// Linhas do leitor (F2, 9.6; Parte 2 §10.6, Leitor): o que a lista virtualizada desenha. Uma linha
// por dispositivo, menos a rubrica (`nome`), que vem depois do pai na ordem de leitura e é mostrada
// dentro da linha dele: acima do artigo, e acima do nome do título ou do capítulo.
import type { TipoDispositivo } from '../../core/modelo';
import type { NoDaLeitura } from '../../dominios/legislacao/leitor';

export interface LinhaDoLeitor {
  /** Índice do dispositivo em `NormaAberta.nos`. */
  indice: number;
  /** Índice do `nome` (rubrica ou nome do nó) mostrado nesta linha, se o dispositivo tem um. */
  indiceNome?: number;
  /** Profundidade na árvore: dá o nível do cabeçalho para o leitor de tela. */
  nivel: number;
  /** Níveis abaixo do artigo (0 no artigo, fora de artigo e nos nós estruturais): o recuo do texto. */
  recuo: number;
}

/**
 * As linhas na ordem de leitura. O `nome` só é dobrado no pai quando vem logo depois dele (é
 * sempre o caso na árvore do estruturador); o solto vira linha própria, sem perder o texto.
 */
export function montarLinhas(nos: readonly NoDaLeitura[]): LinhaDoLeitor[] {
  const linhas: LinhaDoLeitor[] = [];
  // Tipos dos ancestrais do nó atual (a posição é o nível): acha o artigo mais próximo.
  const cadeia: TipoDispositivo[] = [];
  nos.forEach((no, indice) => {
    const { dispositivo, nivel } = no;
    const anterior = linhas.at(-1);
    if (
      dispositivo.tipo === 'nome' &&
      anterior?.indice === indice - 1 &&
      anterior.indiceNome === undefined &&
      nos[indice - 1]?.dispositivo.id === dispositivo.paiId
    ) {
      anterior.indiceNome = indice;
      return;
    }
    cadeia.length = Math.min(cadeia.length, nivel);
    cadeia[nivel] = dispositivo.tipo;
    const artigo = cadeia.lastIndexOf('artigo');
    linhas.push({ indice, nivel, recuo: artigo < 0 ? 0 : nivel - artigo });
  });
  return linhas;
}

/** Quantos textos vêm por pedido ao repositório (`lerJanela` aceita até 200). */
export const TEXTOS_POR_PEDIDO = 50;

/**
 * Os pedidos (janelas de `TEXTOS_POR_PEDIDO` alinhadas ao início da árvore) que cobrem os nós de
 * `de` a `ate`, ambos inclusive. Janelas fixas: a mesma janela nunca é pedida por dois intervalos
 * diferentes, então rolar de volta não relê.
 */
export function janelasQueCobrem(de: number, ate: number, total: number): number[] {
  if (total <= 0) return [];
  const primeira = Math.floor(Math.max(0, de) / TEXTOS_POR_PEDIDO);
  const ultima = Math.floor(Math.min(total - 1, ate) / TEXTOS_POR_PEDIDO);
  return Array.from({ length: Math.max(0, ultima - primeira + 1) }, (_, i) => primeira + i);
}

/** Linhas de texto que cada tipo costuma ter, para estimar a altura antes de medir. */
const LINHAS_ESTIMADAS: Partial<Record<TipoDispositivo, number>> = {
  parte: 3,
  livro: 3,
  titulo: 3,
  capitulo: 2.5,
  secao: 2.5,
  subsecao: 2.5,
  bloco: 2.5,
  preambulo: 6,
  ementa: 3,
  artigo: 4,
  paragrafo: 3,
  inciso: 2,
  alinea: 2,
  item: 2,
  nome: 1,
};

/**
 * Altura de uma linha ainda não medida, em px: o texto real muda com a largura da tela e o tamanho
 * do texto; a medição do navegador corrige depois. Estimar bem evita o salto da barra de rolagem.
 */
export function estimarAltura(tipo: TipoDispositivo, tamanhoDoTexto: number): number {
  return Math.round((LINHAS_ESTIMADAS[tipo] ?? 3) * tamanhoDoTexto * 1.6 + 16);
}

/**
 * A linha que mostra o nó `indice` de `NormaAberta.nos` (9.7: abrir na posição guardada). As
 * linhas estão em ordem de `indice`; o `nome` dobrado no pai não tem linha e vale a do pai, que é
 * a última com `indice` menor. `undefined` se não há linha (norma vazia ou índice antes da 1ª).
 */
export function linhaDoNo(linhas: readonly LinhaDoLeitor[], indice: number): number | undefined {
  let baixo = 0;
  let alto = linhas.length - 1;
  let achada: number | undefined;
  while (baixo <= alto) {
    const meio = (baixo + alto) >> 1;
    if ((linhas[meio]?.indice ?? Infinity) <= indice) {
      achada = meio;
      baixo = meio + 1;
    } else {
      alto = meio - 1;
    }
  }
  return achada;
}

/**
 * "Art. 41, I", "Art. 1º, § 1º", "TÍTULO I": como o "lido até" é mostrado. Do artigo até o nó, os
 * rótulos da cadeia; fora de artigo, o rótulo do próprio nó.
 */
export function referenciaDoNo(
  nos: readonly NoDaLeitura[],
  indiceDe: ReadonlyMap<string, number>,
  indice: number,
): string {
  const rotulos: string[] = [];
  let atual: number | undefined = indice;
  while (atual !== undefined) {
    const dispositivo: NoDaLeitura['dispositivo'] | undefined = nos[atual]?.dispositivo;
    if (!dispositivo) break;
    if (dispositivo.rotulo) rotulos.unshift(dispositivo.rotulo);
    if (dispositivo.tipo === 'artigo') return rotulos.join(', ');
    atual = dispositivo.paiId === undefined ? undefined : indiceDe.get(dispositivo.paiId);
  }
  return nos[indice]?.dispositivo.rotulo ?? '';
}
