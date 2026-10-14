import { RegistroDeContas } from '../../core/persistencia';
import { entrarNaConta } from '../../core/persistencia';
import { FalhaDeConta } from './interface';
import { ServicoDeContaFalso } from './falso';
import { tratarRetornoDoLogin } from './retorno';

const BASE = 'https://arretado.gabrieldjcosta.workers.dev/';
const UID = '66666666-6666-4666-8666-666666666666';

function ambiente(servico: ServicoDeContaFalso) {
  const urls: string[] = [];
  const registro = new RegistroDeContas(`registro-${Math.random()}`);
  return {
    urls,
    registro,
    deps: (url: string) => ({
      servico,
      url,
      substituirUrl: (n: string) => urls.push(n),
      entrar: (s: { uid: string; email: string }) => entrarNaConta(s, { registro }),
    }),
  };
}

describe('retorno do login (F4-A, A3)', () => {
  it('sem ?code= não faz nada', async () => {
    const a = ambiente(new ServicoDeContaFalso());
    expect(await tratarRetornoDoLogin(a.deps(`${BASE}#/hoje`))).toBe('sem-codigo');
    expect(a.urls).toEqual([]);
  });

  it('com ?code= limpa a URL antes de trocar, ativa a conta e leva a #/conta', async () => {
    const servico = new ServicoDeContaFalso({ sessao: { uid: UID, email: 'a@exemplo.com' } });
    const a = ambiente(servico);
    expect(await tratarRetornoDoLogin(a.deps(`${BASE}?code=abc#/hoje`))).toBe('entrou');
    expect(a.urls[0]).not.toContain('code=');
    expect(a.urls.at(-1)).toBe(`${BASE}#/conta`);
    expect((await a.registro.contaAtiva())?.uid).toBe(UID);
  });

  it('falha na troca volta a Entrar com o motivo, sem ativar conta', async () => {
    const servico = new ServicoDeContaFalso();
    servico.concluirRetorno = () =>
      Promise.reject(new FalhaDeConta('sem-convite', 'Este e-mail ainda não foi liberado.'));
    const a = ambiente(servico);
    expect(await tratarRetornoDoLogin(a.deps(`${BASE}?code=abc`))).toBe('falhou');
    expect(a.urls.at(-1)).toBe(`${BASE}#/conta/entrar?erro=sem-convite`);
    expect(await a.registro.contaAtiva()).toBeNull();
  });

  it('retorno com error= (pessoa cancelou no Google) não tenta trocar código', async () => {
    const servico = new ServicoDeContaFalso();
    const espiao = vi.spyOn(servico, 'concluirRetorno');
    const a = ambiente(servico);
    expect(await tratarRetornoDoLogin(a.deps(`${BASE}?error=access_denied`))).toBe('falhou');
    expect(espiao).not.toHaveBeenCalled();
  });
});
