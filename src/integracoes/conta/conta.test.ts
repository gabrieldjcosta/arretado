import { contasHabilitadas, criarServicoDeConta, FalhaDeConta } from '.';

describe('serviço de conta nulo (A1)', () => {
  it('chave de build: só "1" liga', () => {
    expect(contasHabilitadas({})).toBe(false);
    expect(contasHabilitadas({ VITE_CONTA: '0' })).toBe(false);
    expect(contasHabilitadas({ VITE_CONTA: 'true' })).toBe(false);
    expect(contasHabilitadas({ VITE_CONTA: '1' })).toBe(true);
  });

  it('sem sessão, sair é inofensivo e entrar recusa como indisponível', async () => {
    const servico = criarServicoDeConta();
    expect(await servico.sessao()).toBeNull();
    await expect(servico.sair()).resolves.toBeUndefined();
    await expect(servico.entrarComGoogle()).rejects.toMatchObject({ motivo: 'indisponivel' });
    await expect(servico.confirmarCodigo('a@exemplo.com', '123456')).rejects.toBeInstanceOf(
      FalhaDeConta,
    );
    expect(servico.aoMudar(() => {})).toBeTypeOf('function');
  });
});
