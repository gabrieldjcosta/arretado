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
  it('não parte dentro de parênteses; o parêntese sem par não segura a frase', () => {
    expect(
      partes(
        'O prazo é de 30 dias (salvo se houver recurso; nesse caso, 60 dias). Depois, arquiva-se.',
      ),
    ).toEqual([
      'O prazo é de 30 dias (salvo se houver recurso; nesse caso, 60 dias).',
      'Depois, arquiva-se.',
    ]);
    expect(
      partes(
        'Compete ao juiz (art. 66, III; art. 68) decidir; e ao Ministério Público, fiscalizar.',
      ),
    ).toEqual([
      'Compete ao juiz (art. 66, III; art. 68) decidir;',
      'e ao Ministério Público, fiscalizar.',
    ]);
    expect(partes('Segue a regra (Res. CNJ nº 113, de 2010. Ver o anexo) do tribunal.')).toEqual([
      'Segue a regra (Res. CNJ nº 113, de 2010. Ver o anexo) do tribunal.',
    ]);
    expect(partes('Aplica-se a Res. CNJ nº 113 ao caso.')).toEqual([
      'Aplica-se a Res. CNJ nº 113 ao caso.',
    ]);
    expect(partes('a) primeiro item; b) segundo item (sem fechar; terceiro.')).toEqual([
      'a) primeiro item;',
      'b) segundo item (sem fechar;',
      'terceiro.',
    ]);
    // O parêntese aberto numa linha não segura a seguinte.
    expect(partes('Abre (e não fecha;\nsegunda linha; fim.')).toEqual([
      'Abre (e não fecha;',
      'segunda linha;',
      'fim.',
    ]);
  });
  it('o número no fim da frase fecha; o do artigo citado e o do item numerado, não', () => {
    expect(partes('Vale a Lei nº 7.210, de 1984. O juiz decidirá.')).toEqual([
      'Vale a Lei nº 7.210, de 1984.',
      'O juiz decidirá.',
    ]);
    expect(partes('Aplica-se o disposto no art. 11. O juiz decidirá.')).toEqual([
      'Aplica-se o disposto no art. 11.',
      'O juiz decidirá.',
    ]);
    expect(partes('"Art. 83. O juiz poderá conceder o livramento."')).toEqual([
      '"Art. 83. O juiz poderá conceder o livramento."',
    ]);
    expect(partes('1. Primeiro item; 2. Segundo item.')).toEqual([
      '1. Primeiro item;',
      '2. Segundo item.',
    ]);
  });
  it('"lei" no fim fecha a frase', () => {
    expect(partes('O preso tem os direitos previstos em lei. O juiz decide.')).toEqual([
      'O preso tem os direitos previstos em lei.',
      'O juiz decide.',
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
