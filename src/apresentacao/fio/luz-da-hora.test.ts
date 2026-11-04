import { describe, expect, it } from 'vitest';
import { luzDaHora } from './luz-da-hora';

describe('luzDaHora', () => {
  it.each([
    [7, 'manha'],
    [12, 'dia'],
    [17, 'tarde'],
    [20, 'entardecer'],
    [2, 'entardecer'],
  ] as const)('às %ih é %s', (h, esperado) => {
    expect(luzDaHora(new Date(2026, 10, 4, h))).toBe(esperado);
  });
});
