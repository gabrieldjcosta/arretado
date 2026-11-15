// A estrutura da norma (Ponto de luz, P4): os blocos (parte, livro, título, capítulo, seção…) como
// um sumário que acompanha a leitura. Contas puras sobre a árvore em ordem de leitura (`nos`); o
// painel (`EstruturaDaNorma`) só desenha o que sai daqui.
import type { TextoDeDispositivo } from '../../core/modelo';
import type { NoDaLeitura } from '../../dominios/legislacao/leitor';
import type { EstadoDoPonto } from '../componentes/PontoDeLuz';

/**
 * O nó é um bloco da estrutura: estrutural, com rótulo, e não a rubrica (`nome`) de outro nó. O
 * bloco sem rótulo (o trecho que um título solto abre, sem numeração) não entra no sumário.
 */
export function ehBloco(no: NoDaLeitura): boolean {
  const { categoria, tipo, rotulo } = no.dispositivo;
  return categoria === 'estrutural' && tipo !== 'nome' && !!rotulo;
}

/** O estado do bloco em palavras, para o leitor de tela (o ponto é só desenho). */
export const ESTADO_POR_EXTENSO: Record<EstadoDoPonto, string> = {
  feito: 'lida',
  atual: 'em leitura',
  falta: 'ainda não lida',
};

/** `-1` guarda a raiz: os blocos que não estão dentro de outro. */
export const RAIZ = -1;

export interface IndiceDaEstrutura {
  /** O bloco mais fundo que contém cada nó (o próprio nó, se for bloco); `RAIZ` fora de bloco. */
  readonly dentroDe: Int32Array;
  /** Onde cada bloco termina (exclusive, índice de nó): o próximo nó de nível igual ou menor. */
  readonly fim: Int32Array;
  /**
   * O último nó de cada bloco que o "lido até" alcança: o último dele, a menos que seja a rubrica
   * dobrada no nó de antes (o "lido até" marca o dispositivo, nunca a rubrica).
   */
  readonly ultimo: Int32Array;
  /** O bloco que contém cada bloco (`RAIZ` no de cima). */
  readonly pai: Int32Array;
  /** Os blocos de dentro de cada bloco (ou da raiz, em `RAIZ`), em ordem de leitura. */
  readonly filhos: ReadonlyMap<number, readonly number[]>;
}

/** O último nó marcável de um trecho que termina em `fim` (exclusive): a rubrica dobrada vale o pai. */
function ultimoMarcavel(nos: readonly NoDaLeitura[], fim: number): number {
  const ultimo = fim - 1;
  const rubrica = nos[ultimo]?.dispositivo;
  return rubrica?.tipo === 'nome' && nos[ultimo - 1]?.dispositivo.id === rubrica.paiId
    ? ultimo - 1
    : ultimo;
}

/**
 * O índice da estrutura, numa passada. O nível (`nivel`) é a profundidade da árvore em ordem de
 * leitura: o que vem depois de um bloco com nível maior que o dele está dentro dele.
 */
export function indiceDaEstrutura(nos: readonly NoDaLeitura[]): IndiceDaEstrutura {
  const dentroDe = new Int32Array(nos.length).fill(RAIZ);
  const fim = new Int32Array(nos.length).fill(nos.length);
  const pai = new Int32Array(nos.length).fill(RAIZ);
  const filhos = new Map<number, number[]>();
  // Os blocos abertos, do mais alto ao mais fundo.
  const aberta: number[] = [];
  nos.forEach((no, i) => {
    // O nó de nível igual ou menor que o do bloco de cima encerra esse bloco.
    for (let topo = aberta.at(-1); topo !== undefined; topo = aberta.at(-1)) {
      if ((nos[topo]?.nivel ?? 0) < no.nivel) break;
      fim[topo] = i;
      aberta.pop();
    }
    const contido = aberta.at(-1) ?? RAIZ;
    if (ehBloco(no)) {
      pai[i] = contido;
      const irmaos = filhos.get(contido);
      if (irmaos) irmaos.push(i);
      else filhos.set(contido, [i]);
      aberta.push(i);
      dentroDe[i] = i;
    } else {
      dentroDe[i] = contido;
    }
  });
  const ultimo = Int32Array.from(fim, (f, i) => (dentroDe[i] === i ? ultimoMarcavel(nos, f) : i));
  return { dentroDe, fim, ultimo, pai, filhos };
}

/**
 * O nó que guarda o nome do bloco: a rubrica dobrada nele (o `nome` logo depois) ou, no anexo e no
 * bloco solto, ele mesmo.
 */
