import { analisarSumula, enderecoDeSumula, possiveisEnderecos, rotuloDeSumula } from './sumulas';

describe('súmulas: endereço e rótulo', () => {
  it('s<n> e sv<n>', () => {
    expect(enderecoDeSumula(593, false)).toBe('s593');
    expect(enderecoDeSumula(11, true)).toBe('sv11');
    expect(rotuloDeSumula(593, false)).toBe('Súmula 593');
    expect(rotuloDeSumula(11, true)).toBe('Súmula Vinculante 11');
  });
});

describe('súmulas: busca por número', () => {
  it.each([
    ['súmula 593', ['s593']],
    ['Súmula nº 593', ['s593']],
    ['sum. 7', ['s7']],
    ['SV 11', ['sv11']],
    ['súmula vinculante 11', ['sv11']],
    ['Súmula Vinculante nº 011', ['sv11']],
    ['11', ['s11', 'sv11']],
    ['art. 5º', []],
    ['súmula', []],
    ['habeas corpus', []],
  ])('%s', (texto, esperado) => {
    expect(analisarSumula(texto)).toEqual(esperado);
  });

  it('número sozinho também é artigo, para normas comuns', () => {
    expect(possiveisEnderecos('112')).toEqual(['art112', 's112', 'sv112']);
    expect(possiveisEnderecos('súmula 593')).toContain('s593');
  });
});
