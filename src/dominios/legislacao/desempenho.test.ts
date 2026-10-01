import type { Bloco } from '../../core/seguranca/sanitizador';
import { estruturar } from './estruturador';
import { normalizarBlocos } from './normalizacao';
import type { TipoAnomalia } from './rascunho';

// Entrada hostil numa linha só (o sanitizador aceita até 10 milhões de caracteres, LIMITE_PADRAO):
// nenhuma regra pode ser quadrática.
describe('normalização (8.1): desempenho', () => {
  it.each([
    ['algarismos', '1,' + '9'.repeat(2_000_000) + 'º'],
    ['espaços', 'a' + ' '.repeat(2_000_000) + 'b'],
    ['hífens suaves', ('se' + String.fromCharCode(0xad)).repeat(1_000_000) + 'a'],
    ['ordinais', '§ 1 o , 2 o e '.repeat(200_000)],
  ])(
    '%s',
    (_nome, texto) => {
      const inicio = performance.now();
      normalizarBlocos([{ trechos: [{ texto }] }]);
      expect(performance.now() - inicio).toBeLessThan(5_000);
    },
    20_000,
  );
});

// Estruturador (8.2–8.7): página hostil com muitas linhas; nenhuma regra pode ser quadrática, e
// nenhuma lista enorme passa por `push(...itens)`, que estoura a pilha.
describe('estruturador (8.2–8.7): desempenho', () => {
  const linhas = (n: number, texto: (k: number) => string) =>
    Array.from({ length: n }, (_, k) => ({ trechos: [{ texto: texto(k) }] }));
  /** Linhas tachadas (todas, ou as que `tachada` diz; o resto sem tachado). */
  const tachadas = (
    n: number,
    texto: (k: number) => string,
    tachada: (k: number) => boolean = () => true,
  ): Bloco[] =>
    Array.from({ length: n }, (_, k) => ({
      trechos: [{ texto: texto(k), ...(tachada(k) ? { tachado: true as const } : {}) }],
    }));
  const par = (k: number) => k % 2 === 0;
  const impar = (k: number) => k % 2 === 1;
  it.each([
    [
      'mesmo rótulo repetido sem artigo',
      linhas(100_000, (k) => (k % 2 ? 'CAPÍTULO I' : 'TÍTULO I')),
    ],
    ['nome em caixa alta sem fim', linhas(100_000, (k) => (k ? 'NOME EM CAIXA ALTA' : 'TÍTULO I'))],
    ['notas sem fim', linhas(100_000, () => '(Vide Lei nº 1, de 2000) Vigência')],
    ['linha solta sem fim', linhas(100_000, (k) => (k ? 'Rubrica' : 'TÍTULO I'))],
    ['parênteses numa linha', [{ trechos: [{ texto: 'TÍTULO I ' + '(a'.repeat(500_000) + ')' }] }]],
    ['artigos', linhas(100_000, (k) => `Art. ${String(k + 1)}. Texto.`)],
    ['rubricas sem fim', linhas(100_000, (k) => (k ? 'Rubrica candidata' : 'Art. 1º Texto.'))],
    [
      'rubrica e notas sem fim',
      linhas(100_000, (k) => (k ? '(Vide Lei nº 1, de 2000)' : 'Rubrica')),
    ],
    ['"Art." quebrado sem fim', linhas(100_000, () => 'Art.')],
    // 8.4: a fusão de endereço repetido (`indexOf` + `splice` e cópia das redações ficavam
    // quadráticos), a linha continuada (relia o texto inteiro), a citação e o bloco sem fim.
    ['mesmo artigo repetido', linhas(100_000, () => 'Art. 1º Texto.')],
    [
      'artigo e parágrafo repetidos',
      linhas(100_000, (k) => (k % 2 ? '§ 1º Texto.' : 'Art. 1º Texto.')),
    ],
    ['incisos sem fim', linhas(100_000, (k) => (k ? 'I - texto;' : 'Art. 1º Texto:'))],
    ['linha continuada sem fim', linhas(100_000, (k) => (k ? 'e continua' : 'Art. 1º Texto'))],
    [
      'citação sem fim',
      linhas(100_000, (k) => (k === 1 ? '"Começa' : k ? '§ 1º dentro' : 'Art. 1º A:')),
    ],
    [
      'blocos sem fim',
      linhas(100_000, (k) =>
        k % 3 === 2 ? 'Das Disposições Transitórias' : `Art. ${String((k % 3) + 1)}º Texto.`,
      ),
    ],
    [
      'notas numa linha só',
      [
        { trechos: [{ texto: 'TÍTULO I' }] },
        // 200 mil notas: `push(...notas)` estourava a pilha a partir de uns 150 mil itens.
        { trechos: [{ texto: '(Vide) '.repeat(200_000) }] },
      ],
    ],
    // 8.5: as notas do fim de cada linha do texto, com as formas sem parênteses (lidas do fim
    // para o começo, uma a uma).
    ...(
      [
        ['notas no fim do texto', '(Vide) '],
        ['notas soltas', 'Vigência '],
        ['"Vide" sem parênteses', '. Vide art. 1 '],
        ['nota sem parênteses', '; Incluído pela Lei nº 1, de 2000 '],
        ['parênteses sem fecho', '(Vide '],
        ['")" sobrando', ') '],
        ['números soltos', '. 1.000 '],
      ] as const
    ).map(([nome, pedaco]): [string, { trechos: { texto: string }[] }[]] => [
      nome,
      [
        {
          trechos: [
            { texto: `Art. 1º Texto ${pedaco.repeat(Math.floor(2_000_000 / pedaco.length))}` },
          ],
        },
      ],
    ]),
    [
      'notas em linhas emendadas',
      linhas(100_000, (k) => (k ? 'Pena - multa. (Vide) Vigência' : 'Art. 1º A:')),
    ],
    // 8.6: o nó provisório (tachado) juntado ao de mesmo endereço, antes e depois dele; a redação
    // que vai para o ancestral; a pena e a nota que continuam a redação; o nó estrutural tachado.
    ['mesmo artigo tachado e vigente', tachadas(100_000, () => 'Art. 1º Texto.', par)],
    [
      'artigos tachados, cada um com o vigente',
      tachadas(100_000, (k) => `Art. ${String((k >> 1) + 1)}. Texto.`, par),
    ],
    [
      'parágrafos tachados sem o vigente',
      tachadas(
        100_000,
        (k) => (k ? '§ 1º Antigo.' : 'Art. 1º A:'),
        (k) => k > 0,
      ),
    ],
    [
      'incisos tachados em cadeia sem o vigente',
      tachadas(100_000, (k) => `${k % 2 ? 'I' : 'a)'} - antigo;`),
    ],
    [
      'artigo e parágrafo tachados repetidos',
      tachadas(100_000, (k) => (k % 2 ? '§ 1º Antigo.' : 'Art. 1º Antigo.')),
    ],
    [
      'artigo vigente e parágrafos tachados, alternados',
      tachadas(100_000, (k) => (k % 2 ? '§ 1º Antigo.' : 'Art. 1º Texto.'), impar),
    ],
    ['penas tachadas sem fim', tachadas(100_000, (k) => (k ? 'Pena - multa.' : 'Art. 1º Antigo.'))],
    [
      'notas depois do tachado',
      tachadas(
        100_000,
        (k) => (k ? '(Revogado pela Lei nº 1, de 2000)' : 'Art. 1º Antigo.'),
        (k) => k === 0,
      ),
    ],
    [
      'notas tachadas da ALESP',
      tachadas(100_000, (k) =>
        k ? '- Artigo 1º com redação dada pela Lei nº 1.' : 'Artigo 1º - Antigo.',
      ),
    ],
    [
      'rubricas tachadas sem fim',
      tachadas(100_000, (k) => (k ? 'Rubrica antiga' : 'Art. 1º Texto.')),
    ],
    ['títulos tachados sem o vigente', tachadas(100_000, (k) => `TÍTULO ${k % 2 ? 'I' : 'II'}`)],
    [
      'revogados pela nota',
      linhas(100_000, (k) => (k ? '§ 1º (Revogado pela Lei nº 1, de 2000)' : 'Art. 1º A:')),
    ],
    // 8.7: o texto bruto do anexo (linha a linha, e as notas logo depois do cabeçalho), a redação
    // do anexo tachado e 50 mil cabeçalhos de anexo, metade tachados, com o mesmo endereço: os
    // provisórios se juntam ao vigente, e os vigentes repetidos fundem (vale o último).
    [
      'anexo grande',
      linhas(100_000, (k) =>
        k === 0
          ? 'Art. 1º Texto.'
          : k === 1
            ? 'ANEXO'
            : `Cargo ${String(k)} (Vide Lei nº 1, de 2000)`,
      ),
    ],
    [
      'notas sem fim depois do anexo',
      linhas(100_000, (k) =>
        k === 0 ? 'Art. 1º Texto.' : k === 1 ? 'ANEXO' : '(Vide Lei nº 1, de 2000)',
      ),
    ],
    [
      'anexo tachado grande',
      tachadas(
        100_000,
        (k) => (k === 0 ? 'Art. 1º Texto.' : k === 1 ? 'ANEXO' : 'Tabela antiga'),
        (k) => k > 0,
      ),
    ],
    [
      'muitos anexos',
      tachadas(
        100_000,
        (k) => (k === 0 ? 'Art. 1º Texto.' : k % 2 ? 'ANEXO I' : 'Tabela'),
        (k) => k % 4 === 1 || k % 4 === 2,
      ),
    ],
    // O anexo vigente revogado guarda as linhas tachadas numa redação; o tachado com texto sem
    // tachado leva tudo para a redação.
    [
      'anexo revogado com o texto tachado',
      tachadas(
        100_000,
        (k) => (k === 0 ? 'Art. 1º Texto.' : k === 1 ? 'ANEXO - Revogado.' : 'Tabela antiga'),
        (k) => k > 1,
      ),
    ],
    [
      'anexo tachado com texto sem tachado',
      tachadas(
        100_000,
        (k) => (k === 0 ? 'Art. 1º Texto.' : k === 1 ? 'ANEXO' : 'Tabela'),
        (k) => k === 1 || k % 3 === 0,
      ),
    ],
  ])(
    '%s',
    (_nome, blocos) => {
      const inicio = performance.now();
      estruturar(blocos);
      expect(performance.now() - inicio).toBeLessThan(5_000);
    },
    20_000,
  );
});

