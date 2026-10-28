import { Repositorio } from '../../../core/persistencia';
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

  it('duas abas abertas ao mesmo tempo (dois Repositórios no mesmo banco) criam um Ciclo só, e ele fica ativo', async () => {
    const nomeBanco = `corrida-${Math.random().toString(36).slice(2)}`;
    const agora = () => new Date('2026-10-14T12:00:00.000Z');
    const umaAba = await Repositorio.abrir({ nomeBanco, agora });
    const outraAba = await Repositorio.abrir({ nomeBanco, agora });
    const d = await umaAba.colecao('disciplinas').criar({ nome: 'Penal' });
    await umaAba.colecao('pontos').criar({ disciplinaId: d.id, titulo: 'Crimes' });
    // Cada aba tem a sua cópia do módulo, e com ela a sua trava de "uma criação por vez".
    vi.resetModules();
    const doutraAba = await import('./padrao');
    await Promise.all([garantirCicloPadrao(umaAba), doutraAba.garantirCicloPadrao(outraAba)]);
    const ciclos = await listarCiclos(umaAba);
    expect(ciclos).toHaveLength(1);
    expect(ciclos.filter((c) => c.ativo)).toHaveLength(1);
  });

  it('com outro aparelho editando (D17) espera sem acender o aviso de bloqueio, e cria quando liberar', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    await repo.colecao('pontos').criar({ disciplinaId: d.id, titulo: 'Crimes' });
    const aoBloquear = vi.fn();
    repo.bloquearEscrita('Outro aparelho está editando.', { aoBloquear });
    expect(await garantirCicloPadrao(repo)).toBe(false);
    expect(aoBloquear).not.toHaveBeenCalled();
    repo.bloquearEscrita(null);
    expect(await garantirCicloPadrao(repo)).toBe(true);
  });
});
