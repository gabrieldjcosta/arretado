// Gabarito das normas do corpus (F2, atividade 7.3): o que o estruturador (etapa 8) deve achar em
// cada página — dispositivos com endereço, status, notas e redações anteriores; estrutura; contagens;
// e uma amostra com o texto exato, conferida pelo Gabriel contra a página no navegador.
//
// Independência (ver "Gabarito que só repete o estruturador" em docs/solucao-de-problemas.md):
// - este código lê o colado com o jsdom e decide por linha; o estruturador lê os blocos do
//   sanitizador. O estruturador não importa nem copia este arquivo;
// - o inventário é cruzado com sinais que não dependem dele: a página compilada (só o texto
//   vigente, sem tachado), as âncoras `name="art…"` do Planalto, o texto puro colado (outra
//   serialização do navegador) e o último artigo conhecido de cada lei;
// - toda divergência não explicada por uma regra vira pendência, e só sai com uma decisão
//   registrada em `DECISOES` (com o motivo). Gabarito com pendência não passa no `npm test`.
import { JSDOM } from 'jsdom';

/**
 * @typedef {object} Bloco Trecho com numeração própria de artigos, que recomeça no art. 1º (ADCT da
 *   CF; disposições transitórias da LC-SP 988). Os endereços dele ganham o prefixo (`adct.art1`).
 * @property {string} prefixo
 * @property {RegExp} inicio Linha (fora do tachado) que abre o bloco: um título solto (CF) ou o
 *   nome de um nó estrutural (LC-SP 988, "TÍTULO VIII / Das Disposições Transitórias").
 * @property {RegExp} [inicioNaPagina] Onde o bloco começa na página bruta, para separar as âncoras.
 * @property {string} ultimoAntes Último artigo antes do bloco (sinal independente, como o último).
 */

/**
 * @typedef {object} Alvo
 * @property {string} id
 * @property {string | null} compilado Página compilada que serve de contraprova (só LEP e CP têm).
 * @property {string} ultimoArtigo Último artigo da página (o do último bloco, se houver).
 * @property {Bloco[]} [blocos]
 */

/**
 * Normas com gabarito, a página compilada que serve de contraprova, o último artigo e os blocos.
 * @type {readonly Alvo[]}
 */
export const GABARITOS = [
  {
    id: 'lep',
    compilado: 'lep-compilado',
    // Lei 7.210/1984: "Art. 204. Esta Lei entra em vigor concomitantemente com a lei de reforma
    // da Parte Geral do Código Penal…" (último artigo desde a publicação).
    ultimoArtigo: 'art204',
  },
  {
    id: 'cp',
    compilado: 'cp-compilado',
    // Decreto-Lei 2.848/1940: "Art. 361. Este Código entrará em vigor no dia 1º de janeiro de 1942."
    ultimoArtigo: 'art361',
  },
  {
    id: 'lc80',
    compilado: null,
    // LC 80/1994: "Art. 149. Revogam-se as disposições em contrário." (último desde a publicação).
    ultimoArtigo: 'art149',
  },
  {
    id: 'lc-sp-988',
    compilado: null,
    // LC-SP 988/2006: o art. 244 diz "Esta lei complementar e suas disposições transitórias entram
    // em vigor…"; as disposições transitórias recomeçam no "Artigo 1°" e terminam no "Artigo 21",
    // logo antes da assinatura ("Palácio dos Bandeirantes, 9 de janeiro de 2006").
    ultimoArtigo: 'dt.art21',
    blocos: [{ prefixo: 'dt', inicio: /^Das Disposições Transitórias$/i, ultimoAntes: 'art244' }],
  },
  {
    id: 'eca',
    compilado: 'eca-compilado',
    // Lei 8.069/1990: "Art. 267. Revogam-se as Leis n.º 4.513, de 1964, e 6.697, de 10 de outubro
    // de 1979 (Código de Menores), e as demais disposições em contrário."
    ultimoArtigo: 'art267',
  },
  {
    id: 'cdc',
    compilado: 'cdc-compilado',
    // Lei 8.078/1990: "Art. 119. Revogam-se as disposições em contrário."
    ultimoArtigo: 'art119',
  },
  {
    id: 'cf',
    compilado: null,
    // CF/1988: o corpo permanente termina no art. 250 (EC 20/1998); o ADCT recomeça no art. 1º e
    // termina no art. 138 (EC 132/2023).
    ultimoArtigo: 'adct.art138',
    blocos: [
      {
        prefixo: 'adct',
        inicio: /^ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS$/,
        inicioNaPagina: /ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS/,
        ultimoAntes: 'art250',
      },
    ],
  },
];

/**
 * Divergências entre os sinais que foram examinadas e decididas (chave: `<id>:<tipo>:<chave>`;
 * a decisão de um endereço vale para os descendentes). O texto diz o que o gabarito adota e por
 * quê; a conferência do Gabriel pode revê-las. Em todas, o gabarito segue a página com todas as
 * redações, que é o que o app recebe.
 * @type {Readonly<Record<string, string>>}
 */
export const DECISOES = {
  'lep:so-na-pagina:art9A.par1':
    'a compilada omite o § 1º do art. 9º-A; a página o traz sem tachado e sem nota de revogação',
  'cp:so-na-pagina:art92.parUnico':
    'a página traz o antigo "Parágrafo único" sem tachado antes do § 1º que o substituiu (a ' +
    'compilada não o tem); o estruturador deve acusar o caso paragrafo-unico-com-numerado',
  'cp:so-na-pagina:art234.par1':
    'a página rotula "§ 1º." o que a compilada (e o texto original) chama "Parágrafo único"; o ' +
    'estruturador deve acusar o caso paragrafo-1-sem-2',
  'cp:so-na-compilada:art234.parUnico':
    'o mesmo dispositivo que a página rotula "§ 1º." (art234.par1)',
  'cp:ancora:art2248': 'falha de digitação da fonte: name="art2248" no art. 248',
  'cp:ancora:art2253': 'falha de digitação da fonte: name="art2253" no art. 253',
  'cp:artigo-sem-ancora:art248': 'a âncora saiu como "art2248" (falha da fonte)',
  'cp:artigo-sem-ancora:art253': 'a âncora saiu como "art2253" (falha da fonte)',
  'cp:artigo-sem-ancora:art287': 'a âncora saiu como name="287", sem "art" (falha da fonte)',
  'eca:ancora:art469':
    'falha de digitação da fonte: name="art469" na redação tachada do art. 46 (a vigente é "art46.")',
  'eca:artigo-sem-ancora:art46':
    'o caput vigente só tem name="art46." (forma das redações), sem "art46" (falha da fonte)',
  'eca:artigo-sem-ancora:art52D': 'a âncora saiu como name="art5d" (falha da fonte)',
  'cf:ancora:art326':
    'falha de digitação da fonte: name="art326§3" no § 3º do art. 226 (ao lado de name="226§3")',
  'cf:ancora:adct.art760':
    'falha de digitação da fonte: name="adctart760" numa redação tachada do art. 76 do ADCT ' +
    '(as outras redações são "adctart76.0", "adctart76.1"…)',
  'cf:artigo-sem-ancora:art32':
    'o caput só tem name="32" e name="art32.0" (forma das redações), sem "art32" (falha da fonte)',
  'cf:artigo-sem-ancora:art164': 'a âncora saiu como name="164", sem "art" (falha da fonte)',
};

/**
 * Decisão para a divergência: a do próprio endereço ou a de um ancestral.
 * @param {string} id
 * @param {{ tipo: string, chave: string }} divergencia
 * @returns {{ chave: string, texto: string } | undefined}
 */
