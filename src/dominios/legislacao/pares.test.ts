import { describe, expect, it } from 'vitest';
import { diferencaDePalavras, semelhancaDeTextos, sugerirPares, type ArtigoParaPar } from './pares';

const FURTO =
  'Subtrair, para si ou para outrem, coisa alheia móvel: Pena – reclusão, de um a quatro anos, e multa.';
const ROUBO =
  'Subtrair coisa alheia móvel, para si ou para outrem, mediante grave ameaça ou violência a pessoa: Pena – reclusão, de quatro a dez anos, e multa.';
const HOMICIDIO =
  'Matar alguém: Pena – reclusão, de seis a vinte anos, sem qualquer outra circunstância agravante.';

const artigo = (endereco: string, texto: string, peso = 1): ArtigoParaPar => ({
  endereco,
  rotulo: `Art. ${endereco.replace('art', '')}`,
  texto,
  peso,
});

describe('semelhancaDeTextos', () => {
  it('é 1 para o mesmo texto e 0 sem nada em comum', () => {
    expect(semelhancaDeTextos(FURTO, FURTO)).toBe(1);
    expect(semelhancaDeTextos('alfa beta gama delta', 'omega sigma kappa lambda')).toBe(0);
  });

  it('acha furto e roubo mais parecidos entre si do que com o homicídio', () => {
    expect(semelhancaDeTextos(FURTO, ROUBO)).toBeGreaterThan(semelhancaDeTextos(FURTO, HOMICIDIO));
  });
});

describe('diferencaDePalavras', () => {
  it('marca o que só existe de um lado e devolve o texto inteiro dos dois', () => {
    const { a, b } = diferencaDePalavras(FURTO, ROUBO);
    expect(a.map((p) => p.texto).join('')).toBe(FURTO);
    expect(b.map((p) => p.texto).join('')).toBe(ROUBO);
    const soNoRoubo = b
      .filter((p) => p.difere)
      .map((p) => p.texto)
      .join(' ');
    expect(soNoRoubo).toContain('mediante grave ameaça');
    expect(soNoRoubo).toContain('violência a pessoa');
    // O que os dois dizem igual (a pena é de reclusão e multa) não é diferença.
    expect(a.find((p) => p.texto.includes('reclusão'))?.difere).toBe(false);
  });

  it('não conta pontuação nem caixa como diferença', () => {
    const { a, b } = diferencaDePalavras('Pena, reclusão.', 'pena reclusão');
    expect(a.every((p) => !p.difere)).toBe(true);
    expect(b.every((p) => !p.difere)).toBe(true);
  });

  it('textos iguais não têm diferença e vazios não quebram', () => {
    expect(diferencaDePalavras('', '').a).toEqual([]);
    expect(diferencaDePalavras('a b c', 'a b c').a.some((p) => p.difere)).toBe(false);
  });
});

describe('sugerirPares', () => {
  const lote = [
    artigo('art155', FURTO, 0.2),
    artigo('art157', ROUBO, 0.75),
    artigo('art121', HOMICIDIO, 0.06),
  ];

  it('une furto e roubo e deixa o homicídio sozinho', () => {
    const pares = sugerirPares(lote);
    expect(pares).toHaveLength(1);
    expect([pares[0]?.a.endereco, pares[0]?.b.endereco].sort()).toEqual(['art155', 'art157']);
  });

  it('dá o mesmo resultado em qualquer ordem da entrada', () => {
    const direto = sugerirPares(lote).map((p) => [p.a.endereco, p.b.endereco].sort().join('|'));
    const invertido = sugerirPares([...lote].reverse()).map((p) =>
      [p.a.endereco, p.b.endereco].sort().join('|'),
    );
    expect(invertido).toEqual(direto);
  });

  it('usa cada artigo em um par só e respeita o máximo', () => {
    const cinco = ['a', 'b', 'c'].flatMap((x, i) => [
      artigo(`art${x}1`, `${FURTO} variante ${x}${String(i)} conjunto único`, 1),
      artigo(`art${x}2`, `${ROUBO} variante ${x}${String(i)} conjunto único`, 1),
    ]);
    const pares = sugerirPares(cinco, { maximo: 2 });
    expect(pares.length).toBeLessThanOrEqual(2);
    const usados = pares.flatMap((p) => [p.a.endereco, p.b.endereco]);
    expect(new Set(usados).size).toBe(usados.length);
  });

  it('descarta o artigo curto demais e o par quase idêntico', () => {
    expect(
      sugerirPares([artigo('art1', 'Fica revogado.'), artigo('art2', 'Fica revogado.')]),
    ).toEqual([]);
    expect(sugerirPares([artigo('art1', ROUBO), artigo('art2', ROUBO)])).toEqual([]);
  });
});
