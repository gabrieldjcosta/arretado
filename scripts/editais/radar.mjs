// Radar de editais (passo 1 de docs/planos/acompanhamento-de-editais.md): só detecta, nunca toca no catálogo.
//   node scripts/editais/radar.mjs [--fontes docs/editais/fontes.json] [--estado docs/editais/estado.json] [--fila docs/editais/fila.json]
// Lê cada página de `fontes`, guarda em `estado` os links que casam com `padrao` e grava em `fila` o que apareceu
// desde a última leitura. Primeira leitura de uma fonte = linha de base (não alerta). Falha de uma fonte vira aviso, não silêncio.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function extrairLinks(html, base, padrao = '\\.pdf(\\?|$)') {
  const re = new RegExp(padrao, 'i');
  const achados = new Set();
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    let url;
    try {
      url = new URL(m[1].replace(/&amp;/g, '&'), base).href;
    } catch {
      continue;
    }
    if (re.test(url)) achados.add(url);
  }
  return [...achados].sort();
}

// tipo "indice": página que lista concursos (link novo = concurso novo); tipo "edital": página de um concurso
// (link novo = retificação ou documento novo).
export function comparar(estado, leituras, hoje) {
  const novoEstado = { ...estado };
  const fila = [];
  const avisos = [];
  for (const { fonte, links, erro } of leituras) {
    if (erro) {
      avisos.push(`${fonte.id}: ${erro}`);
      continue;
    }
    const antes = estado[fonte.id];
    if (antes) {
      for (const url of links.filter((l) => !antes.links.includes(l)))
        fila.push({
          fonte: fonte.id,
          orgao: fonte.orgao,
          banca: fonte.banca,
          tipo: fonte.tipo === 'indice' ? 'novo' : 'retificado',
          url,
          detectadoEm: hoje,
        });
    }
    novoEstado[fonte.id] = { links, lidoEm: hoje };
  }
  return { novoEstado, fila, avisos };
}

async function ler(fonte, buscar) {
  try {
    const res = await buscar(fonte.url);
    if (!res.ok) return { fonte, erro: `HTTP ${res.status}` };
    return { fonte, links: extrairLinks(await res.text(), fonte.url, fonte.padrao) };
  } catch (e) {
    return { fonte, erro: String(e?.cause?.code ?? e?.message ?? e) };
  }
}

export async function rodar({ fontes, estado, hoje, buscar = fetch }) {
  const leituras = await Promise.all(fontes.map((f) => ler(f, buscar)));
  return comparar(estado, leituras, hoje);
}

const json = (arq, padrao) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : padrao);

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (nome, padrao) => {
    const i = process.argv.indexOf(nome);
    return i >= 0 ? process.argv[i + 1] : padrao;
  };
  const arqFontes = arg('--fontes', 'docs/editais/fontes.json');
  const arqEstado = arg('--estado', 'docs/editais/estado.json');
  const arqFila = arg('--fila', 'docs/editais/fila.json');
  const { novoEstado, fila, avisos } = await rodar({
    fontes: json(arqFontes, []),
    estado: json(arqEstado, {}),
    hoje: new Date().toISOString().slice(0, 10),
  });
  const filaAnterior = json(arqFila, []);
  const chave = (x) => `${x.fonte}|${x.url}`;
  const jaNaFila = new Set(filaAnterior.map(chave));
  const fila2 = [...filaAnterior, ...fila.filter((x) => !jaNaFila.has(chave(x)))];
  writeFileSync(arqEstado, JSON.stringify(novoEstado, null, 2) + '\n');
  writeFileSync(arqFila, JSON.stringify(fila2, null, 2) + '\n');
  for (const a of avisos) console.warn(`AVISO ${a}`);
  console.log(
    `${fila.length} novo(s) nesta leitura · ${fila2.length} na fila · ${avisos.length} fonte(s) com falha`,
  );
  if (avisos.length) process.exitCode = 2;
}
