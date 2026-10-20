import { ServicoDeContaFalsoE2E, uidDoEmail } from './falso-e2e';
import { criarServicoDeConta, ServicoDeContaPreguicoso } from '.';

describe('serviço de conta do build de E2E (T30)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a sessão sobrevive a outra instância (a página recarrega ao entrar)', async () => {
    await new ServicoDeContaFalsoE2E().confirmarCodigo('Ana@Exemplo.com', '123456');
    const outra = new ServicoDeContaFalsoE2E();
    expect(await outra.sessao()).toEqual({
      uid: uidDoEmail('ana@exemplo.com'),
      email: 'ana@exemplo.com',
    });
    await outra.sair();
    expect(await new ServicoDeContaFalsoE2E().sessao()).toBeNull();
  });

  it('código errado é recusado e e-mails diferentes têm uids diferentes', async () => {
    await expect(
      new ServicoDeContaFalsoE2E().confirmarCodigo('a@x.com', '0'),
    ).rejects.toMatchObject({ motivo: 'invalido' });
    expect(uidDoEmail('a@x.com')).not.toBe(uidDoEmail('b@x.com'));
    expect(uidDoEmail('a@x.com')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('as cópias ficam na pasta da conta e não vazam para a outra', async () => {
    const servico = new ServicoDeContaFalsoE2E();
    await servico.confirmarCodigo('a@x.com', '123456');
    await servico.enviarCopia('c.arretado', new Uint8Array([1, 2, 3]));
    expect(await servico.listarCopias()).toEqual([{ nome: 'c.arretado', tamanho: 3 }]);
    expect([...(await servico.baixarCopia('c.arretado'))]).toEqual([1, 2, 3]);
    await servico.confirmarCodigo('b@x.com', '123456');
    expect(await servico.listarCopias()).toEqual([]);
  });

  it('fora do modo e2e-conta o Supabase continua sendo o serviço escolhido', () => {
    expect(import.meta.env.MODE).not.toBe('e2e-conta');
    expect(criarServicoDeConta(true)).toBeInstanceOf(ServicoDeContaPreguicoso);
  });
});
