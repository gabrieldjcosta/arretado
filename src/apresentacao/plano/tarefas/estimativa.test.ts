import { describe, expect, it } from 'vitest';
import { estimativaDe } from './estimativa';

describe('Tarefas: estimativa de minutos (B4)', () => {
  it('aceita número inteiro entre 1 e 600', () => {
    expect(estimativaDe('30')).toBe(30);
    expect(estimativaDe('1')).toBe(1);
    expect(estimativaDe('600')).toBe(600);
  });

  it('recusa vazio, texto e número fora da faixa', () => {
    expect(estimativaDe('')).toBeUndefined();
    expect(estimativaDe('abc')).toBeUndefined();
    expect(estimativaDe('0')).toBeUndefined();
    expect(estimativaDe('601')).toBeUndefined();
    expect(estimativaDe('-5')).toBeUndefined();
  });
});
