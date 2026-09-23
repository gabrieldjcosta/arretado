import DOMPurify from "dompurify";

/**
 * Sanitização é a porta de entrada da Legislação (D13, D18). O app **nunca** renderiza HTML:
 * o HTML colado ou baixado é limpo e convertido em **estrutura** (blocos e trechos), e é a
 * estrutura que a interface desenha. Por isso não existe `dangerouslySetInnerHTML` no projeto.
 *
 * O que se preserva é só o que carrega sentido jurídico (§10.6):
 * parágrafo, quebra, ênfase, **tachado** (redação anterior) e link (nota de vigência).
 */

/** Tamanho máximo de uma importação, em caracteres de HTML (§15 F2: "tamanho máximo"). */
export const LIMITE_DE_HTML = 5_000_000;

const TAGS_PERMITIDAS = [
  "p",
  "br",
  "div",
  "span",
  "em",
  "i",
  "strong",
  "b",
  "u",
  "s",
  "strike",
  "del",
  "a",
  "sup",
  "sub",
  "font",
  "table",
  "tbody",
  "thead",
  "tr",
  "td",
  "th",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

const ATRIBUTOS_PERMITIDOS = ["href", "style"];

/** Marcas de trecho que o estruturador usa para decidir o que é redação anterior e o que é nota. */
export interface Trecho {
  texto: string;
  /** Tachado: no Planalto é a marca da redação anterior (D13). */
  tachado: boolean;
  enfase: boolean;
  /** Link preservado (nota de vigência aponta para a lei alteradora). */
  href?: string | undefined;
}

/** Um bloco corresponde a uma linha lógica do texto legal (parágrafo, inciso, título…). */
export interface Bloco {
  trechos: Trecho[];
  /** Texto do bloco sem marcação, já normalizado. */
  texto: string;
  /** Verdadeiro quando o bloco inteiro está tachado (redação anterior completa). */
  tachado: boolean;
}

export interface ResultadoDaSanitizacao {
  blocos: Bloco[];
  /** Texto puro completo, para busca e para o campo `textoNormalizado` da Versão. */
  texto: string;
  /** O que foi removido, para o relatório de importação (§12.3) — nunca em silêncio. */
  removido: { tags: string[]; atributos: string[] };
}

/**
 * Limpa o HTML e devolve a estrutura. Scripts, estilos, iframes, eventos `on*`, `javascript:` e
 * qualquer conteúdo executável são removidos — não neutralizados, removidos.
 */
export function sanitizarHtml(
  html: string,
  opcoes: { limite?: number } = {},
): ResultadoDaSanitizacao {
  const limite = opcoes.limite ?? LIMITE_DE_HTML;
  if (html.length > limite) {
    throw new ErroDeSanitizacao(
      `O conteúdo tem ${html.length} caracteres e o limite por importação é ${limite}.`,
    );
  }

  const removido = { tags: [] as string[], atributos: [] as string[] };
  const anotarTag = ({ tagName }: { tagName: string }) => {
    if (tagName && !removido.tags.includes(tagName)) removido.tags.push(tagName);
  };
  const anotarAtributo = ({ attrName }: { attrName: string }) => {
    if (attrName && !removido.atributos.includes(attrName)) removido.atributos.push(attrName);
  };

  DOMPurify.addHook("uponSanitizeElement", (_no, dados) => {
    if (dados.tagName && !TAGS_PERMITIDAS.includes(dados.tagName) && dados.tagName !== "body") {
      anotarTag({ tagName: dados.tagName });
    }
  });
  DOMPurify.addHook("uponSanitizeAttribute", (_no, dados) => {
    if (dados.attrName && !ATRIBUTOS_PERMITIDOS.includes(dados.attrName)) {
      anotarAtributo({ attrName: dados.attrName });
    }
  });

  let limpo: string;
  try {
    limpo = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: TAGS_PERMITIDAS,
      ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      FORBID_CONTENTS: ["script", "style"],
      KEEP_CONTENT: true,
    });
  } finally {
    DOMPurify.removeAllHooks();
  }

  const molde = document.createElement("template");
  // O conteúdo já passou pelo DOMPurify; o `template` fica fora do documento e nada executa.
  molde.innerHTML = limpo;
  const blocos = extrairBlocos(molde.content);
  return { blocos, texto: blocos.map((b) => b.texto).join("\n"), removido };
}

export class ErroDeSanitizacao extends Error {
  override name = "ErroDeSanitizacao";
}

const TAGS_DE_BLOCO = new Set([
  "P",
  "DIV",
  "LI",
  "TR",
  "BLOCKQUOTE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);
const TAGS_TACHADAS = new Set(["S", "STRIKE", "DEL"]);
const TAGS_DE_ENFASE = new Set(["EM", "I", "STRONG", "B", "U"]);

interface Heranca {
  tachado: boolean;
  enfase: boolean;
  href?: string | undefined;
}

/** Percorre a árvore acumulando trechos e fechando um bloco a cada elemento de bloco ou `<br>`. */
function extrairBlocos(raiz: ParentNode): Bloco[] {
  const blocos: Bloco[] = [];
  let atual: Trecho[] = [];

  const fechar = () => {
    const trechos = atual.filter((t) => t.texto.length > 0);
    atual = [];
    if (trechos.length === 0) return;
    const texto = normalizarEspacos(trechos.map((t) => t.texto).join(""));
    if (!texto) return;
    blocos.push({ trechos, texto, tachado: trechos.every((t) => t.tachado) });
  };

  const visitar = (no: Node, herdado: Heranca) => {
    for (const filho of Array.from(no.childNodes)) {
      if (filho.nodeType === 3) {
        const texto = filho.textContent ?? "";
        if (texto.trim()) atual.push({ ...herdado, texto });
        else if (atual.length > 0) atual.push({ ...herdado, texto: " " });
        continue;
      }
      if (filho.nodeType !== 1) continue;

      const elemento = filho as Element;
      const tag = elemento.tagName;
      if (tag === "BR") {
        fechar();
        continue;
      }
      const ehBloco = TAGS_DE_BLOCO.has(tag);
      if (ehBloco) fechar();

      visitar(elemento, {
        tachado: herdado.tachado || TAGS_TACHADAS.has(tag) || temEstiloTachado(elemento),
        enfase: herdado.enfase || TAGS_DE_ENFASE.has(tag),
        href: elemento.getAttribute("href") ?? herdado.href,
      });

      if (ehBloco) fechar();
    }
  };

  visitar(raiz, { tachado: false, enfase: false });
  fechar();
  return blocos;
}

/** O Planalto também marca redação anterior por estilo, não só por `<s>` (§13.2). */
function temEstiloTachado(elemento: Element): boolean {
  const estilo = elemento.getAttribute("style");
  return Boolean(estilo && /line-through/i.test(estilo));
}

/** Espaços, quebras múltiplas e espaços rígidos viram um espaço simples (§10.6, regra 1). */
export function normalizarEspacos(texto: string): string {
  return texto.replace(/[\s ]+/g, " ").trim();
}
