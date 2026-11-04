import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ligarToques, tocar, toquesLigados } from './toques';

describe('toques', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('vêm desligados', () => {
    expect(toquesLigados()).toBe(false);
  });

  it('desligado não vibra', () => {
    const vibrar = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true });
    tocar('pousar');
    expect(vibrar).not.toHaveBeenCalled();
  });

  it('ligado, mas sem matchMedia (movimento reduzido por segurança), não vibra', () => {
    const vibrar = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true });
    ligarToques(true);
    expect(toquesLigados()).toBe(true);
    tocar('pousar');
    expect(vibrar).not.toHaveBeenCalled();
  });

  it('ligado e com movimento normal, o pouso vibra uma vez', () => {
    const vibrar = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    ligarToques(true);
    tocar('pousar');
    expect(vibrar).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
