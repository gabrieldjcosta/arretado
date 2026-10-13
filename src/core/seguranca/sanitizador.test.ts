import { EntradaGrandeDemais, sanitizarHtml, textoParaBlocos, type Bloco } from './sanitizador';

/** Conjunto de HTML malicioso (XSS clássico, mXSS, esquemas perigosos, CSS, SVG/MathML). */
const MALICIOSOS: string[] = [
  '<script>alert(1)</script>',
  '<SCRIPT SRC=//evil.example/x.js></SCRIPT>',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">clique</a>',
  '<a href="JaVaScRiPt:alert(1)">clique</a>',
  '<a href="&#106;avascript:alert(1)">clique</a>',
  '<a href="java\tscript:alert(1)">clique</a>',
  '<a href=" javascript:alert(1)">clique</a>',
  '<a href="vbscript:msgbox(1)">clique</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">clique</a>',
  '<a href="file:///etc/passwd">clique</a>',
  '<svg><script>alert(1)</script></svg>',
  '<svg onload=alert(1)><circle r=1 /></svg>',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
  '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<object data="javascript:alert(1)"></object>',
  '<embed src="javascript:alert(1)">',
  '<style>@import "https://evil.example/x.css"; body{background:url(javascript:alert(1))}</style>',
  '<div style="background:url(javascript:alert(1))">texto</div>',
  '<p onclick="alert(1)" onmouseover="alert(1)">texto</p>',
  '<form action="javascript:alert(1)"><button>ok</button></form>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  '<base href="javascript:/">',
  '<template><script>alert(1)</script></template>',
  '<!--<img src=x onerror=alert(1)>-->',
  '<a href="//evil.example">sem esquema</a>',
  '<link rel="stylesheet" href="https://evil.example/x.css">',
  '<input autofocus onfocus=alert(1)>',
  '<details open ontoggle=alert(1)>',
  '<video><source onerror=alert(1)></video>',
  '<a href="https://ok.example" onclick="alert(1)" style="color:red" target="_blank">ok</a>',
];

function trechos(blocos: Bloco[]) {
  return blocos.flatMap((b) => b.trechos);
}

describe('sanitizador: HTML malicioso', () => {
  it.each(MALICIOSOS)('neutraliza %s', (html) => {
    const { blocos } = sanitizarHtml(html);
    for (const t of trechos(blocos)) {
      // Estrutura só com as chaves permitidas.
      expect(Object.keys(t).every((k) => ['texto', 'tachado', 'enfase', 'link'].includes(k))).toBe(
        true,
      );
      // Nenhum link fora de http(s) absoluto.
      if (t.link !== undefined) expect(t.link).toMatch(/^https?:\/\/[^/]/);
    }
    const saida = JSON.stringify(blocos);
    expect(saida).not.toMatch(/javascript:|vbscript:|data:text|file:/i);
    // Código de script e estilo nunca vira texto.
    expect(saida).not.toMatch(/alert\(1\)|@import|msgbox/);
  });

  it('o resultado é dado, nunca nó ou HTML', () => {
    const { blocos } = sanitizarHtml('<p>a<b>b</b></p>');
    expect(JSON.parse(JSON.stringify(blocos))).toEqual(blocos);
  });
});

describe('sanitizador: fragmentos do Planalto', () => {
  const PLANALTO = `
    <p><strike>Art. 112. A pena privativa de liberdade será executada em forma progressiva.</strike></p>
    <p><a name="art112"></a>Art. 112. A pena privativa de liberdade será executada em forma progressiva
      com a transferência para regime menos rigoroso:
      <a href="http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13964.htm#art4">(Redação dada pela Lei nº 13.964, de 2019)</a></p>
    <p style="text-decoration: line-through">§ 1º Texto revogado por estilo.</p>
    <p><span style="TEXT-DECORATION: line-through">§ 2º Antigo</span> <s>com s</s> <del>com del</del></p>
    <p><font face="Arial"><b>TÍTULO I</b><br>DO OBJETO E DA APLICAÇÃO</font></p>
    <p>I&nbsp;-&nbsp;inciso   com    espaços</p>
    <p><a href="../_Ato2004-2006/2004/Lei/L10.792.htm">relativo</a></p>
  `;

  it('preserva tachado (tag e estilo), ênfase e links absolutos', () => {
    const { blocos, linksDescartados } = sanitizarHtml(PLANALTO);
    expect(blocos[0]?.trechos).toEqual([
      {
        texto: 'Art. 112. A pena privativa de liberdade será executada em forma progressiva.',
        tachado: true,
      },
    ]);
    const nota = blocos[1]?.trechos.at(-1);
    expect(nota).toEqual({
      texto: '(Redação dada pela Lei nº 13.964, de 2019)',
      link: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13964.htm#art4',
    });
    expect(blocos[2]?.trechos).toEqual([
      { texto: '§ 1º Texto revogado por estilo.', tachado: true },
    ]);
    expect(blocos[3]?.trechos).toEqual([
      { texto: '§ 2º Antigo', tachado: true },
      { texto: ' ' },
      { texto: 'com s', tachado: true },
      { texto: ' ' },
      { texto: 'com del', tachado: true },
    ]);
    expect(blocos[4]?.trechos).toEqual([{ texto: 'TÍTULO I', enfase: true }]);
    expect(blocos[5]?.trechos).toEqual([{ texto: 'DO OBJETO E DA APLICAÇÃO' }]);
    expect(blocos[6]?.trechos).toEqual([{ texto: 'I - inciso com espaços' }]);
    expect(blocos[7]?.trechos).toEqual([{ texto: 'relativo' }]);
    expect(linksDescartados).toBe(1);
  });

  it('resolve link relativo quando há URL de origem', () => {
    const { blocos } = sanitizarHtml(PLANALTO, {
      base: 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
    });
    expect(blocos.at(-1)?.trechos[0]?.link).toBe(
      'https://www.planalto.gov.br/ccivil_03/_Ato2004-2006/2004/Lei/L10.792.htm',
    );
  });

  it('marca de tachado não pode ser forjada pela entrada', () => {
    const { blocos } = sanitizarHtml('<p data-arretado-tachado="1">vigente</p>');
    expect(blocos[0]?.trechos).toEqual([{ texto: 'vigente' }]);
  });

  it('células e itens viram blocos separados', () => {
    const { blocos } = sanitizarHtml(
      '<table><tr><td>a</td><td>b</td></tr></table><ul><li>c</li></ul>',
    );
    expect(blocos.map((b) => b.trechos[0]?.texto)).toEqual(['a', 'b', 'c']);
  });
});

