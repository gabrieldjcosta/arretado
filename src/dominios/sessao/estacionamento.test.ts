import { alterarPreferencias } from '../../core/preferencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  definirTemporizador,
  estacionar,
  notasParaLembrar,
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

describe('Notas para lembrar (Hoje)', () => {
  it('junta as pendentes de todas as Sessões, a mais recente primeiro, com o endereço de cada uma', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const a = await iniciarSessao(repo, {});
    await estacionar(repo, a.id, 'ligar para o cartório');
    relogio.avancar(MIN);
    await estacionar(repo, a.id, 'pedir o livro');
    await encerrarSessao(repo, a.id);
    relogio.avancar(MIN);
    const b = await iniciarSessao(repo, {});
    await estacionar(repo, b.id, 'pagar a taxa');

    expect(await notasParaLembrar(repo)).toMatchObject([
      { texto: 'pagar a taxa', sessaoId: b.id, indice: 0 },
      { texto: 'pedir o livro', sessaoId: a.id, indice: 1 },
      { texto: 'ligar para o cartório', sessaoId: a.id, indice: 0 },
    ]);
  });

  it('não traz as resolvidas nem as de uma Sessão excluída; o endereço resolve a nota', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const a = await iniciarSessao(repo, {});
    await estacionar(repo, a.id, 'a');
    relogio.avancar(MIN);
    await estacionar(repo, a.id, 'b');
    await encerrarSessao(repo, a.id);
    relogio.avancar(MIN);
    const b = await iniciarSessao(repo, {});
    await estacionar(repo, b.id, 'c');

    const [, meio] = await notasParaLembrar(repo); // c, b, a: resolve a do meio (b)
    await resolverNota(repo, meio?.sessaoId ?? '', meio?.indice ?? -1);
    expect((await notasParaLembrar(repo)).map((n) => n.texto)).toEqual(['c', 'a']);

    await repo.colecao('sessoes').excluir(b.id);
    expect((await notasParaLembrar(repo)).map((n) => n.texto)).toEqual(['a']);
  });

  it('corta no limite, ficando com as mais recentes', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      relogio.avancar(MIN);
      await estacionar(repo, s.id, `nota ${String(n)}`);
    }
    expect((await notasParaLembrar(repo)).map((n) => n.texto)).toEqual([
      'nota 7',
      'nota 6',
      'nota 5',
      'nota 4',
      'nota 3',
    ]);
  });

  it('mantém as notas pedidas, resolvidas ou não, além das cinco pendentes', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    for (const n of [1, 2, 3, 4, 5, 6]) {
      relogio.avancar(MIN);
      await estacionar(repo, s.id, `nota ${String(n)}`);
    }
    await resolverNota(repo, s.id, 5); // a mais recente
    const mantida = { sessaoId: s.id, indice: 5 };

    expect((await notasParaLembrar(repo)).map((n) => n.texto)).toEqual([
      'nota 5',
      'nota 4',
      'nota 3',
      'nota 2',
      'nota 1',
    ]);
    const com = await notasParaLembrar(repo, [mantida]);
    expect(com.map((n) => n.texto)).toEqual([
      'nota 6',
      'nota 5',
      'nota 4',
      'nota 3',
      'nota 2',
      'nota 1',
    ]);
    expect(com[0]?.resolvidaEm).toBeDefined();
  });

  it('sem notas, a lista é vazia', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, {});
    expect(await notasParaLembrar(repo)).toEqual([]);
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
