// Diferença por palavra entre o texto de antes e o de agora ("A lei mudou", AP-05). Pura. O que sai
// aparece só no antes; o que entra, só no agora. Textos longos (acima do limite de palavras) viram
// um bloco inteiro que saiu e outro que entrou, para o custo quadrático não pesar.
export type TrechoDoDiff = { texto: string; tipo: 'igual' | 'sai' | 'entra' };

const LIMITE_DE_PALAVRAS = 1_500;

const palavras = (t: string): string[] => t.match(/\s+|[^\s]+/g) ?? [];

export function diffPorPalavra(antes: string, agora: string): TrechoDoDiff[] {
  const a = palavras(antes);
  const b = palavras(agora);
  if (a.length > LIMITE_DE_PALAVRAS || b.length > LIMITE_DE_PALAVRAS) {
    return [
      ...(antes === '' ? [] : [{ texto: antes, tipo: 'sai' as const }]),
      ...(agora === '' ? [] : [{ texto: agora, tipo: 'entra' as const }]),
    ];
  }
  // Maior subsequência comum, por programação dinâmica (de trás para frente).
  const m = Array.from({ length: a.length + 2 }, () => new Array<number>(b.length + 2).fill(0));
  const ler = (i: number, j: number) => m[i]?.[j] ?? 0;
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const linha = m[i];
      if (linha)
        linha[j] = a[i] === b[j] ? ler(i + 1, j + 1) + 1 : Math.max(ler(i + 1, j), ler(i, j + 1));
    }
  }
  const saida: TrechoDoDiff[] = [];
  const somar = (texto: string, tipo: TrechoDoDiff['tipo']) => {
    const ultimo = saida[saida.length - 1];
    if (ultimo?.tipo === tipo) ultimo.texto += texto;
    else saida.push({ texto, tipo });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      somar(a[i] ?? '', 'igual');
      i++;
      j++;
    } else if (j < b.length && (i === a.length || ler(i, j + 1) >= ler(i + 1, j))) {
      somar(b[j] ?? '', 'entra');
      j++;
    } else {
      somar(a[i] ?? '', 'sai');
      i++;
    }
  }
  return saida;
}
