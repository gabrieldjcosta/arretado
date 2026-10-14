// Extrai o texto de um ato publicado em página HTML (portal da Defensoria, BVS, Câmara) como Markdown
// simples: um parágrafo por linha, `~~tachado~~` para texto riscado. Usado por `acervo-lote-md.mjs`.
import { JSDOM } from 'jsdom';
import { normalizar } from './acervo-pdf-para-md.mjs';

const BLOCOS = new Set([
  'P',
  'DIV',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TR',
  'BR',
  'UL',
  'OL',
  'TABLE',
]);

function riscado(el) {
  return (
    ['S', 'STRIKE', 'DEL'].includes(el.tagName) ||
    /line-through/.test(el.getAttribute?.('style') ?? '')
  );
}

function linhas(no, saida, tachado) {
  for (const f of no.childNodes) {
    if (f.nodeType === 3) {
      const t = f.textContent.replace(/\s+/g, ' ');
      if (t.trim()) saida[saida.length - 1] += tachado ? `~~${t.trim()}~~ ` : t;
    } else if (f.nodeType === 1) {
      if (['SCRIPT', 'STYLE'].includes(f.tagName)) continue;
      const bloco = BLOCOS.has(f.tagName);
      if (bloco) saida.push('');
      linhas(f, saida, tachado || riscado(f));
      if (bloco) saida.push('');
    }
  }
}

/**
 * @param seletor função opcional que escolhe o contêiner; por padrão, o menor elemento com ao menos
 *   3 parágrafos cujo texto traga "Art. 1" ou "Artigo 1".
 */
export function htmlParaTexto(html, seletor) {
  const doc = new JSDOM(html).window.document;
  let alvo;
  if (seletor) alvo = doc.querySelector(seletor);
  else {
    const c = [...doc.querySelectorAll('div,section,article,td,main')]
      .filter((e) => e.querySelectorAll('p').length >= 3 && /(Art\.|Artigo) ?1/.test(e.textContent))
      .sort((a, b) => a.textContent.length - b.textContent.length);
    alvo = c[0];
  }
  if (!alvo) throw new Error('contêiner do texto não encontrado');
  const saida = [''];
  linhas(alvo, saida, false);
  const texto = saida
    .map((l) =>
      l
        .replace(/~~\s*~~/g, '')
        .replace(/~~ ~~/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
  return normalizar(texto);
}
