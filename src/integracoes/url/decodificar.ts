// Decodifica os bytes da página buscada pela rota /api/buscar-norma (T17): BOM, depois o charset
// do cabeçalho de origem, depois o da <meta> nos primeiros bytes, senão windows-1252 (o Planalto
// não declara charset). O hash fica a cargo de quem sanitiza.

const LIMITE_META = 4096;

function charsetDoTipo(tipo: string): string | null {
  return /charset\s*=\s*["']?([\w.:-]+)/i.exec(tipo)?.[1] ?? null;
}

function charsetDaMeta(bytes: Uint8Array): string | null {
  const inicio = new TextDecoder('latin1').decode(bytes.subarray(0, LIMITE_META));
  return /<meta[^>]+charset\s*=\s*["']?\s*([\w.:-]+)/i.exec(inicio)?.[1] ?? null;
}

function decodificadorDe(rotulo: string | null): TextDecoder | null {
  if (!rotulo) return null;
  try {
    return new TextDecoder(rotulo);
  } catch {
    return null;
  }
}

export function decodificarPagina(bytes: Uint8Array, tipoDeOrigem = ''): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  const decodificador =
    decodificadorDe(charsetDoTipo(tipoDeOrigem)) ??
    decodificadorDe(charsetDaMeta(bytes)) ??
    new TextDecoder('windows-1252');
  return decodificador.decode(bytes);
}
