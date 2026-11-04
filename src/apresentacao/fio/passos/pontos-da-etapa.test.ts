import { describe, expect, it } from 'vitest';
import { assuntoDe } from './pontos-da-etapa';

describe('assuntoDe', () => {
  it('deixa inteiro o que cabe e tira a pontuação do fim', () => {
    expect(assuntoDe('A execução penal tem por objetivo efetivar as disposições.')).toBe(
      'A execução penal tem por objetivo efetivar as disposições',
    );
  });

  it('corta numa palavra inteira, com reticências, e junta espaços', () => {
    const texto =
      'A jurisdição   penal dos juízes ou tribunais da justiça ordinária, em todo o território nacional, será exercida na forma desta lei';
    const saida = assuntoDe(texto);
    expect(saida.endsWith('…')).toBe(true);
    expect(saida.length).toBeLessThanOrEqual(65);
    expect(texto.replace(/\s+/g, ' ')).toContain(saida.slice(0, -1));
    expect(saida).not.toMatch(/\s{2}/);
  });
});
