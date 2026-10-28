import { repositorioDeTeste } from '../../../testes/repositorio';
import { arquivarCiclo, listarCiclos } from '../../../dominios/ciclos';
import { garantirCicloPadrao } from './padrao';

describe('ciclo padrão (F5)', () => {
  it('sem Pontos não cria nada', async () => {
    const { repo } = await repositorioDeTeste();
    await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    expect(await garantirCicloPadrao(repo)).toBe(false);
    expect(await listarCiclos(repo)).toHaveLength(0);
  });

  it('com Trilha e sem Ciclo cria o Equilibrado de 25 min, ativo, uma vez só', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    await repo.colecao('pontos').criar({ disciplinaId: d.id, titulo: 'Crimes', faixa: 'alta' });
    expect(await Promise.all([garantirCicloPadrao(repo), garantirCicloPadrao(repo)])).toEqual([
      true,
      true,
    ]);
    const ciclos = await listarCiclos(repo);
    expect(ciclos).toHaveLength(1);
    expect(ciclos[0]).toMatchObject({ modelo: 'equilibrado', ativo: true });
    expect(ciclos[0]?.blocos[0]?.minutos).toBe(25);
    expect(await garantirCicloPadrao(repo)).toBe(false);
  });

  it('quem arquivou o Ciclo não ganha outro', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    await repo.colecao('pontos').criar({ disciplinaId: d.id, titulo: 'Crimes' });
    await garantirCicloPadrao(repo);
    const [c] = await listarCiclos(repo);
    await arquivarCiclo(repo, c!.id);
    expect(await garantirCicloPadrao(repo)).toBe(false);
    expect(await listarCiclos(repo)).toHaveLength(0);
  });
});
