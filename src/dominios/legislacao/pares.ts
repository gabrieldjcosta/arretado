// Pares de dispositivos vizinhos para o "Ache a diferença" (ideia 6 da prancha "Fio que ensina"): dois artigos da
// mesma norma que a banca costuma cobrar e que se parecem no texto (furto e roubo, por exemplo). A semelhança sai do
// próprio texto da lei que a pessoa tem no aparelho; o peso, da incidência (o pacote `public/incidencia/`). O
// que difere entre os dois sai de uma comparação de palavras. Função pura: a mesma entrada dá sempre os mesmos pares.

export interface ArtigoParaPar {
  endereco: string;
  rotulo: string;
  /** O caput, em texto corrido. */
  texto: string;
  /** Peso de incidência do artigo (0 sem dado). */
  peso: number;
}

export interface ParDeArtigos {
  a: ArtigoParaPar;
  b: ArtigoParaPar;
  /** Semelhança do texto, de 0 a 1. */
  semelhanca: number;
  /** Semelhança vezes o peso médio normalizado; ordena os pares. */
  pontos: number;
}

/** Um pedaço do texto; `difere` quando a palavra não existe do outro lado. */
export interface Pedaco {
  texto: string;
  difere: boolean;
}

const SEM_ACENTO = /[̀-ͯ]/g;
const PALAVRAS_DE_LIGACAO = new Set([
  'para',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'como',
  'qual',
  'quando',
  'onde',
  'cujo',
  'cuja',
  'esta',
  'este',
  'essa',
  'esse',
  'seja',
  'serao',
  'sera',
  'sendo',
  'todo',
  'toda',
  'todos',
  'todas',
  'outro',
  'outra',
  'mesmo',
  'mesma',
  'desde',
  'entre',
  'sobre',
  'sendo',
  'quem',
  'aqueles',
  'aquelas',
  'ainda',
  'tambem',
]);

/** Palavras com sentido, sem acento nem caixa: o que conta para dizer que dois textos se parecem. */
export function palavrasDeSentido(texto: string): Set<string> {
  const saida = new Set<string>();
  for (const p of texto
    .normalize('NFD')
    .replace(SEM_ACENTO, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)) {
    if (p.length >= 4 && !PALAVRAS_DE_LIGACAO.has(p)) saida.add(p);
  }
  return saida;
}

/** Jaccard das palavras de sentido: 1 é o mesmo texto, 0 não tem nada em comum. */
export function semelhancaDeTextos(a: string, b: string): number {
  const pa = palavrasDeSentido(a);
  const pb = palavrasDeSentido(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  let comuns = 0;
  for (const p of pa) if (pb.has(p)) comuns += 1;
  return comuns / (pa.size + pb.size - comuns);
}

const chaveDaPalavra = (p: string): string =>
  p
    .normalize('NFD')
    .replace(SEM_ACENTO, '')
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

/**
 * O que difere entre dois textos, palavra a palavra (a maior subsequência comum). Cada lado volta em pedaços que
 * somam o texto original; os pedaços vizinhos do mesmo tipo são juntados. A pontuação não conta como diferença.
 */
export function diferencaDePalavras(a: string, b: string): { a: Pedaco[]; b: Pedaco[] } {
  const pa = a.split(/(\s+)/).filter((x) => x !== '');
  const pb = b.split(/(\s+)/).filter((x) => x !== '');
  const ia = pa.map((p, i) => ({ p, i })).filter((x) => !/^\s+$/.test(x.p));
  const ib = pb.map((p, i) => ({ p, i })).filter((x) => !/^\s+$/.test(x.p));
  const n = ia.length;
  const m = ib.length;
  const tabela: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const celula = (x: number, y: number): number => tabela[x]?.[y] ?? 0;
  for (let i = n - 1; i >= 0; i--) {
    const linha = tabela[i];
    if (!linha) continue;
    for (let j = m - 1; j >= 0; j--) {
      const igual =
        chaveDaPalavra((ia[i] as { p: string }).p) === chaveDaPalavra((ib[j] as { p: string }).p);
      linha[j] = igual ? celula(i + 1, j + 1) + 1 : Math.max(celula(i + 1, j), celula(i, j + 1));
    }
  }
  const comunsA = new Set<number>();
  const comunsB = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const x = ia[i] as { p: string; i: number };
    const y = ib[j] as { p: string; i: number };
    if (chaveDaPalavra(x.p) === chaveDaPalavra(y.p)) {
      comunsA.add(x.i);
      comunsB.add(y.i);
      i += 1;
      j += 1;
    } else if (celula(i + 1, j) >= celula(i, j + 1)) i += 1;
    else j += 1;
  }
  const pedacos = (partes: string[], comuns: Set<number>): Pedaco[] => {
    const saida: Pedaco[] = [];
    partes.forEach((texto, k) => {
      const espaco = /^\s+$/.test(texto);
      // O espaço entre duas palavras que diferem faz parte do mesmo pedaço.
      const difere = espaco
        ? (saida.at(-1)?.difere ?? false) && !comuns.has(k + 1)
        : !comuns.has(k);
      const ultimo = saida.at(-1);
      if (ultimo && ultimo.difere === difere) ultimo.texto += texto;
      else saida.push({ texto, difere });
    });
    return saida;
  };
  return { a: pedacos(pa, comunsA), b: pedacos(pb, comunsB) };
}

