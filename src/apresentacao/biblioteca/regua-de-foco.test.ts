import { describe, expect, it } from 'vitest';
import { frasesDoTexto, indiceDaFrase } from './regua-de-foco';

const partes = (t: string) => frasesDoTexto(t).map((f) => t.slice(f.inicio, f.fim));

describe('frasesDoTexto', () => {
  it('parte no ponto final seguido de maiúscula', () => {
    expect(
      partes('A pena será progressiva. Isso ocorre depois. Também se exige boa conduta.'),
    ).toEqual(['A pena será progressiva.', 'Isso ocorre depois.', 'Também se exige boa conduta.']);
  });
  it('não parte em abreviação, número ou letra sozinha', () => {
    expect(partes('Nos termos do art. 5º, o prazo é de 1.000 dias. Fim.')).toEqual([
      'Nos termos do art. 5º, o prazo é de 1.000 dias.',
      'Fim.',
    ]);
    expect(partes('Art. 121. Matar alguém:')).toEqual(['Art. 121. Matar alguém:']);
    expect(partes('I. primeiro Ponto')).toEqual(['I. primeiro Ponto']);
  });
  it('parte no ponto e vírgula e na quebra de linha', () => {
    expect(partes('Pena - reclusão;\nII - multa; e III - detenção.')).toEqual([
      'Pena - reclusão;',
      'II - multa;',
      'e III - detenção.',
    ]);
  });
  it('não perde nem repete texto e cobre texto sem pontuação', () => {
    expect(partes('sem ponto algum')).toEqual(['sem ponto algum']);
    expect(frasesDoTexto('   ')).toEqual([]);
  });
});

describe('indiceDaFrase', () => {
  it('acha a frase do offset e a anterior entre duas', () => {
    const t = 'Um. Dois. Três.';
    const f = frasesDoTexto(t);
    expect(indiceDaFrase(f, 0)).toBe(0);
    expect(indiceDaFrase(f, 5)).toBe(1);
    expect(indiceDaFrase(f, 3)).toBe(0);
    expect(indiceDaFrase([], 3)).toBe(-1);
  });
});
