import { estruturar } from './estruturador';
import { normalizarBlocos } from './normalizacao';

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

// Estruturador (8.2–8.3): página hostil com muitas linhas; nenhuma regra pode ser quadrática, e
// nenhuma lista enorme passa por `push(...itens)`, que estoura a pilha.
describe('estruturador (8.2–8.3): desempenho', () => {
  const linhas = (n: number, texto: (k: number) => string) =>
    Array.from({ length: n }, (_, k) => ({ trechos: [{ texto: texto(k) }] }));
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
    [
      'notas numa linha só',
      [
        { trechos: [{ texto: 'TÍTULO I' }] },
        // 200 mil notas: `push(...notas)` estourava a pilha a partir de uns 150 mil itens.
        { trechos: [{ texto: '(Vide) '.repeat(200_000) }] },
      ],
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
