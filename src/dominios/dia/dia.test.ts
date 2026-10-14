import { dataCivil } from '../../core/datas';
import type { Repositorio } from '../../core/persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { diaDeHoje, fecharDia, reabrirDia, resumoDoDia } from './fechar';
import { situacaoDeRetorno } from './retorno';

type Estado = 'ativa' | 'encerrada';
async function sessao(
  repo: Repositorio,
  estado: Estado,
  extra: { proximoPasso?: string; rotulo?: string } = {},
) {
  const agora = repo.ctx.agora();
  return repo.colecao('sessoes').criar({
    tipo: 'livre',
    data: dataCivil(agora),
    inicio: agora.toISOString(),
    estado,
    pausas: [],
    ...(extra.rotulo ? { alvo: { tipo: 'livre' as const, rotulo: extra.rotulo } } : {}),
    ...(extra.proximoPasso ? { proximoPasso: extra.proximoPasso } : {}),
  });
}

const DIA = 24 * 60 * 60_000;

describe('Retorno (A3b)', () => {
  it('sem histórico, nada a dizer', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await situacaoDeRetorno(repo)).toBeUndefined();
  });

  it('atividade de ontem não é retorno; de 3 dias atrás é, com o passo que a pessoa deixou', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await sessao(repo, 'encerrada', { rotulo: 'CP', proximoPasso: 'Voltar a CP' });
    relogio.avancar(DIA);
    expect(await situacaoDeRetorno(repo)).toBeUndefined();
    relogio.avancar(2 * DIA);
    expect(await situacaoDeRetorno(repo)).toEqual({
      diasFora: 3,
      proximoPasso: 'Voltar a CP',
      alvoRotulo: 'CP',
    });
  });

  it('não expõe dívida nem sequência', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await sessao(repo, 'encerrada');
    relogio.avancar(10 * DIA);
    const r = await situacaoDeRetorno(repo);
    expect(Object.keys(r ?? {}).sort()).toEqual(['diasFora']);
  });
});

describe('Fechar o Dia (A3b)', () => {
  it('resume o que houve, fecha, é idempotente e reabre', async () => {
    const { repo } = await repositorioDeTeste();
    await sessao(repo, 'encerrada', { proximoPasso: 'Continuar depois de o art. 3' });
    const r = await resumoDoDia(repo);
    expect(r).toMatchObject({ sessoes: 1, proximoPasso: 'Continuar depois de o art. 3' });
    expect(r.sessaoAberta).toBe(false);

    const dia = await fecharDia(repo);
    expect(dia.fechadoEm).toBeDefined();
    expect((await fecharDia(repo)).id).toBe(dia.id);
    expect(await repo.colecao('dias').todosDoUsuario()).toHaveLength(1);

    await reabrirDia(repo);
    expect((await diaDeHoje(repo))?.fechadoEm).toBeUndefined();
    await fecharDia(repo);
    expect((await diaDeHoje(repo))?.fechadoEm).toBeDefined();
  });

  it('fechar o Dia não encerra a Sessão aberta', async () => {
    const { repo } = await repositorioDeTeste();
    await sessao(repo, 'ativa');
    expect((await resumoDoDia(repo)).sessaoAberta).toBe(true);
    await fecharDia(repo);
    expect((await repo.colecao('sessoes').todosDoUsuario())[0]?.estado).toBe('ativa');
  });
});
