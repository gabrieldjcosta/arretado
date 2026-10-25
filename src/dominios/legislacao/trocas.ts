// Ache o erro (AP-06, piloto de 25/10/2026): trocas geradas do texto vigente, sem IA. Cada troca
// mexe num só trecho e sai de um dicionário fechado (número com o extenso junto, prazo,
// quantificador, termo absoluto, pena), para a frase falsa ser gramatical e, lida sozinha,
// plausível. Só vale a troca cujo trecho acende em `detectarDestaques` antes e depois: na tela, os
// trechos que a pessoa pode tocar são os destaques, e uma troca fora deles se entregaria sozinha.
// Determinístico: mesmo texto, mesmas trocas, na mesma ordem. Na tela, os trechos que a pessoa
// pode tocar (`candidatosDeToque`) são os destaques e as palavras do dicionário, dos dois lados da
// troca, em qualquer texto: assim o substituto ("inclusive", "permitido") não se entrega sozinho.
import { detectarDestaques, type Destaque } from './destaques';

export type TipoDeTroca = 'numero' | 'prazo' | 'quantificador' | 'absoluto' | 'pena';

/** Uma troca possível: o trecho `[inicio, fim)` do texto certo e o que entra no lugar. */
export interface Troca {
  inicio: number;
  fim: number;
  original: string;
  substituto: string;
  tipo: TipoDeTroca;
}

// ── Número por extenso (até 999, como a lei escreve) ────────────────────────

const UNIDADES = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];
const DEZENAS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];
const CENTENAS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

/** "cento e oitenta", "duas", "trezentos e sessenta". */
export function porExtenso(n: number, feminino = false): string {
  if (n < 1 || n > 999 || !Number.isInteger(n)) return '';
  if (n === 100) return 'cem';
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const r = n % 100;
  const centena = CENTENAS[c] ?? '';
  if (c > 0) partes.push(feminino ? centena.replace(/os$/, 'as') : centena);
  if (r >= 20) {
    partes.push(DEZENAS[Math.floor(r / 10)] ?? '');
    if (r % 10 > 0) partes.push(unidade(r % 10, feminino));
  } else if (r > 0) partes.push(unidade(r, feminino));
  return partes.join(' e ');
}

function unidade(n: number, feminino: boolean): string {
  if (feminino && n === 1) return 'uma';
  if (feminino && n === 2) return 'duas';
  return UNIDADES[n] ?? '';
}

/** Do extenso ao número e ao gênero; `undefined` fora do dicionário. */
const VALOR_DO_EXTENSO = new Map<string, { n: number; feminino: boolean }>();
for (let n = 1; n <= 999; n++) {
  VALOR_DO_EXTENSO.set(porExtenso(n, true), { n, feminino: true });
  VALOR_DO_EXTENSO.set(porExtenso(n), { n, feminino: false });
}

const normalizarExtenso = (s: string) =>
  s
    .toLowerCase()
    .replace(/ü/g, 'u')
    .replace(/catorze/g, 'quatorze')
    .replace(/\s+/g, ' ')
    .trim();

/** Os valores que a lei costuma usar: a troca vai ao vizinho, para a frase falsa ficar plausível. */
const ESCADA = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 21, 24, 25, 30, 35, 36, 40, 45, 48, 60, 65, 70, 72,
  90, 100, 120, 180, 240, 360,
];

function vizinhos(n: number): number[] {
  const i = ESCADA.indexOf(n);
  if (i === -1) {
    const acima = ESCADA.find((v) => v > n);
    const abaixo = [...ESCADA].reverse().find((v) => v < n);
    return [abaixo, acima].filter((v): v is number => v !== undefined);
  }
  return [ESCADA[i - 1], ESCADA[i + 1]].filter((v): v is number => v !== undefined);
}

// ── Dicionários de palavras (gênero e número preservados por construção) ────