// Validação estrutural (regra 13, 8.7), dentro do `estruturar`: um aviso por artigo fora de ordem e
// por alínea sem inciso, e a sequência de sufixos inteira comparada; nada pode ser quadrático.
describe('validação (8.7): desempenho', () => {
  const linhas = (textos: readonly string[]): Bloco[] =>
    textos.map((texto) => ({ trechos: [{ texto }] }));
  const LETRAS = Array.from({ length: 26 }, (_, k) => String.fromCharCode(65 + k));
  /** Os sufixos de até 3 letras, com o prefixo mais curto antes (A, AA, AAA, AAB… AB…): 18.278. */
  const sufixos = LETRAS.flatMap((a) => [
    a,
    ...LETRAS.flatMap((b) => [a + b, ...LETRAS.map((c) => a + b + c)]),
  ]);
  it.each([
    [
      'milhares de artigos fora de ordem',
      // Do art. 100.000 ao 1º: a falta antes do primeiro e uma volta por artigo, menos o art. 1º,
      // que recomeça a numeração e abre um bloco (`bloco2`, 8.4).
      linhas(
        Array.from(
          { length: 100_000 },
          (_, k) => `Art. ${(100_000 - k).toLocaleString('pt-BR')}. Texto.`,
        ),
      ),
      { artigo_ausente: 1, artigo_fora_de_ordem: 99_998 },
    ],
    [
      'sequência com sufixos',
      // Do art. 1º ao 5º, cada um seguido dos 18.278 sufixos (art. 1º-A, 1º-A-A, 1º-A-A-A…).
      linhas(
        [1, 2, 3, 4, 5].flatMap((n) => [
          `Art. ${String(n)}º Texto.`,
          ...sufixos.map((s) => `Art. ${String(n)}º-${Array.from(s).join('-')}. Texto.`),
        ]),
      ),
      {},
    ],
    [
      'muitas alíneas sem inciso',
      // Um artigo a cada 27 linhas, com as alíneas a) a z) direto no caput.
      linhas(
        Array.from({ length: 100_000 }, (_, k) =>
          k % 27 === 0
            ? `Art. ${(k / 27 + 1).toLocaleString('pt-BR')}. Texto:`
            : `${String.fromCharCode(96 + (k % 27))}) alínea;`,
        ),
      ),
      { alinea_sem_inciso: 100_000 - Math.ceil(100_000 / 27) },
    ],
  ])(
    '%s',
    (_nome, blocos, esperadas: Partial<Record<TipoAnomalia, number>>) => {
      const inicio = performance.now();
      const { anomalias } = estruturar(blocos);
      expect(performance.now() - inicio).toBeLessThan(5_000);
      const porTipo: Partial<Record<TipoAnomalia, number>> = {};
      for (const a of anomalias) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
      expect(porTipo).toEqual(esperadas);
    },
    20_000,
  );
});
