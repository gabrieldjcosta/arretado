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

/** Normas com gabarito, a página compilada que serve de contraprova e o último artigo. */
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
  'cp:so-na-pagina:art129.par2.incIII':
    'a compilada escreve "III perda…" sem hífen (erro de digitação dela); a página tem o hífen',
  'cp:so-na-pagina:art234.par1':
    'a página rotula "§ 1º." o que a compilada (e o texto original) chama "Parágrafo único"; o ' +
    'estruturador deve acusar o caso paragrafo-1-sem-2',
  'cp:so-na-compilada:art234.parUnico':
    'o mesmo dispositivo que a página rotula "§ 1º." (art234.par1)',
  'cp:ancora:art2248': 'erro de digitação na fonte: name="art2248" no art. 248',
  'cp:ancora:art2253': 'erro de digitação na fonte: name="art2253" no art. 253',
  'cp:artigo-sem-ancora:art248': 'a âncora saiu como "art2248" (erro da fonte)',
  'cp:artigo-sem-ancora:art253': 'a âncora saiu como "art2253" (erro da fonte)',
  'cp:artigo-sem-ancora:art287': 'a âncora saiu como name="287", sem "art" (erro da fonte)',
};

/**
 * Decisão para a divergência: a do próprio endereço ou a de um ancestral.
 * @param {string} id
 * @param {{ tipo: string, chave: string }} divergencia
 */
function decisao(id, divergencia) {
  const partes = divergencia.chave.split('.');
  for (let i = partes.length; i > 0; i--) {
    const texto = DECISOES[`${id}:${divergencia.tipo}:${partes.slice(0, i).join('.')}`];
    if (texto) return texto;
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
 * @typedef {'parte' | 'livro' | 'titulo' | 'capitulo' | 'secao' | 'subsecao'} TipoEstrutural
 * @typedef {'artigo' | 'paragrafo' | 'inciso' | 'alinea' | 'item'} TipoNormativo
 * @typedef {object} Rotulo
 * @property {TipoEstrutural | TipoNormativo | 'pena' | 'outro'} tipo
 * @property {number | string} [numero] Artigo, parágrafo e item: número (0 = parágrafo único);
 *   inciso: romano; alínea: letra; estrutural: romano, "ÚNICO", "GERAL" ou "ESPECIAL".
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
const NORMATIVOS = /** @type {const} */ (['artigo', 'paragrafo', 'inciso', 'alinea', 'item']);
/** Ordinal colado ao número ("1º", "1o", "1 o", "1°"), mas não o "o" que começa palavra. */
const ORDINAL = String.raw`(?:\s*[º°o](?![a-zà-ú]))?`;
/** Sufixo com hífen colado à letra ("9º-A", "2º -A", "359-M-A"); "1º - A execução" não é. */
const SUFIXO = String.raw`((?:\s*-[A-Z](?![a-zà-ú]))*)`;
const SEPARADOR = String.raw`\s*[-–—.:]?\s*`;
const RE_ESTRUTURAL =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SUBSE[ÇC][ÃA]O|SE[ÇC][ÃA]O)(?:\s+([IVXLC]+|[ÚU]NIC[OA]|GERAL|ESPECIAL)\b)?\s*[-–.]?\s*(.*)$/i;
const RE_ARTIGO = new RegExp(
  String.raw`^Art(?:igo)?\s*\.?\s*(\d+(?:\.\d{3})*)${ORDINAL}${SUFIXO}${SEPARADOR}`,
);
const RE_PARAGRAFO = new RegExp(String.raw`^§\s*(\d+)${ORDINAL}${SUFIXO}${SEPARADOR}`);
const RE_PARAGRAFO_UNICO = /^Par[áa]grafo\s+[úu]nico\s*[-–—.:]?\s*/i;
const RE_INCISO = new RegExp(String.raw`^([IVXLC]+)${SUFIXO}\s*[-–—]\s*`);
const RE_ALINEA = new RegExp(String.raw`^([a-z])${SUFIXO}\s*\)\s*`);
const RE_ITEM = /^(\d+)\s*[.)]\s*[-–]?\s*(?=\S)/;
const RE_PENA = /^Pena\s*[-–:]/;
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
  if ((m = RE_ALINEA.exec(t))) {
    return { tipo: 'alinea', numero: m[1], sufixo: sufixo(m[2]), resto: t.slice(m[0].length) };
  }
  if ((m = RE_ITEM.exec(t))) {
    return { tipo: 'item', numero: Number(m[1]), sufixo: '', resto: t.slice(m[0].length) };
  }
  if (RE_PENA.test(t)) return { tipo: 'pena', resto: t };
  return { tipo: 'outro', resto: t };
}

