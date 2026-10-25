export const VERSAO_DO_MAPA: 1;
export function compararArtigos(a: string, b: string): number;
export interface RecorteDoMapa {
  id: string;
  titulo: string;
  questoes?: number;
  periodo?: string;
}
export interface MapaGerado {
  versao: 1;
  recorte: string;
  norma: string;
  artigos: [string, number, 'altissima' | 'alta' | 'media' | 'baixa'][];
}
export function montarMapas(
  linhas: ReadonlyArray<{ norma: string; artigo: string; peso: string | number; faixa: string }>,
  recorte: RecorteDoMapa,
  existe?: (item: string) => boolean,
): {
  indice: {
    versao: 1;
    recortes: {
      id: string;
      titulo: string;
      questoes?: number;
      periodo?: string;
      normas: string[];
    }[];
  };
  mapas: MapaGerado[];
  semItem: string[];
  foraDoAcervo: string[];
};
