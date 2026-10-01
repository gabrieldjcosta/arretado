// Notas de vigência (regra 7): a linha feita só de notas (antes e depois do nome do nó, entre a
// epígrafe e a ementa, depois do dispositivo) e as notas no fim de uma linha ("(VETADO) (Incluído
// pela Lei nº 14.197, de 2021) (Vigência)"), com a espécie, a lei e o ano (8.5); e a nota mais
// recente da norma, para a F6. Tudo casa na chave (mesmos índices do texto).
import { linkEntre, type Linha } from './linhas';
import type { NotaDeVigencia, TipoNotaDeVigencia } from './rascunho';

const CHAVE_NOTA =
  /^(?:Reda[cç][aã]o|Inclu[ií]d[oa]s?|Acrescid[oa]s?|Acrescentad[oa]s?|Revogad[oa]s?|Renumerad[oa]s?|Suprimid[oa]s?|Vide|Vig[eê]ncia|Regulament[oa]|Regulamenta[cç][aã]o|Promulga[cç][aã]o|Produ[cç][aã]o de efeitos?|Convers[aã]o|Convertid[oa]|Declarad[oa]|Express[aã]o (?:substitu[ií]d|declarad|suprimid|acrescid|inclu[ií]d|revogad)[oa]|Suspens[oa]|Execu[cç][aã]o suspensa|[UÚ]ltima atualiza[cç][aã]o|NR)(?!\p{L})/iu;

/**
 * Nota de renumeração que começa pelo dispositivo (8.7): "(Parágrafo único renumerado pela Lei nº
 * 9.983, de 2000)" (CP, art. 153, § 1º), "(Parágrafo único renumerado para § 1º pela Emenda…)"
 * (CF, art. 198, § 1º), "(Parágrafo Renumerado pela Emenda…)" (CF, art. 149, § 1º, redação
 * anterior) e "(Transformado em § 1º pela Emenda…)" (CF, art. 102, § 1º). Só com a maiúscula do
 * começo e a palavra logo depois do rótulo: "(parágrafo único do artigo 14)" (LEP, art. 120) é
 * texto da lei.
 */
const ROTULO_DA_NOTA = String.raw`Par[áa]grafo(?: [úu]nico)?|§ ?\d{1,3} ?[ºo°]?(?:-[A-Z])?|Inciso [IVXLCDM]+(?:-[A-Z])?|Al[íi]nea "?[a-z]"?|Item \d{1,3}`;
const NOTA_PELO_DISPOSITIVO = new RegExp(
  String.raw`^(?:(?:${ROTULO_DA_NOTA})\s+(?:[Rr]enumerad|[Tt]ransformad)[oa]s?|Transformad[oa]s? em)(?!\p{L})`,
  'u',
);

/** Conteúdo de um parêntese que é nota. "(Revogado)" sozinho é texto do dispositivo, não nota. */
function ehConteudoDeNota(conteudo: string): boolean {
  const c = conteudo.trim();
  if (NOTA_PELO_DISPOSITIVO.test(c)) return true;
  if (!CHAVE_NOTA.test(c)) return false;
  return !/^Revogad[oa]s?\.?$/iu.test(c);
}

const GRUPO = /\((?:[^()]|\([^()]*\))*\)/y;
const SOLTA = /(?:Vig[eê]ncia|Regulamento|Produ[cç][aã]o de efeitos?|Vide [^()]*?\d{4})(?!\p{L})/uy;
const SEPARADORES = /[\s.,;]+/y;

/** Nota da ALESP em linha própria ("- Inciso IX com redação dada pela…"). */
const NOTA_ALESP = /^- \S/;

/** Linha feita só de notas → as notas; senão `undefined`. */
export function lerNotasDaLinha(linha: Linha): NotaDeVigencia[] | undefined {
  const { chave, texto, trechos } = linha;
  if (NOTA_ALESP.test(chave))
    return [nota(texto.slice(2), linkEntre(trechos, 2, texto.length), linha.i)];
  const notas: NotaDeVigencia[] = [];
  let pos = 0;
  while (pos < chave.length) {
    SEPARADORES.lastIndex = pos;
    if (SEPARADORES.exec(chave)) pos = SEPARADORES.lastIndex;
    if (pos >= chave.length) break;
    GRUPO.lastIndex = pos;
    SOLTA.lastIndex = pos;
    const grupo = GRUPO.exec(chave);
    const solta = grupo ? null : SOLTA.exec(chave);
    const casou = grupo ?? solta;
    if (!casou) return notasNoFimDaLinhaInteira(linha);
    if (grupo && !ehConteudoDeNota(grupo[0].slice(1, -1))) return undefined;
    const fim = pos + casou[0].length;
    notas.push(nota(texto.slice(pos, fim), linkEntre(trechos, pos, fim), linha.i));
    pos = fim;
  }
  return notas.length > 0 ? notas : undefined;
}

