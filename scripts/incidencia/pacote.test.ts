import { itemDoAcervo, montarPacote } from './pacote.mjs';

describe('pacote de incidência', () => {
  it('traduz a norma da tabela para o item do acervo', () => {
    expect(itemDoAcervo('lei-8069-1990')).toBe('lei-federal-8069-1990');
    expect(itemDoAcervo('lc-80-1994')).toBe('lei-complementar-federal-80-1994');
    expect(itemDoAcervo('cf')).toBe('constituicao-1988');
    expect(itemDoAcervo('???')).toBeNull();
  });

  it('leva só as faixas pedidas e relata a norma sem item', () => {
    const { pacote, ignoradas } = montarPacote(
      [
        { norma: 'cf', artigo: '5', faixa: 'Altíssima' },
        { norma: 'cf', artigo: '6', faixa: 'Baixa' },
        { norma: 'lei-8069-1990', artigo: '19', faixa: 'Alta' },
        { norma: 'x', artigo: '1', faixa: 'Alta' },
      ],
      { id: 'p', titulo: 'T' },
    );
    expect(pacote.normas).toEqual({
      'constituicao-1988': ['5'],
      'lei-federal-8069-1990': ['19'],
    });
    expect(ignoradas).toEqual(['x']);
  });
});
