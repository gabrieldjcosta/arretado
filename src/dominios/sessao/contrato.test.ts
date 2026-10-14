import { repositorioDeTeste } from '../../testes/repositorio';
import {
  encerrarSessao,
  estacionar,
  iniciarSessao,
  pausarSessao,
  restaurarSessao,
  retomarSessao,
} from './contrato';

describe('contrato da Sessão (P0)', () => {
  it('ainda não implementado: os pacotes A2 e A3a trocam estas funções', async () => {
    const { repo } = await repositorioDeTeste();
    const chamadas = [
      iniciarSessao(repo, {}),
      pausarSessao(repo, 'x'),
      retomarSessao(repo, 'x'),
      encerrarSessao(repo, 'x'),
      restaurarSessao(repo),
      estacionar(repo, 'x', 'ver depois'),
    ];
    for (const c of chamadas) await expect(c).rejects.toThrow(/não implementado/);
  });
});