const PARES: readonly [TipoDeTroca, string, string][] = [
  ['prazo', 'dias úteis', 'dias corridos'],
  ['prazo', 'dias corridos', 'dias úteis'],
  ['prazo', 'improrrogável', 'prorrogável'],
  ['prazo', 'improrrogáveis', 'prorrogáveis'],
  ['prazo', 'prorrogável', 'improrrogável'],
  ['prazo', 'prorrogáveis', 'improrrogáveis'],
  ['quantificador', 'no máximo', 'no mínimo'],
  ['quantificador', 'no mínimo', 'no máximo'],
  ['quantificador', 'superior a', 'inferior a'],
  ['quantificador', 'inferior a', 'superior a'],
  ['quantificador', 'mais de', 'menos de'],
  ['quantificador', 'menos de', 'mais de'],
  ['quantificador', 'salvo', 'inclusive'],
  ['quantificador', 'exceto', 'inclusive'],
  ['quantificador', 'desde que', 'ainda que'],
  ['quantificador', 'ainda que', 'desde que'],
  ['quantificador', 'mesmo que', 'desde que'],
  ['absoluto', 'sempre', 'nunca'],
  ['absoluto', 'nunca', 'sempre'],
  ['absoluto', 'jamais', 'sempre'],
  ['absoluto', 'nenhum', 'qualquer'],
  ['absoluto', 'nenhuma', 'qualquer'],
  ['absoluto', 'vedado', 'permitido'],
  ['absoluto', 'vedada', 'permitida'],
  ['absoluto', 'vedados', 'permitidos'],
  ['absoluto', 'vedadas', 'permitidas'],
  ['absoluto', 'proibido', 'permitido'],
  ['absoluto', 'proibida', 'permitida'],
  ['absoluto', 'proibidos', 'permitidos'],
  ['absoluto', 'proibidas', 'permitidas'],
  ['absoluto', 'obrigatório', 'facultativo'],
  ['absoluto', 'obrigatória', 'facultativa'],
  ['absoluto', 'obrigatórios', 'facultativos'],
  ['absoluto', 'obrigatórias', 'facultativas'],
  ['absoluto', 'obrigatoriamente', 'facultativamente'],
  ['pena', 'reclusão', 'detenção'],
  ['pena', 'detenção', 'reclusão'],
  ['pena', 'maioria absoluta', 'maioria simples'],
  ['pena', 'maioria simples', 'maioria absoluta'],
];

const INICIO = String.raw`(?<![\p{L}\p{N}])`;
const FIM = String.raw`(?![\p{L}\p{N}])`;
const alternativas = (palavras: readonly string[]) =>
  palavras.map((p) => p.replace(/ /g, String.raw`[^\S\n]+`)).join('|');
const PADRAO_DAS_PALAVRAS = new RegExp(
  `${INICIO}(?:${alternativas(PARES.map(([, de]) => de))})${FIM}`,
  'giu',
);
/** Os dois lados de cada par: o que pode ser tocado em qualquer texto. */
const PADRAO_DO_DICIONARIO = new RegExp(
  `${INICIO}(?:${alternativas([...new Set(PARES.flatMap(([, de, para]) => [de, para]))])})${FIM}`,
  'giu',
);
const SUBSTITUTO = new Map(PARES.map(([tipo, de, para]) => [de, { tipo, para }]));

/** A troca de palavra guarda a maiúscula inicial ("Salvo" → "Inclusive"). */
function comCaixaDe(original: string, substituto: string): string {
  return original[0] === original[0]?.toUpperCase()
    ? substituto.slice(0, 1).toUpperCase() + substituto.slice(1)
    : substituto;
}

// ── Números ─────────────────────────────────────────────────────────────────

