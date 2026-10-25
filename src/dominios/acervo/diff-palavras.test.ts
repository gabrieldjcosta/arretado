import { diffPorPalavra } from './diff-palavras';

const so = (t: ReturnType<typeof diffPorPalavra>, tipo: 'igual' | 'sai' | 'entra') =>
  t
    .filter((x) => x.tipo === tipo)
    .map((x) => x.texto)
    .join('|');

describe('diffPorPalavra', () => {
  it('marca o que saiu e o que entrou, e preserva o que ficou', () => {
    const d = diffPorPalavra(
      'reclusão, de um a quatro anos, e multa.',
      'reclusão, de 2 (dois) a 6 (seis) anos, e multa.',
    );
    expect(so(d, 'sai')).toContain('um');
    expect(so(d, 'sai')).toContain('quatro');
    expect(so(d, 'entra')).toContain('(dois)');
    expect(so(d, 'entra')).toContain('(seis)');
    // Reconstruir cada lado a partir do diff devolve o texto original.
    const antes = d
      .filter((x) => x.tipo !== 'entra')
      .map((x) => x.texto)
      .join('');
    const agora = d
      .filter((x) => x.tipo !== 'sai')
      .map((x) => x.texto)
      .join('');
    expect(antes).toBe('reclusão, de um a quatro anos, e multa.');
    expect(agora).toBe('reclusão, de 2 (dois) a 6 (seis) anos, e multa.');
  });

  it('textos iguais não têm marcas; texto vazio e texto gigante não quebram', () => {
    expect(diffPorPalavra('a b', 'a b')).toEqual([{ texto: 'a b', tipo: 'igual' }]);
    expect(diffPorPalavra('', 'novo')).toEqual([{ texto: 'novo', tipo: 'entra' }]);
    const grande = 'p '.repeat(2_000);
    expect(diffPorPalavra(grande, grande + 'x').map((x) => x.tipo)).toEqual(['sai', 'entra']);
  });
});
