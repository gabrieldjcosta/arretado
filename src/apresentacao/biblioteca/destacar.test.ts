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

describe('remissões no leitor (11.9): mais uma camada na mesma partição', () => {
  const trechos = [
    { texto: 'nos termos do art. 84, XIX; ' },
    { texto: 'veja o art. 5º', enfase: true },
  ];

  it('parte o texto nos limites da citação sem mudar o texto, e só o primeiro pedaço é parada do teclado', () => {
    const pedacos = partirTrechos(trechos, [], undefined, [{ inicio: 19, fim: 34, alvo: 7 }]);
    expect(pedacos.map((p) => p.trecho.texto).join('')).toBe(textoParaDestacar(trechos));
    const citados = pedacos.filter((p) => p.remissao);
    expect(citados.map((p) => p.trecho.texto).join('')).toBe('84, XIX; veja o');
    expect(citados.map((p) => p.remissao?.primeiro)).toEqual([true, false]);
    expect(citados.every((p) => p.remissao?.alvo === 7)).toBe(true);
  });

  it('a citação que começa dentro da anterior fica de fora; fim fora do texto é aparado', () => {
    const pedacos = partirTrechos(trechos, [], undefined, [
      { inicio: 4, fim: 10, alvo: 1 },
      { inicio: 8, fim: 12, alvo: 2 },
      { inicio: 40, fim: 9999, alvo: 3 },
    ]);
    expect(new Set(pedacos.flatMap((p) => (p.remissao ? [p.remissao.alvo] : [])))).toEqual(
      new Set([1, 3]),
    );
  });

  it('pedacosDoTexto guarda o resultado enquanto o texto e as remissões são os mesmos', () => {
    const remissoes = [{ inicio: 4, fim: 10, alvo: 1 }];
    const a = pedacosDoTexto(trechos, false, undefined, remissoes);
    expect(pedacosDoTexto(trechos, false, undefined, remissoes)).toBe(a);
    expect(a.some((p) => p.remissao)).toBe(true);
    // Sem remissão nem marcação, nada de camada nova.
    expect(pedacosDoTexto(trechos, false, undefined, []).some((p) => p.remissao)).toBe(false);
  });
});
