import { repositorioDeTeste } from '../../testes/repositorio';
import { escolherProximaAcao } from './contrato';

describe('contrato da Próxima ação (P0)', () => {
  it('ainda não implementado: o pacote A1 troca esta função', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(escolherProximaAcao(repo, '2026-10-13')).rejects.toThrow(/não implementado/);
  });
});