function decisao(id, divergencia) {
  const partes = divergencia.chave.split('.');
  for (let i = partes.length; i > 0; i--) {
    const chave = `${id}:${divergencia.tipo}:${partes.slice(0, i).join('.')}`;
    const texto = DECISOES[chave];
    if (texto) return { chave, texto };
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Linhas do colado

/** Elementos que quebram linha (o colado do Planalto é feito de `<p>`; o CP tem `<li>`). */
const BLOCOS = new Set(
  'P LI TD TH H1 H2 H3 H4 H5 H6 BLOCKQUOTE DIV CENTER UL OL TABLE TBODY THEAD TR BODY DD DT PRE'.split(
    ' ',
  ),
);
/** `<s>` só com ordinal é decorativo no Planalto (`<s>º</s>`); com texto é revogação (ALESP). */
const SO_ORDINAL = /^[\sºª°o.]*$/i;

/**
 * @typedef {object} Linha
 * @property {string} texto Texto inteiro da linha (espaços colapsados, sem U+00AD).
 * @property {string} vigente Só o que não está tachado.
 * @property {string} anterior Só o que está tachado.
 * @property {number} fracaoTachada De 0 a 1, contada em caracteres visíveis.
 */

/**
 * Quebra o HTML colado em linhas (bloco ou `<br>`), separando o tachado do resto.
 * @param {string} html
 * @returns {Linha[]}
 */
export function linhasDoHtml(html) {
  const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
  /** @type {{ pedacos: { texto: string, tachado: boolean }[], total: number, tachados: number }[]} */
  const brutas = [];
  /** @type {(typeof brutas)[number] | null} */
  let atual = null;
  const fechar = () => {
    if (atual && atual.total > 0) brutas.push(atual);
    atual = null;
  };
  /** @param {Element} el */
  const tacha = (el) => {
    if (el.tagName === 'STRIKE' || el.tagName === 'DEL') return true;
    if (el.tagName === 'S') return !SO_ORDINAL.test(el.textContent);
    return /line-through/i.test(el.getAttribute('style') ?? '');
  };
  /** @param {Node} no @param {boolean} tachado */
  const visitar = (no, tachado) => {
    if (no.nodeType === 3) {
      const texto = no.nodeValue ?? '';
      atual ??= { pedacos: [], total: 0, tachados: 0 };
      atual.pedacos.push({ texto, tachado });
      const visiveis = texto.replace(/\s/g, '').length;
      atual.total += visiveis;
      if (tachado) atual.tachados += visiveis;
      return;
    }
    if (no.nodeType !== 1) return;
    const el = /** @type {Element} */ (no);
    if (el.tagName === 'BR') return fechar();
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const bloco = BLOCOS.has(el.tagName);
    if (bloco) fechar();
    const dentro = tachado || tacha(el);
    for (const filho of el.childNodes) visitar(filho, dentro);
    if (bloco) fechar();
  };
  visitar(document.body, false);
  /** @param {{ texto: string }[]} pedacos */
  const juntar = (pedacos) => limpar(pedacos.map((p) => p.texto).join(''));
  return brutas.map((b) => ({
    texto: juntar(b.pedacos),
    vigente: juntar(b.pedacos.filter((p) => !p.tachado)),
    anterior: juntar(b.pedacos.filter((p) => p.tachado)),
    fracaoTachada: b.tachados / b.total,
  }));
}

/** @param {string} s */
function limpar(s) {
  return s
    .replace(/\u00AD/g, '')
    .replace(/[\s\u00A0]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------------------------
// Rótulo e notas

/**
 * @typedef {'parte' | 'livro' | 'titulo' | 'capitulo' | 'secao' | 'subsecao' | 'bloco'} TipoEstrutural
 *   `bloco`: título solto que abre um {@link Bloco} (o ADCT da CF).
 * @typedef {'artigo' | 'paragrafo' | 'inciso' | 'alinea' | 'item' | 'anexo'} TipoNormativo
 * @typedef {object} Rotulo
 * @property {TipoEstrutural | TipoNormativo | 'pena' | 'outro'} tipo
 * @property {number | string} [numero] Artigo, parágrafo e item: número (0 = parágrafo único);
 *   inciso: romano; alínea: letra; estrutural: romano, "ÚNICO", "GERAL" ou "ESPECIAL"; anexo:
 *   romano ou "" (anexo único).
 * @property {string} [sufixo] "A", "B"…; "MA" para "359-M-A".
 * @property {string} resto Texto depois do rótulo.
 */

const ESTRUTURAIS = /** @type {const} */ ([
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'subsecao',
]);
const NORMATIVOS = /** @type {const} */ ([
  'artigo',
  'paragrafo',
  'inciso',
  'alinea',
  'item',
  'anexo',
]);
/** Ordinal colado ao número ("1º", "1o", "1 o", "1°"), mas não o "o" que começa palavra. */
const ORDINAL = String.raw`(?:\s*[º°o](?![a-zà-ú]))?`;
/** Sufixo com hífen colado à letra ("9º-A", "2º -A", "359-M-A"); "1º - A execução" não é. */
const SUFIXO = String.raw`((?:\s*-[A-Z](?![a-zà-ú]))*)`;
const SEPARADOR = String.raw`\s*[-–—.:]?\s*`;
/** Numeral com sufixo colado: "CAPÍTULO II-B" (CP), "Seção V-A" (CF). */
const RE_ESTRUTURAL =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SUBSE[ÇC][ÃA]O|SE[ÇC][ÃA]O)(?:\s+([IVXLC]+(?:-[A-Z](?![A-Za-zÀ-ú]))?|[ÚU]NIC[OA]|GERAL|ESPECIAL)\b)?\s*[-–.]?\s*(.*)$/i;
const RE_ARTIGO = new RegExp(
  String.raw`^Art(?:igo)?\s*\.?\s*(\d+(?:\.\d{3})*)${ORDINAL}${SUFIXO}${SEPARADOR}`,
);
const RE_PARAGRAFO = new RegExp(String.raw`^§\s*(\d+)${ORDINAL}${SUFIXO}${SEPARADOR}`);
const RE_PARAGRAFO_UNICO = /^Par[áa]grafo\s+[úu]nico\s*[-–—.:]?\s*/i;
/** Com sufixo, o separador pode faltar (CF: "I-A o Conselho Nacional de Justiça"). */
const RE_INCISO = new RegExp(
  String.raw`^([IVXLC]+)(?:((?:\s*-[A-Z](?![a-zà-ú]))+)(?:\s*[-–—]\s*|\s+)|\s*[-–—]\s*)`,
);
/**
 * Inciso sem hífen, antes do texto em minúscula (CF, art. 103-B, § 5º: "I receber as
 * reclamações…"; CP de 1940, art. 78: "I aqueles que…"). Só vale se a linha termina como inciso
 * (";", ":" ou "."): "I ncidência em interdição de direito" é rubrica com a capitular separada.
 */
const RE_INCISO_SEM_HIFEN = /^([IVXLC]+)\s+(?=[a-zà-ú])/;
const RE_ALINEA = new RegExp(String.raw`^([a-z])${SUFIXO}\s*\)\s*`);
/** "1.", "1)" (Planalto) ou "1 -" (ALESP). */
const RE_ITEM = /^(\d+)\s*(?:[.)]\s*[-–]?|[-–])\s*(?=\S)/;
/** "ANEXO", "ANEXO I", "ANEXO - Revogado." (ALESP); só em maiúsculas (regra 11). */
const RE_ANEXO = /^ANEXO(?:\s+([IVXLC]+|[ÚU]NICO))?(?![A-Za-zÀ-ú])\s*[-–—.:]?\s*/;
/** "Pena - …", "Pena: …" e "Pena Detenção…" (CDC, sem hífen); "Pena de multa" é rubrica (CP). */
const RE_PENA = /^Pena\s*[-–:]|^Pena\s+(?:[Rr]eclus|[Dd]eten|[Pp]ris|[Mm]ulta)/;
const TIPO_ESTRUTURAL = /** @type {Record<string, TipoEstrutural>} */ ({
  PARTE: 'parte',
  LIVRO: 'livro',
  TITULO: 'titulo',
  CAPITULO: 'capitulo',
  SECAO: 'secao',
  SUBSECAO: 'subsecao',
});

/** @param {string | undefined} s */
const sufixo = (s) => (s ?? '').replace(/[\s-]/g, '');

/**
 * Reconhece o rótulo no começo da linha.
 * @param {string} t Linha limpa.
 * @returns {Rotulo}
 */
export function rotulo(t) {
  let m = RE_ESTRUTURAL.exec(t);
  if (m) {
    const chave = m[1]
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '');
    const tipo = TIPO_ESTRUTURAL[chave];
    if (m[2] || tipo === 'parte') {
      return { tipo, numero: (m[2] ?? '').toUpperCase(), sufixo: '', resto: m[3] };
    }
  }
  if ((m = RE_ANEXO.exec(t))) {
    return {
      tipo: 'anexo',
      numero: (m[1] ?? '').toUpperCase(),
      sufixo: '',
      resto: t.slice(m[0].length),
    };
  }
  if ((m = RE_ARTIGO.exec(t))) {
    const numero = Number(m[1].replace(/\./g, ''));
    return { tipo: 'artigo', numero, sufixo: sufixo(m[2]), resto: t.slice(m[0].length) };
  }
  if ((m = RE_PARAGRAFO.exec(t))) {
    return {
      tipo: 'paragrafo',
      numero: Number(m[1]),
      sufixo: sufixo(m[2]),
      resto: t.slice(m[0].length),
    };
  }
  if ((m = RE_PARAGRAFO_UNICO.exec(t))) {
    return { tipo: 'paragrafo', numero: 0, sufixo: '', resto: t.slice(m[0].length) };
  }
  if ((m = RE_INCISO.exec(t))) {
    return { tipo: 'inciso', numero: m[1], sufixo: sufixo(m[2]), resto: t.slice(m[0].length) };
  }
  if ((m = RE_INCISO_SEM_HIFEN.exec(t)) && /[.;:]$/.test(separarNotas(t).texto)) {
    return { tipo: 'inciso', numero: m[1], sufixo: '', resto: t.slice(m[0].length) };
  }
  if ((m = RE_ALINEA.exec(t))) {
    return { tipo: 'alinea', numero: m[1], sufixo: sufixo(m[2]), resto: t.slice(m[0].length) };
  }
  if ((m = RE_ITEM.exec(t))) {
    return { tipo: 'item', numero: Number(m[1]), sufixo: '', resto: t.slice(m[0].length) };
  }
  if (RE_PENA.test(t)) return { tipo: 'pena', resto: t };
  return { tipo: 'outro', resto: t };
}

/**
 * Renumeração dita a partir do dispositivo (acerto da 8.7): "(Parágrafo único renumerado pela Lei
 * nº 9.983, de 2000)" (CP, art. 153, § 1º), "(Parágrafo único renumerado para § 1º pela Emenda…)"
 * (CF, art. 198, § 1º) e "(Transformado em § 1º pela Emenda Constitucional nº 3, de 17/03/93)"
 * (CF, art. 102, § 1º). A palavra vem logo depois do rótulo: "(parágrafo único do artigo 14)"
 * (LEP, art. 120, II) é texto.
 */
const RENUMERADO_PELO_DISPOSITIVO =
  '(?:Par[áa]grafo(?:\\s+[úu]nico)?|§\\s*\\d+\\s*[ºo°]?(?:-[A-Z])?|Inciso\\s+[IVXLCDM]+(?:-[A-Z])?|' +
  'Al[íi]nea\\s+"?[a-z]"?|Item\\s+\\d+)\\s+(?:renumerad|transformad)[oa]s?|Transformad[oa]s?\\s+em';
/**
 * Palavras que abrem nota de vigência (Parte 2 §10.6, regra 7, e as variantes do corpus). "(NR)"
 * ("nova redação") é o marcador da ALESP no fim do texto alterado.
 */
const CHAVES_NOTA =
  '(?:Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Revogad[oa]|Vide|Vig[êe]ncia|Renumerad[oa]|Regulamento|' +
  'Promulga[çc][ãa]o|Produ[çc][ãa]o de efeito|Acrescid[oa]|Suprimid[oa]|' +
  'Express[ãa]o (?:substitu[íi]d|declarad|suprimid|acrescid|inclu[íi]d|revogad)[oa]|' +
  `${RENUMERADO_PELO_DISPOSITIVO}|NR(?=\\s*\\)))`;
/**
 * Parênteses com uma chave de nota (admite um nível de parênteses dentro); ou candidata a nota
 * solta, sem parênteses (link do Planalto), que `ehNotaSolta` confirma.
 */
const RE_NOTA = new RegExp(
  String.raw`\(\s*${CHAVES_NOTA}[^()]*(?:\([^()]*\)[^()]*)*\)` +
    String.raw`|(?<=\s|\))(?:Vig[êe]ncia|Regulamento|Produ[çc][ãa]o de efeitos?)(?=\s*(?:\(|$))` +
    String.raw`|(?<=\s|\))Vide [^()]*?(?=\s*(?:\(|$))`,
  'gi',
);

/**
 * Nota solta, sem parênteses, só com a chave em maiúscula:
 * - "Vigência", "Regulamento", "Produção de efeitos" e "Vide …" logo depois de outra nota ("(Vide
 *   Emenda Constitucional nº 132…) Vigência", CF; "…) Produção de efeitos", ADCT; "…) Vide art. 96
 *   - ADCT", CF, art. 18, § 4º);
 * - "Vide …" depois do fim da frase ("…do artigo anterior. Vide Lei nº 8.072, de 25.7.90", CP, art.
 *   158, § 2º);
 * - "Regulamento" e "Vigência" no fim da linha, depois do fim da frase ou do nome em caixa alta
 *   ("…os seguintes preceitos: Regulamento", CF, art. 17; "…DA REFORMA AGRÁRIA Regulamento").
 * @param {string} nota @param {string} linha @param {number} inicio
 */
function ehNotaSolta(nota, linha, inicio) {
  if (!/^(?:Vig[êe]ncia|Regulamento|Produ[çc][ãa]o de efeitos?|Vide )/.test(nota)) return false;
  const antes = linha.slice(0, inicio).trimEnd();
  if (antes.endsWith(')')) return true;
  if (nota.startsWith('Vide')) return /[.;:]$/.test(antes);
  const noFim = linha.slice(inicio + nota.length).trim() === '';
  return noFim && /^(?:Regulamento|Vig)/.test(nota) && /(?:[.;:]|[A-ZÀ-Ú]{2})$/.test(antes);
}
/** Nota sem o parêntese de fecho no fim da linha (ECA, art. 233: "(Revogado pela Lei nº 9.455, de 7.4.1997"). */
const RE_NOTA_SEM_FECHO = new RegExp(String.raw`\(\s*${CHAVES_NOTA}[^()]*$`, 'i');

/**
 * Número solto depois do fim da frase: link da fonte para outro ato, fora do texto (LEP, art. 18-A,
 * § 3º: "…aos presos e às presas. 7.627 (Incluído…)", link para o Decreto 7.627/2011; apontado pelo
 * Gabriel na conferência de 24/09/2026). Vira nota; a compilada não o traz.
 */
const RE_NUMERO_SOLTO = /(?<=[.;:])\s+(\d{1,3}(?:\.\d{3})+)\s*$/;

const RE_NOTA_SEM_PARENTESES =
  /\s((?:Inclu[íi]d[oa]|Reda[çc][ãa]o dada|Acrescid[oa]|Revogad[oa]|Renumerad[oa]) pel[oa] (?:Lei|Emenda|Medida|Decreto)[^()]*?, de \d{4})(?:\s+(Vig[êe]ncia))?\s*$/;

/**
 * Tira as notas de vigência do texto ("(Redação dada pela Lei…)", "(Vigência)", "(Vide…)").
 * @param {string} texto
 * @returns {{ texto: string, notas: string[] }}
 */
export function separarNotas(texto) {
  /** @type {string[]} */
  const notas = [];
  let sem = texto.replace(RE_NOTA, (nota, inicio, linha) => {
    // "(Revogado)" sozinho é o texto do dispositivo revogado, não nota (a nota diz por qual lei).
    if (/^\(\s*revogad[oa]\s*\)$/i.test(nota)) return nota;
    if (!nota.startsWith('(') && !ehNotaSolta(nota, linha, inicio)) return nota;
    notas.push(limpar(nota));
    return ' ';
  });
  // Nota sem o parêntese de fecho, no fim (a sobra " :" depois dela sai junto).
  const aberta = RE_NOTA_SEM_FECHO.exec(sem);
  if (aberta) {
    notas.push(limpar(aberta[0]).replace(/[\s.,;:]+$/, ''));
    sem = sem.slice(0, aberta.index);
  }
  // Nota sem parênteses no fim (CP, art. 232-A: "…com violência; ou Incluído pela Lei nº 13.445,
  // de 2017 Vigência"): só com a chave em maiúscula, "pela Lei…" e o ano fechando a linha.
  const numero = RE_NUMERO_SOLTO.exec(sem);
  if (numero) {
    notas.push(/** @type {string} */ (numero[1]));
    return { texto: limpar(sem.slice(0, numero.index)), notas };
  }
  const solta = RE_NOTA_SEM_PARENTESES.exec(sem);
  if (!solta) return { texto: limpar(sem), notas };
  return {
    texto: limpar(sem.slice(0, solta.index)),
    notas: [...notas, limpar(solta[1]), ...(solta[2] ? [solta[2]] : [])],
  };
}

/** Tem letra e nenhuma minúscula. @param {string} s */
const caixaAlta = (s) => /[A-ZÀ-Ú]/.test(s) && !/[a-zà-ú]/.test(s);

/** Endereço de artigo, com o prefixo do bloco se houver: `art9A`, `adct.art76B`. */
const RE_ENDERECO_ARTIGO = /^(?:([a-z]+)\.)?art(\d+)([A-Z]*)$/;
/** @param {string} e */
const ehArtigo = (e) => RE_ENDERECO_ARTIGO.test(e);
/** @param {string} e @returns {{ prefixo: string, numero: number, sufixo: string }} */
const partesDoArtigo = (e) => {
  const [, prefixo = '', n, suf] = /** @type {RegExpExecArray} */ (RE_ENDERECO_ARTIGO.exec(e));
  return { prefixo, numero: Number(n), sufixo: suf };
};

/** Só pontuação (ou nada); "§" e parêntese soltos são sobra do tachado. @param {string} s */
const vazio = (s) => /^[\s.,;:()§–—-]*$/.test(s);
/** @param {string[]} notas */
const revoga = (notas) => notas.some((n) => /revogad/i.test(n));

// ---------------------------------------------------------------------------------------------
// Inventário

/**
 * @typedef {object} Redacao
 * @property {string} texto Linha tachada inteira (com rótulo e notas).
 * @property {'tachado' | 'revogacao' | 'duplicata'} origem `tachado`: linha toda tachada;
 *   `revogacao`: texto tachado ao lado de "(Revogado…)"; `duplicata`: linha sem tachado
 *   substituída por outra de mesmo endereço.
 * @property {string} [enderecoLido] Endereço da linha tachada, quando não há dispositivo vigente
 *   com ele e a redação foi para o ancestral mais próximo (estrutura antiga, renumeração).
 */

/**
 * @typedef {object} Dispositivo
 * @property {string} endereco Ex.: `art9A`, `art5.par2.incIII.alB`, `art2.parUnico`.
 * @property {TipoNormativo} tipo
 * @property {'vigente' | 'revogado' | 'vetado'} status
 * @property {string} rotulo Como na página ("Art. 9º-A.", "§ 1o", "Parágrafo único.").
 * @property {string} texto Texto vigente sem rótulo e sem notas ("" se revogado ou vetado);
 *   as linhas "Pena - …" seguintes entram depois de uma quebra de linha.
 * @property {string[]} notas Notas de vigência do texto vigente, na ordem.
 * @property {Redacao[]} redacoes
 * @property {string} [nome] Rubrica logo antes do dispositivo (CP: "Anterioridade da Lei").
 * @property {number} linha Índice da primeira linha do dispositivo (ordem na página).
 */

/**
 * @typedef {object} NoEstrutural
 * @property {TipoEstrutural} tipo
 * @property {string} rotulo "TÍTULO I", "Seção II"…
 * @property {string} nome
 * @property {string | null} primeiroArtigo
 * @property {string[]} [notas] Notas em linha própria logo depois do nó (ALESP: "- Subseção VII
 *   renumerada para VIII pela…").
 */

/**
 * @typedef {object} Caso Situação da página que o estruturador precisa tratar (8.2–8.6).
 * @property {string} tipo
 * @property {number} linha
 * @property {string} [endereco]
 * @property {string} texto
 */

/**
 * @typedef {object} Inventario
 * @property {Dispositivo[]} dispositivos Em ordem de página.
 * @property {NoEstrutural[]} estrutura
 * @property {Caso[]} casos
 */

/**
 * Monta o inventário de dispositivos a partir das linhas, na ordem da página:
 * - rótulo decide o tipo; endereço pela sequência (inciso sob o último caput ou parágrafo,
 *   alínea sob o último inciso, item sob a última alínea);
 * - linha toda tachada é redação anterior do dispositivo de mesmo endereço; sem ele, do
 *   ancestral mais próximo (`enderecoLido`), ou vira artigo revogado se for artigo;
 * - rótulo fora do tachado, texto tachado e nota "Revogado" = dispositivo revogado, com o
 *   texto como redação anterior;
 * - mesmo endereço de novo sem tachado: vale a última linha, a anterior vira redação
 *   (caso `duplicata`, ou `revogacao-reescrita` quando a primeira era uma revogação);
 * - "Pena - …" continua o dispositivo anterior; linha curta sem rótulo antes de um
 *   dispositivo é o nome (rubrica); a primeira depois de um nó estrutural é o nome do nó;
 * - linha de nota ("- Inciso IX com redação dada pela…", ALESP) é nota do último dispositivo ou
 *   nó; tachada, continua a redação anterior tachada logo acima;
 * - a linha que abre um bloco (ADCT) passa a prefixar os endereços dos artigos seguintes;
 * - depois de um "ANEXO", o que não é outro anexo nem nota é texto bruto dele (regra 11).
 * @param {Linha[]} linhas
 * @param {{ blocos?: readonly Bloco[] }} [opcoes]
 * @returns {Inventario}
 */
export function inventariar(linhas, opcoes = {}) {
  const blocos = opcoes.blocos ?? [];
  /** @type {Map<string, Dispositivo>} */
  const disp = new Map();
  /** @type {NoEstrutural[]} */
  const estrutura = [];
  /** @type {Caso[]} */
  const casos = [];
  /** @type {{ endereco: string, linha: number, texto: string, revogadoPor: string[], rubricas: string[] }[]} */
  const tachadas = [];
  let ctx = { art: '', par: '', inc: '', al: '' };
  /** @type {NoEstrutural | null} */
  let no = null;
  let aguardandoNomeDoNo = false;
  /** @type {string[]} */
  let rubricas = [];
  /** As notas de cada rubrica pendente (mesma ordem de `rubricas`). */
  /** @type {string[][]} */
  let notasDasRubricas = [];
  /** Primeira linha tachada depois das rubricas pendentes (a dona delas, se não houver vigente). */
  /** @type {(typeof tachadas)[number] | null} */
  let captura = null;
  /** @type {{ vigente: string } | { tachada: (typeof tachadas)[number] } | null} */
  let ultimo = null;
  /** Último dispositivo ou nó (a quem vai a linha de nota). */
  let ultimoFoiNo = false;
  let prefixo = '';
  let emAnexo = false;
  /** O nome do último nó está em caixa alta e pode continuar na linha seguinte. */
  let nomeDoNoContinua = false;
  /** Dentro de uma citação entre aspas em várias linhas (CDC, art. 113). */
  let citacao = false;

  /** @param {Rotulo} r */
  const endereco = (r) => {
    const suf = r.sufixo ?? '';
    if (r.tipo === 'artigo') return `${prefixo ? `${prefixo}.` : ''}art${String(r.numero)}${suf}`;
    if (r.tipo === 'anexo') return `anexo${String(r.numero)}`;
    if (!ctx.art) return '';
    if (r.tipo === 'paragrafo') {
      return `${ctx.art}.${r.numero === 0 ? 'parUnico' : `par${String(r.numero)}${suf}`}`;
    }
    if (r.tipo === 'inciso') return `${ctx.par || ctx.art}.inc${String(r.numero)}${suf}`;
    if (r.tipo === 'alinea') {
      return `${ctx.inc || ctx.par || ctx.art}.al${String(r.numero).toUpperCase()}${suf}`;
    }
    return `${ctx.al || ctx.inc || ctx.par || ctx.art}.it${String(r.numero)}`;
  };
  /** @param {Rotulo} r @param {string} e */
  const avancar = (r, e) => {
    if (r.tipo === 'artigo') ctx = { art: e, par: '', inc: '', al: '' };
    else if (r.tipo === 'anexo') ctx = { art: '', par: '', inc: '', al: '' };
    else if (r.tipo === 'paragrafo') ctx = { ...ctx, par: e, inc: '', al: '' };
    else if (r.tipo === 'inciso') ctx = { ...ctx, inc: e, al: '' };
    else if (r.tipo === 'alinea') ctx = { ...ctx, al: e };
  };

  linhas.forEach((l, i) => {
    let r = rotulo(l.texto);
    const rv = rotulo(l.vigente);
    const rotuloVigente = /** @type {readonly string[]} */ ([
      ...NORMATIVOS,
      ...ESTRUTURAIS,
    ]).includes(rv.tipo);
    // Fora do tachado, sem o rótulo e as notas, não sobra texto: com nota "Revogado" a linha é a
    // revogação do dispositivo; sem ela, é redação anterior (rótulo ou nota que escaparam do
    // tachado, como "§ 8º" do art. 129 do CP). Pedaço do rótulo fora do tachado conta como rótulo
    // (CF: "III ~~- classistas…~~ (Revogado pela…)"; "c ~~) os nascidos…~~").
    const foraDoTachado = separarNotas(rotuloVigente ? rv.resto : l.vigente);
    if (!rotuloVigente && l.anterior !== '' && NORMATIVOS.includes(/** @type {never} */ (r.tipo))) {
      const doRotulo = l.texto.slice(0, l.texto.length - r.resto.length).replace(/\s/g, '');
      if (doRotulo.startsWith(foraDoTachado.texto.replace(/\s/g, ''))) foraDoTachado.texto = '';
    } else if (
      !rotuloVigente &&
      l.anterior !== '' &&
      /^(?:[IVXLC]+|A)$/.test(foraDoTachado.texto)
    ) {
      // O pedaço do rótulo fora do tachado separado do resto por um espaço (ECA, art. 90: "I
      // ~~V - abrigo;~~"; CP, art. 45: "I ~~I - ocorrer…~~"; CP, art. 334: "A ~~rt. 334…~~",
      // capitular): o rótulo é o pedaço junto com o começo do tachado.
      const junto = rotulo(`${foraDoTachado.texto}${l.anterior}`);
      if (NORMATIVOS.includes(/** @type {never} */ (junto.tipo))) {
        r = junto;
        foraDoTachado.texto = '';
      }
    }
    const semTexto = l.anterior !== '' && vazio(foraDoTachado.texto);
    const revogadaInteira = semTexto && revoga(foraDoTachado.notas);
    const tachada = !revogadaInteira && (l.fracaoTachada >= 0.999 || semTexto);
    // Rótulo antigo tachado ao lado do novo (ALESP: "~~X~~ XI - outras previstas em lei.";
    // "~~Parágrafo único~~ § 1° - O Defensor…"): vale o rótulo de fora do tachado.
    const renumerado =
      !tachada &&
      l.anterior !== '' &&
      NORMATIVOS.includes(/** @type {never} */ (rv.tipo)) &&
      (rv.tipo !== r.tipo || rv.numero !== r.numero || rv.sufixo !== r.sufixo);
    if (renumerado) {
      casos.push({ tipo: 'rotulo-renumerado', linha: i, texto: l.texto });
      r = rv;
    }

    // Nota em linha própria (ALESP), logo depois do que ela anota.
    if (/^[-–]\s+\S/.test(l.texto)) {
      if (tachada) {
        if (ultimo && 'tachada' in ultimo && !ultimoFoiNo) ultimo.tachada.texto += `\n${l.texto}`;
        return;
      }
      const nota = limpar(l.vigente.replace(/^[-–]\s+/, ''));
      if (ultimoFoiNo && no) (no.notas ??= []).push(nota);
      else if (ultimo && 'tachada' in ultimo) {
        ultimo.tachada.texto += `\n${l.texto}`;
        if (revoga([nota])) ultimo.tachada.revogadoPor.push(nota);
      } else if (ultimo) /** @type {Dispositivo} */ (disp.get(ultimo.vigente)).notas.push(nota);
      else casos.push({ tipo: 'nota-sem-dispositivo', linha: i, texto: l.texto });
      return;
    }

    // Texto bruto do anexo (regra 11): não se estrutura.
    if (emAnexo && r.tipo !== 'anexo') {
      if (ultimo && 'tachada' in ultimo) {
        if (tachada || l.anterior !== '') ultimo.tachada.texto += `\n${l.texto}`;
      } else if (ultimo && !tachada) {
        const d = /** @type {Dispositivo} */ (disp.get(ultimo.vigente));
        if (d.status === 'vigente') d.texto += `\n${l.vigente}`;
      }
      return;
    }

    // Citação da lei alterada, entre aspas (CDC, arts. 110 a 117; ECA, art. 264): continua o
    // último dispositivo, depois de uma quebra de linha; sem as aspas de fecho, as linhas seguintes
    // também, até a que as fecha (artigo e rótulo estrutural fecham antes, se faltar o par).
    const abreCitacao = !tachada && /^["“”«]/.test(l.vigente);
    if (
      citacao &&
      !abreCitacao &&
      (r.tipo === 'artigo' || ESTRUTURAIS.includes(/** @type {never} */ (r.tipo)))
    )
      citacao = false;
    if ((citacao || abreCitacao) && !tachada && ultimo && 'vigente' in ultimo && !ultimoFoiNo) {
      const d = /** @type {Dispositivo} */ (disp.get(ultimo.vigente));
      const partes = separarNotas(l.vigente);
      if (d.status === 'vigente') {
        d.texto += `\n${partes.texto}`;
        d.notas.push(...partes.notas);
      }
      citacao = !/["”»][\s.,;:)]*$/.test(partes.texto);
      return;
    }

    const bloco = tachada ? undefined : blocos.find((b) => b.inicio.test(l.vigente));
    if (bloco) {
      prefixo = bloco.prefixo;
      ctx = { art: '', par: '', inc: '', al: '' };
      if (r.tipo === 'outro' && !aguardandoNomeDoNo) {
        no = { tipo: 'bloco', rotulo: l.vigente, nome: '', primeiroArtigo: null };
        estrutura.push(no);
        ultimoFoiNo = true;
        rubricas = [];
        notasDasRubricas = [];
        captura = null;
        return;
      }
    }

    if (/** @type {readonly string[]} */ (ESTRUTURAIS).includes(r.tipo)) {
      if (tachada || l.fracaoTachada > 0.5) {
        casos.push({ tipo: 'estrutural-tachado', linha: i, texto: l.texto });
        return;
      }
      // Mesmo nó de novo sem artigo no meio (CP: "TÍTULO VI — DOS CRIMES CONTRA OS COSTUMES" sem
      // tachado antes do novo Título VI): vale o último; o antigo e o que veio abaixo dele saem.
      // Rótulo e nome saem do texto fora do tachado quando ele mesmo começa pelo rótulo (nome
      // antigo tachado na mesma linha); senão, da linha inteira.
      const [linhaNo, rNo] = rv.tipo === r.tipo ? [l.vigente, rv] : [l.texto, r];
      const rotuloNo = separarNotas(linhaNo.slice(0, linhaNo.length - rNo.resto.length)).texto;
      const repetido = estrutura.findLastIndex(
        (n) => n.primeiroArtigo === null && n.tipo === r.tipo && n.rotulo === rotuloNo,
      );
      if (repetido !== -1) {
        for (const velho of estrutura.splice(repetido)) {
          casos.push({
            tipo: 'estrutural-substituido',
            linha: i,
            texto: `${velho.rotulo} ${velho.nome}`.trim(),
          });
        }
      }
      no = {
        tipo: /** @type {TipoEstrutural} */ (r.tipo),
        rotulo: rotuloNo,
        nome: separarNotas(rNo.resto).texto,
        primeiroArtigo: null,
      };
      estrutura.push(no);
      aguardandoNomeDoNo = no.nome === '';
      nomeDoNoContinua = caixaAlta(no.nome);
      ultimoFoiNo = true;
      rubricas = [];
      notasDasRubricas = [];
      captura = null;
      return;
    }

    if (r.tipo === 'outro' || r.tipo === 'pena') {
      if (r.tipo === 'pena' && ultimo) {
        if ('tachada' in ultimo) {
          if (l.anterior !== '' || tachada) ultimo.tachada.texto += `\n${l.texto}`;
          if (revoga(foraDoTachado.notas)) ultimo.tachada.revogadoPor.push(...foraDoTachado.notas);
          return;
        }
        const d = /** @type {Dispositivo} */ (disp.get(ultimo.vigente));
        if (l.anterior !== '' || tachada) {
          d.redacoes.push({ texto: l.texto, origem: tachada ? 'tachado' : 'revogacao' });
        } else if (d.status === 'vigente') {
          const pena = separarNotas(l.vigente);
          d.texto += `\n${pena.texto}`;
          d.notas.push(...pena.notas);
        }
        return;
      }
      if (tachada || vazio(foraDoTachado.texto)) return; // rubrica antiga ou só nota
      const anterior =
        ultimo && 'vigente' in ultimo && !ultimoFoiNo ? disp.get(ultimo.vigente) : undefined;
      if (aguardandoNomeDoNo && no) {
        no.nome = foraDoTachado.texto;
        aguardandoNomeDoNo = false;
        nomeDoNoContinua = caixaAlta(no.nome);
      } else if (nomeDoNoContinua && no && r.tipo === 'outro' && caixaAlta(foraDoTachado.texto)) {
        // Nome do nó quebrado em duas linhas (CP: "DOS CRIMES CONTRA O ESTADO / DEMOCRÁTICO DE
        // DIREITO").
        no.nome += ` ${foraDoTachado.texto}`;
      } else if (
        r.tipo === 'outro' &&
        anterior?.status === 'vigente' &&
        /^[a-zà-ú]/.test(foraDoTachado.texto) &&
        !/[.;:]$/.test(anterior.texto)
      ) {
        // Parágrafo da fonte quebrado em duas linhas (ALESP, art. 159: "…bem como os concedidos"
        // / "aos advogados em geral."): continua o texto do dispositivo.
        anterior.texto += ` ${foraDoTachado.texto}`;
        anterior.notas.push(...foraDoTachado.notas);
        casos.push({
          tipo: 'linha-continuada',
          linha: i,
          endereco: anterior.endereco,
          texto: l.texto,
        });
      } else if (r.tipo === 'outro' && /[;,]$/.test(foraDoTachado.texto)) {
        // Rubrica não termina como inciso; é sobra da fonte (ALESP: "bracionalização na
        // execução das funções;" antes do "IV - racionalização…").
        casos.push({ tipo: 'linha-solta', linha: i, texto: l.texto });
      } else if (r.tipo === 'outro') {
        rubricas.push(foraDoTachado.texto);
        notasDasRubricas.push(foraDoTachado.notas);
        nomeDoNoContinua = false;
      }
      return;
    }

    aguardandoNomeDoNo = false;
    nomeDoNoContinua = false;
    const e = endereco(r);
    if (!e) {
      casos.push({ tipo: 'fora-de-artigo', linha: i, texto: l.texto });
      return;
    }
    avancar(r, e);
    ultimoFoiNo = false;
    if (r.tipo === 'anexo') {
      // O anexo vem depois da assinatura: as linhas soltas antes dele não são rubrica.
      emAnexo = true;
      rubricas = [];
      notasDasRubricas = [];
      captura = null;
    }
    if (tachada) {
      // As rubricas seguem pendentes: são do vigente de mesmo endereço, se vier; senão, deste
      // artigo só tachado (CP, art. 185: "Usurpação de nome ou pseudônimo alheio"). Parágrafo ou
      // inciso tachado não as captura: elas esperam o próximo vigente.
      const capturar = !captura && rubricas.length > 0 && ehArtigo(e);
      const t = {
        endereco: e,
        linha: i,
        texto: l.texto,
        revogadoPor: [],
        rubricas: capturar ? [...rubricas] : [],
      };
      if (capturar) captura = t;
      tachadas.push(t);
      ultimo = { tachada: t };
      return;
    }

    const capturou = captura !== null;
    if (captura && captura.endereco !== e) {
      rubricas = rubricas.slice(captura.rubricas.length);
      notasDasRubricas = notasDasRubricas.slice(captura.rubricas.length);
    } else if (captura) captura.rubricas = [];
    captura = null;
    // Rubricas seguidas: a do dispositivo é a última; as de antes não chegaram a dispositivo e são
    // as últimas linhas do anterior (ECA, art. 258-C: "Medida Administrativa - …" antes de
    // "Disposições Finais e Transitórias", a rubrica do art. 259).
    const doAnterior =
      ultimo && 'vigente' in ultimo && !ultimoFoiNo ? disp.get(ultimo.vigente) : undefined;
    if (rubricas.length > 1 && !capturou && doAnterior?.status === 'vigente') {
      rubricas.slice(0, -1).forEach((texto, k) => {
        doAnterior.texto += `\n${texto}`;
        doAnterior.notas.push(...(notasDasRubricas[k] ?? []));
      });
      rubricas = rubricas.slice(-1);
      notasDasRubricas = notasDasRubricas.slice(-1);
    }
    const partes = revogadaInteira
      ? foraDoTachado
      : separarNotas(rv.tipo === r.tipo ? rv.resto : '');
    /** @type {Dispositivo['status']} */
    let status = 'vigente';
    if (/^\(?\s*vetad[oa]\s*\)?[\s.;,:]*$/i.test(partes.texto)) status = 'vetado';
    else if (/^\(?\s*revogad[oa]\s*\)?[\s.;,]*$/i.test(partes.texto)) status = 'revogado';
    else if (vazio(partes.texto) && revoga(partes.notas)) status = 'revogado';
    else if (vazio(partes.texto))
      casos.push({ tipo: 'sem-texto', linha: i, endereco: e, texto: l.texto });
    if (l.anterior !== '' && status === 'vigente') {
      casos.push({ tipo: 'tachado-parcial', linha: i, endereco: e, texto: l.texto });
    }
    const base = revogadaInteira ? l.texto : l.vigente;
    /** @type {Dispositivo} */
    const novo = {
      endereco: e,
      tipo: /** @type {TipoNormativo} */ (r.tipo),
      status,
      rotulo: limpar(
        base.slice(0, base.length - (revogadaInteira ? r.resto : (rv.resto ?? '')).length),
      ),
      texto: status === 'vigente' ? partes.texto : '',
      notas: partes.notas,
      redacoes: l.anterior !== '' ? [{ texto: l.texto, origem: 'revogacao' }] : [],
      ...(rubricas.length > 0 ? { nome: rubricas.join(' / ') } : {}),
      linha: i,
    };
    rubricas = [];
    notasDasRubricas = [];
    const antigo = disp.get(e);
    if (antigo) {
      const reescrita =
        antigo.status === 'revogado' && antigo.redacoes.some((x) => x.origem === 'revogacao');
      casos.push({
        tipo: reescrita ? 'revogacao-reescrita' : 'duplicata',
        linha: i,
        endereco: e,
        texto: l.texto,
      });
      const substituida = `${antigo.rotulo} ${antigo.texto || `(${antigo.status})`}`;
      novo.redacoes = [
        ...antigo.redacoes,
        ...(reescrita ? [] : [{ texto: substituida, origem: /** @type {const} */ ('duplicata') }]),
        ...novo.redacoes,
      ];
      if (antigo.nome && !novo.nome) novo.nome = antigo.nome;
      novo.linha = antigo.linha;
    }
    disp.set(e, novo);
    ultimo = { vigente: e };
    if (novo.tipo === 'artigo') for (const n of estrutura) n.primeiroArtigo ??= e;
  });

  // Linhas tachadas: artigos primeiro (um artigo só tachado vira artigo revogado), depois o resto.
  const porNivel = [...tachadas].sort(
    (a, b) => Number(!ehArtigo(a.endereco)) - Number(!ehArtigo(b.endereco)),
  );
  for (const t of porNivel) {
    if (!disp.has(t.endereco) && ehArtigo(t.endereco)) {
      casos.push({
        tipo: 'artigo-so-tachado',
        linha: t.linha,
        endereco: t.endereco,
        texto: t.texto,
      });
      disp.set(t.endereco, {
        endereco: t.endereco,
        tipo: 'artigo',
        status: 'revogado',
        rotulo: limpar(t.texto.slice(0, t.texto.length - rotulo(t.texto).resto.length)),
        texto: '',
        notas: t.revogadoPor,
        redacoes: [{ texto: t.texto, origem: 'tachado' }],
        ...(t.rubricas.length > 0 ? { nome: t.rubricas.join(' / ') } : {}),
        linha: t.linha,
      });
      continue;
    }
    let alvo = t.endereco;
    while (!disp.has(alvo) && !ehArtigo(alvo) && alvo.includes('.'))
      alvo = alvo.slice(0, alvo.lastIndexOf('.'));
    const d = disp.get(alvo);
    if (!d) {
      casos.push({
        tipo: 'tachado-sem-dispositivo',
        linha: t.linha,
        endereco: t.endereco,
        texto: t.texto,
      });
      continue;
    }
    d.redacoes.push({
      texto: t.texto,
      origem: 'tachado',
      ...(alvo !== t.endereco ? { enderecoLido: t.endereco } : {}),
    });
  }

  // Revogado sob um pai que só existe tachado (CP, art. 187, parágrafo único, II; CF, art. 115,
  // parágrafo único, III) é detalhe da redação antiga: vai para o ancestral mais próximo. Vigente
  // sem pai é endereço errado (caso sem-pai, pendência no gabarito).
  // Do raso ao fundo: o filho de um revogado que saiu também fica sem pai e sai atrás dele.
  const porProfundidade = [...disp.values()].sort(
    (a, b) => a.endereco.split('.').length - b.endereco.split('.').length,
  );
  for (const d of porProfundidade) {
    if (ehArtigo(d.endereco) || d.tipo === 'anexo') continue;
    let alvo = d.endereco.slice(0, d.endereco.lastIndexOf('.'));
    if (disp.has(alvo)) continue;
    while (!disp.has(alvo) && !ehArtigo(alvo) && alvo.includes('.'))
      alvo = alvo.slice(0, alvo.lastIndexOf('.'));
    const ancestral = disp.get(alvo);
    if (d.status === 'vigente' || !ancestral) {
      casos.push({ tipo: 'sem-pai', linha: d.linha, endereco: d.endereco, texto: d.rotulo });
      continue;
    }
    disp.delete(d.endereco);
    casos.push({ tipo: 'revogado-sem-pai', linha: d.linha, endereco: d.endereco, texto: d.rotulo });
    ancestral.redacoes.push(
      ...d.redacoes.map((r) => ({ ...r, enderecoLido: r.enderecoLido ?? d.endereco })),
    );
  }

  const dispositivos = [...disp.values()].sort((a, b) => a.linha - b.linha);
  for (const d of dispositivos) {
    if (!d.endereco.endsWith('.parUnico') || d.status !== 'vigente') continue;
    const art = d.endereco.slice(0, -'.parUnico'.length);
    if (disp.get(`${art}.par1`)?.status === 'vigente') {
      casos.push({
        tipo: 'paragrafo-unico-com-numerado',
        linha: d.linha,
        endereco: d.endereco,
        texto: d.rotulo,
      });
    }
  }
  for (const d of dispositivos) {
    if (!/\.par1$/.test(d.endereco) || d.status !== 'vigente') continue;
    if (!disp.has(`${d.endereco.slice(0, -1)}2`)) {
      casos.push({
        tipo: 'paragrafo-1-sem-2',
        linha: d.linha,
        endereco: d.endereco,
        texto: d.rotulo,
      });
    }
  }
  return { dispositivos, estrutura, casos };
}

// ---------------------------------------------------------------------------------------------
// Sinais independentes

/**
 * Comparação tolerante de textos de duas páginas (ordinal, aspas, travessões, espaços e
 * pontuação final): só para achar divergência, nunca para gravar.
 * @param {string} s
 */
export function paraComparar(s) {
  return s
    .normalize('NFC')
    .replace(/[“”"«»]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/(\d)\s*[º°o](?![a-zà-ú])/g, '$1º')
    .replace(/\s+/g, ' ')
    .replace(/\s*([,.;:)])/g, '$1')
    .replace(/\(\s*/g, '(')
    .replace(/[.;:,\s]+$/, '')
    .trim();
}

/**
 * @typedef {object} Divergencia
 * @property {string} tipo `so-na-pagina`, `so-na-compilada`, `status`, `texto`, `ancora`,
 *   `artigo-sem-ancora`, `texto-puro`, `sequencia`, `bloco`, `ultimo-artigo`, `sem-pai`; e
 *   `decisao-sem-uso` (entrada de `DECISOES` que não explica nenhuma divergência).
 * @property {string} chave Endereço (ou âncora).
 * @property {string} [explicacao] Regra que explica a divergência; sem ela, é pendência.
 * @property {string} [detalhe]
 */

/**
 * Página com todas as redações × página compilada (só o vigente). Explicadas por regra:
 * detalhe de dispositivo revogado ou vetado que a compilada resume numa linha, e dispositivo que
 * a compilada lista como revogado mas a página só traz tachado (vira redação anterior).
 * @param {Inventario} pagina
 * @param {Inventario} compilada
 * @returns {Divergencia[]}
 */
export function cruzarComCompilada(pagina, compilada) {
  const p = new Map(pagina.dispositivos.map((d) => [d.endereco, d]));
  const c = new Map(compilada.dispositivos.map((d) => [d.endereco, d]));
  const lidos = new Set(pagina.dispositivos.flatMap((d) => d.redacoes.map((r) => r.enderecoLido)));
  /** @type {Divergencia[]} */
  const saida = [];
  for (const d of pagina.dispositivos) {
    const outro = c.get(d.endereco);
    if (!outro) {
      const ancestrais = d.endereco
        .split('.')
        .map((_, i, partes) => partes.slice(0, i + 1).join('.'));
      const fora = ancestrais.some((a) => p.get(a)?.status !== 'vigente');
      saida.push({
        tipo: 'so-na-pagina',
        chave: d.endereco,
        ...(fora
          ? { explicacao: 'detalhe de dispositivo revogado ou vetado; a compilada o resume' }
          : {}),
      });
    } else if (outro.status !== d.status) {
      saida.push({
        tipo: 'status',
        chave: d.endereco,
        detalhe: `${d.status} na página, ${outro.status} na compilada`,
      });
    } else if (paraComparar(outro.texto) !== paraComparar(d.texto)) {
      saida.push({
        tipo: 'texto',
        chave: d.endereco,
        explicacao: 'redação editorial diferente entre as duas páginas; o gabarito segue a página',
        detalhe: trechoDiferente(paraComparar(d.texto), paraComparar(outro.texto)),
      });
    }
  }
  for (const d of compilada.dispositivos) {
    if (p.has(d.endereco)) continue;
    const tachado = lidos.has(d.endereco) && d.status !== 'vigente';
    saida.push({
      tipo: 'so-na-compilada',
      chave: d.endereco,
      ...(tachado
        ? {
            explicacao:
              'revogado na compilada; na página, só tachado (redação anterior do ancestral)',
          }
        : {}),
      detalhe: `${d.status}: ${d.rotulo} ${d.texto}`.slice(0, 160),
    });
  }
  return saida;
}

/** @param {string} a @param {string} b */
function trechoDiferente(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const de = Math.max(0, i - 25);
  return `página: "…${a.slice(de, i + 45)}…" | compilada: "…${b.slice(de, i + 45)}…"`;
}

/**
 * Nomes das âncoras `<a name="art…">` da página bruta, por bloco (a parte de cada bloco começa
 * no `inicioNaPagina` dele). No ADCT da CF os nomes levam prefixo (`adctart1`, `sadctart1`,
 * `dtart1`), tirado aqui para comparar como no corpo (`art1`).
 * @param {string} paginaBruta
 * @param {readonly Bloco[]} blocos
 * @returns {Map<string, string[]>} prefixo do bloco ('' = corpo) → nomes em minúsculas
 */
export function ancorasPorBloco(paginaBruta, blocos) {
  const cortes = blocos
    .map((b) => ({
      prefixo: b.prefixo,
      pos: b.inicioNaPagina ? paginaBruta.search(b.inicioNaPagina) : -1,
    }))
    .filter((c) => c.pos >= 0)
    .sort((a, b) => a.pos - b.pos);
  /** @type {Map<string, string[]>} */
  const saida = new Map([
    ['', []],
    ...cortes.map((c) => /** @type {[string, string[]]} */ ([c.prefixo, []])),
  ]);
  for (const m of paginaBruta.matchAll(/<a\s[^>]*?\bname\s*=\s*["']?([^"'\s>]+)/gi)) {
    const bloco = cortes.findLast((c) => c.pos <= (m.index ?? 0))?.prefixo ?? '';
    const nome = m[1].toLowerCase().replace(bloco ? /^(?:s?adct|dt)(?=art\d)/ : /^$/, '');
    if (/^art\d/.test(nome)) saida.get(bloco)?.push(nome);
  }
  return saida;
}

/**
 * Âncoras `<a name="art…">` da página bruta (sinal da própria fonte, 7.1). Nomes vistos no
 * corpus: `art9` (artigo), `art9a` (sufixo ou alínea: ambíguo), `art2p` (parágrafo único),
 * `art9i`/`art9ii` (inciso), `art14§1` (parágrafo), `art6.` e `art9a.0`/`.1` (redações).
 * Compara o número do artigo; o sufixo, só no sentido artigo → âncora. Cada bloco com as suas.
 * @param {Map<string, string[]>} ancoras De {@link ancorasPorBloco}.
 * @param {Inventario} inventario
 * @returns {Divergencia[]}
 */
export function cruzarComAncoras(ancoras, inventario) {
  /** @type {Divergencia[]} */
  const saida = [];
  const artigos = inventario.dispositivos
    .filter((d) => d.tipo === 'artigo')
    .map((d) => ({ endereco: d.endereco, ...partesDoArtigo(d.endereco) }));
  for (const [prefixo, nomes] of ancoras) {
    const doBloco = artigos.filter((a) => a.prefixo === prefixo);
    const antes = prefixo ? `${prefixo}.` : '';
    const numeros = new Set(nomes.map((n) => Number(/^art(\d+)/.exec(n)?.[1])));
    const doInventario = new Set(doBloco.map((a) => a.numero));
    for (const n of [...numeros].filter((x) => !doInventario.has(x)).sort((a, b) => a - b)) {
      saida.push({
        tipo: 'ancora',
        chave: `${antes}art${String(n)}`,
        detalhe: 'âncora sem artigo na página',
      });
    }
    const conjunto = new Set(nomes);
    for (const a of doBloco) {
      const suf = a.sufixo.toLowerCase();
      const variantes = [`art${String(a.numero)}${suf}`, `art${String(a.numero)}-${suf}`];
      if (!variantes.some((v) => conjunto.has(v)))
        saida.push({ tipo: 'artigo-sem-ancora', chave: a.endereco });
    }
  }
  return saida;
}

/**
 * Texto puro colado (serialização do navegador, sem a segmentação por bloco deste código):
 * cada linha que começa com "Art." tem de corresponder a uma linha de artigo do HTML, tachada ou
 * não, com o mesmo endereço — pega "Art" quebrado, artigo engolido ou linha perdida.
 * @param {string} textoPuro
 * @param {Linha[]} linhas
 * @returns {Divergencia[]}
 */
export function cruzarComTextoPuro(textoPuro, linhas) {
  /** @param {string[]} lista */
  const contar = (lista) => {
    /** @type {Map<string, number>} */
    const m = new Map();
    for (const x of lista) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const doTexto = contar(
    textoPuro
      .split(/\r\n|\r|\n/)
      .map((l) => rotulo(limpar(l)))
      .filter((r) => r.tipo === 'artigo')
      .map((r) => `art${String(r.numero)}${r.sufixo ?? ''}`),
  );
  const doHtml = contar(
    linhas
      .map((l) => rotulo(l.texto))
      .filter((r) => r.tipo === 'artigo')
      .map((r) => `art${String(r.numero)}${r.sufixo ?? ''}`),
  );
  return [...new Set([...doTexto.keys(), ...doHtml.keys()])]
    .filter((k) => doTexto.get(k) !== doHtml.get(k))
    .map((k) => ({
      tipo: 'texto-puro',
      chave: k,
      detalhe: `${String(doTexto.get(k) ?? 0)} linha(s) no texto puro, ${String(doHtml.get(k) ?? 0)} no HTML`,
    }));
}

/**
 * Artigos em ordem crescente (número, depois sufixo) dentro de cada bloco; cada bloco começa no
 * art. 1º logo depois do último artigo conhecido antes dele; e o último da página é o conhecido.
 * @param {Inventario} inventario
 * @param {string} ultimoConhecido
 * @param {readonly Bloco[]} [blocos]
 * @returns {Divergencia[]}
 */
export function conferirSequencia(inventario, ultimoConhecido, blocos = []) {
  const artigos = inventario.dispositivos.filter((d) => d.tipo === 'artigo').map((d) => d.endereco);
  /** @type {Divergencia[]} */
  const saida = [];
  for (let i = 1; i < artigos.length; i++) {
    const a = partesDoArtigo(artigos[i - 1]);
    const b = partesDoArtigo(artigos[i]);
    if (a.prefixo !== b.prefixo) {
      const bloco = blocos.find((x) => x.prefixo === b.prefixo);
      if (!bloco || bloco.ultimoAntes !== artigos[i - 1] || b.numero !== 1 || b.sufixo) {
        saida.push({
          tipo: 'bloco',
          chave: artigos[i],
          detalhe: `depois de ${artigos[i - 1]}${bloco ? `; esperado ${bloco.ultimoAntes} → ${b.prefixo}.art1` : '; bloco fora da lista'}`,
        });
      }
    } else if (b.numero < a.numero || (b.numero === a.numero && b.sufixo <= a.sufixo)) {
      saida.push({ tipo: 'sequencia', chave: artigos[i], detalhe: `depois de ${artigos[i - 1]}` });
    }
  }
  const abertos = new Set(artigos.map((e) => partesDoArtigo(e).prefixo));
  for (const b of blocos.filter((x) => !abertos.has(x.prefixo)))
    saida.push({ tipo: 'bloco', chave: b.prefixo, detalhe: 'bloco sem nenhum artigo' });
  if (artigos.at(-1) !== ultimoConhecido) {
    saida.push({
      tipo: 'ultimo-artigo',
      chave: artigos.at(-1) ?? '',
      detalhe: `esperado ${ultimoConhecido}`,
    });
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------
// Gabarito

/**
 * Contagens por tipo e status, notas, redações e estrutura.
 * @param {Inventario} inv
 */
export function contar(inv) {
  /** @param {string[]} lista */
  const porValor = (lista) =>
    Object.fromEntries([...new Set(lista)].map((v) => [v, lista.filter((x) => x === v).length]));
  const d = inv.dispositivos;
  const redacoes = d.flatMap((x) => x.redacoes);
  return {
    dispositivos: d.length,
    porTipo: porValor(d.map((x) => x.tipo)),
    porStatus: porValor(d.map((x) => x.status)),
    artigos: porValor(d.filter((x) => x.tipo === 'artigo').map((x) => x.status)),
    comSufixo: d.filter((x) => x.tipo === 'artigo' && /[A-Z]$/.test(x.endereco)).length,
    notasVigencia: d.reduce((soma, x) => soma + x.notas.length, 0),
    redacoesAnteriores: redacoes.length,
    redacoesPorOrigem: porValor(redacoes.map((r) => r.origem)),
    redacoesNoAncestral: redacoes.filter((r) => r.enderecoLido).length,
    dispositivosComRedacaoAnterior: d.filter((x) => x.redacoes.length > 0).length,
    nomes: d.filter((x) => x.nome).length,
    estrutura: porValor(inv.estrutura.map((n) => n.tipo)),
    estruturaisTachados: inv.casos.filter((c) => c.tipo === 'estrutural-tachado').length,
  };
}

/** Quantos itens de cada categoria entram na amostra, em ordem de prioridade. */
const CATEGORIAS_AMOSTRA = /** @type {const} */ ([
  [
    'primeiro e último artigo',
    2,
    (/** @type {Dispositivo} */ d, /** @type {Dispositivo[]} */ todos) =>
      d === todos.find((x) => x.tipo === 'artigo') ||
      d === todos.findLast((x) => x.tipo === 'artigo'),
  ],
  [
    'artigo com sufixo',
    3,
    (/** @type {Dispositivo} */ d) => d.tipo === 'artigo' && /[A-Z]$/.test(d.endereco),
  ],
  ['várias redações anteriores', 3, (/** @type {Dispositivo} */ d) => d.redacoes.length >= 2],
  [
    'redação anterior no ancestral',
    2,
    (/** @type {Dispositivo} */ d) => d.redacoes.some((r) => r.enderecoLido),
  ],
  [
    'artigo revogado',
    2,
    (/** @type {Dispositivo} */ d) => d.tipo === 'artigo' && d.status === 'revogado',
  ],
  [
    'parágrafo, inciso ou alínea revogado',
    3,
    (/** @type {Dispositivo} */ d) => d.tipo !== 'artigo' && d.status === 'revogado',
  ],
  ['vetado', 2, (/** @type {Dispositivo} */ d) => d.status === 'vetado'],
  ['com nome (rubrica)', 3, (/** @type {Dispositivo} */ d) => Boolean(d.nome)],
  ['com "Pena"', 2, (/** @type {Dispositivo} */ d) => d.texto.includes('\n')],
  ['alínea', 3, (/** @type {Dispositivo} */ d) => d.tipo === 'alinea'],
  ['item', 2, (/** @type {Dispositivo} */ d) => d.tipo === 'item'],
  ['parágrafo único', 2, (/** @type {Dispositivo} */ d) => d.endereco.endsWith('.parUnico')],
  ['parágrafo com sufixo', 2, (/** @type {Dispositivo} */ d) => /\.par\d+[A-Z]+$/.test(d.endereco)],
  [
    'inciso de parágrafo',
    2,
    (/** @type {Dispositivo} */ d) => /\.par[^.]+\.inc[^.]+$/.test(d.endereco),
  ],
  [
    'artigo de bloco com numeração própria',
    3,
    (/** @type {Dispositivo} */ d) => d.tipo === 'artigo' && d.endereco.includes('.'),
  ],
  ['anexo', 1, (/** @type {Dispositivo} */ d) => d.tipo === 'anexo'],
]);
export const TAMANHO_AMOSTRA = 50;

/**
 * Amostra determinística: primeiro os casos difíceis (categorias acima, espalhados pela lei) e
 * os que tiveram divergência entre os sinais; o resto, espaçado igualmente pela página.
 * @param {Inventario} inv
 * @param {Divergencia[]} divergencias
 * @returns {{ dispositivo: Dispositivo, motivo: string }[]}
 */
export function escolherAmostra(inv, divergencias) {
  const todos = inv.dispositivos;
  /** @type {Map<string, string>} */
  const escolhidos = new Map();
  /** @param {Dispositivo[]} lista @param {number} n */
  const espalhar = (lista, n) =>
    lista.length <= n
      ? lista
      : Array.from({ length: n }, (_, i) => lista[Math.floor(((i + 0.5) * lista.length) / n)]);
  const porEndereco = new Map(todos.map((d) => [d.endereco, d]));
  for (const div of divergencias) {
    if (escolhidos.size >= 6) break;
    const d = porEndereco.get(div.chave);
    const decidida = div.explicacao?.startsWith('decisão:') ?? false;
    if (d && (decidida || div.tipo === 'texto')) {
      escolhidos.set(
        d.endereco,
        decidida ? 'divergência decidida' : 'texto diferente na compilada',
      );
    }
  }
  for (const c of inv.casos) {
    if (escolhidos.size >= 12) break;
    const d = c.endereco ? porEndereco.get(c.endereco) : undefined;
    if (d && !escolhidos.has(d.endereco) && c.tipo !== 'estrutural-tachado')
      escolhidos.set(d.endereco, `caso: ${c.tipo}`);
  }
  for (const [motivo, n, criterio] of CATEGORIAS_AMOSTRA) {
    const candidatos = todos.filter((d) => !escolhidos.has(d.endereco) && criterio(d, todos));
    for (const d of espalhar(candidatos, n)) escolhidos.set(d.endereco, motivo);
  }
  const resto = todos.filter((d) => !escolhidos.has(d.endereco));
  for (const d of espalhar(resto, Math.max(0, TAMANHO_AMOSTRA - escolhidos.size)))
    escolhidos.set(d.endereco, 'espaçado');
  return todos
    .filter((d) => escolhidos.has(d.endereco))
    .map((d) => ({ dispositivo: d, motivo: /** @type {string} */ (escolhidos.get(d.endereco)) }));
}

/**
 * @typedef {object} Conferencia
 * @property {'pendente' | 'conferida'} estado
 * @property {string | null} por
 * @property {string | null} em Data (AAAA-MM-DD).
 * @property {string[]} observacoes O que o Gabriel achou (e o que mudou por causa disso).
 */

/**
 * Monta o gabarito de uma norma a partir das entradas lidas do disco. Sinais que a página não
 * tem ficam de fora e registrados em `sinais`: compilada (só LEP e CP) e âncoras (a ALESP não
 * tem nenhuma).
 * @param {Alvo} alvo
 * @param {{ sha256Conteudo: string, url: string, arquivo: string }} pagina Entrada do manifesto.
 * @param {{ paginaBruta: string, coladoHtml: string, coladoTexto: string, compiladoHtml?: string, sha256?: Record<string, string> }} entradas
 *   `sha256`: hash dos bytes de cada colado lido, por nome de arquivo.
 */
export function montarGabarito(alvo, pagina, entradas) {
  const blocos = alvo.blocos ?? [];
  const linhas = linhasDoHtml(entradas.coladoHtml);
  const inv = inventariar(linhas, { blocos });
  const ancoras = ancorasPorBloco(entradas.paginaBruta, blocos);
  const temAncoras = [...ancoras.values()].some((nomes) => nomes.length > 0);
  if (alvo.compilado && entradas.compiladoHtml === undefined)
    throw new Error(`${alvo.id}: falta o colado da compilada ${alvo.compilado}`);
  const compilada =
    alvo.compilado && entradas.compiladoHtml !== undefined
      ? inventariar(linhasDoHtml(entradas.compiladoHtml), { blocos })
      : null;
  const sinais = [
    ...(compilada ? ['compilada'] : []),
    ...(temAncoras ? ['ancoras'] : []),
    'texto-puro',
    'sequencia',
  ];
  /** @type {Set<string>} */
  const usadas = new Set();
  /** @type {Divergencia[]} */
  const divergencias = [
    ...(compilada ? cruzarComCompilada(inv, compilada) : []),
    ...(temAncoras ? cruzarComAncoras(ancoras, inv) : []),
    ...cruzarComTextoPuro(entradas.coladoTexto, linhas),
    ...conferirSequencia(inv, alvo.ultimoArtigo, blocos),
    ...inv.casos
      .filter((c) => c.tipo === 'sem-pai')
      .map((c) => ({
        tipo: 'sem-pai',
        chave: c.endereco ?? '',
        detalhe: 'dispositivo vigente sob pai que não existe',
      })),
  ].map((d) => {
    const achada = d.explicacao ? undefined : decisao(alvo.id, d);
    if (!achada) return d;
    usadas.add(achada.chave);
    return { ...d, explicacao: `decisão: ${achada.texto}` };
  });
  // Decisão que não explica mais nada (a regra passou a cobrir o caso, ou a fonte mudou) sai.
  for (const chave of Object.keys(DECISOES).filter((k) => k.startsWith(`${alvo.id}:`))) {
    if (!usadas.has(chave))
      divergencias.push({ tipo: 'decisao-sem-uso', chave, detalhe: 'apagar de DECISOES' });
  }
  // O fragmento do link diferencia maiúsculas (CP: name="art216A"): guarda o nome como na página.
  /** @type {Map<string, string>} */
  const nomeOriginal = new Map();
  for (const m of entradas.paginaBruta.matchAll(/<a\s[^>]*?\bname\s*=\s*["']?([^"'\s>]+)/gi)) {
    if (!nomeOriginal.has(m[1].toLowerCase())) nomeOriginal.set(m[1].toLowerCase(), m[1]);
  }
  /** @param {string} endereco */
  const link = (endereco) => {
    const art = /^(?:([a-z]+)\.)?art(\d+)([A-Z]*)/.exec(endereco);
    if (!art) return pagina.url;
    const nome = `art${art[2]}${art[3].toLowerCase()}`;
    // No ADCT, a âncora do caput leva o prefixo ("adctart1", às vezes só "sadctart1").
    const candidatos = art[1] ? [`${art[1]}${nome}`, `s${art[1]}${nome}`] : [nome];
    const achado = candidatos.map((c) => nomeOriginal.get(c)).find(Boolean);
    return achado ? `${pagina.url}#${achado}` : pagina.url;
  };
  const amostra = escolherAmostra(inv, divergencias).map(({ dispositivo: d, motivo }) => ({
    endereco: d.endereco,
    motivo,
    status: d.status,
    rotulo: d.rotulo,
    ...(d.nome ? { nome: d.nome } : {}),
    texto: d.texto,
    notas: d.notas,
    redacoes: d.redacoes,
    link: link(d.endereco),
  }));
  return {
    versao: 1,
    id: alvo.id,
    origemSha256Conteudo: pagina.sha256Conteudo,
    origemSha256Colados: entradas.sha256 ?? {},
    descricao:
      'Gabarito da 7.3: o que o estruturador deve achar no colado desta página. Gerado por ' +
      'scripts/corpus-gabarito.mjs (npm run corpus:gabarito) a partir de sinais independentes; ' +
      'só a "conferencia" é editada à mão. Endereços e regras em scripts/corpus/gabarito.mjs.',
    entradas: {
      colado: `${alvo.id}.colado.html`,
      textoPuro: `${alvo.id}.colado.txt`,
      pagina: pagina.arquivo,
      compilada: alvo.compilado ? `${alvo.compilado}.colado.html` : null,
    },
    sinais,
    /** @type {Conferencia} */
    conferencia: { estado: 'pendente', por: null, em: null, observacoes: [] },
    ultimoArtigo: alvo.ultimoArtigo,
    ...(blocos.length > 0
      ? {
          blocos: blocos.map((b) => ({
            prefixo: b.prefixo,
            ultimoAntes: b.ultimoAntes,
            primeiroArtigo: `${b.prefixo}.art1`,
          })),
        }
      : {}),
    contagens: contar(inv),
    pendencias: divergencias.filter((d) => !d.explicacao),
    divergencias: divergencias.filter((d) => d.explicacao),
    casos: inv.casos
      .filter((c) => c.tipo !== 'estrutural-tachado')
      .map((c) => ({ tipo: c.tipo, endereco: c.endereco ?? null, texto: c.texto.slice(0, 200) })),
    estrutura: inv.estrutura,
    dispositivos: inv.dispositivos.map((d) => ({
      endereco: d.endereco,
      status: d.status,
      notas: d.notas.length,
      redacoes: d.redacoes.length,
      ...(d.nome ? { nome: true } : {}),
    })),
    amostra,
  };
}

/**
 * JSON estável e legível no diff: um dispositivo por linha; o resto com 2 espaços; LF no fim.
 * @param {ReturnType<typeof montarGabarito>} gabarito
 */
export function serializarGabarito(gabarito) {
  const { dispositivos, ...resto } = gabarito;
  const corpo = JSON.stringify({ ...resto, dispositivos: [] }, null, 2);
  const linhas = dispositivos.map((d) => `    ${JSON.stringify(d)}`).join(',\n');
  return `${corpo.replace('"dispositivos": []', `"dispositivos": [\n${linhas}\n  ]`)}\n`;
}

/**
 * Mantém a conferência do gabarito anterior se nada mais mudou; senão volta a "pendente", com as
 * observações de antes (e a data da conferência desfeita) para não perder o que foi achado.
 * @param {{ conferencia?: Conferencia } | null} anterior
 * @param {ReturnType<typeof montarGabarito>} novo
 * @returns {{ gabarito: ReturnType<typeof montarGabarito>, mudou: boolean }}
 */
export function preservarConferencia(anterior, novo) {
  if (!anterior?.conferencia) return { gabarito: novo, mudou: true };
  const comConferencia = { ...novo, conferencia: anterior.conferencia };
  const igual =
    serializarGabarito(/** @type {ReturnType<typeof montarGabarito>} */ (anterior)) ===
    serializarGabarito(comConferencia);
  if (igual) return { gabarito: comConferencia, mudou: false };
  const antes = anterior.conferencia;
  const desfeita =
    antes.estado === 'conferida'
      ? [
          `Conferida em ${antes.em ?? '?'} por ${antes.por ?? '?'} sobre um gabarito anterior; o ` +
            'gabarito mudou: conferir de novo.',
        ]
      : [];
  const observacoes = [...desfeita, ...antes.observacoes];
  return {
    gabarito: { ...novo, conferencia: { ...novo.conferencia, observacoes } },
    mudou: true,
  };
}

/**
 * Folha de conferência em Markdown (docs/conferencias/gabarito-<id>.md): a amostra, com link
 * para a âncora da página oficial, para o Gabriel marcar item a item.
 * @param {ReturnType<typeof montarGabarito>} g
 * @param {string} titulo
 */
export function folhaDeConferencia(g, titulo) {
  const c = g.contagens;
  // Gabarito gravado antes de existir o campo cruzava os quatro sinais.
  const sinais = g.sinais ?? ['compilada', 'ancoras', 'texto-puro', 'sequencia'];
  const linhas = [
    `# Conferência do gabarito — ${titulo}`,
    '',
    `Gerado por \`npm run corpus:gabarito\` (F2, atividade 7.3), que só regrava esta folha quando o gabarito muda. Marque e anote aqui; a sessão seguinte passa o resultado para \`corpus/normas/${g.id}.gabarito.json\` › \`conferencia\`.`,
    '',
    '## Como conferir (~30 min)',
    '',
    '1. Abrir cada link (vai direto ao artigo na página oficial) e comparar com o item: rótulo, texto, notas e redações anteriores (o texto tachado da página).',
    '2. Marcar `[x]` no que bate. No que não bate, escrever ao lado o que a página mostra.',
    '3. Conferir também as contagens gerais abaixo pelo que se vê na página (último artigo, artigos com letra).',
    ...(sinais.includes('ancoras')
      ? []
      : [
          '4. Esta página não tem âncoras por artigo: o link abre o começo da página; achar o item com Ctrl+F pelo rótulo.',
        ]),
    '',
    ...(sinais.includes('compilada')
      ? []
      : [
          `Sem página compilada no corpus: o gabarito foi cruzado só com ${sinais.includes('ancoras') ? 'as âncoras da página, ' : ''}o texto puro colado e a sequência de artigos. Conferir com mais atenção o status (vigente, revogado, vetado) e as redações anteriores.`,
          '',
        ]),
    '## Contagens',
    '',
    `- Dispositivos: ${String(c.dispositivos)} (${Object.entries(c.porTipo)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(', ')})`,
    `- Artigos: ${Object.entries(c.artigos)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(', ')}; com letra (9º-A…): ${String(c.comSufixo)}; último: ${g.ultimoArtigo}`,
    ...(g.blocos ?? []).map(
      (b) =>
        `- Bloco com numeração própria \`${b.prefixo}\`: começa em ${b.primeiroArtigo}, depois de ${b.ultimoAntes}`,
    ),
    `- Redações anteriores: ${String(c.redacoesAnteriores)} em ${String(c.dispositivosComRedacaoAnterior)} dispositivos`,
    `- Notas de vigência no texto vigente: ${String(c.notasVigencia)}`,
    `- Estrutura: ${Object.entries(c.estrutura)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(', ')}`,
    '',
    `## Amostra (${String(g.amostra.length)} dispositivos)`,
    '',
  ];
  for (const a of g.amostra) {
    linhas.push(`- [ ] **${a.endereco}** (${a.motivo}) — [abrir](${a.link})`);
    if (a.nome) linhas.push(`  - Nome: ${a.nome}`);
    const texto = a.status === 'vigente' ? a.texto.replace(/\n/g, ' ⏎ ') : `(${a.status})`;
    linhas.push(`  - ${a.rotulo} ${texto}`);
    for (const n of a.notas) linhas.push(`  - Nota: ${n}`);
    for (const r of a.redacoes) {
      const lido = r.enderecoLido ? ` [lida como ${r.enderecoLido}]` : '';
      linhas.push(
        `  - Redação anterior (${r.origem})${lido}: ~~${r.texto.replace(/\n/g, ' ⏎ ').slice(0, 300)}~~`,
      );
    }
  }
  if (g.divergencias.length > 0) {
    linhas.push('', '## Divergências entre os sinais (explicadas)', '');
    for (const d of g.divergencias.filter((x) => x.tipo !== 'so-na-pagina')) {
      linhas.push(
        `- \`${d.tipo}\` **${d.chave}**: ${d.explicacao ?? ''}${d.detalhe ? ` — ${d.detalhe}` : ''}`,
      );
    }
    const detalhe = g.divergencias.filter((x) => x.tipo === 'so-na-pagina').length;
    if (detalhe > 0)
      linhas.push(
        `- \`so-na-pagina\`: ${String(detalhe)} detalhes de dispositivos revogados ou vetados que a compilada resume.`,
      );
  }
  return `${linhas.join('\n')}\n`;
}
