import { repositorioDeTeste } from '../../testes/repositorio';
import { posicaoNoCiclo } from './posicao';
import {
  ajustarPeso,
  ativarCiclo,
  CicloInvalido,
  cicloAtivo,
  criarCiclo,
  desfazerUltimoAjuste,
  listarCiclos,
  posicaoDoCiclo,
  pularBloco,
} from './servico';

describe('posicaoNoCiclo', () => {
  it('começa no bloco 0 da volta 1; cada bloco feito ou pulado avança; passar do fim abre outra volta', () => {
    expect(posicaoNoCiclo(3, [])).toEqual({ indice: 0, volta: 1 });
    expect(posicaoNoCiclo(3, [{ em: '2026-10-01', blocoOrdem: 0 }])).toEqual({
      indice: 1,
      volta: 1,
    });
    expect(
      posicaoNoCiclo(3, [
        { em: '2026-10-03', blocoOrdem: 2 },
        { em: '2026-10-01', blocoOrdem: 0 },
        { em: '2026-10-02', blocoOrdem: 1 },
      ]),
    ).toEqual({ indice: 0, volta: 2 });
  });
});

describe('serviço de ciclos', () => {
  async function comMaterias() {
    const { repo, relogio } = await repositorioDeTeste();
    const a = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    const b = await repo.colecao('disciplinas').criar({ nome: 'Civil' });
    return { repo, relogio, a, b };
  }

  it('cria o ciclo com blocos pelos pesos; o primeiro vira o ativo; só um fica ativo', async () => {
    const { repo, a, b } = await comMaterias();
    const c1 = await criarCiclo(repo, {
      nome: ' Meu  ciclo ',
      modelo: 'manual',
      pesos: [
        { disciplinaId: a.id, peso: 2 },
        { disciplinaId: b.id, peso: 1 },
      ],
    });
    expect(c1).toMatchObject({ nome: 'Meu ciclo', ativo: true });
    expect(c1.blocos).toHaveLength(3);
    expect(c1.blocos[0]?.minutos).toBe(40);
    const c2 = await criarCiclo(repo, {
      nome: 'Outro',
      modelo: 'igual',
      pesos: [{ disciplinaId: a.id, peso: 1 }],
      ativo: false,
    });
    expect((await cicloAtivo(repo))?.id).toBe(c1.id);
    await ativarCiclo(repo, c2.id);
    expect((await cicloAtivo(repo))?.id).toBe(c2.id);
    expect((await listarCiclos(repo)).filter((c) => c.ativo === true)).toHaveLength(1);
    await expect(
      criarCiclo(repo, { nome: ' ', modelo: 'manual', pesos: [] }),
    ).rejects.toBeInstanceOf(CicloInvalido);
  });

  it('posição vem das Sessões encerradas do ciclo e dos pulos', async () => {
    const { repo, relogio, a, b } = await comMaterias();
    const ciclo = await criarCiclo(repo, {
      nome: 'C',
      modelo: 'manual',
      pesos: [
        { disciplinaId: a.id, peso: 1 },
        { disciplinaId: b.id, peso: 1 },
      ],
    });
    expect(await posicaoDoCiclo(repo, ciclo)).toEqual({ indice: 0, volta: 1 });
    const s = await repo.colecao('sessoes').criar({
      tipo: 'estudo',
      data: '2026-09-23',
      inicio: relogio.agora.toISOString(),
      fim: relogio.agora.toISOString(),
      estado: 'encerrada',
      pausas: [],
      cicloId: ciclo.id,
      blocoOrdem: 0,
    });
    expect(s.cicloId).toBe(ciclo.id);
    expect(await posicaoDoCiclo(repo, ciclo)).toEqual({ indice: 1, volta: 1 });
    relogio.avancar(60_000);
    const depois = await pularBloco(repo, ciclo.id);
    expect(await posicaoDoCiclo(repo, depois)).toEqual({ indice: 0, volta: 2 });
  });

  it('ajustar peso refaz os blocos, mantém os minutos e registra no log; peso igual não muda nada', async () => {
    const { repo, a, b } = await comMaterias();
    const ciclo = await criarCiclo(repo, {
      nome: 'C',
      modelo: 'manual',
      minutos: 25,
      pesos: [
        { disciplinaId: a.id, peso: 1 },
        { disciplinaId: b.id, peso: 1 },
      ],
    });
    expect((await ajustarPeso(repo, ciclo.id, a.id, 1, 'manual')).logDePesos).toBeUndefined();
    const novo = await ajustarPeso(repo, ciclo.id, a.id, 9, 'erro', '38% de erro');
    expect(novo.pesos.find((p) => p.disciplinaId === a.id)?.peso).toBe(4);
    expect(novo.blocos).toHaveLength(5);
    expect(novo.blocos.every((x) => x.minutos === 25)).toBe(true);
    expect(novo.logDePesos?.[0]).toMatchObject({ antes: 1, depois: 4, origem: 'erro' });
    await expect(ajustarPeso(repo, ciclo.id, 'x', 2, 'manual')).rejects.toBeInstanceOf(
      CicloInvalido,
    );
  });
});

describe('desfazer o ajuste por erro (C5)', () => {
  it('volta o peso, registra a volta e só desfaz ajuste por erro ainda em vigor', async () => {
    const { repo } = await repositorioDeTeste();
    const penal = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    const civil = await repo.colecao('disciplinas').criar({ nome: 'Civil' });
    const c = await criarCiclo(repo, {
      nome: 'C',
      modelo: 'manual',
      pesos: [
        { disciplinaId: penal.id, peso: 1 },
        { disciplinaId: civil.id, peso: 1 },
      ],
    });
    await expect(desfazerUltimoAjuste(repo, c.id)).rejects.toBeInstanceOf(CicloInvalido);
    await ajustarPeso(repo, c.id, penal.id, 2, 'erro', 'Penal: 40% de erro');
    const volta = await desfazerUltimoAjuste(repo, c.id);
    expect(volta.pesos.find((p) => p.disciplinaId === penal.id)?.peso).toBe(1);
    expect(volta.blocos).toHaveLength(2);
    expect(volta.logDePesos?.map((r) => [r.origem, r.antes, r.depois])).toEqual([
      ['erro', 1, 2],
      ['manual', 2, 1],
    ]);
    await expect(desfazerUltimoAjuste(repo, c.id)).rejects.toBeInstanceOf(CicloInvalido);
  });
});