/** A linha inteira pelas regras do fim da linha (nota sem parênteses, sem fecho). */
function notasNoFimDaLinhaInteira(linha: Linha): NotaDeVigencia[] | undefined {
  const { fim, notas } = separarNotasFinais(linha);
  return fim === 0 && notas.length > 0 ? notas : undefined;
}

/** Nota tem até 2.000 caracteres: só o fim da linha é examinado (a busca não fica quadrática). */
const JANELA = 4_000;
/** O que pode vir depois de uma nota: pontuação e sobra da fonte (">" no CP, art. 47, III; "]" na CF, ADCT, art. 35). */
const DEPOIS_DA_NOTA = /[\s.,;:>\]]/u;
/** Nota solta, sem parênteses (link do Planalto). */
const SOLTA_NO_FIM = /(?<![\p{L}\p{N}])(?:Vig[eê]ncia|Regulamento|Produ[cç][aã]o de efeitos?)$/u;
/** "Vide …" sem parênteses ("…do artigo anterior. Vide Lei nº 8.072, de 25.7.90", CP; "…) Vide art. 96 - ADCT", CF). */
const VIDE_NO_FIM = /(?<![\p{L}\p{N}])Vide [^()]{1,150}$/u;
/**
 * Nota sem parênteses (CP, art. 232-A: "…com violência; ou Incluído pela Lei nº 13.445, de 2017
 * Vigência"): só com a chave em maiúscula, "pela Lei…" (ou Emenda, Medida, Decreto) e o ano.
 */
const SEM_PARENTESES_NO_FIM =
  /(?<=^|\s)(?:Inclu[ií]d[oa]|Reda[cç][aã]o dada|Acrescid[oa]|Revogad[oa]|Renumerad[oa]) pel[oa] (?:Lei|Emenda|Medida|Decreto)[^()]{0,200}?, de \d{4}$/u;
/**
 * Número solto depois do fim da frase: link para outro ato (LEP, art. 18-A, § 3º: "…às presas.
 * 7.627 (Incluído…)", o Decreto 7.627/2011).
 */
const NUMERO_SOLTO_NO_FIM = /(?<=[.;:]\s{1,20})\d{1,3}(?:\.\d{3}){1,4}$/u;
/**
 * O pedaço do fim examinado por cada regra (o maior que ela casa): a busca de cada nota não passa
 * do fim da linha, e a linha com centenas de milhares de notas continua linear.
 */
const CAUDA = 400;
const CAUDA_NUMERO = 48;
const CAUDA_SEM_PARENTESES = 280;
const CAUDA_SOLTA = 40;
const CAUDA_VIDE = 160;

export interface NotasFinais {
  /** Onde o texto acaba (as notas começam). */
  fim: number;
  notas: NotaDeVigencia[];
  /**
   * Pontuação que vinha depois da última nota e é do texto, que acaba sem ela ("…emergencial
   * (Incluído pela Lei nº 12.653, de 2012).", CP, art. 135-A): quem monta o texto a acrescenta.
   */
  pontuacao?: string;
}

/**
 * Notas no fim de `linha.texto[inicio, fim)`, na ordem, e onde o texto acaba. Para no primeiro
 * parêntese que não é nota ("(VETADO)" fica no texto). Além do parêntese: a nota sem o parêntese
 * de fecho no fim da linha (ECA, art. 233: "(Revogado pela Lei nº 9.455, de 7.4.1997"), a nota
 * sem parênteses, "Vigência", "Regulamento" e "Produção de efeitos" soltos (depois de outra nota,
 * do fim da frase ou do nome em caixa alta: "…DA REFORMA AGRÁRIA Regulamento", CF) e o número
 * solto depois do fim da frase.
 */
