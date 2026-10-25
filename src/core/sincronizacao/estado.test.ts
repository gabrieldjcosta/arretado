import { describe, expect, it } from 'vitest';
import { estadoDaSincronizacao, ROTULO_DO_ESTADO } from './estado';

const ok = { ok: true, em: '2026-10-25T12:00:00.000Z' };

describe('estadoDaSincronizacao (os três estados da tela)', () => {
  it('com algo a enviar é "Salvo neste aparelho", mesmo depois de uma rodada boa', () => {
    expect(estadoDaSincronizacao({ pendentes: 2, ultimaRodada: ok, conflitos: 0 })).toBe('salvo');
  });
  it('tudo enviado e a última rodada boa, sem Conflito: "Igual nos seus aparelhos"', () => {
    expect(estadoDaSincronizacao({ pendentes: 0, ultimaRodada: ok, conflitos: 0 })).toBe('igual');
  });
  it('tudo enviado mas sem rodada boa (ou nenhuma), ou com Conflito aberto: "Enviado à conta"', () => {
    expect(estadoDaSincronizacao({ pendentes: 0, ultimaRodada: null, conflitos: 0 })).toBe(
      'enviado',
    );
    expect(
      estadoDaSincronizacao({ pendentes: 0, ultimaRodada: { ...ok, ok: false }, conflitos: 0 }),
    ).toBe('enviado');
    expect(estadoDaSincronizacao({ pendentes: 0, ultimaRodada: ok, conflitos: 1 })).toBe('enviado');
    expect(
      estadoDaSincronizacao({ pendentes: 0, ultimaRodada: ok, conflitos: 0, emQuarentena: 1 }),
    ).toBe('enviado');
  });
  it('cada estado tem palavra na tela', () => {
    expect(Object.keys(ROTULO_DO_ESTADO).sort()).toEqual(['enviado', 'igual', 'salvo']);
  });
});