export interface OpcoesDePares {
  /** Quantos pares no máximo. */
  maximo?: number;
  /** Abaixo disto os dois artigos não se parecem o bastante para valer o contraste. */
  semelhancaMinima?: number;
  /** Acima disto são quase o mesmo texto e a diferença é miúda demais. */
  semelhancaMaxima?: number;
  /** Menos palavras de sentido que isto: o artigo é curto demais para comparar. */
  palavrasMinimas?: number;
}

/**
 * Os pares de artigos que valem o "Ache a diferença": parecidos no texto, com incidência, cada artigo em um par só.
 * Sem peso (todos zero), o par vale pela semelhança.
 */
export function sugerirPares(
  artigos: readonly ArtigoParaPar[],
  opcoes: OpcoesDePares = {},
): ParDeArtigos[] {
  const {
    maximo = 5,
    semelhancaMinima = 0.3,
    semelhancaMaxima = 0.9,
    palavrasMinimas = 6,
  } = opcoes;
  const uteis = artigos.filter((x) => palavrasDeSentido(x.texto).size >= palavrasMinimas);
  const maior = Math.max(0, ...uteis.map((x) => x.peso));
  const candidatos: ParDeArtigos[] = [];
  for (let i = 0; i < uteis.length; i++) {
    for (let j = i + 1; j < uteis.length; j++) {
      const a = uteis[i] as ArtigoParaPar;
      const b = uteis[j] as ArtigoParaPar;
      const semelhanca = semelhancaDeTextos(a.texto, b.texto);
      if (semelhanca < semelhancaMinima || semelhanca > semelhancaMaxima) continue;
      const peso = maior > 0 ? (a.peso + b.peso) / (2 * maior) : 1;
      candidatos.push({ a, b, semelhanca, pontos: semelhanca * (0.25 + 0.75 * peso) });
    }
  }
  candidatos.sort(
    (x, y) =>
      y.pontos - x.pontos ||
      x.a.endereco.localeCompare(y.a.endereco) ||
      x.b.endereco.localeCompare(y.b.endereco),
  );
  const usados = new Set<string>();
  const saida: ParDeArtigos[] = [];
  for (const par of candidatos) {
    if (usados.has(par.a.endereco) || usados.has(par.b.endereco)) continue;
    usados.add(par.a.endereco);
    usados.add(par.b.endereco);
    saida.push(par);
    if (saida.length >= maximo) break;
  }
  return saida;
}
