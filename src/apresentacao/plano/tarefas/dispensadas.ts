// "Não agora" nas sugestões: some do dia, sem registrar falha nem guardar nada no banco. Vale só hoje.
import { gravarJson, lerJson } from '../armazenamento';

const CHAVE = 'arretado:sugestoes-dispensadas:v1';

export function lerDispensadas(hoje: string): string[] {
  const bruto = lerJson(CHAVE);
  if (typeof bruto !== 'object' || bruto === null) return [];
  const o = bruto as { data?: unknown; chaves?: unknown };
  if (o.data !== hoje || !Array.isArray(o.chaves)) return [];
  return o.chaves.filter((c): c is string => typeof c === 'string');
}

export function gravarDispensadas(hoje: string, chaves: readonly string[]): void {
  gravarJson(CHAVE, { data: hoje, chaves });
}
