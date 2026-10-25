// Tabela de peso por artigo (norma,artigo,peso,faixa) → pacote de incidência para o app:
// { id, titulo, normas: { <id do item do acervo>: [números de artigo] } }. Só entram as faixas pedidas.
const FIXAS = {
  cf: 'constituicao-1988',
  'ce-sp': 'constituicao-estadual-1989',
  cp: 'decreto-lei-2848-1940',
  cpp: 'decreto-lei-3689-1941',
  cpm: 'decreto-lei-1001-1969',
  cc: 'lei-federal-10406-2002',
  cpc: 'lei-federal-13105-2015',
  ctn: 'lei-federal-5172-1966',
  cadh: 'convencao-americana-direitos-humanos',
};

/** `lei-8069-1990` → `lei-federal-8069-1990`; `lc-80-1994` → `lei-complementar-federal-80-1994`. */
export function itemDoAcervo(slug) {
  if (FIXAS[slug]) return FIXAS[slug];
  const m = slug.match(/^(lei|lc|lce|le|dec)-(\d+)-(\d{4})$/);
  if (!m) return null;
  const tipo = {
    lei: 'lei-federal',
    lc: 'lei-complementar-federal',
    lce: 'lei-complementar-estadual',
    le: 'lei-estadual',
    dec: 'decreto-federal',
  }[m[1]];
  return `${tipo}-${m[2]}-${m[3]}`;
}

/** `linhas`: objetos de lerCsv com norma, artigo e faixa. */
export function montarPacote(linhas, { id, titulo, faixas = ['Altíssima', 'Alta'] }) {
  const normas = {};
  const ignoradas = new Set();
  for (const l of linhas) {
    if (!faixas.includes(l.faixa)) continue;
    const item = itemDoAcervo(l.norma);
    if (!item) {
      ignoradas.add(l.norma);
      continue;
    }
    (normas[item] ??= []).push(l.artigo);
  }
  return { pacote: { id, titulo, normas }, ignoradas: [...ignoradas] };
}
