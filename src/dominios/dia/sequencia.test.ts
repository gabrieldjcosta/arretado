import { dataCivil } from '../../core/datas';
import { repositorioDeTeste } from '../../testes/repositorio';
import { DIAS_NO_FIO, fraseDaSequencia, sequenciaDoFio } from './sequencia';

const DIA = 24 * 60 * 60_000;

async function estudar(repo: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) {
  const agora = repo.ctx.agora();
  await repo.colecao('sessoes').criar({
    tipo: 'livre',
    data: dataCivil(agora),
    inicio: agora.toISOString(),
    estado: 'encerrada',
    pausas: [],
  });
}

describe('Sequência que dobra', () => {
  it('sem estudo nenhum, não há o que dizer', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await sequenciaDoFio(repo)).toBeUndefined();
  });

  it('dia sem estudo vira descanso e o total nunca diminui', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await estudar(repo);
    await estudar(repo); // dois registros no mesmo Dia contam uma vez
    relogio.avancar(DIA);
    await estudar(repo);
    const antes = await sequenciaDoFio(repo);
    expect(antes?.total).toBe(2);
    expect(antes?.hojeEmDescanso).toBe(false);
    relogio.avancar(5 * DIA);
    const depois = await sequenciaDoFio(repo);
    expect(depois?.total).toBe(2);
    expect(depois?.hojeEmDescanso).toBe(true);
    expect(depois?.dias).toHaveLength(DIAS_NO_FIO);
    expect(depois?.dias.at(-1)?.estado).toBe('descanso');
    expect(depois?.dias.filter((d) => d.estado === 'estudo')).toHaveLength(2);
  });

  it('a frase diz o total e, em descanso, que o fio espera, sem dívida', () => {
    expect(fraseDaSequencia({ total: 7, hojeEmDescanso: true })).toBe(
      '7 dias de estudo no caminho. O fio te espera, sem pressa.',
    );
    expect(fraseDaSequencia({ total: 1, hojeEmDescanso: false })).toBe(
      '1 dia de estudo no caminho.',
    );
  });
});
