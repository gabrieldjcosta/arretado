import { fraseDaProva } from './frase-da-prova';

describe('fraseDaProva (C6)', () => {
  it('diz os dias e quando começa a passada final', () => {
    expect(fraseDaProva(40)).toBe(
      'Faltam 40 dias para a prova. A passada final começa em 33 dias.',
    );
    expect(fraseDaProva(8)).toBe('Faltam 8 dias para a prova. A passada final começa em 1 dia.');
  });
  it('na última semana, a passada está em andamento', () => {
    expect(fraseDaProva(7)).toBe('Faltam 7 dias para a prova. A passada final está em andamento.');
    expect(fraseDaProva(1)).toBe('Falta 1 dia para a prova. A passada final está em andamento.');
  });
  it('no dia, "hoje"; passada, nada', () => {
    expect(fraseDaProva(0)).toBe('A prova é hoje.');
    expect(fraseDaProva(-3)).toBeUndefined();
  });
});
