import { describe, expect, it } from 'vitest';
import { rotuloDoCampo, valorEmTexto } from './campos';

describe('campos do Conflito em palavras', () => {
  it('rotula o campo pelo mapa ou separando o camelCase', () => {
    expect(rotuloDoCampo('fraseCorreta')).toBe('Frase correta');
    expect(rotuloDoCampo('modulosDesabilitados')).toBe('Módulos desligados');
    expect(rotuloDoCampo('campoInventadoAqui')).toBe('Campo inventado aqui');
    expect(rotuloDoCampo('titulo')).toBe('Título');
  });

  it('escreve o valor sem código', () => {
    expect(valorEmTexto([])).toBe('nenhum');
    expect(valorEmTexto(['a', 'b'])).toBe('a, b');
    expect(valorEmTexto([{ x: 1 }, { x: 2 }])).toBe('2 itens');
    expect(valorEmTexto(null)).toBe('vazio');
    expect(valorEmTexto('')).toBe('vazio');
    expect(valorEmTexto(undefined)).toBe('sem valor');
    expect(valorEmTexto(true)).toBe('sim');
    expect(valorEmTexto(false)).toBe('não');
    expect(valorEmTexto(3)).toBe('3');
    expect(valorEmTexto({})).toBe('nada');
    expect(valorEmTexto({ inicio: 'x', fim: null })).toBe('Início: x; Fim: vazio');
  });
});
