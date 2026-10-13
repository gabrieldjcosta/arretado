import DOMPurify, { type Config } from 'dompurify';

/**
 * Porta de entrada de todo HTML externo (D13, D18, T9). O HTML colado ou baixado é
 * sanitizado com lista de permissão mínima e convertido em **estrutura** (blocos de
 * trechos com tachado, ênfase e link). A interface nunca recebe HTML.
 */

export interface Trecho {
  texto: string;
  tachado?: true;
  enfase?: true;
  link?: string;
}

/** Uma linha lógica do texto (parágrafo, item, célula ou linha quebrada por `<br>`). */
export interface Bloco {
  trechos: Trecho[];
}

export interface ResultadoSanitizacao {
  blocos: Bloco[];
  /** Links descartados por não serem http(s) absolutos (ou resolvíveis pela base). */
  linksDescartados: number;
}

export class EntradaGrandeDemais extends Error {
  constructor(
    readonly tamanho: number,
    readonly limite: number,
  ) {
    super(
      `O conteúdo tem ${String(Math.ceil(tamanho / 1_000_000))} MB; o limite é ${String(limite / 1_000_000)} MB.`,
    );
    this.name = 'EntradaGrandeDemais';
  }
}

/** Limite padrão por importação (caracteres). O Código Penal do Planalto tem cerca de 2 MB. */
export const LIMITE_PADRAO = 10_000_000;

const MARCA_TACHADO = 'data-arretado-tachado';
/** O atributo `style` renomeado antes do parser (ver `semEstiloEmLinha`). */
const ESTILO = 'data-arretado-estilo';

const TAGS_BLOCO = new Set([
  'P',
  'DIV',
  'LI',
  'TR',
  'TD',
  'TH',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'CENTER',
  'TABLE',
  'UL',
  'OL',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
  'MAIN',
  'ASIDE',
  'NAV',
  'PRE',
  'DL',
  'DT',
  'DD',
  'CAPTION',
  'ADDRESS',
  'FIGURE',
  'FIGCAPTION',
  'TFOOT',
]);
const TAGS_TACHADO = new Set(['S', 'STRIKE', 'DEL']);
const TAGS_ENFASE = new Set(['B', 'STRONG', 'I', 'EM', 'U']);

const CONFIG: Config & { RETURN_DOM_FRAGMENT: true } = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'div',
    'span',
    'font',
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'strike',
    'del',
    'a',
    'sup',
    'sub',
    'table',
    'tbody',
    'thead',
    'tr',
    'td',
    'th',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'center',
    'section',
    'article',
    'header',
    'footer',
    'main',
    'aside',
    'nav',
    'pre',
    'dl',
    'dt',
    'dd',
    'hr',
    'caption',
    'address',
    'figure',
    'figcaption',
    'tfoot',
  ],
  ALLOWED_ATTR: ['href', MARCA_TACHADO],
  ALLOWED_URI_REGEXP: /^(?:https?:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
  RETURN_DOM_FRAGMENT: true,
};

let purificador: ReturnType<typeof DOMPurify> | null = null;

function obterPurificador() {
  if (purificador) return purificador;
  const p = DOMPurify(window);
  // Tachado por estilo (comum no Planalto) vira marca semântica antes de o estilo ser removido.
  p.addHook('uponSanitizeElement', (no, dados) => {
    if (!(no instanceof Element)) return;
    const estilo = no.getAttribute(ESTILO) ?? no.getAttribute('style') ?? '';
    no.removeAttribute(MARCA_TACHADO);
    if (!/text-decoration[^;]*line-through/i.test(estilo)) return;
    if (dados.allowedTags[dados.tagName]) {
      no.setAttribute(MARCA_TACHADO, '1');
    } else {
      // Elemento fora da lista será removido mantendo o conteúdo: o tachado passa a um <s>.
      const s = no.ownerDocument.createElement('s');
      while (no.firstChild) s.appendChild(no.firstChild);
      no.appendChild(s);
    }
  });
  purificador = p;
  return p;
}

/**
 * O parser do DOMPurify (DOMParser) cria o documento com a CSP da página: cada atributo `style` e
 * cada `<style>` do HTML colado viram uma violação de `style-src` (milhares numa lei do
 * Planalto; E2E da 9.5), mesmo sem nada ser aplicado. Antes do parser, o `<style>` sai e o
 * atributo `style` das tags vira `data-arretado-estilo`, que o gancho lê (tachado por estilo) e
 * o DOMPurify remove. Texto nunca traz `<` seguido de letra (vem como `&lt;`); um valor de
 * atributo com `>` só faz a troca parar naquela tag.
 */
function semEstiloEmLinha(html: string): string {
  return (
    html
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
      // `<base>` no parser dispara violação de `base-uri` da CSP (13.1); o DOMPurify o removeria de qualquer forma.
      .replace(/<base\b[^>]*>/gi, '')
      .replace(/<[a-z][^>]*>/gi, (tag) => tag.replace(/(\s)style(\s*=)/gi, `$1${ESTILO}$2`))
  );
}

