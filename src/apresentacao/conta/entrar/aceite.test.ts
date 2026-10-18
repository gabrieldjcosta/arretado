import {
  entrarNaConta,
  nomeBancoDaConta,
  RegistroDeContas,
  Repositorio,
} from '../../../core/persistencia';
import { temConsentimento } from '../../../core/preferencias';
import {
  aceiteDoLoginPendente,
  descartarAceiteDoLogin,
  marcarAceiteDoLogin,
  registrarAceitePendente,
} from './aceite';

const UID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

afterEach(descartarAceiteDoLogin);

describe('aceite do login (A7)', () => {
  it('sem marca de aceite, nada é gravado', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    await entrarNaConta({ uid: UID, email: 'a@exemplo.com' }, { registro });
    const repo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID) });
    expect(await registrarAceitePendente(repo, registro)).toBe(false);
    expect(await temConsentimento(repo, 'login')).toBe(false);
  });

  it('com a marca e a conta ativa, grava em Usuario.consentimentos e limpa a marca', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    await entrarNaConta({ uid: UID, email: 'a@exemplo.com' }, { registro });
    const repo = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID) });
    marcarAceiteDoLogin(new Date('2026-10-18T10:00:00Z'));
    expect(await registrarAceitePendente(repo, registro)).toBe(true);
    const [usuario] = await repo.colecao('usuarios').todosDoUsuario();
    expect(usuario?.consentimentos).toEqual([
      { versaoPolitica: 'v3:login', aceitoEm: '2026-10-18T10:00:00.000Z' },
    ]);
    expect(aceiteDoLoginPendente()).toBeNull();
  });

  it('banco sem conta não recebe o aceite e a marca fica', async () => {
    const registro = new RegistroDeContas(`registro-${Math.random()}`);
    const repo = await Repositorio.abrir({ nomeBanco: `sem-conta-${Math.random()}` });
    marcarAceiteDoLogin();
    expect(await registrarAceitePendente(repo, registro)).toBe(false);
    expect(await temConsentimento(repo, 'login')).toBe(false);
    expect(aceiteDoLoginPendente()).not.toBeNull();
  });
});
