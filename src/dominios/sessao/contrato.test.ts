import { repositorioDeTeste } from '../../testes/repositorio';
import { estacionar } from './contrato';

describe('contrato da Sessão', () => {
  it('estacionar segue não implementado: é do pacote A3a', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(estacionar(repo, 'x', 'ver depois')).rejects.toThrow(/não implementado/);
  });
});
