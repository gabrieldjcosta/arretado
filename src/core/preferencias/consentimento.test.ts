import { repositorioDeTeste } from '../../testes/repositorio';
import {
  exigirConsentimento,
  registrarConsentimento,
  registrarConsentimentoNoServidor,
  temConsentimento,
  VERSAO_POLITICA,
} from './consentimento';

describe('consentimento local (A7)', () => {
  it('sem aceite, não há consentimento nem permissão', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await temConsentimento(repo, 'login')).toBe(false);
    await expect(exigirConsentimento(repo, 'backup-nuvem')).rejects.toThrow(/consentimento/i);
  });

  it('grava versão, escopo e data em Usuario.consentimentos', async () => {
    const { repo } = await repositorioDeTeste();
    await registrarConsentimento(repo, 'login', new Date('2026-10-18T12:00:00Z'));
    const [usuario] = await repo.colecao('usuarios').todosDoUsuario();
    expect(usuario?.consentimentos).toEqual([
      { versaoPolitica: `${VERSAO_POLITICA}:login`, aceitoEm: '2026-10-18T12:00:00.000Z' },
    ]);
    expect(await temConsentimento(repo, 'login')).toBe(true);
    expect(await temConsentimento(repo, 'backup-nuvem')).toBe(false);
  });

  it('escopos são independentes e o aceite repetido não duplica', async () => {
    const { repo } = await repositorioDeTeste();
    await registrarConsentimento(repo, 'login');
    await registrarConsentimento(repo, 'login');
    await registrarConsentimento(repo, 'backup-nuvem');
    const [usuario] = await repo.colecao('usuarios').todosDoUsuario();
    expect(usuario?.consentimentos).toHaveLength(2);
    await expect(exigirConsentimento(repo, 'backup-nuvem')).resolves.toBeUndefined();
  });

  it('aceite de outra versão da política não vale', async () => {
    const { repo } = await repositorioDeTeste();
    const [usuario] = await repo.colecao('usuarios').todosDoUsuario();
    await repo.colecao('usuarios').atualizar(usuario!.id, {
      consentimentos: [{ versaoPolitica: 'v2:login', aceitoEm: '2026-01-01T00:00:00.000Z' }],
    });
    expect(await temConsentimento(repo, 'login')).toBe(false);
  });

  it('a porta do servidor é nula: não faz nada e não usa rede', async () => {
    await expect(registrarConsentimentoNoServidor('login')).resolves.toBeUndefined();
  });
});
