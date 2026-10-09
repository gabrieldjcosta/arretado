// @vitest-environment node
import { lerTemas, medir, razao } from './contraste.mjs';

describe('contraste dos tokens (AA nos dois temas)', () => {
  const { claro, escuroSistema, escuroManual } = lerTemas();

  it('a razão WCAG bate com os valores de referência', () => {
    expect(razao({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(21, 5);
    expect(razao({ r: 119, g: 119, b: 119, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(
      4.48,
      1,
    );
  });

  it('o escuro por preferência do sistema tem os mesmos valores do escuro manual', () => {
    expect(escuroSistema).toEqual(escuroManual);
  });

  it.each([
    ['claro', claro],
    ['escuro', { ...claro, ...escuroManual }],
  ])('todos os pares passam no tema %s', (_nome, tema) => {
    const reprovados = medir(tema).filter((l) => !l.ok);
    expect(reprovados.map((l) => `${l.fg}/${l.bg} ${l.valor.toFixed(2)}<${l.minimo}`)).toEqual([]);
  });
});