export function separarNotasFinais(
  linha: Linha,
  inicio = 0,
  fim = linha.texto.length,
): NotasFinais {
  const { chave } = linha;
  const notas: NotaDeVigencia[] = [];
  let limite = fim;
  let pontuacao: string | undefined;
  for (;;) {
    // O que vem depois da nota (pontuação e sobra da fonte) fica fora dela e do texto.
    let ate = limite;
    while (ate > inicio && DEPOIS_DA_NOTA.test(chave.charAt(ate - 1))) ate--;
    let achada = notaNoFim(chave, inicio, ate, notas.length === 0);
    if (!achada && chave.charAt(ate - 1) === ')') {
      // ")" sem par depois da nota (CP, art. 313-A: "(Incluído pela Lei nº 9.983, de 2000) )"):
      // sobra da fonte, como a pontuação.
      let k = ate - 1;
      while (k > inicio && DEPOIS_DA_NOTA.test(chave.charAt(k - 1))) k--;
      const semPar = abreParentese(chave, Math.max(inicio, ate - JANELA), ate - 1) === undefined;
      if (semPar && chave.charAt(k - 1) === ')') {
        ate = k;
        achada = notaNoFim(chave, inicio, ate, notas.length === 0);
      }
    }
    if (!achada) break;
    if (notas.length === 0) pontuacao = /[.;:]/.exec(chave.slice(ate, limite))?.[0];
    const [a, b] = achada;
    // Do fim para o começo; a ordem do texto volta no fim (`unshift` ficaria quadrático).
    notas.push(nota(linha.texto.slice(a, b), linkEntre(linha.trechos, a, b), linha.i));
    limite = a;
  }
  if (notas.length === 0) return { fim, notas };
  notas.reverse();
  let final = limite;
  while (final > inicio && /\s/.test(chave.charAt(final - 1))) final--;
  const texto = chave.slice(inicio, final);
  const pontuada = texto === '' || /[.;:,!?]$/.test(texto);
  return { fim: limite, notas, ...(pontuacao && !pontuada ? { pontuacao } : {}) };
}

/** A nota que termina em `ate` (e começa depois de `inicio`): `[início, fim)`, ou nada. */
function notaNoFim(
  chave: string,
  inicio: number,
  ate: number,
  ultima: boolean,
): [number, number] | undefined {
  if (ate <= inicio) return undefined;
  const janela = Math.max(inicio, ate - JANELA);
  if (chave.charAt(ate - 1) === ')') {
    const a = abreParentese(chave, janela, ate - 1);
    if (a === undefined || !ehConteudoDeNota(chave.slice(a + 1, ate - 1))) return undefined;
    return [a, ate];
  }
  // Parêntese de nota sem fecho: só a última nota da linha (ela vai até o fim).
  if (ultima) {
    const cauda = Math.max(inicio, ate - CAUDA);
    const aberto = chave.lastIndexOf('(', ate - 1);
    const fecha = aberto >= cauda ? chave.indexOf(')', aberto) : -1;
    if (aberto >= cauda && (fecha === -1 || fecha >= ate)) {
      if (ehConteudoDeNota(chave.slice(aberto + 1, ate))) return [aberto, ate];
    }
  }
  const noFim = (re: RegExp, tamanho: number): number | undefined => {
    const cauda = Math.max(inicio, ate - tamanho);
    const m = re.exec(chave.slice(cauda, ate));
    return m ? cauda + m.index : undefined;
  };
  const numero = noFim(NUMERO_SOLTO_NO_FIM, CAUDA_NUMERO);
  if (numero !== undefined) return [numero, ate];
  const semParenteses = noFim(SEM_PARENTESES_NO_FIM, CAUDA_SEM_PARENTESES);
  if (semParenteses !== undefined) return [semParenteses, ate];
  const solta = noFim(SOLTA_NO_FIM, CAUDA_SOLTA);
  if (solta !== undefined && soltaEhNota(chave, inicio, solta, true)) return [solta, ate];
  const vide = noFim(VIDE_NO_FIM, CAUDA_VIDE);
  if (vide !== undefined && soltaEhNota(chave, inicio, vide, false)) return [vide, ate];
  return undefined;
}

/**
 * Nota solta, sem parênteses, só depois de outra nota ou do fim da frase, ou sozinha; "Vigência",
 * "Regulamento" e "Produção de efeitos" também depois de uma palavra em caixa alta (nome do nó).
 * "…na forma do Regulamento" é texto.
 */
function soltaEhNota(chave: string, inicio: number, a: number, caixaAlta: boolean): boolean {
  let k = a;
  while (k > inicio && /\s/.test(chave.charAt(k - 1))) k--;
  if (k === inicio) return true;
  const antes = chave.slice(Math.max(inicio, k - CAUDA), k);
  return (
    /[).;:]$/.test(antes) ||
    (caixaAlta && /(?<!\p{L})\p{Lu}{2,}$/u.test(antes)) ||
    SEM_PARENTESES_NO_FIM.test(antes)
  );
}

