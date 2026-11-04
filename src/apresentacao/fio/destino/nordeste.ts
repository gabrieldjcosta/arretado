// Os dados do mapa do Destino (D-D25): o Nordeste de verdade, em coordenadas do desenho (x para a
// direita, y para baixo, projeção equiretangular a 9° de latitude). Fonte: malha estadual do IBGE (via
// click_that_hood), simplificada e projetada pela Marca; os lugares e as fichas vêm da pesquisa dela
// (`nordeste-lugares.md`), que ainda precisa da conferência do Gabriel. O JSON (66 kB, 26 kB comprimido)
// só entra no pedaço do pacote que desenha o mapa (`MapaDoNordeste`), carregado quando a pessoa abre o Destino.

/** Os nove estados do Nordeste, na ordem da jornada: uma matéria do Ciclo para cada um. */
export const ORDEM_UF = ['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'] as const;
export type Uf = (typeof ORDEM_UF)[number];

/** Um lugar da jornada (um município da pesquisa), na ordem em que o caminho passa por ele. */
export interface LugarDoMapa {
  n: string;
  uf: Uf;
  x: number;
  y: number;
  /** A ficha: por que o lugar importa. Rascunho da pesquisa até o Gabriel conferir. */
  porque: string;
  /** O caso ou assunto jurídico ligado ao lugar, quando há. */
  caso?: string;
}

export interface EstadoDoMapa {
  nome: string;
  /** O contorno, em caminho SVG. */
  d: string;
  /** Onde fica o nome no estado. */
  c: readonly [number, number];
}

export interface DadosDoNordeste {
  /** x, y, largura e altura do desenho todo. */
  caixa: readonly [number, number, number, number];
  estados: Readonly<Record<Uf, EstadoDoMapa>>;
  /** O resto do Brasil em volta, só o contorno, que esmaece com a distância. */
  resto: readonly string[];
  ordem: readonly LugarDoMapa[];
}
