import { describe, expect, it } from 'vitest';
import { traduzirFalhaDeEnvio } from './supabase';

describe('traduzirFalhaDeEnvio', () => {
  it.each([400, 409, 422])('%i é recusa definitiva', (status) => {
    expect(traduzirFalhaDeEnvio(status).definitiva).toBe(true);
  });
  it.each([0, 401, 403, 429, 500, 503])('%i tenta de novo', (status) => {
    expect(traduzirFalhaDeEnvio(status).definitiva).toBe(false);
  });
});
