import { simularMovimento } from '../../../testes/movimento';
import { escritaDaAbertura, FREQUENCIA, lembrarDaEscrita, tomarEscrita } from './frequencia';

const CHAVE = 'arretado:escrita-do-nome:v1';
const em = (iso: string) => new Date(iso);

beforeEach(() => {
  window.localStorage.clear();
  // O setup semeia o Dia no futuro (aparelho que já viu a Abertura); aqui o nome ainda não foi escrito.
  window.localStorage.removeItem(CHAVE);
  simularMovimento('normal');
});

describe('frequência da escrita do nome (D-D9, Q6)', () => {
  it('a constante única: completa na primeira vez, curta no primeiro do Dia, parada nas demais', () => {
    expect(FREQUENCIA).toEqual({
      primeiraVez: 'completa',
      primeiraDoDia: 'curta',
      demais: 'parada',
    });
  });

  it('primeira abertura no aparelho: o nome inteiro', () => {
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('completa');
  });

  it('só ler não conta: sem lembrar, a abertura seguinte ainda é a primeira', () => {
    escritaDaAbertura(em('2026-10-20T12:00:00Z'));
    expect(escritaDaAbertura(em('2026-10-20T12:01:00Z'))).toBe('completa');
  });

  it('abertura seguinte no mesmo Dia: parada', () => {
    lembrarDaEscrita(em('2026-10-20T12:00:00Z'));
    expect(escritaDaAbertura(em('2026-10-20T12:01:00Z'))).toBe('parada');
    expect(escritaDaAbertura(em('2026-10-20T22:00:00Z'))).toBe('parada');
  });

  it('primeira abertura de outro Dia: curta', () => {
    lembrarDaEscrita(em('2026-10-19T12:00:00Z'));
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('curta');
  });

  it('um Dia guardado igual ou posterior ao de hoje (o relógio andou para trás) vale como já escrito', () => {
    lembrarDaEscrita(em('2026-10-21T12:00:00Z'));
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('parada');
    window.localStorage.setItem(CHAVE, '{"dia":"9999-12-31"}');
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('parada');
  });

  it('o Dia é o de Brasília (T14): 23h59 e 0h00 do horário de Brasília são Dias diferentes', () => {
    lembrarDaEscrita(em('2026-10-20T02:30:00Z')); // 23h30 de 19/10 em Brasília
    expect(escritaDaAbertura(em('2026-10-20T02:59:00Z'))).toBe('parada');
    expect(escritaDaAbertura(em('2026-10-20T03:00:00Z'))).toBe('curta'); // 0h00 de 20/10
  });

  it('só guarda o Dia: nenhum dado de estudo', () => {
    lembrarDaEscrita(em('2026-10-20T12:00:00Z'));
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('movimento reduzido do sistema: parada, e a primeira vez fica guardada para depois', () => {
    simularMovimento('reduzido');
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('parada');
    simularMovimento('normal');
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('completa');
  });

  it.each(['{', '"x"', 'null', '[]', '{"dia":5}', '{"dia":null}'])(
    'valor estragado (%s) vale como primeira vez',
    (bruto) => {
      window.localStorage.setItem(CHAVE, bruto);
      expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('completa');
    },
  );

  it('sem armazenamento, segue: lê como primeira vez e não quebra ao lembrar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(escritaDaAbertura(em('2026-10-20T12:00:00Z'))).toBe('completa');
    expect(() => {
      lembrarDaEscrita(em('2026-10-20T12:00:00Z'));
    }).not.toThrow();
  });
});

describe('tomarEscrita (a Abertura toma a escrita, M2 do Zé)', () => {
  it('na primeira vez toma a escrita inteira e guarda o Dia', () => {
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('completa');
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('na primeira abertura de outro Dia toma a escrita curta e guarda o Dia novo', () => {
    lembrarDaEscrita(em('2026-10-19T12:00:00Z'));
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('curta');
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('depois de tomada, o cabeçalho já não escreve: a abertura seguinte do Dia é parada', () => {
    tomarEscrita(em('2026-10-20T12:00:00Z'));
    expect(escritaDaAbertura(em('2026-10-20T12:00:30Z'))).toBe('parada');
    // E tomar de novo não toma nada: o nome não se escreve duas vezes no mesmo Dia.
    expect(tomarEscrita(em('2026-10-20T12:00:30Z'))).toBe('parada');
  });

  it('nas demais aberturas não toma nem grava nada', () => {
    lembrarDaEscrita(em('2026-10-20T08:00:00Z'));
    const antes = window.localStorage.getItem(CHAVE);
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('parada');
    expect(window.localStorage.getItem(CHAVE)).toBe(antes);
  });

  it('movimento reduzido do sistema: não toma nada, e a primeira vez continua guardada', () => {
    simularMovimento('reduzido');
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('parada');
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
    simularMovimento('normal');
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('completa');
  });
});
