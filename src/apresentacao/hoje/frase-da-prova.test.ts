import { fraseDaProva } from './frase-da-prova';

describe('fraseDaProva (C6)', () => {
  it('com mais de uma semana, diz a data e os dias', () => {
    expect(fraseDaProva(40, '2026-11-23')).toBe('Prova objetiva em 23/11, daqui a 40 dias.');
    expect(fraseDaProva(8, '2026-11-23')).toBe('Prova objetiva em 23/11, daqui a 8 dias.');
  });
  it('na última semana, diz que os pontos mais cobrados estão voltando', () => {
    expect(fraseDaProva(5, '2026-11-23')).toBe(
      'Prova objetiva em 5 dias. Os pontos mais cobrados estão voltando.',
    );
    expect(fraseDaProva(7, '2026-11-23')).toContain('estão voltando');
  });
  it('amanhã, hoje; passada, nada', () => {
    expect(fraseDaProva(1, '2026-11-23')).toBe('Prova objetiva amanhã.');
    expect(fraseDaProva(0, '2026-11-23')).toBe('A prova objetiva é hoje.');
    expect(fraseDaProva(-3, '2026-11-23')).toBeUndefined();
  });
});
