import { describe, expect, it } from 'vitest';
import { FalhaDeSincronizacao } from '../../core/sincronizacao';
import { pontoDaPodaDaResposta, traduzirFalhaDeEnvio } from './supabase';

describe('traduzirFalhaDeEnvio', () => {
  it.each([400, 409, 422])('%i é recusa definitiva', (status) => {
    expect(traduzirFalhaDeEnvio(status).definitiva).toBe(true);
  });
  it.each([0, 401, 403, 429, 500, 503])('%i tenta de novo', (status) => {
    expect(traduzirFalhaDeEnvio(status).definitiva).toBe(false);
  });
});

describe('pontoDaPodaDaResposta (B5)', () => {
  it('lê o ponto que o servidor devolve', () => {
    expect(pontoDaPodaDaResposta({ data: 42, error: null })).toBe(42);
    expect(pontoDaPodaDaResposta({ data: null, error: null })).toBe(0);
  });
  it('servidor sem a migração do B5 (função ausente): nada foi podado', () => {
    expect(pontoDaPodaDaResposta({ data: null, error: { code: 'PGRST202' } })).toBe(0);
  });
  it('outra falha continua derrubando a rodada (o agendador repete)', () => {
    expect(() => pontoDaPodaDaResposta({ data: null, error: { code: '42501' } })).toThrow(
      FalhaDeSincronizacao,
    );
  });
});
