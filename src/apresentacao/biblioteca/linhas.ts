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

/**
 * "art. 9º-A, LEP", "art. 5º, LXXIV, CF": a referência de citar ("art." em minúsculas, com o título curto
 * da norma), a que vai para a área de transferência e para o erro e o cartão. Sem rótulo na cadeia
 * (o preâmbulo), só o título curto.
 */
export function referenciaDe(
  nos: readonly NoDaLeitura[],
  indiceDe: ReadonlyMap<string, number>,
  indice: number,
  tituloCurto: string,
): string {
  const rotulo = referenciaDoNo(nos, indiceDe, indice);
  if (!rotulo) return tituloCurto;
  // "Art. 9º-A" vira "art. 9º-A"; "TÍTULO I" (fora de artigo) fica como está.
  const citacao = rotulo.startsWith('Art.') ? 'art.' + rotulo.slice(4) : rotulo;
  return `${citacao}, ${tituloCurto}`;
}

/**
 * As unidades do artigo por artigo (11.8): cada uma começa numa linha normativa fora de qualquer
 * artigo (o artigo, o preâmbulo, a ementa) e vai até a próxima linha de recuo 0 (o próximo artigo ou
 * um título, capítulo…). Os números são linhas de `linhas`, ou seja, já valem com o filtro.
 */
export function unidadesDeLeitura(
  linhas: readonly LinhaDoLeitor[],
  nos: readonly NoDaLeitura[],
): number[] {
  const inicios: number[] = [];
  linhas.forEach((linha, i) => {
    if (linha.recuo === 0 && nos[linha.indice]?.dispositivo.categoria !== 'estrutural') {
      inicios.push(i);
    }
  });
  return inicios;
}

/** Onde a unidade `ordem` termina (exclusive): a próxima linha de recuo 0, ou o fim das linhas. */
export function fimDaUnidade(
  linhas: readonly LinhaDoLeitor[],
  unidades: readonly number[],
  ordem: number,
): number {
  const inicio = unidades[ordem];
  if (inicio === undefined) return 0;
  for (let i = inicio + 1; i < linhas.length; i++) {
    if (linhas[i]?.recuo === 0) return i;
  }
  return linhas.length;
}

/**
 * A unidade que mostra a linha `linha`: a que a contém; um título ou capítulo (que não está em
 * unidade nenhuma) vale o primeiro artigo abaixo dele, ou o último se não há mais nenhum.
 * `undefined` se não há unidade (norma sem artigo, ou o filtro só deixou títulos).
 */
export function unidadeDaLinha(
  linhas: readonly LinhaDoLeitor[],
  unidades: readonly number[],
  linha: number,
): number | undefined {
  if (unidades.length === 0) return undefined;
  let ordem = -1;
  for (let i = 0; i < unidades.length; i++) {
    if ((unidades[i] ?? Infinity) <= linha) ordem = i;
    else break;
  }
  if (ordem >= 0 && linha < fimDaUnidade(linhas, unidades, ordem)) return ordem;
  return Math.min(ordem + 1, unidades.length - 1);
}

/**
 * Os blocos (título, capítulo, seção…) que contêm o nó, do mais alto ao mais baixo: o contexto
 * discreto do cartão. Índices em `NormaAberta.nos`.
 */
export function blocosAcima(
  nos: readonly NoDaLeitura[],
  indiceDe: ReadonlyMap<string, number>,
  indice: number,
): number[] {
  const acima: number[] = [];
  let atual = nos[indice]?.dispositivo.paiId;
  while (atual !== undefined) {
    const i = indiceDe.get(atual);
    const dispositivo = i === undefined ? undefined : nos[i]?.dispositivo;
    if (i === undefined || !dispositivo) break;
    if (dispositivo.categoria === 'estrutural') acima.unshift(i);
    atual = dispositivo.paiId;
  }
  return acima;
}
