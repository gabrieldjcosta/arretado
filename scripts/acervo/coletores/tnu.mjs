// Coletor das súmulas da TNU (lista oficial do CJF, listaSumulas.php, em ISO-8859-1).
// Uso: node scripts/acervo/coletores/tnu.mjs <saida.json> [cache.html]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [saida, cache] = process.argv.slice(2);
const URL_LISTA = 'https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
let html;
if (cache && existsSync(cache)) html = readFileSync(cache, 'latin1');
else {
  const r = await fetch(URL_LISTA, { headers: { 'user-agent': UA } });
  html = new TextDecoder('latin1').decode(await r.arrayBuffer());
  if (cache) writeFileSync(cache, html, 'latin1');
}
const ENT = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>' };
const limpar = (h) =>
  h
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<[^>]+>/gu, '')
    .replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/giu, (e) => ENT[e] ?? e)
    .replace(/[^\S\n]+/gu, ' ')
    .replace(/ ?\n ?/gu, '\n')
    .trim();

const sumulas = [];
for (const m of html.matchAll(
  /<td width="41%">([\s\S]*?)<\/td>\s*<td width="59%">([\s\S]*?)<\/td>/gu,
)) {
  const meta = limpar(m[1]);
  const numero = Number(/S[ÚU]MULA (\d+)/iu.exec(meta)?.[1]);
  if (!numero) continue;
  const enunciado = limpar(m[2]).replace(/\n+/gu, ' ');
  const situacao = /\((CANCELADA|REVOGADA)\b/iu.test(meta) ? 'cancelada' : 'vigente';
  const origem = meta
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('; ')
    .slice(0, 200);
  sumulas.push({ numero, enunciado, situacao, ...(origem ? { origem } : {}), link: URL_LISTA });
}
sumulas.sort((a, b) => a.numero - b.numero);
writeFileSync(
  saida,
  JSON.stringify(
    {
      tribunal: 'Turma Nacional de Uniformização dos Juizados Especiais Federais',
      vinculante: false,
      sumulas,
    },
    null,
    2,
  ) + '\n',
);
console.log(`gravado ${saida}: ${sumulas.length}`);
