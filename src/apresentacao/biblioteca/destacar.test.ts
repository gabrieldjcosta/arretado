import { partirTrechos, pedacosDestacados, pedacosDoTexto, textoParaDestacar } from './destacar';

describe('destaque no leitor (9.8): os trechos partidos', () => {
  it('o tachado vira espaço do mesmo comprimento: os índices valem nos trechos', () => {
    const trechos = [
      { texto: 'no prazo de ' },
      { texto: '30 (trinta)', tachado: true },
      { texto: ' 60 dias' },
    ];
    const texto = textoParaDestacar(trechos);
    expect(texto).toHaveLength(trechos.map((t) => t.texto).join('').length);
    expect(texto).toBe(`no prazo de ${' '.repeat(11)} 60 dias`);
  });

  it('parte nos limites sem mudar o texto, e cada pedaço leva a formatação do trecho', () => {
    const trechos = [
      { texto: 'A lei, ' },
      { texto: 'salvo para', enfase: true },
      { texto: ' beneficiar', link: 'https://exemplo' },
    ];
    const pedacos = partirTrechos(trechos, [{ inicio: 7, fim: 12, categoria: 'condicao' }]);
    expect(pedacos).toEqual([
      { trecho: { texto: 'A lei, ' } },
      { trecho: { texto: 'salvo', enfase: true }, categoria: 'condicao' },
      { trecho: { texto: ' para', enfase: true } },
      { trecho: { texto: ' beneficiar', link: 'https://exemplo' } },
    ]);
    expect(pedacos.map((p) => p.trecho.texto).join('')).toBe('A lei, salvo para beneficiar');
  });

  it('o destaque que atravessa trechos acende os dois pedaços, menos o tachado', () => {
    const trechos = [
      { texto: 'no prazo de ' },
      { texto: '30 (trinta)', tachado: true },
      { texto: ' 60 dias.' },
    ];
    const pedacos = pedacosDestacados(trechos);
    expect(pedacos).toEqual([
      { trecho: { texto: 'no ' } },
      { trecho: { texto: 'prazo de ' }, categoria: 'prazo' },
      { trecho: { texto: '30 (trinta)', tachado: true } },
      { trecho: { texto: ' 60 dias' }, categoria: 'prazo' },
      { trecho: { texto: '.' } },
    ]);
  });

  it('calculado uma vez por texto', () => {
    const trechos = [{ texto: 'salvo' }];
    expect(pedacosDestacados(trechos)).toBe(pedacosDestacados(trechos));
  });

  it('sem destaque, os trechos ficam inteiros (o mesmo objeto)', () => {
    const trechos = [{ texto: 'A execução penal.' }, { texto: '\n' }];
    const pedacos = pedacosDestacados(trechos);
    expect(pedacos.map((p) => p.trecho)).toEqual(trechos);
    expect(pedacos[0]?.trecho).toBe(trechos[0]);
  });
});

describe('grifos e notas no leitor (11.4): uma partição só com o destaque', () => {
  const link = 'https://exemplo';
  const trechos = [
    { texto: 'no prazo de ' },
    { texto: '30 (trinta)', tachado: true },
    { texto: ' 60 dias, salvo', link },
  ];
  const original = trechos.map((t) => t.texto).join('');

  it('destaque, grifos sobrepostos e nota cruzados: o texto inteiro igual, sem duplicar', () => {
    const pedacos = pedacosDoTexto(trechos, true, {
      grifos: [
        // "prazo de 30 (tr": atravessa o tachado.
        { id: 'a', cor: 1, inicio: 3, fim: 18 },
        // O mais novo fica por cima de "a" onde os dois se cruzam.
        { id: 'b', cor: 3, inicio: 15, fim: 30 },
      ],
      notas: [{ id: 'n', fim: 26 }],
    });
    expect(pedacos.map((p) => p.trecho.texto).join('')).toBe(original);
    const a = (primeiro: boolean) => ({ id: 'a', cor: 1, primeiro });
    const b = (primeiro: boolean) => ({ id: 'b', cor: 3, primeiro });
    expect(pedacos).toEqual([
      { trecho: { texto: 'no ' } },
      { trecho: { texto: 'prazo de ' }, categoria: 'prazo', grifo: a(true) },
      { trecho: { texto: '30 ', tachado: true }, grifo: a(false) },
      { trecho: { texto: '(tr', tachado: true }, grifo: b(true) },
      { trecho: { texto: 'inta)', tachado: true }, grifo: b(false) },
      { trecho: { texto: ' 60', link }, categoria: 'prazo', grifo: b(false), notas: ['n'] },
      { trecho: { texto: ' dia', link }, categoria: 'prazo', grifo: b(false) },
      { trecho: { texto: 's', link }, categoria: 'prazo' },
      { trecho: { texto: ', ', link } },
      { trecho: { texto: 'salvo', link }, categoria: 'condicao' },
    ]);
  });

  it('sem destaque, só as marcações; offsets fora do texto são cortados', () => {
    const pedacos = pedacosDoTexto(trechos, false, {
      grifos: [{ id: 'a', cor: 2, inicio: 33, fim: 99 }],
      notas: [{ id: 'n', fim: 99 }],
    });
    expect(pedacos.map((p) => p.trecho.texto).join('')).toBe(original);
    expect(pedacos.some((p) => p.categoria)).toBe(false);
    expect(pedacos.at(-1)).toEqual({
      trecho: { texto: 'salvo', link },
      grifo: { id: 'a', cor: 2, primeiro: true },
      notas: ['n'],
    });
  });

  it('com marcação, guardados pelas camadas, para o mesmo texto e o mesmo destaque', () => {
    const marcas = { grifos: [{ id: 'a', cor: 1, inicio: 0, fim: 2 }], notas: [] };
    const pedacos = pedacosDoTexto(trechos, true, marcas);
    expect(pedacosDoTexto(trechos, true, marcas)).toBe(pedacos);
    expect(pedacosDoTexto(trechos, false, marcas)).not.toBe(pedacos);
    expect(pedacosDoTexto([...trechos], false, marcas)).not.toBe(pedacos);
  });

  it('sem marcação, os pedaços do destaque guardados (o mesmo objeto)', () => {
    expect(pedacosDoTexto(trechos, true, { grifos: [], notas: [] })).toBe(
      pedacosDestacados(trechos),
    );
    expect(pedacosDoTexto(trechos, false, undefined).map((p) => p.trecho)).toEqual(trechos);
  });
});
