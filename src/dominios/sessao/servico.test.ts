import { repositorioDeTeste } from '../../testes/repositorio';
import {
  duracaoEmSegundos,
  encerrarSessao,
  iniciarSessao,
  pausarSessao,
  restaurarSessao,
  retomarSessao,
  sugerirProximoPasso,
} from './servico';

const MIN = 60_000;
const PONTO = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';

describe('Sessão leve (A2)', () => {
  it('começa sem nada: Sessão livre, ativa, sem alvo', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    expect(s).toMatchObject({ tipo: 'livre', estado: 'ativa', pausas: [], data: '2026-09-23' });
    expect(s.alvo).toBeUndefined();
    expect(s.fronteira).toBeUndefined();
  });

  it('grava alvo, fronteira, origem e ponto; fronteira em branco não grava', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {
      alvo: { tipo: 'ponto', id: PONTO, rotulo: 'Direito Penal' },
      fronteira: '  até o art. 15 ',
      origemDaAcao: { tipo: 'escolha_propria' },
    });
    expect(s).toMatchObject({
      tipo: 'estudo',
      pontoId: PONTO,
      fronteira: 'até o art. 15',
      origemDaAcao: { tipo: 'escolha_propria' },
    });
    const { repo: r2 } = await repositorioDeTeste();
    expect((await iniciarSessao(r2, { fronteira: '   ' })).fronteira).toBeUndefined();
  });

  it('só há uma Sessão aberta: iniciar de novo devolve a mesma', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await iniciarSessao(repo, {});
    const b = await iniciarSessao(repo, { fronteira: 'outra' });
    expect(b.id).toBe(a.id);
    expect(await repo.colecao('sessoes').todosDoUsuario()).toHaveLength(1);
  });

  it('pausar e retomar sem falha; a pausa não conta na duração', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    relogio.avancar(10 * MIN);
    const p = await pausarSessao(repo, s.id);
    expect(p.estado).toBe('pausada');
    relogio.avancar(30 * MIN);
    const r = await retomarSessao(repo, s.id);
    expect(r.estado).toBe('ativa');
    expect(r.pausas).toHaveLength(1);
    expect(r.pausas[0]?.fim).toBeDefined();
    relogio.avancar(5 * MIN);
    const e = await encerrarSessao(repo, s.id);
    expect(e).toMatchObject({ estado: 'encerrada', duracaoSegundos: 15 * 60 });
  });

  it('encerrar pausada fecha a pausa; pausar/retomar/encerrar repetidos não mudam nada', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    relogio.avancar(5 * MIN);
    await pausarSessao(repo, s.id);
    expect((await pausarSessao(repo, s.id)).pausas).toHaveLength(1);
    relogio.avancar(20 * MIN);
    const e = await encerrarSessao(repo, s.id);
    expect(e.pausas[0]?.fim).toBe(e.fim);
    expect(e.duracaoSegundos).toBe(5 * 60);
    relogio.avancar(MIN);
    expect(await encerrarSessao(repo, s.id, { proximoPasso: 'x' })).toEqual(e);
    expect(await retomarSessao(repo, s.id)).toEqual(e);
    expect(await pausarSessao(repo, s.id)).toEqual(e);
  });

  it('próximo passo é opcional: em branco não grava', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await iniciarSessao(repo, {});
    expect((await encerrarSessao(repo, a.id, { proximoPasso: '  ' })).proximoPasso).toBeUndefined();
    const b = await iniciarSessao(repo, {});
    expect((await encerrarSessao(repo, b.id, { proximoPasso: ' ler art. 16 ' })).proximoPasso).toBe(
      'ler art. 16',
    );
  });

  it('restaura a Sessão ativa ou pausada do dia; encerrada não', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    expect(await restaurarSessao(repo)).toBeUndefined();
    const s = await iniciarSessao(repo, {});
    relogio.avancar(MIN);
    expect((await restaurarSessao(repo))?.id).toBe(s.id);
    await pausarSessao(repo, s.id);
    expect((await restaurarSessao(repo))?.estado).toBe('pausada');
    await encerrarSessao(repo, s.id);
    expect(await restaurarSessao(repo)).toBeUndefined();
  });

  it('interrompida não restaura: Sessão aberta de outro dia vira interrompida, sem fim nem duração', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await pausarSessao(repo, s.id);
    relogio.avancar(26 * 60 * MIN);
    expect(await restaurarSessao(repo)).toBeUndefined();
    const velha = await repo.colecao('sessoes').obter(s.id);
    expect(velha).toMatchObject({ estado: 'interrompida' });
    expect(velha?.fim).toBeUndefined();
    expect(velha?.duracaoSegundos).toBeUndefined();
    expect(velha?.pausas.every((p) => p.fim)).toBe(true);
    // e já se pode começar outra
    const nova = await iniciarSessao(repo, {});
    expect(nova.id).not.toBe(s.id);
  });

  it('emite eventos sessao.* só com ids', async () => {
    const { repo } = await repositorioDeTeste();
    const nomes: string[] = [];
    repo.eventos.assinar('*', (e) => {
      if (e.nome.startsWith('sessao.')) nomes.push(e.nome);
    });
    const s = await iniciarSessao(repo, {});
    await pausarSessao(repo, s.id);
    await retomarSessao(repo, s.id);
    await encerrarSessao(repo, s.id);
    expect(nomes).toEqual([
      'sessao.iniciada',
      'sessao.pausada',
      'sessao.retomada',
      'sessao.encerrada',
    ]);
  });

  it('erro claro para id inexistente', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(pausarSessao(repo, 'nao-existe')).rejects.toThrow('Sessão não encontrada.');
  });

  it('duração nunca é negativa', () => {
    expect(
      duracaoEmSegundos(
        { inicio: '2026-01-01T10:00:00.000Z', pausas: [] },
        '2026-01-01T09:00:00.000Z',
      ),
    ).toBe(0);
  });

  it('pré-preenche o próximo passo pela fronteira, depois pelo rótulo', () => {
    expect(
      sugerirProximoPasso({ fronteira: 'o art. 15', alvo: { tipo: 'livre', rotulo: 'CP' } }),
    ).toBe('Continuar depois de o art. 15');
    expect(sugerirProximoPasso({ alvo: { tipo: 'leitura', rotulo: 'Lei 8.072' } })).toBe(
      'Voltar a Lei 8.072',
    );
    expect(sugerirProximoPasso({})).toBe('');
  });
});
