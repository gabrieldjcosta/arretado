export type EstadoDoArmazenamento = 'persistente' | 'temporario' | 'indisponivel';

interface ApiDeArmazenamento {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

/**
 * Pede ao navegador que não apague o IndexedDB sob pouco espaço (e, no Safari, que não o limpe
 * após dias sem uso). Local-first: os dados só existem aqui até a F4. Nunca lança; o resultado
 * é informativo (a tela de Dados pode mostrar "salvo neste aparelho" × "sujeito a limpeza").
 */
export async function pedirArmazenamentoPersistente(
  api: ApiDeArmazenamento | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.storage,
): Promise<EstadoDoArmazenamento> {
  if (!api?.persist || !api.persisted) return 'indisponivel';
  try {
    if (await api.persisted()) return 'persistente';
    return (await api.persist()) ? 'persistente' : 'temporario';
  } catch {
    return 'indisponivel';
  }
}
