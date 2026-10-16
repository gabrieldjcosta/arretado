// Acrescenta à curadoria (acervo/curadoria.json) os itens do índice das 177 normas
// (acervo/fontes/links-das-177-normas.csv) que têm adaptador: páginas HTML do Planalto, da ALESP e da Câmara.
// Não mexe nos itens já curados à mão. Sem rede. Uso: node scripts/acervo-curadoria-do-csv.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const CSV = 'acervo/fontes/links-das-177-normas.csv';
const CURADORIA = 'acervo/curadoria.json';
const TIPOS = {
  constituicao: ['Constituição', 'Constituições e emendas', 'federal'],
  constituicao_estadual: ['Constituição estadual', 'Constituições e emendas', 'estadual'],
  emenda_constitucional: ['Emenda constitucional', 'Constituições e emendas', 'federal'],
  lei_complementar_federal: ['Lei complementar', 'Leis complementares', 'federal'],
  lei_complementar_estadual: ['Lei complementar', 'Leis complementares', 'estadual'],
  decreto_lei: ['Decreto-lei', 'Leis federais', 'federal'],
  lei_federal: ['Lei', 'Leis federais', 'federal'],
  lei_estadual: ['Lei', 'Leis estaduais', 'estadual'],
  decreto_federal: ['Decreto', 'Decretos', 'federal'],
  decreto_estadual: ['Decreto', 'Decretos', 'estadual'],
};
/** Páginas HTML que o adaptador entende; os Anexos do Decreto 10.088 (OIT) pedem recorte e ficam de fora. */
const HOSTS = {
  'www.planalto.gov.br': 'planalto',
  'www.al.sp.gov.br': 'html',
  'www2.camara.leg.br': 'html',
};

const linhas = readFileSync(CSV, 'utf8')
  .replace(/^\ufeff/i, '')
  .split(/\r?\n/)
  .filter(Boolean)
  .slice(1);
const cur = JSON.parse(readFileSync(CURADORIA, 'utf8'));
const ids = new Set(cur.itens.map((i) => i.id));
let novos = 0;
for (const l of linhas) {
  const c = l.split(/";"/).map((x) => x.replace(/^"|"$/g, ''));
  const [, tipoCsv, citada, confirmada, link, , , status, , , obs] = c;
  const tipo = TIPOS[tipoCsv];
  const adaptador = HOSTS[link ? new URL(link).host : ''];
  if (!tipo || !adaptador || /decreto-10088/.test(link)) continue;
  const m = /^\S+ (?:(\d+) )?(\d{4})/.exec(citada);
  const id = m
    ? [tipoCsv.replace(/_/g, '-'), m[1], m[2]].filter(Boolean).join('-')
    : tipoCsv.replace(/_/g, '-') + '-' + (c[0] ?? '');
  if (ids.has(id)) continue;
  const avisos = [];
  // Antes gerava avisos DIVERGÊNCIA e "Conferir a norma"; removido para esta tarefa.
  cur.itens.push({
    id,
    titulo: confirmada.slice(0, 200) || citada.slice(0, 200),
    grupo: tipo[1],
    tipo: tipo[0],
    esfera: tipo[2],
    vinculos: [],
    avisos,
    fonte: { adaptador, url: link },
  });
  ids.add(id);
  novos++;
}
writeFileSync(CURADORIA, JSON.stringify(cur, null, 2) + '\n');
console.log(`${novos} item(ns) acrescentado(s); curadoria com ${cur.itens.length}.`);