export function noDoNome(nos: readonly NoDaLeitura[], bloco: number): number {
  const proximo = nos[bloco + 1]?.dispositivo;
  return proximo?.tipo === 'nome' && proximo.paiId === nos[bloco]?.dispositivo.id
    ? bloco + 1
    : bloco;
}

/** O nome do bloco, em texto corrido, a partir do texto do nó que o guarda; vazio se ele não chegou. */
export function nomeDoTexto(texto: TextoDeDispositivo | undefined): string {
  return (
    texto?.trechos
      .map((t) => t.texto)
      .join('')
      .trim() ?? ''
  );
}

/** Um bloco do sumário inteiro: o índice do nó e quantos blocos há acima dele. */
export interface BlocoDoSumario {
  bloco: number;
  nivel: number;
}

/**
 * Todos os blocos da norma, na ordem de leitura, cada um com a sua profundidade: o sumário inteiro,
 * que o celular abre numa folha (lá não cabe o painel ao lado do texto).
 */
export function blocosEmOrdem(indice: IndiceDaEstrutura): BlocoDoSumario[] {
  const blocos: BlocoDoSumario[] = [];
  const descer = (pai: number, nivel: number) => {
    for (const bloco of indice.filhos.get(pai) ?? []) {
      blocos.push({ bloco, nivel });
      descer(bloco, nivel + 1);
    }
  };
  descer(RAIZ, 0);
  return blocos;
}

/** A norma tem estrutura para mostrar (ao menos um bloco). */
export function temEstrutura(indice: IndiceDaEstrutura): boolean {
  return (indice.filhos.get(RAIZ)?.length ?? 0) > 0;
}

/** Um bloco da lista e, só no bloco de agora, os blocos de dentro dele. */
export interface ItemDaVista {
  bloco: number;
  dentro: readonly number[];
}

export interface VistaDaEstrutura {
  /** Os blocos que levam à lista, do mais alto ao mais fundo (o caminho até aqui). */
  acima: readonly number[];
  /** Os blocos listados (o bloco de agora e os irmãos dele), em ordem de leitura. */
  itens: readonly ItemDaVista[];
  /** O bloco em que a leitura está; sem ele, a leitura ainda não chegou ao primeiro bloco. */
  aqui: number | undefined;
}

/** O caminho da raiz até o bloco, ele incluído (vazio em `RAIZ`). */
function caminhoAte(indice: IndiceDaEstrutura, bloco: number): number[] {
  const caminho: number[] = [];
  for (let b = bloco; b !== RAIZ; b = indice.pai[b] ?? RAIZ) caminho.unshift(b);
  return caminho;
}

/**
 * O que o sumário mostra com a leitura no nó `no`: o bloco mais fundo que o contém e os irmãos
 * dele (as outras seções do capítulo), ele marcado como o de agora, com os blocos de dentro dele logo
 * abaixo (as seções, se ele é um capítulo) e o caminho até a lista acima. Subir um nível é tocar no
 * caminho: o bloco de lá passa a ser o de agora, e a lista, a dos irmãos dele. Antes do primeiro
 * bloco, os de cima, sem nenhum de agora. A lista só muda quando a leitura passa para outro bloco,
 * não a cada nó.
 */
export function vistaDaEstrutura(indice: IndiceDaEstrutura, no: number): VistaDaEstrutura {
  const aqui = indice.dentroDe[no] ?? RAIZ;
  const semDentro: readonly number[] = [];
  if (aqui === RAIZ) {
    const topo = indice.filhos.get(RAIZ) ?? [];
    return {
      acima: [],
      itens: topo.map((bloco) => ({ bloco, dentro: semDentro })),
      aqui: undefined,
    };
  }
  const pai = indice.pai[aqui] ?? RAIZ;
  const irmaos = indice.filhos.get(pai) ?? [aqui];
  return {
    acima: caminhoAte(indice, pai),
    itens: irmaos.map((bloco) => ({
      bloco,
      dentro: bloco === aqui ? (indice.filhos.get(aqui) ?? semDentro) : semDentro,
    })),
    aqui,
  };
}

/**
 * O estado do bloco pelo "lido até" (índice de nó): feito se o "lido até" chegou ao último nó dele
 * (sem a rubrica que fecha o bloco: ela é do dispositivo de antes), atual se está dentro dele, falta
 * se ainda não chegou. Sem "lido até", falta.
 */
export function estadoDoBloco(
  indice: IndiceDaEstrutura,
  bloco: number,
  lidoAte: number | undefined,
): EstadoDoPonto {
  if (lidoAte === undefined || lidoAte < bloco) return 'falta';
  return lidoAte >= (indice.ultimo[bloco] ?? bloco) ? 'feito' : 'atual';
}