const UNIDADE = String.raw`(dias-multa|dias?|mês|meses|anos?|horas?|semanas?)(?![\p{L}\p{N}])`;
/** O resto de um intervalo ("a 8 (oito)", "até quatro") entre o número e a unidade, se houver. */
const INTERVALO = String.raw`((?:[^\S\n]+(?:a|até)[^\S\n]+(?:\d{1,3}(?:[^\S\n]*\([^()\n]{1,60}\))?|\p{L}+(?:[^\S\n]+e[^\S\n]+\p{L}+){0,3}))?)`;
/** O que vem depois do número, sem consumir (o segundo número do intervalo também casa). */
const CAUDA = String.raw`(?=${INTERVALO}([^\S\n]+)${UNIDADE})`;
/** "30 (trinta) dias": algarismo e extenso juntos; as duas partes mudam juntas. */
const PAR = new RegExp(String.raw`${INICIO}(\d{1,3})[^\S\n]*\(([^()\n]{1,60})\)${CAUDA}`, 'gu');
/** "seis meses", "cento e oitenta dias": só o extenso. */
const EXTENSO = new RegExp(
  String.raw`${INICIO}(\p{L}+(?:[^\S\n]+e[^\S\n]+\p{L}+){0,3})${CAUDA}`,
  'giu',
);

/** A unidade concorda com o número novo ("1 (um) ano" → "2 (dois) anos"). */
function concordar(unidade: string, n: number): string {
  if (unidade === 'dias-multa') return unidade;
  if (/^m[êe]s/u.test(unidade)) return n === 1 ? 'mês' : 'meses';
  const singular = unidade.replace(/s$/, '');
  return n === 1 ? singular : `${singular}s`;
}

/**
 * A troca de um número: o trecho vai até a unidade quando ela vem logo depois (para concordar);
 * no primeiro número de um intervalo ("de um a quatro anos"), só o número.
 */
function trocaDeNumero(
  texto: string,
  m: RegExpExecArray | RegExpMatchArray,
  novo: number,
  numero: string,
): Troca {
  const casado = m[0];
  // Os três últimos grupos são a cauda (o par tem um grupo a mais que o extenso).
  const [intervalo = '', espaco = '', unidade = ''] = m.slice(-3);
  const inicio = m.index ?? 0;
  const direto = intervalo === '';
  const fim = inicio + casado.length + (direto ? espaco.length + unidade.length : 0);
  return {
    inicio,
    fim,
    original: texto.slice(inicio, fim),
    substituto: direto ? `${numero}${espaco}${concordar(unidade, novo)}` : numero,
    tipo: 'numero',
  };
}

/** Os números (algarismo ou extenso) de um trecho, na ordem: para manter "de 2 a 8 anos" crescente. */
function valoresEmOrdem(trecho: string): number[] {
  const valores: number[] = [];
  for (const m of trecho.matchAll(/\d{1,3}(?![\d.])|\p{L}+(?:[^\S\n]+e[^\S\n]+\p{L}+){0,3}/giu)) {
    const n = /^\d/.test(m[0]) ? Number(m[0]) : VALOR_DO_EXTENSO.get(normalizarExtenso(m[0]))?.n;
    if (n !== undefined) valores.push(n);
  }
  return valores;
}

const crescente = (v: number[]) => v.every((x, i) => i === 0 || x > (v[i - 1] ?? -Infinity));

function dentroDeDestaque(destaques: readonly Destaque[], inicio: number, fim: number) {
  return destaques.find((d) => d.inicio <= inicio && fim <= d.fim);
}

/**
 * Todas as trocas aprovadas de um texto de dispositivo (o vigente, sem tachado), em ordem de
 * posição. Vazio quando o texto não dá troca segura.
 */
export function gerarTrocas(texto: string): Troca[] {
  return avaliarTrocas(texto).aprovadas;
}

