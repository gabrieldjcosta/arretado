import { describe, expect, it } from 'vitest';
import { proximaLeituraFunda } from './leitura-funda';

describe('proximaLeituraFunda', () => {
  it('recolhe depois de descer o bastante', () => {
    expect(proximaLeituraFunda(false, 400, 20)).toBe(false);
    expect(proximaLeituraFunda(false, 400, 60)).toBe(true);
  });
  it('volta ao subir um pouco', () => {
    expect(proximaLeituraFunda(true, 400, -5)).toBe(true);
    expect(proximaLeituraFunda(true, 400, -20)).toBe(false);
  });
  it('perto do alto sempre aparece', () => {
    expect(proximaLeituraFunda(true, 30, 100)).toBe(false);
  });
});
