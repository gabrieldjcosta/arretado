// Decodificação do cliente (T17) sobre páginas do corpus: Planalto sem charset (windows-1252) e
// ALESP com <meta charset=UTF-8>. O corpus é lido por faixa/partes, nunca impresso.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodificarPagina } from '../src/integracoes/url/decodificar';

const pagina = (id: string) =>
  new Uint8Array(readFileSync(join(process.cwd(), 'corpus', 'normas', `${id}.html`)));

describe('decodificarPagina', () => {
  it.each(['lep', 'cdc', 'cf'])('%s (Planalto, sem charset) cai em windows-1252', (id) => {
    const bytes = pagina(id);
    expect(new TextDecoder('latin1').decode(bytes.subarray(0, 4096))).not.toMatch(/charset/i);
    const texto = decodificarPagina(bytes, 'text/html');
    expect(texto).not.toContain('�');
    expect(texto).toMatch(/Disposi[çc][õo]es|Art\. 1º/);
    expect(texto).toMatch(/ç|ã|é/);
  });

  it('lc-sp-988 (ALESP) obedece à <meta charset=UTF-8>', () => {
    const bytes = pagina('lc-sp-988');
    const texto = decodificarPagina(bytes);
    expect(texto).not.toContain('�');
    expect(texto).not.toMatch(/Ã§|Ã£|Ã©/);
    expect(texto).toContain('charset=UTF-8');
  });

  it('o charset do cabeçalho de origem vale mais que a meta', () => {
    const bytes = new TextEncoder().encode('<meta charset="utf-8">ç');
    expect(decodificarPagina(bytes, 'text/html; charset=iso-8859-1')).toContain('Ã§');
  });

  it('meta http-equiv e BOM; rótulo desconhecido cai em windows-1252', () => {
    const meta = new TextEncoder().encode(
      '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">ç',
    );
    expect(decodificarPagina(meta)).toContain('ç');
    expect(decodificarPagina(new Uint8Array([0xef, 0xbb, 0xbf, 0xc3, 0xa7]))).toBe('ç');
    expect(decodificarPagina(new Uint8Array([0xe7]), 'text/html; charset=xpto')).toBe('ç');
    expect(decodificarPagina(new Uint8Array([0xe7, 0xe3]))).toBe('çã');
  });
});