/** Palavras que abrem nota de vigência (Parte 2 §10.6, regra 7, e as variantes do corpus). */
const CHAVES_NOTA =
  '(?:Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Revogad[oa]|Vide|Vig[êe]ncia|Renumerad[oa]|Regulamento|' +
  'Promulga[çc][ãa]o|Produ[çc][ãa]o de efeito|Acrescid[oa]|Suprimid[oa])';
/** Parênteses com uma chave de nota; admite um nível de parênteses dentro. */
const RE_NOTA = new RegExp(String.raw`\(\s*${CHAVES_NOTA}[^()]*(?:\([^()]*\)[^()]*)*\)`, 'gi');

/**
 * Tira as notas de vigência do texto ("(Redação dada pela Lei…)", "(Vigência)", "(Vide…)").
 * @param {string} texto
 * @returns {{ texto: string, notas: string[] }}
 */
export function separarNotas(texto) {
  /** @type {string[]} */
  const notas = [];
  const sem = texto.replace(RE_NOTA, (nota) => {
    // "(Revogado)" sozinho é o texto do dispositivo revogado, não nota (a nota diz por qual lei).
    if (/^\(\s*revogad[oa]\s*\)$/i.test(nota)) return nota;
    notas.push(limpar(nota));
    return ' ';
  });
  return { texto: limpar(sem), notas };
}

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
 *   dispositivo é o nome (rubrica); a primeira depois de um nó estrutural é o nome do nó.
 * @param {Linha[]} linhas
 * @returns {Inventario}
 */
