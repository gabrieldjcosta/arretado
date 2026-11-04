import { escolherTexto, vozRegionalPermitida } from './voz';

describe('voz regional', () => {
  it('Calmo e perfil ausente nunca recebem o sotaque', () => {
    expect(vozRegionalPermitida(undefined)).toBe(false);
    expect(vozRegionalPermitida({})).toBe(false);
    expect(vozRegionalPermitida({ perfilDeEstudo: 'calmo' })).toBe(false);
    expect(vozRegionalPermitida({ perfilDeEstudo: 'guiado' })).toBe(true);
    expect(vozRegionalPermitida({ perfilDeEstudo: 'leitura' })).toBe(true);
  });

  it('permitida: sorteio abaixo de 1/3 usa o regional; acima, o neutro', () => {
    expect(escolherTexto('fimDeRodada', { permitida: true, sorteio: 0.1 })).toBe(
      'Danado de bom! Rodada feita.',
    );
    expect(escolherTexto('fimDeRodada', { permitida: true, sorteio: 0.5 })).toBe('Feito.');
  });

  it('permitida: as vezes sem sotaque repartem-se entre palavras neutras, sempre dentro da lista', () => {
    const vistas = new Set<string>();
    for (const sorteio of [0.34, 0.6, 0.99]) {
      vistas.add(escolherTexto('fimDeRodada', { permitida: true, sorteio }));
    }
    expect(vistas).toEqual(new Set(['Feito.', 'Pronto.', 'Rodada fechada.']));
  });

  it('Calmo nunca varia as palavras: o neutro, sempre', () => {
    for (const sorteio of [0, 0.5, 0.99]) {
      expect(escolherTexto('fimDeRodada', { permitida: false, sorteio })).toBe('Feito.');
    }
  });

  it('não permitida: sempre o neutro', () => {
    expect(escolherTexto('diaFechado', { permitida: false, sorteio: 0 })).toBe('Dia fechado');
  });
});
