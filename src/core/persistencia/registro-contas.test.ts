import { Repositorio } from './repositorio';
import {
  abrirRepositorioAtivo,
  entrarNaConta,
  nomeBancoDaConta,
  nomeDoBancoAtivo,
  RegistroDeContas,
} from './registro-contas';

const UID_A = '11111111-1111-4111-8111-111111111111';
const UID_B = '22222222-2222-4222-8222-222222222222';
const UID_C = '33333333-3333-4333-8333-333333333333';
const UID_D = '44444444-4444-4444-8444-444444444444';

function registroDeTeste() {
  return new RegistroDeContas(`registro-${Math.random()}`);
}

describe('registro de contas (F4-A, A1)', () => {
  it('um banco por conta, com nome derivado do uid; uid inválido é recusado', () => {
    expect(nomeBancoDaConta(UID_A)).toBe(`arretado-c-${UID_A}`);
    expect(nomeBancoDaConta(UID_A.toUpperCase())).toBe(`arretado-c-${UID_A}`);
    expect(() => nomeBancoDaConta('../x')).toThrow();
  });

  it('sem conta ativa abre o banco de sempre', async () => {
    const registro = registroDeTeste();
    expect(await registro.contaAtiva()).toBeNull();
    expect(await nomeDoBancoAtivo({ contasHabilitadas: true, registro })).toBe('arretado');
  });

  it('ativar, trocar e sair mudam só o banco escolhido; a lista guarda as duas contas', async () => {
    const registro = registroDeTeste();
    const agora = (iso: string) => new Date(iso);
    await registro.ativar(UID_A, { email: 'a@exemplo.com', agora: agora('2026-10-14T10:00:00Z') });
    expect(await nomeDoBancoAtivo({ contasHabilitadas: true, registro })).toBe(
      nomeBancoDaConta(UID_A),
    );
    await registro.ativar(UID_B, { agora: agora('2026-10-14T11:00:00Z') });
    expect((await registro.contaAtiva())?.uid).toBe(UID_B);
    expect((await registro.listar()).map((c) => c.uid)).toEqual([UID_B, UID_A]);
    await registro.desativar();
    expect(await registro.contaAtiva()).toBeNull();
    expect((await registro.listar()).length).toBe(2);
    await registro.esquecer(UID_A);
    expect((await registro.listar()).map((c) => c.uid)).toEqual([UID_B]);
  });

  it('reativar mantém o e-mail já conhecido', async () => {
    const registro = registroDeTeste();
    await registro.ativar(UID_A, { email: 'a@exemplo.com' });
    await registro.ativar(UID_A);
    expect((await registro.contaAtiva())?.email).toBe('a@exemplo.com');
  });

  it('dado gravado na conta A não aparece na conta B nem no banco sem conta', async () => {
    const registro = registroDeTeste();
    await registro.ativar(UID_A);
    const a = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    await a.colecao('tags').criar({ nome: 'só da conta A' }, { origem: 'sistema' });
    const idA = a.ctx.usuarioId;
    a.fechar();

    await registro.ativar(UID_B);
    const b = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    expect(await b.colecao('tags').todosDoUsuario()).toHaveLength(0);
    expect(b.ctx.usuarioId).not.toBe(idA);
    b.fechar();

    await registro.desativar();
    const semConta = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    expect(semConta.db.name).toBe('arretado');
    expect(await semConta.colecao('tags').todosDoUsuario()).toHaveLength(0);
    semConta.fechar();

    await registro.ativar(UID_A);
    const deNovo = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    expect(deNovo.ctx.usuarioId).toBe(idA);
    expect(await deNovo.colecao('tags').todosDoUsuario()).toHaveLength(1);
    deNovo.fechar();
  });

  it('com a chave desligada nem toca no registro: abre o banco de sempre', async () => {
    const nome = `registro-${Math.random()}`;
    const registro = new RegistroDeContas(nome);
    await registro.ativar(UID_A);
    const espiao = vi.spyOn(registro, 'contaAtiva');
    expect(await nomeDoBancoAtivo({ contasHabilitadas: false, registro })).toBe('arretado');
    expect(espiao).not.toHaveBeenCalled();
  });

  it('nomeBanco explícito vence (espaços separados continuam abrindo pelo próprio nome)', async () => {
    const nomeBanco = `espaco-${Math.random()}`;
    const repo = await abrirRepositorioAtivo({ contasHabilitadas: true, nomeBanco });
    expect(repo.db.name).toBe(nomeBanco);
    repo.fechar();
    expect(Repositorio).toBeDefined();
  });
});

describe('primeira entrada na conta (F4-A, A3)', () => {
  it('o banco da conta nasce com usuarioId = uid e fica ativo', async () => {
    const registro = registroDeTeste();
    await entrarNaConta({ uid: UID_C, email: 'a@exemplo.com' }, { registro });
    expect((await registro.contaAtiva())?.uid).toBe(UID_C);
    const repo = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    expect(repo.db.name).toBe(nomeBancoDaConta(UID_C));
    expect(repo.ctx.usuarioId).toBe(UID_C);
    const usuarios = await repo.colecao('usuarios').todosDoUsuario();
    expect(usuarios.map((u) => u.id)).toEqual([UID_C]);
    repo.fechar();
  });

  it('entrar de novo na mesma conta mantém os dados e a identidade', async () => {
    const registro = registroDeTeste();
    await entrarNaConta({ uid: UID_D, email: 'b@exemplo.com' }, { registro });
    const antes = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    await antes.colecao('tags').criar({ nome: 'da conta B' }, { origem: 'sistema' });
    antes.fechar();
    await entrarNaConta({ uid: UID_D, email: 'b@exemplo.com' }, { registro });
    const depois = await abrirRepositorioAtivo({ contasHabilitadas: true, registro });
    expect(depois.ctx.usuarioId).toBe(UID_D);
    expect(await depois.colecao('tags').todosDoUsuario()).toHaveLength(1);
    depois.fechar();
  });

  it('banco da conta que já existe com outra identidade é recusado, sem alterar nada', async () => {
    const registro = registroDeTeste();
    const outro = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID_A) });
    const idLocal = outro.ctx.usuarioId;
    outro.fechar();
    await expect(
      entrarNaConta({ uid: UID_A, email: 'a@exemplo.com' }, { registro }),
    ).rejects.toThrow(/outra identidade/);
    expect(await registro.contaAtiva()).toBeNull();
    const deNovo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID_A) });
    expect(deNovo.ctx.usuarioId).toBe(idLocal);
    deNovo.fechar();
  });
});
