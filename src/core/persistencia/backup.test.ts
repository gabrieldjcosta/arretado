import { repositorioDeTeste } from '../../testes/repositorio';
import { lerUltimoBackup, registrarBackup } from './backup';

describe('último backup', () => {
  it('começa nulo e guarda o instante do pacote', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await lerUltimoBackup(repo)).toBeNull();
    const t = await registrarBackup(repo);
    expect(await lerUltimoBackup(repo)).toBe(t);
  });
});
