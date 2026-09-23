import { repositorioDeTeste } from '../testes/repositorio';
import { podeRelatarHoje, registrarRelato, RelatoRecusado, relatosAguardando } from './relatos';

describe('relatar problema (5.4)', () => {
  it('exige descrição', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(
      registrarRelato(repo, { descricao: '   ', tela: '/recall' }),
    ).rejects.toBeInstanceOf(RelatoRecusado);
  });

  it('um por dia, contado no fuso de Brasília', async () => {
    // 23/09 às 20:00 em Brasília (23:00 UTC).
    const { repo, relogio } = await repositorioDeTeste({ inicio: '2026-09-23T23:00:00.000Z' });
    await registrarRelato(repo, { descricao: 'Botão travou', tela: '/recall' });
    expect(await podeRelatarHoje(repo)).toBe(false);
    // 23:30 em Brasília, já 24/09 em UTC: ainda é o mesmo dia.
    relogio.avancar(3.5 * 3_600_000);
    await expect(registrarRelato(repo, { descricao: 'Outro', tela: '/' })).rejects.toThrow(/hoje/);
    // Dia seguinte em Brasília.
    relogio.avancar(3_600_000);
    expect(await podeRelatarHoje(repo)).toBe(true);
    await registrarRelato(repo, { descricao: 'Outro', tela: '/' });
    expect(await relatosAguardando(repo)).toHaveLength(2);
  });

  it('guarda só tela (sem parâmetros), versão e aparelho, na fila local', async () => {
    const { repo } = await repositorioDeTeste();
    const r = await registrarRelato(repo, {
      descricao: 'Lista não carrega',
      tela: '/recall/erros?busca=art-112#x',
    });
    expect(r).toMatchObject({
      tela: '/recall/erros',
      aparelhoId: repo.ctx.aparelhoId,
      status: 'aguardando_envio',
    });
    expect(Object.keys(r).sort()).toEqual(
      [
        'aparelhoId',
        'atualizadoEm',
        'criadoEm',
        'data',
        'descricao',
        'excluidoEm',
        'id',
        'origem',
        'status',
        'tela',
        'tsLogico',
        'usuarioId',
        'versaoApp',
      ].sort(),
    );
  });
});
