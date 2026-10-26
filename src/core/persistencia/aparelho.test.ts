import { describe, expect, it } from 'vitest';
import { nomeDaPlataforma } from './aparelho';

describe('nomeDaPlataforma', () => {
  it('distingue celular, tablet e computador pelo userAgent', () => {
    expect(
      nomeDaPlataforma('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Mobile Safari'),
    ).toBe('Celular Android');
    expect(nomeDaPlataforma('Mozilla/5.0 (Linux; Android 14; SM-X700) AppleWebKit/537.36')).toBe(
      'Tablet Android',
    );
    expect(nomeDaPlataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      'iPhone',
    );
    expect(nomeDaPlataforma('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('iPad');
    expect(nomeDaPlataforma('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'Computador com Windows',
    );
    expect(nomeDaPlataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('Mac');
    expect(nomeDaPlataforma('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)')).toBe('Chromebook');
    expect(nomeDaPlataforma('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Computador com Linux');
    expect(nomeDaPlataforma('desconhecida')).toBe('Aparelho');
  });
});
