import { partirTrechos, pedacosDestacados, textoParaDestacar } from './destacar';

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
