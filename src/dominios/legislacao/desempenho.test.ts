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
