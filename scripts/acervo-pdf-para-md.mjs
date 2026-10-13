// Converte o PDF de um ato oficial em Markdown simples para `acervo/fontes/` (adaptador `markdown`).
// Uso: node scripts/acervo-pdf-para-md.mjs <url-do-pdf> <saida.md> "<título>" [--cnj-pagina <url>]
// Requer `pdftotext` (poppler) no PATH. O texto sai uma linha por dispositivo: "Art.", "§", incisos,
// alíneas e títulos começam linha nova; o resto é junção das quebras de linha do PDF.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const UA = { 'user-agent': 'Mozilla/5.0' };

export async function baixar(url) {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Página de ato do CNJ → URL do PDF mais atual (último "compilado"; senão o do ato; `modo` "original" prefere o do ato). */
export async function pdfDoCnj(pagina, modo = 'compilado') {
  const html = (await baixar(pagina)).toString('utf8');
  const links = [...new Set([...html.matchAll(/href="([^"]*\/files\/[^"]*\.pdf)"/g)].map((m) => m[1]))]
    .filter((l) => !/justica\.pr|regras_das/.test(l))
    .map((l) => new URL(l.replace('/files//', '/files/'), pagina).href);
  const comp = links.filter((l) => /compilado/.test(l));
  if (modo === 'original') return links.find((l) => !/compilado/.test(l)) ?? links[0] ?? null;
  return (comp.length ? comp : links).at(-1) ?? null;
}

const INICIO =
  /^(Art\.|Artigo|§|Parágrafo único|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|T[ÍI]TULO|LIVRO|ANEXO|[IVXLCDM]+\s*[-–—.)]|[a-z]\)|\d+\s*[-–—.)]|\*\s)/;
const CAIXA_ALTA = /^[A-ZÀ-Ú0-9 ,.\-–ªº/()]{6,}$/;
const RUIDO = [
  /^\s*\d+\s*$/,
  /^\s*P[áa]gina \d+( de \d+)?\s*$/i,
  /^\s*Este texto não substitui/i,
  /^\s*Texto compilado/i,
  /^\s*Documento assinado/i,
  /^\s*Assinado eletronicamente/i,
];

/** Ordinais que o PDF achata ("art. 5o" → "art. 5º"), "nº" sem o sinal e "Art." colado no fim do artigo anterior. */
export function normalizar(texto) {
  return texto
    .replace(/[-]/g, '')
    .replace(/(\d)o(?![A-Za-zÀ-ú\d])/g, '$1º')
    .replace(/\b(Lei|Decreto|Resolução|Provimento|Portaria|Recomendação|Deliberação|Convenção|CNJ|CSDP|DPG|CONANDA|CNAS) no (?=\d)/g, '$1 nº ')
    .replace(/\b(RESOLUÇÃO|PROVIMENTO|DELIBERAÇÃO|PORTARIA|RECOMENDAÇÃO|ATO NORMATIVO) No /g, '$1 Nº ')
    .replace(/([.;:”"]) (Art\. \d+[ºo°]?[ .-])/g, '$1\n$2')
    .replace(/([.;:”")]) (§ ?\d+[ºo°]?[ .-]|Parágrafo único)/g, '$1\n$2')
    .replace(/([.;:]) ([IVXLC]{1,6} ?[–—-] )/g, '$1\n$2')
    .replace(/([.;:]) ([a-z]\) )/g, '$1\n$2');
}

export function limpar(bruto) {
  const linhas = normalizar(bruto.replace(/\f/g, '\n').replace(/­/g, '')).split(/\r?\n/);
  const saida = [];
  for (const l0 of linhas) {
    const l = l0.replace(/[ \t ]+/g, ' ').trim();
    if (!l) {
      saida.push('');
      continue;
    }
    if (RUIDO.some((r) => r.test(l))) continue;
    let ant = saida.at(-1);
    if (ant === '' && /^[a-zà-ú(]/.test(l)) {
      // Quebra de página ou de coluna no meio da frase: a linha anterior não terminou.
      let k = saida.length - 1;
      while (k >= 0 && saida[k] === '') k--;
      if (k >= 0 && !/[.;:!?)”"…]$/.test(saida[k])) {
        saida.length = k + 1;
        ant = saida[k];
      }
    }
    if (ant === undefined || ant === '' || INICIO.test(l) || (CAIXA_ALTA.test(l) && !/[a-z]/.test(l))) {
      saida.push(l);
    } else if (/[a-zà-ú]-$/.test(ant) && /^[a-zà-ú]/.test(l)) {
      saida[saida.length - 1] = ant.slice(0, -1) + l;
    } else saida[saida.length - 1] = `${ant} ${l}`;
  }
  return saida
    .filter((l, i) => l || (i > 0 && saida[i - 1]))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Documentos técnicos sem artigos (PNAS, SINASE, Tipificação): marca com `#` as linhas que parecem título
 * (numeradas "1.", "1.1", "1.1.1" ou em caixa alta), para o adaptador separar o texto em seções.
 */
export function comTitulos(texto) {
  return texto
    .split('\n')
    .map((l) => {
      if (l.length > 110 || /[.!?;,]$/.test(l)) return l;
      const n = /^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+[A-ZÀ-Ú]/.exec(l);
      if (n) return `${'#'.repeat(Math.min(n[1].split('.').length, 4))} ${l}`;
      if (/^[A-ZÀ-Ú][A-ZÀ-Ú0-9 ,\-–/()ªº]{5,}$/.test(l)) return `# ${l}`;
      return l;
    })
    .join('\n');
}

export function pdfParaTexto(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'));
  const f = join(dir, 'a.pdf');
  writeFileSync(f, buf);
  return execFileSync('pdftotext', ['-enc', 'UTF-8', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
}

if (process.argv[1]?.endsWith('acervo-pdf-para-md.mjs')) {
  const [, , url0, saida, titulo, flag, pagina] = process.argv;
  let url = url0;
  if (flag === '--cnj-pagina') url = (await pdfDoCnj(pagina)) ?? url0;
  const texto = limpar(pdfParaTexto(await baixar(url)));
  writeFileSync(saida, `# ${titulo}\n${texto}\n`);
  console.log(`${saida}: ${texto.length} caracteres de ${url}`);
}
