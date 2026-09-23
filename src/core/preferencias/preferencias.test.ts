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
});