describe('limites e texto puro', () => {
  it('recusa entrada acima do limite', () => {
    expect(() => sanitizarHtml('x'.repeat(11), { limite: 10 })).toThrow(EntradaGrandeDemais);
    expect(() => textoParaBlocos('x'.repeat(11), { limite: 10 })).toThrow(EntradaGrandeDemais);
  });

  it('texto puro vira uma linha por bloco, sem formatação', () => {
    expect(textoParaBlocos('Art. 1º  Texto\r\n\n  § 1º  Outro  ')).toEqual([
      { trechos: [{ texto: 'Art. 1º Texto' }] },
      { trechos: [{ texto: '§ 1º Outro' }] },
    ]);
  });

  it('CR sozinho, U+2028 e U+2029 (quebra de linha do Word) também separam linhas (8.1)', () => {
    expect(
      textoParaBlocos('Art. 1º A lei.\rArt. 2º\u2028Art. 3º\u2029').map((b) => b.trechos[0]?.texto),
    ).toEqual(['Art. 1º A lei.', 'Art. 2º', 'Art. 3º']);
  });
});

describe('correções da revisão da etapa 2', () => {
  it('seções, artigos e outros blocos separam dispositivos', () => {
    const { blocos } = sanitizarHtml(
      '<section>Art. 1º Texto.</section><section>Art. 2º Outro.</section><dl><dt>a</dt><dd>b</dd></dl>x<hr>y',
    );
    expect(blocos.map((b) => b.trechos.map((t) => t.texto).join(''))).toEqual([
      'Art. 1º Texto.',
      'Art. 2º Outro.',
      'a',
      'b',
      'x',
      'y',
    ]);
  });

  it('pre separa linhas', () => {
    const { blocos } = sanitizarHtml('<pre>Art. 1º\nArt. 2º</pre>');
    expect(blocos.map((b) => b.trechos[0]?.texto)).toEqual(['Art. 1º', 'Art. 2º']);
  });

  it('tachado por estilo em elemento fora da lista é preservado', () => {
    const { blocos } = sanitizarHtml(
      '<p><abbr style="text-decoration: line-through">revogado</abbr> vigente</p>',
    );
    expect(blocos[0]?.trechos).toEqual([
      { texto: 'revogado', tachado: true },
      { texto: ' vigente' },
    ]);
  });
});

describe('estilo em linha fora do parser (CSP, 9.5)', () => {
  it('<base> é removido antes do parser (base-uri da CSP, 13.1)', () => {
    const { blocos } = sanitizarHtml('<base href="https://exemplo.invalid/"><p>Art. 1º Texto.</p>');
    expect(JSON.stringify(blocos)).toContain('Art. 1º Texto.');
    expect(JSON.stringify(blocos)).not.toContain('exemplo.invalid');
  });

  it('nenhum atributo style nem <style> chega ao DOMParser, e o tachado por estilo continua', () => {
    const espiao = vi.spyOn(DOMParser.prototype, 'parseFromString');
    try {
      const { blocos } = sanitizarHtml(
        [
          '<style>p { color: red }</style>',
          '<p STYLE = "text-decoration: line-through">Art. 1º Antigo.</p>',
          '<p><span class="x" style=\'color:red\'>Art. 1º Novo, com style="a" no texto.</span></p>',
        ].join(''),
      );
      expect(blocos).toEqual([
        { trechos: [{ texto: 'Art. 1º Antigo.', tachado: true }] },
        { trechos: [{ texto: 'Art. 1º Novo, com style="a" no texto.' }] },
      ]);
      const entradas = espiao.mock.calls.map(([html]) => html);
      expect(entradas.length).toBeGreaterThan(0);
      for (const html of entradas) {
        expect(html).not.toMatch(/<style/i);
        const tags = html.match(/<[a-z][^>]*>/gi) ?? [];
        expect(tags.filter((t) => /\sstyle\s*=/i.test(t))).toEqual([]);
      }
    } finally {
      espiao.mockRestore();
    }
  });
});
