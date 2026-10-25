// @vitest-environment node
import { compararArtigos, montarMapas } from './mapa.mjs';

describe('mapa da norma (arquivos de incidência)', () => {
  it('ordena os artigos pela leitura, com o sufixo depois do número', () => {
    expect(['181', '9', '180-A', '10', '180'].sort(compararArtigos)).toEqual([
      '9',
      '10',
      '180',
      '180-A',
      '181',
    ]);
  });

  it('monta um arquivo por item do acervo, com peso e faixa, e o índice do recorte', () => {
    const { indice, mapas, semItem, foraDoAcervo } = montarMapas(
      [
        { norma: 'cp', artigo: '157', peso: '2.5', faixa: 'Altíssima' },
        { norma: 'cp', artigo: '1', peso: '0.333', faixa: 'Alta' },
        { norma: 'cp', artigo: '180-A', peso: '1', faixa: 'Média' },
        { norma: 'cp', artigo: '5', peso: '0.1', faixa: 'Baixa' },
        { norma: 'cp', artigo: '5', peso: '0.4', faixa: 'Baixa' },
        { norma: 'lei-8069-1990', artigo: '19', peso: '1', faixa: 'Alta' },
        { norma: 'lc-87-1996', artigo: '1', peso: '1', faixa: 'Alta' },
        { norma: '???', artigo: '1', peso: '1', faixa: 'Alta' },
        { norma: 'cp', artigo: '12', peso: 'x', faixa: 'Alta' },
        { norma: 'cp', artigo: '13', peso: '1', faixa: 'Inexistente' },
      ],
      { id: 'fcc-defensor-sp', titulo: 'FCC × Defensor Público (SP)', questoes: 829 },
      (item) => item !== 'lei-complementar-federal-87-1996',
    );
    expect(mapas).toEqual([
      {
        versao: 1,
        recorte: 'fcc-defensor-sp',
        norma: 'decreto-lei-2848-1940',
        artigos: [
          ['1', 0.333, 'alta'],
          ['5', 0.4, 'baixa'],
          ['157', 2.5, 'altissima'],
          ['180-A', 1, 'media'],
        ],
      },
      {
        versao: 1,
        recorte: 'fcc-defensor-sp',
        norma: 'lei-federal-8069-1990',
        artigos: [['19', 1, 'alta']],
      },
    ]);
    expect(indice).toEqual({
      versao: 1,
      recortes: [
        {
          id: 'fcc-defensor-sp',
          titulo: 'FCC × Defensor Público (SP)',
          questoes: 829,
          normas: ['decreto-lei-2848-1940', 'lei-federal-8069-1990'],
        },
      ],
    });
    expect(semItem).toEqual(['???']);
    expect(foraDoAcervo).toEqual(['lei-complementar-federal-87-1996']);
  });
});
