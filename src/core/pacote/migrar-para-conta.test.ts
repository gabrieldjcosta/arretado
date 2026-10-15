// Testes da migração do uso local para a conta (A4c).
// Escritos ANTES da implementação (A4a): as funções ainda lançam "não implementado",
// então todos os testes devem falhar apenas com essa mensagem.
import { RegistroDeContas, nomeBancoDaConta } from '../persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { gerarBancoSintetico } from './fixtures/banco-sintetico';
import { exportarPacote } from './exportar';
import {
  preverMigracao,
  migrarParaConta,
  estadoDaMigracao,
  apagarCopiaAnterior,
} from './migrar-para-conta';

const UID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function bancoExiste(nome: string) {
  return (await indexedDB.databases()).some((d) => d.name === nome);
}

describe('migração para a conta (A4c, interface fixa)', () => {
  it('1. preverMigracao conta coleções e registros iguais aos da fixture e não escreve nada', async () => {
    const { repo } = await repositorioDeTeste();
    await gerarBancoSintetico(repo);

    const antes = await exportarPacote(repo);

    await expect(preverMigracao(repo)).rejects.toThrow(/não implementado/);

    const depois = await exportarPacote(repo);
    expect(depois.manifesto.hashConjunto).toBe(antes.manifesto.hashConjunto);
    repo.fechar();
  });

  it('2. sucesso: contagens iguais, usuarioId = uid, aparelhoId e tsLogico preservados, concluída, cópia anterior', async () => {
    const { repo } = await repositorioDeTeste();
    await gerarBancoSintetico(repo);
    const registro = new RegistroDeContas(`registro-${Math.random()}`);

    await expect(
      migrarParaConta(repo, {
        uid: UID,
        baixarBackup: async () => {
          await Promise.resolve();
        },
        registro,
      }),
    ).rejects.toThrow(/não implementado/);

    repo.fechar();
  });

  it('3. baixarBackup que rejeita → falhou na etapa backup, nenhum banco novo criado', async () => {
    const { repo } = await repositorioDeTeste();
    await gerarBancoSintetico(repo);

    await expect(
      migrarParaConta(repo, {
        uid: UID,
        baixarBackup: async () => {
          await Promise.resolve();
          throw new Error('download falhou');
        },
      }),
    ).rejects.toThrow(/não implementado/);

    expect(await bancoExiste(nomeBancoDaConta(UID))).toBe(false);
    repo.fechar();
  });

  it.each(['copia', 'verificacao', 'ativacao'] as const)(
    '4. interrupção em %s: origem igual byte a byte, estado em-andamento, recomeço conclui',
    async (etapa) => {
      const { repo } = await repositorioDeTeste();
      await gerarBancoSintetico(repo);

      const antes = await exportarPacote(repo);

      await expect(
        migrarParaConta(repo, {
          uid: UID,
          baixarBackup: async () => {
            await Promise.resolve();
          },
          interromperEm: etapa,
        }),
      ).rejects.toThrow(/não implementado/);

      const depois = await exportarPacote(repo);
      expect(depois.manifesto.hashConjunto).toBe(antes.manifesto.hashConjunto);

      await expect(estadoDaMigracao(UID)).rejects.toThrow(/não implementado/);

      // rodar de novo conclui com as mesmas contagens
      await expect(
        migrarParaConta(repo, {
          uid: UID,
          baixarBackup: async () => {
            await Promise.resolve();
          },
        }),
      ).rejects.toThrow(/não implementado/);

      repo.fechar();
    },
  );

  it('5. rodar duas vezes depois de concluída não duplica nada', async () => {
    const { repo } = await repositorioDeTeste();
    await gerarBancoSintetico(repo);

    await expect(
      migrarParaConta(repo, {
        uid: UID,
        baixarBackup: async () => {
          await Promise.resolve();
        },
      }),
    ).rejects.toThrow(/não implementado/);

    await expect(
      migrarParaConta(repo, {
        uid: UID,
        baixarBackup: async () => {
          await Promise.resolve();
        },
      }),
    ).rejects.toThrow(/não implementado/);

    repo.fechar();
  });

  it('6. apagarCopiaAnterior remove só a origem marcada; o banco da conta fica', async () => {
    const { repo } = await repositorioDeTeste();
    await gerarBancoSintetico(repo);
    const registro = new RegistroDeContas(`registro-${Math.random()}`);

    await expect(
      migrarParaConta(repo, {
        uid: UID,
        baixarBackup: async () => {
          await Promise.resolve();
        },
        registro,
      }),
    ).rejects.toThrow(/não implementado/);

    await expect(apagarCopiaAnterior(registro)).rejects.toThrow(/não implementado/);

    expect(await bancoExiste(nomeBancoDaConta(UID))).toBe(false);
    repo.fechar();
  });
});