/** As trocas aprovadas e quantas candidatas a validação barrou (relatório do piloto). */
export function avaliarTrocas(texto: string): { aprovadas: Troca[]; rejeitadas: number } {
  const destaques = detectarDestaques(texto);
  const candidatas: Troca[] = [];

  for (const m of texto.matchAll(PADRAO_DAS_PALAVRAS)) {
    const chave = m[0].toLowerCase().replace(/\s+/g, ' ');
    const regra = SUBSTITUTO.get(chave);
    if (!regra) continue;
    candidatas.push({
      inicio: m.index,
      fim: m.index + m[0].length,
      original: m[0],
      substituto: comCaixaDe(m[0], regra.para),
      tipo: regra.tipo,
    });
  }

  for (const m of texto.matchAll(PAR)) {
    const n = Number(m[1]);
    const extenso = VALOR_DO_EXTENSO.get(normalizarExtenso(m[2] ?? ''));
    // Extenso que não bate com o algarismo (ou fora do dicionário): duvidoso, fica de fora.
    if (!extenso || extenso.n !== n) continue;
    for (const novo of vizinhos(n)) {
      candidatas.push(
        trocaDeNumero(texto, m, novo, `${String(novo)} (${porExtenso(novo, extenso.feminino)})`),
      );
    }
  }

  for (const m of texto.matchAll(EXTENSO)) {
    const extenso = VALOR_DO_EXTENSO.get(normalizarExtenso(m[1] ?? ''));
    // Fora do dicionário, ou o extenso do par "30 (trinta)", que não troca sozinho.
    if (!extenso || texto[m.index - 1] === '(') continue;
    for (const novo of vizinhos(extenso.n)) {
      candidatas.push(
        trocaDeNumero(texto, m, novo, comCaixaDe(m[0], porExtenso(novo, extenso.feminino))),
      );
    }
  }

  const aprovadas = candidatas
    .filter((t) => {
      if (t.tipo !== 'numero') return true;
      const destaque = dentroDeDestaque(destaques, t.inicio, t.fim);
      if (!destaque) return false;
      // "de 2 (dois) a 8 (oito) anos" continua crescente depois da troca.
      const trocado = aplicarTroca(texto, t);
      const fim = destaque.fim + t.substituto.length - (t.fim - t.inicio);
      const ordemAntes = valoresEmOrdem(texto.slice(destaque.inicio, destaque.fim));
      const ordemDepois = valoresEmOrdem(trocado.slice(destaque.inicio, fim));
      return !crescente(ordemAntes) || crescente(ordemDepois);
    })
    .sort((a, b) => a.inicio - b.inicio || a.substituto.localeCompare(b.substituto));
  return { aprovadas, rejeitadas: candidatas.length - aprovadas.length };
}

/**
 * Os trechos que a pessoa pode tocar num texto (certo ou trocado): os destaques e as palavras do
 * dicionário, em ordem e sem sobreposição. Toda troca cai dentro de um deles.
 */
export function candidatosDeToque(texto: string): { inicio: number; fim: number }[] {
  const trechos: { inicio: number; fim: number }[] = detectarDestaques(texto).map((d) => ({
    inicio: d.inicio,
    fim: d.fim,
  }));
  for (const m of texto.matchAll(PADRAO_DO_DICIONARIO)) {
    const fim = m.index + m[0].length;
    if (!trechos.some((t) => m.index < t.fim && fim > t.inicio))
      trechos.push({ inicio: m.index, fim });
  }
  return trechos.sort((a, b) => a.inicio - b.inicio);
}

/** O texto com a troca aplicada: a frase falsa, que nunca é gravada. */
export function aplicarTroca(texto: string, troca: Troca): string {
  return texto.slice(0, troca.inicio) + troca.substituto + texto.slice(troca.fim);
}

/** Uma troca do texto, escolhida pela semente (determinístico); `undefined` sem troca segura. */
export function escolherTroca(texto: string, semente: number): Troca | undefined {
  const trocas = gerarTrocas(texto);
  if (trocas.length === 0) return undefined;
  return trocas[Math.abs(Math.floor(semente)) % trocas.length];
}
