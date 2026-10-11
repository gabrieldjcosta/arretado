// Coleta bruta das teses institucionais da DPE-SP (Peça 5, só a coleta).
// Uso: node scripts/acervo-teses-coletar.mjs [--sem-pdf]
// Saída (fora do git): .claude/tmp/acervo/teses/{pagina.html, teses.json, pdf/*.pdf, relatorio.md}
// User-Agent identificado; no máximo 1 requisição por segundo.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const BASE = 'https://www.defensoria.sp.def.br';
const P = '_br_def_sp_defensoria_teses_institucionais_DpespTesesInstitucionaisPortlet_';
const URL_LISTA =
  `${BASE}/web/guest/institucional/edepe/pagina-inicial-edepe/teses-institucionais` +
  `?p_p_id=${P.slice(1, -1)}&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view` +
  `&${P}jspPage=%2Fview.jsp&${P}delta=200&${P}resetCur=false&${P}cur=1`;
const UA = 'Arretado-coleta/1.0 (uso pessoal de estudo; gabrieldjcosta@gmail.com)';
const SAIDA = join('.claude', 'tmp', 'acervo', 'teses');
const semPdf = process.argv.includes('--sem-pdf');

const AREAS = ['Execução Criminal', 'Infância e Juventude', 'Criminal', 'Cível', 'Família'];
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
let ultima = 0;
async function baixar(url) {
  const espera = 1000 - (Date.now() - ultima);
  if (espera > 0) await dorme(espera);
  ultima = Date.now();
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

const entidades = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};
const limpa = (s) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (m) => entidades[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

function analisar(html) {
  const cartoes = [
    ...html.matchAll(/<a href="([^"]+)"[^>]*class="article-edepe-teses"[^>]*>([\s\S]*?)<\/a>/g),
  ];
  return cartoes.map(([, href, corpo]) => {
    const titulo = limpa((corpo.match(/<h5[^>]*>([\s\S]*?)<\/h5>/) ?? [])[1] ?? '');
    const numero = Number((titulo.match(/^Tese\s+(\d+)/) ?? [])[1] ?? NaN);
    const area = AREAS.find((a) => titulo.includes(a)) ?? null;
    const encontro = (titulo.match(/([IVXL]+)[ ]+Encontro/) ?? [])[1] ?? null;
    const ano = Number((titulo.match(/(20[0-9]{2})[)]?$/) ?? [])[1] ?? NaN);
    const arquivo = decodeURIComponent((href.match(/\/(TS_[^/]+?)\.pdf/) ?? [])[1] ?? '');
    const texto = limpa((corpo.match(/<b>Súmula:<\/b>([\s\S]*?)<\/article>/) ?? [])[1] ?? '');
    const sigla =
      {
        Cível: 'cvl',
        Família: 'fam',
        Criminal: 'crm',
        'Execução Criminal': 'xcr',
        'Infância e Juventude': 'inj',
      }[area] ?? 'xxx';
    const id =
      `tese-${String(numero).padStart(3, '0')}-${sigla}-${encontro ?? 'sem-encontro'}-${Number.isNaN(ano) ? 'sem-ano' : ano}`.toLowerCase();
    return {
      id,
      arquivoNoSite: arquivo || null,
      numero: Number.isNaN(numero) ? null : numero,
      area,
      encontro,
      ano: Number.isNaN(ano) ? null : ano,
      cancelada: /CANCELADA/i.test(arquivo) || /^TESE CANCELADA/i.test(texto),
      titulo,
      texto,
      urlPdf: href.replace(/&amp;/g, '&'),
    };
  });
}

await mkdir(join(SAIDA, 'pdf'), { recursive: true });
const html = (await baixar(URL_LISTA)).toString('utf8');
await writeFile(join(SAIDA, 'pagina.html'), html);
const total = Number((html.match(/Exibindo\s+(\d+)\s+resultados/) ?? [])[1] ?? 0);
const teses = analisar(html);

const problemas = [];
if (teses.length !== total)
  problemas.push(`Cartões lidos (${teses.length}) ≠ total informado (${total}).`);
const ids = new Set();
const observacoes = [];
for (const t of teses) {
  if (t.numero === null || !t.area) problemas.push(`Título fora do padrão: "${t.titulo}"`);
  if (!t.texto) problemas.push(`${t.titulo}: sem texto.`);
  if (ids.has(t.id)) problemas.push(`Id repetido: ${t.id}`);
  ids.add(t.id);
  if (!t.arquivoNoSite) observacoes.push(`${t.titulo}: o link não segue o padrão TS_*.pdf.`);
  if (t.cancelada) observacoes.push(`${t.titulo}: CANCELADA (nome do PDF ou texto).`);
  if (
    t.arquivoNoSite &&
    t.numero !== null &&
    !t.arquivoNoSite.startsWith('TS_' + String(t.numero).padStart(3, '0') + '_')
  )
    observacoes.push(`${t.titulo}: o PDF é ${t.arquivoNoSite} (número diferente do título).`);
  if (!t.ano && !t.cancelada) observacoes.push(`${t.titulo}: sem ano no título.`);
}
const porArea = {};
for (const t of teses) (porArea[t.area] ??= []).push(t.numero);

if (!semPdf) {
  for (const t of teses) {
    const nome = `${t.id}.pdf`;
    const caminho = join(SAIDA, 'pdf', nome);
    t.arquivoPdf = nome;
    try {
      await access(caminho);
    } catch {
      try {
        await writeFile(caminho, await baixar(BASE + t.urlPdf.replace(BASE, '')));
      } catch (e) {
        problemas.push(`PDF da tese ${t.numero}: ${e.message}`);
        t.arquivoPdf = null;
        continue;
      }
    }
    const buf = await readFile(caminho);
    t.sha256Pdf = createHash('sha256').update(buf).digest('hex');
    t.bytesPdf = buf.length;
    if (buf.subarray(0, 4).toString() !== '%PDF')
      problemas.push(`Tese ${t.numero}: arquivo não é PDF.`);
  }
}

await writeFile(
  join(SAIDA, 'teses.json'),
  JSON.stringify({ coletadoEm: new Date().toISOString(), fonte: URL_LISTA, total, teses }, null, 2),
);

const contar = (campo) =>
  Object.entries(teses.reduce((a, t) => ((a[t[campo]] = (a[t[campo]] ?? 0) + 1), a), {}))
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
await writeFile(
  join(SAIDA, 'relatorio.md'),
  `# Coleta das teses da DPE-SP\n\nTotal informado: ${total}; lidas: ${teses.length}.\n\n## Por área\n${contar('area')}\n\n## Por ano\n${contar('ano')}\n\n## Observações do site (não são erros da coleta)\n${observacoes.length ? observacoes.map((p) => `- ${p}`).join('\n') : 'Nenhuma.'}\n\n## Problemas\n${problemas.length ? problemas.map((p) => `- ${p}`).join('\n') : 'Nenhum.'}\n`,
);
console.log(`Total ${total}, lidas ${teses.length}, problemas ${problemas.length}`);
problemas.slice(0, 20).forEach((p) => console.log(' -', p));
