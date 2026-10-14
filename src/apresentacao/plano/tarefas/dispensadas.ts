// "Não agora" nas sugestões: some do dia, sem registrar falha nem guardar nada no banco. Vale só hoje.
const CHAVE = 'arretado:sugestoes-dispensadas:v1';

export function lerDispensadas(hoje: string): string[] {
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null');
    if (typeof bruto !== 'object' || bruto === null) return [];
    const o = bruto as { data?: unknown; chaves?: unknown };
    if (o.data !== hoje || !Array.isArray(o.chaves)) return [];
    return o.chaves.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}

export function gravarDispensadas(hoje: string, chaves: readonly string[]): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify({ data: hoje, chaves }));
  } catch {
    /* sem armazenamento: some só nesta tela */
  }
}
