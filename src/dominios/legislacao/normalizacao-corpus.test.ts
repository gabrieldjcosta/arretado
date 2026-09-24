// Normalização (8.1) sobre o corpus inteiro: o colado das 7 páginas (corpus/normas/*.colado.*),
// em texto puro e, nas 3 páginas menores, em HTML pelo sanitizador (as grandes ficam para a 8.2).
// Os colados entram como texto pelo `?raw` do Vite: src/ não tem os tipos do Node.
import { sanitizarHtml, textoParaBlocos, type Bloco } from '../../core/seguranca/sanitizador';
import { normalizarBlocos, type RelatorioNormalizacao } from './normalizacao';

const TEXTO = import.meta.glob<string>('../../../corpus/normas/*.colado.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const HTML = import.meta.glob<string>('../../../corpus/normas/{lep,lc80,lc-sp-988}.colado.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const colado = (id: string, ext: 'txt' | 'html') => {
  const conteudo = (ext === 'txt' ? TEXTO : HTML)[`../../../corpus/normas/${id}.colado.${ext}`];
  if (conteudo === undefined) throw new Error(`sem colado: ${id}.${ext}`);
  return conteudo;
};
const TODAS = ['lep', 'lep-compilado', 'cp', 'cp-compilado', 'lc80', 'lc-sp-988', 'cf'] as const;
const COM_HTML = ['lep', 'lc80', 'lc-sp-988'] as const;

/** O que a regra 1 troca em cada colado (conferido à mão em 23/09/2026; muda se o corpus mudar). */
const RELATORIO_TEXTO: Record<(typeof TODAS)[number], Partial<RelatorioNormalizacao>> = {
  lep: { ordinais: 69 },
  'lep-compilado': { ordinais: 54 },
  cp: { ordinais: 182 },
  'cp-compilado': { ordinais: 112 },
  lc80: { ordinais: 8, hifensSuaves: 79, hifenSuave: 'hifen' },
  'lc-sp-988': { ordinais: 494 },
  cf: { ordinais: 32 },
};
/** No HTML o ordinal num trecho próprio (`<s>º</s>`, `<sup><u>o</u></sup>`) também conta. */
const RELATORIO_HTML: Record<(typeof COM_HTML)[number], Partial<RelatorioNormalizacao>> = {
  lep: { ordinais: 69 },
  lc80: { ordinais: 64, hifensSuaves: 79, hifenSuave: 'hifen' },
  'lc-sp-988': { ordinais: 494 },
};
/** Tachados que somem no HTML: o `<s>º</s>` e o `<s>ª</s>` decorativos da LC 80 (56). */
const DECORATIVOS: Record<string, number> = { lc80: 56 };

const texto = (b: Bloco) => b.trechos.map((t) => t.texto).join('');
const tachados = (blocos: Bloco[]) =>
  blocos
    .flatMap((b) => b.trechos)
    .filter((t) => t.tachado)
    .reduce((n, t) => n + t.texto.replace(/\s/g, '').length, 0);

// eslint-disable-next-line no-control-regex
const CONTROLES = /[\u0000-\u001f\u007f-\u009f]/;
const PROIBIDOS =
  /[\u034F\u00AD\u061C\u180E\u200B-\u200F\u2010\u2011\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFFD]/u;
const ORDINAL_SOLTO = [
  /\d ?[\u00B0\u02DA\u1D52\u1D43]/u, // grau como ordinal (o corpus não tem grau de verdade)
  /(?<![\p{L}\d.,/])\d{1,3}o(?![\p{L}\d])/u, // "1o"
  /(?:^|[\s(])(?:Art\.?|Artigo|§§?) ?[1-9] o(?![\p{L}\d])/u, // "§ 3 o"
  /\d º/u, // "§ 3 º"
  /(?:\d|(?<![\p{L}\d])[nN])\.[\u00B0\u02DA\u1D52]/u, // "n.°", "§ 2.°"
];

function conferir(
  id: string,
  entrada: Bloco[],
  relatorioEsperado: Partial<RelatorioNormalizacao>,
  decorativos = 0,
) {
  const { blocos, relatorio } = normalizarBlocos(entrada);
  expect(blocos).toHaveLength(entrada.length);
  expect(relatorio).toMatchObject({
    entidades: 0,
    perdidos: 0,
    hifensSuaves: 0,
    ...relatorioEsperado,
  });
  const problemas: string[] = [];
  blocos.forEach((b, i) => {
    const t = texto(b);
    if (CONTROLES.test(t) || PROIBIDOS.test(t))
      problemas.push(`bloco ${String(i)}: caractere proibido`);
    if (t !== t.normalize('NFC')) problemas.push(`bloco ${String(i)}: fora do NFC`);
    if (/ {2}|^ | $/.test(t)) problemas.push(`bloco ${String(i)}: espaço sobrando`);
    for (const re of ORDINAL_SOLTO)
      if (re.test(t)) problemas.push(`bloco ${String(i)}: ordinal ${t.slice(0, 60)}`);
    b.trechos.forEach((tr, j) => {
      const ant = b.trechos[j - 1];
      if (tr.texto.length === 0) problemas.push(`bloco ${String(i)}: trecho vazio`);
      if (ant && ant.tachado === tr.tachado && ant.enfase === tr.enfase && ant.link === tr.link)
        problemas.push(`bloco ${String(i)}: trechos iguais não fundidos`);
      if (ant && /\d$/.test(ant.texto) && /^[ºª]/.test(tr.texto))
        problemas.push(`bloco ${String(i)}: ordinal separado do número`);
    });
  });
  expect(problemas, id).toEqual([]);
  expect(tachados(blocos), `${id}: tachado preservado`).toBe(tachados(entrada) - decorativos);
  expect(normalizarBlocos(blocos).blocos, `${id}: idempotente`).toEqual(blocos);
  return blocos;
}

describe('normalização (8.1) no corpus', () => {
  it.each(TODAS)('texto puro: %s', (id) => {
    const entrada = textoParaBlocos(colado(id, 'txt'));
    conferir(id, entrada, RELATORIO_TEXTO[id]);
  });

  it.each(COM_HTML)(
    'HTML: %s, com as mesmas linhas do texto puro',
    (id) => {
      const html = conferir(
        id,
        sanitizarHtml(colado(id, 'html')).blocos,
        RELATORIO_HTML[id],
        DECORATIVOS[id],
      );
      const puro = normalizarBlocos(textoParaBlocos(colado(id, 'txt'))).blocos;
      // O texto puro traz o texto alternativo da imagem do brasão, que o sanitizador descarta.
      const linhasPuro = puro.map(texto).filter((l) => !/^Brastra\.gif \(\d+ bytes\)$/.test(l));
      expect(html.map(texto)).toEqual(linhasPuro);
    },
    60_000,
  );
});
