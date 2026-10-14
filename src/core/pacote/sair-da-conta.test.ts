import { entrarNaConta, RegistroDeContas, Repositorio, nomeBancoDaConta } from '../persistencia';
import { sairDaConta, trocarDeConta } from './sair-da-conta';

const UID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function bancoExiste(nome: string) {
  return (await indexedDB.databases()).some((d) => d.name === nome);
}

async function contaAberta(uid: string, registro: RegistroDeContas) {
  await entrarNaConta({ uid, email: `${uid.slice(0, 1)}@exemplo.com` }, { registro });
  return Repositorio.abrir({ nomeBanco: nomeBancoDaConta(uid), usuarioId: uid });
}

describe('sair da conta (F4-A, A5)', () => {
  it('manter: o banco da conta fica no aparelho e nenhuma conta fica ativa', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    const repo = await contaAberta(UID_A, registro);
    await repo.colecao('tags').criar({ nome: 'fica' }, { origem: 'sistema' });
    await sairDaConta(repo, { registro });
    expect(await registro.contaAtiva()).toBeNull();
    expect(await bancoExiste(nomeBancoDaConta(UID_A))).toBe(true);
    const volta = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID_A) });
    expect(await volta.colecao('tags').todosDoUsuario()).toHaveLength(1);
    volta.fechar();
  });

  it('apagar daqui: remove o banco e esquece a conta; o banco sem conta não é tocado', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    const principal = await Repositorio.abrir();
    await principal.colecao('tags').criar({ nome: 'sem conta' }, { origem: 'sistema' });
    principal.fechar();
    const repo = await contaAberta(UID_B, registro);
    await sairDaConta(repo, { registro, apagarDados: true });
    expect(await registro.contaAtiva()).toBeNull();
    expect(await registro.listar()).toEqual([]);
    expect(await bancoExiste(nomeBancoDaConta(UID_B))).toBe(false);
    const depois = await Repositorio.abrir();
    expect(await depois.colecao('tags').todosDoUsuario()).toHaveLength(1);
    depois.fechar();
  });

  it('recusa quando o banco aberto não é o da conta ativa, sem alterar nada', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    const semConta = await Repositorio.abrir();
    await expect(sairDaConta(semConta, { registro, apagarDados: true })).rejects.toThrow(
      /nada foi alterado/,
    );
    expect(await bancoExiste('arretado')).toBe(true);
    semConta.fechar();
  });

  it('trocar de conta muda só a ativa; conta desconhecida é recusada', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    await registro.ativar(UID_A, { email: 'a@exemplo.com' });
    await registro.ativar(UID_B, { email: 'b@exemplo.com' });
    await trocarDeConta(UID_A, { registro });
    expect((await registro.contaAtiva())?.uid).toBe(UID_A);
    await expect(
      trocarDeConta('cccccccc-cccc-4ccc-8ccc-cccccccccccc', { registro }),
    ).rejects.toThrow(/desconhecida/);
    expect((await registro.contaAtiva())?.uid).toBe(UID_A);
  });
});