export function inventariar(linhas) {
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
  /** Primeira linha tachada depois das rubricas pendentes (a dona delas, se não houver vigente). */
  /** @type {(typeof tachadas)[number] | null} */
  let captura = null;
  /** @type {{ vigente: string } | { tachada: (typeof tachadas)[number] } | null} */
  let ultimo = null;

  /** @param {Rotulo} r */
  const endereco = (r) => {
    const suf = r.sufixo ?? '';
    if (r.tipo === 'artigo') return `art${String(r.numero)}${suf}`;
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
    else if (r.tipo === 'paragrafo') ctx = { ...ctx, par: e, inc: '', al: '' };
    else if (r.tipo === 'inciso') ctx = { ...ctx, inc: e, al: '' };
    else if (r.tipo === 'alinea') ctx = { ...ctx, al: e };
  };

  linhas.forEach((l, i) => {
    const r = rotulo(l.texto);
    const rv = rotulo(l.vigente);
    const rotuloVigente = /** @type {readonly string[]} */ ([
      ...NORMATIVOS,
      ...ESTRUTURAIS,
    ]).includes(rv.tipo);
    // Fora do tachado, sem o rótulo e as notas, não sobra texto: com nota "Revogado" a linha é a
    // revogação do dispositivo; sem ela, é redação anterior (rótulo ou nota que escaparam do
    // tachado, como "§ 8º" do art. 129 do CP).
    const foraDoTachado = separarNotas(rotuloVigente ? rv.resto : l.vigente);
    const semTexto = l.anterior !== '' && vazio(foraDoTachado.texto);
    const revogadaInteira = semTexto && revoga(foraDoTachado.notas);
    const tachada = !revogadaInteira && (l.fracaoTachada >= 0.999 || semTexto);

    if (/** @type {readonly string[]} */ (ESTRUTURAIS).includes(r.tipo)) {
      if (tachada || l.fracaoTachada > 0.5) {
        casos.push({ tipo: 'estrutural-tachado', linha: i, texto: l.texto });
        return;
      }
      // Mesmo nó de novo sem artigo no meio (CP: "TÍTULO VI — DOS CRIMES CONTRA OS COSTUMES" sem
      // tachado antes do novo Título VI): vale o último; o antigo e o que veio abaixo dele saem.
      const rotuloNo = separarNotas(l.vigente.slice(0, l.vigente.length - r.resto.length)).texto;
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
        nome: separarNotas(r.resto).texto,
        primeiroArtigo: null,
      };
      estrutura.push(no);
      aguardandoNomeDoNo = no.nome === '';
      rubricas = [];
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
      if (aguardandoNomeDoNo && no) {
        no.nome = foraDoTachado.texto;
        aguardandoNomeDoNo = false;
      } else if (r.tipo === 'outro') {
        rubricas.push(foraDoTachado.texto);
      }
      return;
    }

    aguardandoNomeDoNo = false;
    const e = endereco(r);
    if (!e) {
      casos.push({ tipo: 'fora-de-artigo', linha: i, texto: l.texto });
      return;
    }
    avancar(r, e);
    if (tachada) {
      // As rubricas seguem pendentes: são do vigente de mesmo endereço, se vier; senão, deste
      // artigo só tachado (CP, art. 185: "Usurpação de nome ou pseudônimo alheio").
      const t = {
        endereco: e,
        linha: i,
        texto: l.texto,
        revogadoPor: [],
        rubricas: captura ? [] : [...rubricas],
      };
      if (!captura && rubricas.length > 0) captura = t;
      tachadas.push(t);
      ultimo = { tachada: t };
      return;
    }

    if (captura && captura.endereco !== e) rubricas = rubricas.slice(captura.rubricas.length);
    else if (captura) captura.rubricas = [];
    captura = null;
    const partes = revogadaInteira
      ? foraDoTachado
      : separarNotas(rv.tipo === r.tipo ? rv.resto : '');
    /** @type {Dispositivo['status']} */
    let status = 'vigente';
    if (/^\(?\s*vetad[oa]\s*\)?[\s.;,]*$/i.test(partes.texto)) status = 'vetado';
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
    (a, b) => Number(a.endereco.includes('.')) - Number(b.endereco.includes('.')),
  );
  for (const t of porNivel) {
    if (!disp.has(t.endereco) && !t.endereco.includes('.')) {
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
    while (!disp.has(alvo) && alvo.includes('.')) alvo = alvo.slice(0, alvo.lastIndexOf('.'));
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
 *   `artigo-sem-ancora`, `texto-puro`, `ultimo-artigo`.
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
 * Âncoras `<a name="art…">` da página bruta (sinal da própria fonte, 7.1). Nomes vistos no
 * corpus: `art9` (artigo), `art9a` (sufixo ou alínea: ambíguo), `art2p` (parágrafo único),
 * `art9i`/`art9ii` (inciso), `art14§1` (parágrafo), `art6.` e `art9a.0`/`.1` (redações).
 * Compara o número do artigo; o sufixo, só no sentido artigo → âncora.
 * @param {string} paginaBruta HTML decodificado da página original (não o colado).
 * @param {Inventario} inventario
 * @returns {Divergencia[]}
 */
export function cruzarComAncoras(paginaBruta, inventario) {
  const nomes = [...paginaBruta.matchAll(/<a\s[^>]*?\bname\s*=\s*["']?(art\d+[^"'\s>]*)/gi)].map(
    (m) => m[1].toLowerCase(),
  );
  const numeros = new Set(nomes.map((n) => Number(/^art(\d+)/.exec(n)?.[1])));
  const artigos = inventario.dispositivos.filter((d) => d.tipo === 'artigo');
  const doInventario = new Set(artigos.map((d) => Number(/^art(\d+)/.exec(d.endereco)?.[1])));
  /** @type {Divergencia[]} */
  const saida = [];
  for (const n of [...numeros].filter((x) => !doInventario.has(x)).sort((a, b) => a - b)) {
    saida.push({
      tipo: 'ancora',
      chave: `art${String(n)}`,
      detalhe: 'âncora sem artigo na página',
    });
  }
  const conjunto = new Set(nomes);
  for (const d of artigos) {
    const [, n, suf] = /** @type {RegExpExecArray} */ (/^art(\d+)([A-Z]*)$/.exec(d.endereco));
    const variantes = [`art${n}${suf.toLowerCase()}`, `art${n}-${suf.toLowerCase()}`];
    if (!variantes.some((v) => conjunto.has(v)))
      saida.push({ tipo: 'artigo-sem-ancora', chave: d.endereco });
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
 * Artigos em ordem crescente (número, depois sufixo) e o último igual ao conhecido.
 * @param {Inventario} inventario
 * @param {string} ultimoConhecido
 * @returns {Divergencia[]}
 */
export function conferirSequencia(inventario, ultimoConhecido) {
  const artigos = inventario.dispositivos.filter((d) => d.tipo === 'artigo').map((d) => d.endereco);
  /** @type {Divergencia[]} */
  const saida = [];
  /** @param {string} e */
  const chave = (e) => {
    const [, n, suf] = /** @type {RegExpExecArray} */ (/^art(\d+)([A-Z]*)$/.exec(e));
    return [Number(n), suf];
  };
  for (let i = 1; i < artigos.length; i++) {
    const [na, sa] = chave(artigos[i - 1]);
    const [nb, sb] = chave(artigos[i]);
    if (nb < na || (nb === na && sb <= sa)) {
      saida.push({ tipo: 'sequencia', chave: artigos[i], detalhe: `depois de ${artigos[i - 1]}` });
    }
  }
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
 * Monta o gabarito de uma norma a partir das entradas lidas do disco.
 * @param {{ id: string, ultimoArtigo: string }} alvo
 * @param {{ sha256Conteudo: string, url: string, arquivo: string }} pagina Entrada do manifesto.
 * @param {{ paginaBruta: string, coladoHtml: string, coladoTexto: string, compiladoHtml: string, compilado: string }} entradas
 */
export function montarGabarito(alvo, pagina, entradas) {
  const linhas = linhasDoHtml(entradas.coladoHtml);
  const inv = inventariar(linhas);
  const compilada = inventariar(linhasDoHtml(entradas.compiladoHtml));
  const divergencias = [
    ...cruzarComCompilada(inv, compilada),
    ...cruzarComAncoras(entradas.paginaBruta, inv),
    ...cruzarComTextoPuro(entradas.coladoTexto, linhas),
    ...conferirSequencia(inv, alvo.ultimoArtigo),
  ].map((d) => {
    const texto = decisao(alvo.id, d);
    return texto && !d.explicacao ? { ...d, explicacao: `decisão: ${texto}` } : d;
  });
  const ancoras = new Set(
    [...entradas.paginaBruta.matchAll(/<a\s[^>]*?\bname\s*=\s*["']?(art\d+[^"'\s>]*)/gi)].map((m) =>
      m[1].toLowerCase(),
    ),
  );
  /** @param {string} endereco */
  const link = (endereco) => {
    const art = /^art(\d+)([A-Z]*)/.exec(endereco);
    const nome = art ? `art${art[1]}${art[2].toLowerCase()}` : '';
    return ancoras.has(nome) ? `${pagina.url}#${nome}` : pagina.url;
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
    descricao:
      'Gabarito da 7.3: o que o estruturador deve achar no colado desta página. Gerado por ' +
      'scripts/corpus-gabarito.mjs (npm run corpus:gabarito) a partir de sinais independentes; ' +
      'só a "conferencia" é editada à mão. Endereços e regras em scripts/corpus/gabarito.mjs.',
    entradas: {
      colado: `${alvo.id}.colado.html`,
      textoPuro: `${alvo.id}.colado.txt`,
      pagina: pagina.arquivo,
      compilada: `${entradas.compilado}.colado.html`,
    },
    /** @type {Conferencia} */
    conferencia: { estado: 'pendente', por: null, em: null, observacoes: [] },
    ultimoArtigo: alvo.ultimoArtigo,
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
 * Mantém a conferência do gabarito anterior se nada mais mudou; senão volta a "pendente".
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
  return igual ? { gabarito: comConferencia, mudou: false } : { gabarito: novo, mudou: true };
}

/**
 * Folha de conferência em Markdown (docs/conferencias/gabarito-<id>.md): a amostra, com link
 * para a âncora da página oficial, para o Gabriel marcar item a item.
 * @param {ReturnType<typeof montarGabarito>} g
 * @param {string} titulo
 */
export function folhaDeConferencia(g, titulo) {
  const c = g.contagens;
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
    '',
    '## Contagens',
    '',
    `- Dispositivos: ${String(c.dispositivos)} (${Object.entries(c.porTipo)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(', ')})`,
    `- Artigos: ${Object.entries(c.artigos)
      .map(([k, v]) => `${k} ${String(v)}`)
      .join(', ')}; com letra (9º-A…): ${String(c.comSufixo)}; último: ${g.ultimoArtigo}`,
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
