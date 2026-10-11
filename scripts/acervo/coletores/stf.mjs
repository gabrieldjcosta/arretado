// Coletor das súmulas do STF (portal.stf.jus.br). Uso: node scripts/acervo/coletores/stf.mjs <comum|vinculante> <cache> <saida.json>
// Uma requisição por segundo; o cache bruto fica fora do git. Não inventa texto: o enunciado é o da página oficial.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modo, cache, saida] = process.argv.slice(2);
if (!['comum', 'vinculante'].includes(modo) || !cache || !saida) {
  console.error('uso: stf.mjs <comum|vinculante> <pasta-de-cache> <saida.json>');
  process.exit(2);
}
const vinculante = modo === 'vinculante';
const base = vinculante ? 26 : 30;
const RAIZ = 'https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
mkdirSync(cache, { recursive: true });

const ENTIDADES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&#39;': "'",
  '&ordm;': 'º',
  '&ordf;': 'ª',
  '&sect;': '§',
};
const limpar = (h) =>
  h
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<\/p>/giu, '\n')
    .replace(/<[^>]+>/gu, '')
    .replace(/&#(?:8203|8239);/gu, (m) => (m === '&#8239;' ? ' ' : ''))
    .replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/giu, (e) => ENTIDADES[e] ?? e)
    .replace(/[^\S\n]+/gu, ' ')
    .replace(/ ?\n ?/gu, '\n')
    .replace(/\n{2,}/gu, '\n')
    .trim();

let ultimo = 0;
async function baixar(url, arquivo) {
  const local = join(cache, arquivo);
  if (existsSync(local)) return readFileSync(local, 'utf8');
  const espera = 1100 - (Date.now() - ultimo);
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimo = Date.now();
  for (let t = 1; t <= 4; t++) {
    const r = await fetch(url, { headers: { 'user-agent': UA } });
    if (r.ok) {
      const txt = await r.text();
      writeFileSync(local, txt);
      return txt;
    }
    await new Promise((res) => setTimeout(res, 3000 * t));
  }
  throw new Error(`falhou: ${url}`);
}

const indice = await baixar(`${RAIZ}?base=${base}`, `indice-${modo}.html`);
const itens = [
  ...indice.matchAll(/<div class="sumula-item"><a[^>]*sumula=(\d+)">\s*([\s\S]*?)<\/a>/gu),
].map((m) => {
  const rotulo = limpar(m[2]).replace(new RegExp(String.fromCharCode(0x200b), 'gu'), '');
  const numero = Number(/(\d+)/u.exec(rotulo.replace(/\(.*\)/u, ''))?.[1]);
  const situacao = /\(cancelada\)/iu.test(rotulo)
    ? 'cancelada'
    : /\(superada\)/iu.test(rotulo)
      ? 'superada'
      : 'vigente';
  return { id: m[1], numero, situacao };
});
console.log(`${modo}: ${itens.length} súmulas no índice`);

const sumulas = [];
for (const it of itens) {
  const url = `${RAIZ}?base=${base}&sumula=${it.id}`;
  const html = await baixar(url, `${modo}-${it.id}.html`);
  if (/está pendente de publicação/iu.test(html)) {
    console.log(`pulada (pendente de publicação): ${modo} ${it.numero}`);
    continue;
  }
  const titulo =
    /<div class="titulo">\s*Súmula[\s\S]*?<\/div><div class="parCOM">([\s\S]*?)<\/div><div class="titulo">/u.exec(
      html,
    );
  if (!titulo) throw new Error(`sem enunciado: ${url}`);
  const enunciado = limpar(titulo[1]);
  const obsTxt = limpar(html.split(/<div class="titulo">\s*Observação/u)[1] ?? '');
  const pub = /(?:Data de publicação do enunciado|Data de aprovação|Aprovação):?\s*([^\n]+)/iu.exec(
    obsTxt,
  );
  const origem = pub ? limpar(pub[1]).replace(/\.$/u, '').slice(0, 200) : undefined;
  sumulas.push({
    numero: it.numero,
    enunciado,
    situacao: it.situacao,
    ...(origem ? { origem } : {}),
    link: url,
  });
}
sumulas.sort((a, b) => a.numero - b.numero);
writeFileSync(
  saida,
  JSON.stringify(
    {
      tribunal: vinculante
        ? 'Supremo Tribunal Federal (súmulas vinculantes)'
        : 'Supremo Tribunal Federal',
      vinculante,
      sumulas,
    },
    null,
    2,
  ) + '\n',
);
console.log(`gravado ${saida}: ${sumulas.length}`);