/** O "(" que abre o ")" em `fecha` (com um nível de parênteses dentro), sem passar de `janela`. */
function abreParentese(chave: string, janela: number, fecha: number): number | undefined {
  let profundidade = 0;
  for (let k = fecha; k >= janela; k--) {
    const c = chave.charAt(k);
    if (c === ')') profundidade++;
    else if (c === '(') {
      profundidade--;
      if (profundidade === 0) return k;
    }
    if (profundidade > 2) return undefined;
  }
  return undefined;
}

function nota(texto: string, link: string | undefined, linha: number): NotaDeVigencia {
  const ato = lerAto(texto);
  return {
    texto,
    tipo: tipoDaNota(texto),
    linha,
    ...(ato?.lei === undefined ? {} : { lei: ato.lei }),
    ...(ato?.ano === undefined ? {} : { ano: ato.ano }),
    ...(link === undefined ? {} : { link }),
  };
}

/** Espécie pela palavra-chave do começo (Planalto)… */
const ESPECIE_NO_COMECO: readonly [RegExp, TipoNotaDeVigencia][] = [
  [/^NR\)?$/i, 'nr'],
  [/^vide(?!\p{L})/iu, 'vide'],
  // "Produção de efeitos" leva ao artigo da emenda que diz quando ela vale (CF).
  [/^(?:vig[eê]ncia|produ[cç][aã]o de efeito)/iu, 'vigencia'],
  [/^regulament/iu, 'regulamento'],
  [/^express[aã]o /iu, 'expressao'],
  [/^reda[cç][aã]o/iu, 'redacao_dada'],
  [/^(?:inclu[ií]d|acrescid|acrescentad)/iu, 'incluido'],
  [/^renumerad/iu, 'renumerado'],
  [/^(?:revogad|suprimid)/iu, 'revogado'],
];
/**
 * …ou no meio (ALESP: "Inciso IX com redação dada pela…", "Artigo 54 revogado pela…", "Parágrafo
 * único transformado em § 1º pela…").
 */
const ESPECIE_NO_MEIO: readonly [RegExp, TipoNotaDeVigencia][] = [
  [/reda[cç][aã]o dada/iu, 'redacao_dada'],
  [/inclu[ií]d|acrescid|acrescentad/iu, 'incluido'],
  [/renumerad|transformad/iu, 'renumerado'],
  [/revogad|suprimid/iu, 'revogado'],
];

/** Espécie da nota (regra 7): decide as regras 9 e 10 e alimenta a F6. */
export function tipoDaNota(texto: string): TipoNotaDeVigencia {
  const t = texto.replace(/^[\s(]+/, '');
  for (const [re, tipo] of ESPECIE_NO_COMECO) if (re.test(t)) return tipo;
  for (const [re, tipo] of ESPECIE_NO_MEIO) if (re.test(t)) return tipo;
  return 'outra';
}

/** Ato normativo citado na nota, na forma canônica ("Lei nº 13.964", "Emenda Constitucional nº 132"). */
const ATO =
  /(?<!\p{L})(Lei Complementar|Lei Delegada|Decreto-Lei|Decreto Legislativo|Decreto|Emenda Constitucional de Revis[aã]o|Emenda Constitu\p{L}*(?: Constitucional)?|Medida Provis[oó]ria|MPV|Resolu[cç][aã]o|Lei)(?!\p{L})\s*(?:n\s*\.?\s*[ºo°]\s*\.?|n\.)?\s*(\d{1,3}(?:\.\d{3})+(?!\d)|\d+)(-\d+)?/iu;
/**
 * Data logo depois do número: "de 2019", "de 11.7.1984", "de 25.7.90", "de 15/08/95", "de 25 de
 * setembro de 2009"; e as falhas da fonte "12.033. de 2009" (CP), "de 15 de 2001" (CP, sem o mês),
 * "nº 41, 19.12.2003" (CF, sem o "de").
 */
const DATA =
  /^\s*[,.]?\s*(?:de\s+)?(?:(\d{1,2})º?\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4}|\d{2})(?!\d)|(\d{1,2})º?\s+de\s+(\p{L}+)\s+de\s+(\d{4})|(?:\d{1,2}º?\s+de\s+)?(\d{4}))(?!\d)/u;

