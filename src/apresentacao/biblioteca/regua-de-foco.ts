// Régua de foco do Leitor (pedido do Gabriel, 05/11/2026): só a frase em leitura fica acesa; o
// resto do texto esmaece, sem sair do lugar. Aqui, a parte pura: onde cada frase começa e termina
// no texto vigente do dispositivo (os mesmos offsets dos grifos e dos destaques).

/** Uma frase: `[inicio, fim)` em unidades de código do texto vigente, sem os espaços das pontas. */
export interface Frase {
  inicio: number;
  fim: number;
}

/** Palavras que terminam em ponto sem fechar a frase ("Art.", "inc.", "nº."). */
const ABREVIACOES = new Set([
  'art',
  'arts',
  'inc',
  'incs',
  'par',
  'n',
  'nº',
  'nos',
  'cf',
  'p',
  'pp',
  'ss',
  'ex',
  'v',
  'vs',
  'dr',
  'sr',
  'min',
  'rel',
  'des',
  'fls',
  'al',
  'c',
  'cap',
  'seç',
  'sec',
  'dec',
  'obs',
  'res',
]);

const FECHA = /["'”’)\]]/;
const ABRE = /["“'‘([]/;
const COMECA_FRASE = /[\p{Lu}\p{N}"“'‘(§[]/u;

function palavraAntes(texto: string, ponto: number): string {
  let i = ponto;
  while (i > 0 && /[\p{L}\p{N}º°ª]/u.test(texto[i - 1] ?? '')) i--;
  return texto.slice(i, ponto).toLowerCase();
}

/**
 * O que está entre parênteses que abrem e fecham na mesma linha: lá dentro nada fecha a frase
 * ("(salvo se houver recurso; nesse caso, 60 dias)", "(art. 66, III; art. 68)"). O parêntese sem par
 * não segura nada: a alínea "a)" e o que abre e não fecha ficam como texto comum.
 */
function entreParenteses(texto: string): boolean[] {
  const dentro = new Array<boolean>(texto.length).fill(false);
  const abertos: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '\n') abertos.length = 0;
    else if (c === '(') abertos.push(i);
    else if (c === ')') {
      const abre = abertos.pop();
      // Só o de fora marca: cada posição é marcada uma vez, e a conta segue linear.
      if (abre !== undefined && abertos.length === 0) dentro.fill(true, abre + 1, i);
    }
  }
  return dentro;
}

/**
 * Parte o texto em frases. Fecha a frase o ponto final, de interrogação ou de exclamação seguido de
 * espaço e de começo de frase (maiúscula, número, aspas ou §), o ponto e vírgula e a quebra de
 * linha. Não fecha em abreviação ("Art. 5º"), nem em número com ponto ("1.000"), em letra sozinha
 * ("I.") ou dentro de parênteses. O número antes do ponto só segura a frase quando é rótulo: o item
 * numerado ("1. Primeiro") e o artigo citado no começo ("Art. 121. Matar alguém"); no fim da frase
 * ("de 1984. O juiz decidirá.") ele fecha. Puro e linear; os espaços das pontas ficam de fora.
 */
export function frasesDoTexto(texto: string): Frase[] {
  const frases: Frase[] = [];
  const dentro = entreParenteses(texto);
  let inicio = 0;
  /** A posição é a primeira da frase em aberto, fora os espaços e o que abre (aspas, parêntese). */
  const comecoDaFrase = (posicao: number) => {
    let i = inicio;
    while (i < posicao && (/\s/.test(texto[i] ?? '') || ABRE.test(texto[i] ?? ''))) i++;
    return i === posicao;
  };
  /** O número que começa em `comeco` é rótulo (item numerado ou artigo citado), não o fim da frase. */
  const numeroDeRotulo = (comeco: number) => {
    if (comecoDaFrase(comeco)) return true;
    let antes = comeco;
    while (antes > inicio && /[^\S\n]/.test(texto[antes - 1] ?? '')) antes--;
    if (texto[antes - 1] !== '.') return false;
    const palavra = palavraAntes(texto, antes - 1);
    return ABREVIACOES.has(palavra) && comecoDaFrase(antes - 1 - palavra.length);
  };
  const fechar = (fim: number) => {
    let i = inicio;
    let f = fim;
    while (i < f && /\s/.test(texto[i] ?? '')) i++;
    while (f > i && /\s/.test(texto[f - 1] ?? '')) f--;
    if (f > i) frases.push({ inicio: i, fim: f });
    inicio = fim;
  };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i] ?? '';
    if (c === '\n') {
      fechar(i);
      continue;
    }
    if (dentro[i]) continue;
    if (c === ';') {
      let fim = i + 1;
      while (FECHA.test(texto[fim] ?? '')) fim++;
      fechar(fim);
      i = fim - 1;
      continue;
    }
    if (c !== '.' && c !== '?' && c !== '!') continue;
    let fim = i + 1;
    while (texto[fim] === '.' || FECHA.test(texto[fim] ?? '')) fim++;
    const depois = texto[fim];
    if (depois === undefined) {
      fechar(fim);
      break;
    }
    if (!/[^\S\n]/.test(depois)) continue;
    let proximo = fim;
    while (/[^\S\n]/.test(texto[proximo] ?? '')) proximo++;
    const inicial = texto[proximo];
    if (inicial === undefined || inicial === '\n') {
      fechar(fim);
      i = fim - 1;
      continue;
    }
    if (c === '.') {
      const palavra = palavraAntes(texto, i);
      if (ABREVIACOES.has(palavra) || /^\p{L}$/u.test(palavra)) continue;
      if (/^[\p{N}]+$/u.test(palavra) && numeroDeRotulo(i - palavra.length)) continue;
    }
    if (!COMECA_FRASE.test(inicial)) continue;
    fechar(fim);
    i = fim - 1;
  }
  fechar(texto.length);
  return frases;
}

/** A frase que contém o offset (no espaço entre duas, a que vem antes); `-1` se não há frases. */
export function indiceDaFrase(frases: readonly Frase[], offset: number): number {
  if (frases.length === 0) return -1;
  let achada = 0;
  for (let i = 0; i < frases.length; i++) {
    if ((frases[i]?.inicio ?? 0) <= offset) achada = i;
    else break;
  }
  return achada;
}
