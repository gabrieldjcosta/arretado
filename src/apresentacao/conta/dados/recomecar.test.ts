import {
  entrarNaConta,
  nomeBancoDaConta,
  registrarBackup,
  RegistroDeContas,
  Repositorio,
} from '../../../core/persistencia';
import { apagarTudoERecomecar } from './recomecar';

const UID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const sufixo = () => Math.random().toString(36).slice(2);

async function bancoExiste(nome: string): Promise<boolean> {
  return (await indexedDB.databases()).some((b) => b.name === nome);
}

describe('Apagar tudo e recomeçar (A7)', () => {
  it('sem cópia recente nem exportação confirmada, não apaga nada', async () => {
    const nomeBanco = `principal-${sufixo()}`;
    const repo = await Repositorio.abrir({ nomeBanco });
    await repo.colecao('tags').criar({ nome: 'Estudo' });
    await expect(
      apagarTudoERecomecar(repo, { registro: new RegistroDeContas(`r-${sufixo()}`) }),
    ).rejects.toThrow(/cópia/i);
    expect(await repo.colecao('tags').contar()).toBe(1);
    expect(await bancoExiste(nomeBanco)).toBe(true);
  });

  it('sem conta: com exportação confirmada, apaga o banco local', async () => {
    const nomeBanco = `principal-${sufixo()}`;
    const repo = await Repositorio.abrir({ nomeBanco });
    await repo.colecao('tags').criar({ nome: 'Estudo' });
    await apagarTudoERecomecar(repo, {
      registro: new RegistroDeContas(`r-${sufixo()}`),
      exportei: true,
    });
    expect(await bancoExiste(nomeBanco)).toBe(false);
  });

  it('com cópia recente (backup registrado), dispensa a confirmação manual', async () => {
    const nomeBanco = `principal-${sufixo()}`;
    const repo = await Repositorio.abrir({ nomeBanco });
    await registrarBackup(repo);
    await apagarTudoERecomecar(repo, { registro: new RegistroDeContas(`r-${sufixo()}`) });
    expect(await bancoExiste(nomeBanco)).toBe(false);
  });

  it('com conta: esvazia o banco, mantém a conta ativa e a identidade (usuarioId = uid)', async () => {
    const registro = new RegistroDeContas(`r-${sufixo()}`);
    await entrarNaConta({ uid: UID, email: 'a@exemplo.com' }, { registro });
    const repo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID) });
    await repo.colecao('tags').criar({ nome: 'Estudo' });
    await apagarTudoERecomecar(repo, { registro, exportei: true });

    const ativa = await registro.contaAtiva();
    expect(ativa).toMatchObject({ uid: UID, email: 'a@exemplo.com' });
    const novo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID), usuarioId: UID });
    expect(novo.ctx.usuarioId).toBe(UID);
    expect(await novo.colecao('tags').contar()).toBe(0);
  });
});
