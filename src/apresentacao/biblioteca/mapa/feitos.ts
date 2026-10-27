// Os trechos que a pessoa terminou lendo "seguindo o mapa", neste Aparelho. O "lido até" é um ponto só
// e a leitura pelo mapa pula de um trecho a outro, então o que ela cobriu vai à parte: ids dos
// artigos, por norma, no `localStorage` (fora do backup e da nuvem; sem armazenamento, só não conta).
const chave = (normaId: string) => `arretado.mapa.feitos.${normaId}`;

export function artigosFeitos(normaId: string): string[] {
  try {
    const lido: unknown = JSON.parse(localStorage.getItem(chave(normaId)) ?? '[]');
    return Array.isArray(lido) ? lido.filter((i): i is string => typeof i === 'string') : [];
  } catch {
    return [];
  }
}

export function registrarArtigosFeitos(normaId: string, ids: readonly string[]): void {
  try {
    localStorage.setItem(
      chave(normaId),
      JSON.stringify([...new Set([...artigosFeitos(normaId), ...ids])]),
    );
  } catch {
    /* sem armazenamento: o trecho só não entra na cobertura */
  }
}
