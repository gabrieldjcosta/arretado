import { Preferencias } from '../modelo';
import { Repositorio } from '../persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { alterarPreferencias, obterPreferencias } from './index';

describe('preferências (1.7)', () => {
  it('nascem com o padrão', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await obterPreferencias(repo)).toMatchObject({ tema: 'sistema', retencaoSnapshots: 5 });
  });

  it('persistem após reabrir', async () => {
    const nomeBanco = `pref-${Math.random()}`;
    const a = await Repositorio.abrir({ nomeBanco });
    await alterarPreferencias(a, { tema: 'escuro', tamanhoFonte: 20 });
    a.fechar();
    const b = await Repositorio.abrir({ nomeBanco });
    expect(await obterPreferencias(b)).toMatchObject({ tema: 'escuro', tamanhoFonte: 20 });
  });

  it('rejeitam valor fora do tipo', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(alterarPreferencias(repo, { retencaoSnapshots: 2 })).rejects.toThrow();
  });

  it('são recriadas se apagadas', async () => {
    const { repo } = await repositorioDeTeste();
    await repo.colecao('preferencias').excluir((await obterPreferencias(repo)).id);
    expect((await obterPreferencias(repo)).tema).toBe('sistema');
  });

  it('a preferência anterior à 9.8, sem `destacarCondicionantesEPrazos`, continua válida e muda sem migração', async () => {
    const { repo } = await repositorioDeTeste();
    const antiga = await obterPreferencias(repo);
    // O registro que já existe no aparelho não tem o campo: ausente é desligado.
    expect(antiga).not.toHaveProperty('destacarCondicionantesEPrazos');
    expect(Preferencias.safeParse(antiga).success).toBe(true);
    expect((await alterarPreferencias(repo, { tamanhoFonte: 20 })).tamanhoFonte).toBe(20);
    const ligada = await alterarPreferencias(repo, { destacarCondicionantesEPrazos: true });
    expect(ligada.destacarCondicionantesEPrazos).toBe(true);
    expect(
      Preferencias.safeParse({ ...ligada, destacarCondicionantesEPrazos: 'sim' }).success,
    ).toBe(false);
  });
});