/** Forma canônica do tipo do ato (sem acento e em minúsculas → como se escreve). */
function tipoCanonico(lido: string): string {
  const t = semAcento(lido).toLowerCase().replace(/\s+/g, ' ');
  if (t === 'emenda constitucional de revisao') return 'Emenda Constitucional de Revisão';
  // "Emenda constitucional", "Emenda Constituição Constitucional", "Emenda Constituicional" (CF).
  if (t.startsWith('emenda constitu')) return 'Emenda Constitucional';
  const tipos: Record<string, string> = {
    'lei complementar': 'Lei Complementar',
    'lei delegada': 'Lei Delegada',
    'decreto-lei': 'Decreto-Lei',
    'decreto legislativo': 'Decreto Legislativo',
    decreto: 'Decreto',
    'medida provisoria': 'Medida Provisória',
    mpv: 'Medida Provisória',
    resolucao: 'Resolução',
    lei: 'Lei',
  };
  return tipos[t] ?? lido;
}

const MESES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

interface Ato {
  lei: string;
  ano?: number;
  /** Para desempatar no mesmo ano (`notaVigenciaMaisRecente`): mês e dia quando há, e o número. */
  mes?: number;
  dia?: number;
  numero: number;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

/** O primeiro ato normativo da nota, com o ano (e a data, se houver). ADI, ADPF e MI não são ato. */
export function lerAto(texto: string): Ato | undefined {
  const m = ATO.exec(texto);
  if (!m) return undefined;
  const numeroLido = `${m[2] ?? ''}${m[3] ?? ''}`;
  const ato: Ato = {
    lei: `${tipoCanonico(m[1] ?? '')} nº ${numeroLido}`,
    numero: Number((m[2] ?? '').replace(/\./g, '')),
  };
  const d = DATA.exec(texto.slice(m.index + m[0].length));
  if (!d) return ato;
  const [, dia1, mes1, ano1, dia2, mesExtenso, ano2, ano3] = d;
  const bruto = ano1 ?? ano2 ?? ano3;
  if (bruto === undefined) return ato;
  let ano = Number(bruto);
  // Ano com dois algarismos ("25.7.90", "15/12/98"): do Planalto, sempre depois de 1930.
  if (bruto.length === 2) ano += ano >= 30 ? 1900 : 2000;
  if (ano < 1800 || ano > 2100) return ato;
  const mes =
    mes1 !== undefined
      ? Number(mes1)
      : mesExtenso !== undefined
        ? MESES.indexOf(semAcento(mesExtenso).toLowerCase()) + 1
        : undefined;
  const dia = dia1 !== undefined ? Number(dia1) : dia2 !== undefined ? Number(dia2) : undefined;
  return {
    ...ato,
    ano,
    ...(mes !== undefined && mes >= 1 && mes <= 12 ? { mes } : {}),
    ...(dia !== undefined && dia >= 1 && dia <= 31 ? { dia } : {}),
  };
}

/** Espécies que não dizem que o texto mudou: remetem a outro ato ("Vide Lei Complementar nº 230, de 2026" na CF), ao decreto que regulamenta ou à vigência. */
const SEM_ALTERACAO = new Set<TipoNotaDeVigencia>(['vide', 'regulamento', 'vigencia', 'nr']);

/**
 * A nota com lei e ano mais recente (D16; `VersaoDeNorma.notaVigenciaMaisRecente`), para a F6
 * comparar com a da versão registrada ("há indício: Lei X/AAAA"). Só as que alteram o texto
 * (redação dada, incluído, revogado, renumerado, expressão, outras como "Última atualização" da
 * ALESP). No mesmo ano, desempata a data completa ("de 26.6.2014") e depois o número do ato; a
 * nota só com o ano perde para a de data completa do mesmo ano.
 */
export function notaVigenciaMaisRecente(
  notas: Iterable<Pick<NotaDeVigencia, 'texto' | 'tipo'>>,
): { lei: string; ano: number } | undefined {
  let melhor: (Ato & { ano: number }) | undefined;
  for (const n of notas) {
    if (SEM_ALTERACAO.has(n.tipo)) continue;
    const ato = lerAto(n.texto);
    if (ato?.ano === undefined) continue;
    const a = ato as Ato & { ano: number };
    if (!melhor || compararAtos(a, melhor) > 0) melhor = a;
  }
  return melhor && { lei: melhor.lei, ano: melhor.ano };
}

function compararAtos(a: Ato & { ano: number }, b: Ato & { ano: number }): number {
  return (
    a.ano - b.ano ||
    (a.mes ?? 0) - (b.mes ?? 0) ||
    (a.dia ?? 0) - (b.dia ?? 0) ||
    a.numero - b.numero
  );
}
