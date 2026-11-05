import { contasHabilitadas, criarServicoDeConta, FalhaDeConta } from '.';
import { RETORNO_DESENVOLVIMENTO, RETORNO_PRODUCAO, enderecoDeRetorno } from './projeto';

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
    await expect(servico.entrarCom('google')).rejects.toMatchObject({ motivo: 'indisponivel' });
    await expect(servico.confirmarCodigo('a@exemplo.com', '123456')).rejects.toBeInstanceOf(
      FalhaDeConta,
    );
    expect(servico.aoMudar(() => {})).toBeTypeOf('function');
  });
});

describe('enderecoDeRetorno', () => {
  it.each([
    ['localhost', RETORNO_DESENVOLVIMENTO],
    ['127.0.0.1', RETORNO_DESENVOLVIMENTO],
    ['arretado.cc', RETORNO_PRODUCAO],
    ['arretado.gabrieldjcosta.workers.dev', RETORNO_PRODUCAO],
    ['', RETORNO_PRODUCAO],
  ])('%s volta para o endereço fixo da lista permitida', (host, esperado) => {
    expect(enderecoDeRetorno(host)).toBe(esperado);
  });

  it('só usa endereços https oficiais ou o localhost de desenvolvimento', () => {
    expect(RETORNO_PRODUCAO).toMatch(/^https:\/\/arretado\.cc\/$/);
    expect(RETORNO_DESENVOLVIMENTO).toBe('http://localhost:5173/');
  });
});
