import { SERVICO_DE_IA_NULO } from '.';

describe('porta da IA (reservada nas Frases 1)', () => {
  it('a implementação nula não está disponível e nunca propõe nada', async () => {
    expect(SERVICO_DE_IA_NULO.disponivel).toBe(false);
    expect(await SERVICO_DE_IA_NULO.proporFrase('Questão qualquer')).toBeNull();
  });
});
