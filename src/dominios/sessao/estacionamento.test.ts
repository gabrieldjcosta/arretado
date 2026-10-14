import { alterarPreferencias } from '../../core/preferencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  definirTemporizador,
  estacionar,
  notasPendentes,
  resolverNota,
  segundosRestantes,
} from './estacionamento';
import { encerrarSessao, iniciarSessao, pausarSessao, retomarSessao } from './servico';

const MIN = 60_000;

describe('Estacionamento (A3a)', () => {
  it('guarda a distração na Sessão, em ordem, sem mudar o estado', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await estacionar(repo, s.id, '  ver o preço do livro ');
    relogio.avancar(MIN);
    const depois = await estacionar(repo, s.id, 'responder a Ana');
    expect(depois.estado).toBe('ativa');
    expect(depois.estacionamento?.map((n) => n.texto)).toEqual([
      'ver o preço do livro',
      'responder a Ana',
    ]);
    expect(notasPendentes(depois)).toHaveLength(2);
  });

  it('texto em branco não grava; Sessão encerrada não aceita', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    expect((await estacionar(repo, s.id, '   ')).estacionamento).toBeUndefined();
    await encerrarSessao(repo, s.id);
    await expect(estacionar(repo, s.id, 'tarde demais')).rejects.toThrow(/já terminou/);
  });

  it('estaciona também com a Sessão pausada', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await pausarSessao(repo, s.id);
    const nova = await estacionar(repo, s.id, 'lembrete');
    expect(nova).toMatchObject({ estado: 'pausada' });
    expect(nova.estacionamento).toHaveLength(1);
  });

  it('resolve e desfaz uma nota, depois de encerrar também', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await estacionar(repo, s.id, 'a');
    await estacionar(repo, s.id, 'b');
    await encerrarSessao(repo, s.id);
    const r = await resolverNota(repo, s.id, 0);
    expect(r.estacionamento?.[0]?.resolvidaEm).toBeDefined();
    expect(notasPendentes(r).map((n) => n.texto)).toEqual(['b']);
    const d = await resolverNota(repo, s.id, 0, false);
    expect(d.estacionamento?.[0]?.resolvidaEm).toBeUndefined();
    expect(await resolverNota(repo, s.id, 9)).toMatchObject({ id: s.id });
  });
});

describe('Temporizador (A3a)', () => {
  it('escolhe e tira; só informa, não encerra nada', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    expect((await definirTemporizador(repo, s.id, 25)).temporizadorMin).toBe(25);
    const sem = await definirTemporizador(repo, s.id, undefined);
    expect(sem.temporizadorMin).toBeUndefined();
    expect(sem.estado).toBe('ativa');
  });

  it('o padrão das preferências vale quando a entrada não escolhe', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { temporizadorPadraoMin: 30 });
    expect((await iniciarSessao(repo, {})).temporizadorMin).toBe(30);
  });

  it('a entrada vence o padrão', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { temporizadorPadraoMin: 30 });
    expect((await iniciarSessao(repo, { temporizadorMin: 10 })).temporizadorMin).toBe(10);
  });

  it('conta só o tempo ativo: a pausa congela', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { temporizadorMin: 25 });
    relogio.avancar(5 * MIN);
    await pausarSessao(repo, s.id);
    relogio.avancar(60 * MIN);
    const volta = await retomarSessao(repo, s.id);
    expect(segundosRestantes(volta, relogio.agora.toISOString())).toBe(20 * 60);
    relogio.avancar(21 * MIN);
    expect(segundosRestantes(volta, relogio.agora.toISOString())).toBe(-60);
  });

  it('sem temporizador não há contagem', () => {
    expect(
      segundosRestantes(
        { inicio: '2026-09-23T12:00:00.000Z', pausas: [] },
        '2026-09-23T12:10:00.000Z',
      ),
    ).toBeUndefined();
  });
});
