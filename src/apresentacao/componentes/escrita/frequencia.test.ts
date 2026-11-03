import { simularMovimento } from '../../../testes/movimento';
import {
  escalaDaEscrita,
  escritaDaAbertura,
  escritaNaTela,
  FREQUENCIA,
  FREQUENCIA_NA_TELA,
  lembrarDaEscrita,
  NOME_NA_TELA_MS,
  PULOS_PARA_CALAR,
  registrarAberturaVista,
  registrarPulo,
  tomarEscrita,
} from './frequencia';

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

describe('escritaNaTela: toda abertura escreve o nome na tela cheia (D-D14, contrato v10h)', () => {
  const guardado = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null') as unknown;

  it('a constante: inteira na primeira vez, do Dia na primeira de cada Dia, depressa nas demais', () => {
    expect(FREQUENCIA_NA_TELA).toEqual({
      primeiraVez: 'completa',
      primeiraDoDia: 'doDia',
      demais: 'depressa',
    });
  });

  it('os tempos do contrato: o nome em 2,64 s, 2,4 s e 1,6 s; a escala é o que o kit multiplica por --k', () => {
    expect(NOME_NA_TELA_MS).toEqual({ completa: 2640, doDia: 2400, depressa: 1600 });
    expect(escalaDaEscrita('completa')).toBe(1);
    expect(escalaDaEscrita('doDia')).toBeCloseTo(0.909, 3);
    expect(escalaDaEscrita('depressa')).toBeCloseTo(0.606, 3);
  });

  it('primeira abertura no aparelho: o nome inteiro', () => {
    expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('completa');
  });

  it('só ler não conta: sem lembrar, a abertura seguinte ainda é a primeira', () => {
    escritaNaTela(em('2026-10-20T12:00:00Z'));
    expect(escritaNaTela(em('2026-10-20T12:01:00Z'))).toBe('completa');
  });

  it('primeira abertura de outro Dia: a do Dia; as seguintes do mesmo Dia: depressa', () => {
    lembrarDaEscrita(em('2026-10-19T12:00:00Z'));
    expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('doDia');
    lembrarDaEscrita(em('2026-10-20T12:00:00Z'));
    expect(escritaNaTela(em('2026-10-20T12:01:00Z'))).toBe('depressa');
    expect(escritaNaTela(em('2026-10-20T22:00:00Z'))).toBe('depressa');
  });

  it('um Dia guardado no futuro (o relógio andou para trás, ou a semente dos testes): parada', () => {
    lembrarDaEscrita(em('2026-10-21T12:00:00Z'));
    expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('parada');
    window.localStorage.setItem(CHAVE, '{"dia":"9999-12-31"}');
    expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('parada');
  });

  it('movimento reduzido do sistema: parada, e a primeira vez fica guardada para depois', () => {
    simularMovimento('reduzido');
    expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('parada');
    simularMovimento('normal');
    expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('completa');
  });

  it.each(['{', '"x"', 'null', '[]', '{"dia":5}', '{"dia":null}'])(
    'valor estragado (%s) vale como primeira vez',
    (bruto) => {
      window.localStorage.setItem(CHAVE, bruto);
      expect(escritaNaTela(em('2026-10-20T12:00:00Z'))).toBe('completa');
    },
  );

  describe('o cansaço dita o corte: três aberturas seguidas puladas calam a tela até o Dia seguinte', () => {
    const hoje = em('2026-10-20T12:00:00Z');

    it('cada pulo entra na conta do Dia, junto do Dia', () => {
      lembrarDaEscrita(hoje);
      registrarPulo(hoje);
      expect(guardado()).toEqual({ dia: '2026-10-20', puladas: 1 });
      registrarPulo(hoje);
      expect(guardado()).toEqual({ dia: '2026-10-20', puladas: 2 });
      expect(escritaNaTela(hoje)).toBe('depressa');
    });

    it('o terceiro pulo cala a tela cheia; o cabeçalho segue a frequência dele', () => {
      expect(PULOS_PARA_CALAR).toBe(3);
      lembrarDaEscrita(hoje);
      for (let i = 0; i < PULOS_PARA_CALAR; i++) registrarPulo(hoje);
      expect(escritaNaTela(hoje)).toBe('parada');
      expect(tomarEscrita(hoje)).toBe('parada');
      expect(escritaDaAbertura(hoje)).toBe('parada');
    });

    it('lembrar o Dia (a tela cheia que abre) não perde a conta dos pulos de hoje', () => {
      lembrarDaEscrita(hoje);
      registrarPulo(hoje);
      lembrarDaEscrita(hoje);
      expect(guardado()).toEqual({ dia: '2026-10-20', puladas: 1 });
    });

    it('ir até o fim zera a conta: pulos seguidos, não somados', () => {
      lembrarDaEscrita(hoje);
      registrarPulo(hoje);
      registrarPulo(hoje);
      registrarAberturaVista(hoje);
      expect(guardado()).toEqual({ dia: '2026-10-20' });
      registrarPulo(hoje);
      registrarPulo(hoje);
      expect(escritaNaTela(hoje)).toBe('depressa');
    });

    it('no Dia seguinte a tela volta, na abertura do Dia, e a conta recomeça', () => {
      lembrarDaEscrita(hoje);
      for (let i = 0; i < PULOS_PARA_CALAR; i++) registrarPulo(hoje);
      const amanha = em('2026-10-21T12:00:00Z');
      expect(escritaNaTela(amanha)).toBe('doDia');
      registrarPulo(amanha);
      expect(guardado()).toEqual({ dia: '2026-10-21', puladas: 1 });
    });

    it.each([
      '{"dia":"2026-10-20","puladas":-2}',
      '{"dia":"2026-10-20","puladas":"3"}',
      '{"dia":"2026-10-20","puladas":1.5}',
    ])('conta estragada (%s) vale zero', (bruto) => {
      window.localStorage.setItem(CHAVE, bruto);
      expect(escritaNaTela(hoje)).toBe('depressa');
    });
  });
});

describe('tomarEscrita (a Abertura toma a escrita, M2 do Zé)', () => {
  it('na primeira vez toma a escrita inteira e guarda o Dia', () => {
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('completa');
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('na primeira abertura de outro Dia toma a escrita do Dia e guarda o Dia novo', () => {
    lembrarDaEscrita(em('2026-10-19T12:00:00Z'));
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('doDia');
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('depois de tomada, o cabeçalho já não escreve; a tela cheia, na abertura seguinte, escreve depressa (D-D14)', () => {
    tomarEscrita(em('2026-10-20T12:00:00Z'));
    expect(escritaDaAbertura(em('2026-10-20T12:00:30Z'))).toBe('parada');
    expect(tomarEscrita(em('2026-10-20T12:00:30Z'))).toBe('depressa');
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('nas demais aberturas do Dia toma a escrita depressa e guarda o mesmo Dia', () => {
    lembrarDaEscrita(em('2026-10-20T08:00:00Z'));
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('depressa');
    expect(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('com o Dia guardado no futuro (a semente dos testes) não toma nem grava nada', () => {
    window.localStorage.setItem(CHAVE, '{"dia":"9999-12-31"}');
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('parada');
    expect(window.localStorage.getItem(CHAVE)).toBe('{"dia":"9999-12-31"}');
  });

  it('movimento reduzido do sistema: não toma nada, e a primeira vez continua guardada', () => {
    simularMovimento('reduzido');
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('parada');
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
    simularMovimento('normal');
    expect(tomarEscrita(em('2026-10-20T12:00:00Z'))).toBe('completa');
  });
});
