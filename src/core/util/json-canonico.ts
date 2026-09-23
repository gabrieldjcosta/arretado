/**
 * JSON com chaves ordenadas e sem `undefined`: mesma entrada lógica, mesmo texto.
 * Base de comparação de registros e dos hashes de conteúdo do pacote.
 */
export function jsonCanonico(valor: unknown): string {
  return JSON.stringify(ordenar(valor));
}

function ordenar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => (x === undefined ? null : ordenar(x)));
  if (v !== null && typeof v === 'object' && !(v instanceof Uint8Array)) {
    const saida: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) saida[k] = ordenar(x);
    }
    return saida;
  }
  return v;
}

export function iguais(a: unknown, b: unknown): boolean {
  return jsonCanonico(a) === jsonCanonico(b);
}
