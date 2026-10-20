// Peso por artigo a partir da tabela de incidência (recorte banca × cargo). Heurística: cada artigo
// recebe o peso da linha mais específica que o cobre (menos artigos) = qtd_questoes / nº de artigos dela.
export function normaDe(ref) {
  const r = String(ref ?? '');
  return r === 'CP' ? 'cp' : /ECA|8\.069/.test(r) ? 'eca' : null;
}

/** Artigos citados em "arts. 32 a 42 e 53", "art. 14, inciso I", "arts. 217-A a 226". Intervalos só enumeram inteiros. */
export function artigosDe(texto) {
  const t = String(texto ?? '')
    .replace(/§\s*\d+º?/g, '')
    .replace(/\binciso\s+[IVXL]+/gi, '')
    .replace(/[ºª°]/g, '');
  const partes = t
    .split(/\s+e\s+|,/)
    .map((p) => p.trim())
    .filter((p) => /\d/.test(p));
  const out = new Set();
  for (const p of partes) {
    const [a, b] = p.split(/\s+a\s+/);
    const x = a?.match(/\d+(?:-[A-Z])?/)?.[0];
    const y = b?.match(/\d+(?:-[A-Z])?/)?.[0];
    if (!x) continue;
    out.add(x);
    if (y) {
      out.add(y);
      const i = parseInt(x, 10);
      const j = parseInt(y, 10);
      for (let n = i + 1; n < j && j - i < 400; n++) out.add(String(n));
    }
  }
  return [...out];
}

/** Preferimos o intervalo do próprio nome do assunto: a coluna dispositivo_ref às vezes herda o do pai. */
export function referenciaDe(l) {
  const m = l.assunto_tec.match(
    /\((?:arts?\.?|artigos?)\s*([^)]*?)(?:\s+d[ao]s?\s+(?:CP|Lei|Código)[^)]*)?\)/i,
  );
  return m ? m[1] : String(l.dispositivo_ref ?? '').replace(/[,\s]+$/, '');
}

export function pesoPorArtigo(linhas) {
  const melhor = new Map();
  for (const l of linhas) {
    const norma = normaDe(l.norma_ref);
    if (!norma) continue;
    const arts = artigosDe(referenciaDe(l));
    if (!arts.length) continue;
    const peso = Number(l.qtd_questoes) / arts.length;
    for (const a of arts) {
      const k = `${norma}|${a}`;
      const atual = melhor.get(k);
      if (!atual || arts.length < atual.n)
        melhor.set(k, { norma, artigo: a, peso, n: arts.length, fonte: l.assunto_tec });
    }
  }
  const out = [];
  for (const norma of new Set([...melhor.values()].map((x) => x.norma))) {
    const itens = [...melhor.values()]
      .filter((x) => x.norma === norma)
      .sort((a, b) => b.peso - a.peso || a.artigo.localeCompare(b.artigo, 'pt', { numeric: true }));
    const total = itens.reduce((s, x) => s + x.peso, 0);
    let acc = 0;
    for (const x of itens) {
      const antes = acc / total;
      acc += x.peso;
      const faixa =
        antes < 0.4 ? 'Altíssima' : antes < 0.7 ? 'Alta' : antes < 0.9 ? 'Média' : 'Baixa';
      out.push({
        norma,
        artigo: x.artigo,
        peso: Math.round(x.peso * 1000) / 1000,
        faixa,
        fonte: x.fonte,
      });
    }
  }
  return out;
}