/** Sanitiza HTML e o converte em blocos. `base` resolve links relativos (importação por URL). */
export function sanitizarHtml(
  html: string,
  opcoes: { base?: string; limite?: number } = {},
): ResultadoSanitizacao {
  const limite = opcoes.limite ?? LIMITE_PADRAO;
  if (html.length > limite) throw new EntradaGrandeDemais(html.length, limite);
  const fragmento = obterPurificador().sanitize(semEstiloEmLinha(html), CONFIG);
  const conversor = new Conversor(opcoes.base);
  conversor.percorrer(fragmento, { tachado: false, enfase: false, link: undefined });
  return { blocos: conversor.finalizar(), linksDescartados: conversor.linksDescartados };
}

/** Texto puro (fallback, D13): uma linha por bloco (CRLF, CR, LF, U+2028 e U+2029), sem formatação. */
export function textoParaBlocos(texto: string, opcoes: { limite?: number } = {}): Bloco[] {
  const limite = opcoes.limite ?? LIMITE_PADRAO;
  if (texto.length > limite) throw new EntradaGrandeDemais(texto.length, limite);
  return texto
    .split(/\r\n|[\r\n\u2028\u2029]/)
    .map((l) => normalizarEspacos(l).trim())
    .filter((l) => l.length > 0)
    .map((l) => ({ trechos: [{ texto: l }] }));
}

interface Estado {
  tachado: boolean;
  enfase: boolean;
  link: string | undefined;
  /** Dentro de <pre>: quebras de linha do texto separam blocos. */
  pre?: boolean;
}

class Conversor {
  private readonly blocos: Bloco[] = [];
  private atual: Trecho[] = [];
  linksDescartados = 0;

  constructor(private readonly base: string | undefined) {}

  percorrer(no: Node, estado: Estado): void {
    for (const filho of Array.from(no.childNodes)) {
      if (filho.nodeType === Node.TEXT_NODE) {
        const texto = filho.textContent ?? '';
        if (estado.pre) {
          texto.split(/\r\n|\r|\n/).forEach((linha, i) => {
            if (i > 0) this.quebrar();
            this.acrescentar(linha, estado);
          });
        } else {
          this.acrescentar(texto, estado);
        }
        continue;
      }
      if (!(filho instanceof Element)) continue;
      const tag = filho.tagName.toUpperCase();
      if (tag === 'BR' || tag === 'HR') {
        this.quebrar();
        continue;
      }
      const bloco = TAGS_BLOCO.has(tag);
      if (bloco) this.quebrar();
      this.percorrer(filho, {
        tachado: estado.tachado || TAGS_TACHADO.has(tag) || filho.hasAttribute(MARCA_TACHADO),
        enfase: estado.enfase || TAGS_ENFASE.has(tag),
        link: tag === 'A' ? this.resolverLink(filho.getAttribute('href')) : estado.link,
        pre: estado.pre === true || tag === 'PRE',
      });
      if (bloco) this.quebrar();
    }
  }

  private resolverLink(href: string | null): string | undefined {
    if (!href) return undefined;
    try {
      const url = this.base ? new URL(href, this.base) : new URL(href);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {
      // Relativo sem base ou malformado: descartado abaixo.
    }
    this.linksDescartados += 1;
    return undefined;
  }

  private acrescentar(texto: string, estado: Estado): void {
    const t = normalizarEspacos(texto);
    if (t.length === 0) return;
    const trecho: Trecho = { texto: t };
    if (estado.tachado) trecho.tachado = true;
    if (estado.enfase) trecho.enfase = true;
    if (estado.link) trecho.link = estado.link;
    const anterior = this.atual.at(-1);
    if (
      anterior &&
      anterior.tachado === trecho.tachado &&
      anterior.enfase === trecho.enfase &&
      anterior.link === trecho.link
    ) {
      anterior.texto += t;
    } else {
      this.atual.push(trecho);
    }
  }

  quebrar(): void {
    const trechos = aparar(this.atual);
    if (trechos.length > 0) this.blocos.push({ trechos });
    this.atual = [];
  }

  finalizar(): Bloco[] {
    this.quebrar();
    return this.blocos;
  }
}

/** Colapsa espaços (inclusive NBSP e quebras) como o HTML faz na exibição. */
function normalizarEspacos(texto: string): string {
  return texto.replace(/[\s\u00a0\u200b]+/g, ' ');
}

/** Remove espaços nas pontas do bloco e colapsa espaço duplo entre trechos. */
function aparar(trechos: Trecho[]): Trecho[] {
  const saida: Trecho[] = [];
  for (const t of trechos) {
    const anterior = saida.at(-1);
    let texto = t.texto;
    if ((!anterior || anterior.texto.endsWith(' ')) && texto.startsWith(' '))
      texto = texto.slice(1);
    if (texto.length > 0) saida.push({ ...t, texto });
  }
  const ultimo = saida.at(-1);
  if (ultimo) {
    ultimo.texto = ultimo.texto.replace(/ $/, '');
    if (ultimo.texto.length === 0) saida.pop();
  }
  return saida;
}
