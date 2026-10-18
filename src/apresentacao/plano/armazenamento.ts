// Acesso tolerante ao armazenamento do aparelho (localStorage): sem armazenamento, com
// chave bloqueada ou com valor estragado, lê `null` e a grava é engolida — o fluxo segue,
// só não retoma de onde parou.
export function lerJson(chave: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(chave) ?? 'null');
  } catch {
    return null;
  }
}

export function gravarJson(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: o fluxo segue */
  }
}

export function apagarJson(chave: string): void {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    /* idem */
  }
}
