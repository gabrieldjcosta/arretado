import { describe, expect, it } from 'vitest';
import type { EstadoDaEstrela } from '../../dominios/legislacao/estrelas';
import { mostrarBotaoDaEstrela } from './botaoDaEstrela';

const direta: EstadoDaEstrela = { estrelado: true, origem: 'direta' };
const herdada: EstadoDaEstrela = { estrelado: true, origem: 'herdada', deId: 'n1' };
const excecao: EstadoDaEstrela = { estrelado: false, origem: 'excecao', deId: 'n1' };
const sem: EstadoDaEstrela = { estrelado: false };

describe('botão da estrela (peça 1)', () => {
  it('a estrela direta sempre aparece', () => {
    expect(mostrarBotaoDaEstrela(direta, false)).toBe(true);
    expect(mostrarBotaoDaEstrela(direta, true)).toBe(true);
  });

  it('herdada, exceção e sem estrela só aparecem na linha ativa', () => {
    for (const estado of [herdada, excecao, sem]) {
      expect(mostrarBotaoDaEstrela(estado, false)).toBe(false);
      expect(mostrarBotaoDaEstrela(estado, true)).toBe(true);
    }
  });
});
