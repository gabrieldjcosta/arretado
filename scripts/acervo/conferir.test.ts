import {
  decodificar,
  enderecoPermitido,
  entradasDoPlanalto,
  hashDoTexto,
  julgar,
  normalizarPagina,
  relatorio,
} from './conferir';

describe('conferência das fontes oficiais', () => {
  it('ignora script, estilo, comentário, marcação e espaço, mas não o texto da lei', () => {
    const a =
      '<html><script>var x=1</script><style>p{}</style><!-- c --><p>Art. 1º&nbsp;Fica   criado.</p></html>';
    const b = '<html><p>\n Art. 1º Fica criado.\n</p><script>var x=2</script></html>';
    expect(normalizarPagina(a)).toBe('Art. 1º Fica criado.');
    expect(hashDoTexto(normalizarPagina(a))).toBe(hashDoTexto(normalizarPagina(b)));
    const nova = '<p>Art. 1º Fica criado. (Redação dada pela Lei nº 1/2026)</p>';
    expect(hashDoTexto(normalizarPagina(nova))).not.toBe(hashDoTexto(normalizarPagina(a)));
  });

  it('lê Windows-1252 quando não é UTF-8', () => {
    expect(decodificar(Uint8Array.from([0x41, 0x72, 0x74, 0x2e, 0x20, 0xba]))).toBe('Art. º');
    expect(decodificar(new TextEncoder().encode('Art. 1º'))).toBe('Art. 1º');
  });

  it('julga: base nova, igual, mudou e instável (duas leituras diferentes)', async () => {
    const base = { x: { hash: 'h1', conferidoEm: '2026-11-02' } };
    expect(await julgar('y', base, 'h9')).toMatchObject({ estado: 'base_nova' });
    expect(await julgar('x', base, 'h1')).toEqual({ id: 'x', estado: 'igual' });
    expect(await julgar('x', base, 'h2', () => Promise.resolve('h2'))).toMatchObject({
      estado: 'mudou',
      anterior: 'h1',
    });
    expect(await julgar('x', base, 'h2', () => Promise.resolve('h3'))).toEqual({
      id: 'x',
      estado: 'instavel',
    });
  });

  it('só aceita https no Planalto', () => {
    expect(enderecoPermitido('https://www.planalto.gov.br/x.htm')).toBe(true);
    for (const url of [
      'http://www.planalto.gov.br/x',
      'https://planalto.gov.br.exemplo.com/x',
      'file:///etc/passwd',
      'x',
    ])
      expect(enderecoPermitido(url)).toBe(false);
  });

  it('só confere normas do Planalto', () => {
    const indice = JSON.stringify({
      itens: [
        { id: 'a', tipo: 'norma', titulo: 'A', urlOficial: 'https://www.planalto.gov.br/x.htm' },
        { id: 'b', tipo: 'norma', titulo: 'B', urlOficial: 'https://www.al.sp.gov.br/y' },
        { id: 'c', tipo: 'sumulas', titulo: 'C', urlOficial: 'https://www.planalto.gov.br/z' },
      ],
    });
    expect(entradasDoPlanalto(indice).map((e) => e.id)).toEqual(['a']);
  });

  it('o relatório lista o que mudou, sem tom de cobrança', () => {
    const entradas = [{ id: 'a', titulo: 'Lei A', urlOficial: 'https://www.planalto.gov.br/a' }];
    const t = relatorio(
      [{ id: 'a', estado: 'mudou', hash: 'n', anterior: 'o' }],
      entradas,
      '2026-11-09',
    );
    expect(t).toContain('Texto novo no Planalto (1)');
    expect(t).toContain('`a`: Lei A');
    expect(relatorio([{ id: 'a', estado: 'igual' }], entradas, '2026-11-09')).toContain(
      'Nenhuma norma com texto novo',
    );
  });
});
