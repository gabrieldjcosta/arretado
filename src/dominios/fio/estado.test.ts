import { describe, expect, it } from 'vitest';
import { entrada, marcarLidos, materia, norma } from './fixtures';
import {
  abrirPasso,
  concluirPasso,
  estadoInicial,
  lerEstadoDoFio,
  POUSOS_GUARDADOS,
  pousar,
  pularPasso,
  puxar,
  type ProximoDoFio,
} from './estado';
import { planejarEtapa, tamanhoDaEtapa } from './gerador';
import type { EntradaDoFio, EstadoDoFio, Passo, ResultadoDoPasso } from './tipos';

type ProximoPasso = Extract<ProximoDoFio, { tipo: 'passo' }>;
const passoDe = (r: { proximo: ProximoDoFio }): ProximoPasso => {
  if (r.proximo.tipo !== 'passo') throw new Error(`esperava passo, veio ${r.proximo.tipo}`);
  return r.proximo;
};

/** O que a pessoa faria em cada passo: lê tudo, erra o primeiro grifo, guarda, revisa, acerta. */
function fazer(p: Passo): ResultadoDoPasso {
  switch (p.tipo) {
    case 'ler':
      return { tipo: 'ler', lidos: 'artigos' in p ? p.artigos.length : 0 };
    case 'lembrar':
      return {
        tipo: 'lembrar',
        acertos: p.artigos.length - 1,
        erros: p.artigos.slice(0, 1).map((a) => a.endereco),
      };
    case 'guardar':
      return { tipo: 'guardar', guardadas: p.enderecos.length };
    case 'revisar':
      return { tipo: 'revisar', revisados: p.quantidade, voltamAmanha: 1 };
    case 'fixar_sumula':
      return { tipo: 'fixar_sumula' };
    case 'praticar':
      return { tipo: 'praticar', acertos: p.quantidade, total: p.quantidade };
    case 'ache_a_diferenca':
      return { tipo: 'ache_a_diferenca', achadas: 1, total: 1 };
    case 'seu_passo':
      return { tipo: 'seu_passo', questoes: 10 };
  }
}

describe('puxar', () => {
  it('sem etapa, planeja uma e devolve o primeiro passo', () => {
    const r = puxar(estadoInicial(), entrada({ vencidos: 3 }));
    const p = passoDe(r);
    expect(p).toMatchObject({ indice: 0, posicao: 1, de: 3, retomar: false });
    expect(p.passo.tipo).toBe('ler');
    expect(r.estado.etapa?.passos).toHaveLength(3);
  });

  it('sem matéria nenhuma, avisa a tela', () => {
    const r = puxar(estadoInicial(), entrada({ materias: [], ciclo: undefined }));
    expect(r.proximo).toEqual({ tipo: 'sem_materia' });
    expect(r.estado).toEqual(estadoInicial());
  });

  it('puxar de novo sem fazer nada dá o mesmo passo (sair e voltar não muda o que vem)', () => {
    const e = entrada({ vencidos: 3 });
    const a = puxar(estadoInicial(), e);
    const b = puxar(a.estado, e);
    expect(b.proximo).toEqual(a.proximo);
    expect(b.estado).toEqual(a.estado);
  });

  it('o plano congela: mudar vencidos ou tarefas no meio da etapa não reembaralha', () => {
    const a = puxar(estadoInicial(), entrada({ vencidos: 0 }));
    const depois = puxar(a.estado, entrada({ vencidos: 30, tarefas: [{ id: 't', titulo: 'x' }] }));
    expect(depois.estado.etapa).toEqual(a.estado.etapa);
  });

  it('o Ler cuja leitura já foi feita fora do Fio nasce "Já feito"', () => {
    const e = entrada();
    const a = puxar(estadoInicial(), e);
    const ler = passoDe(a).passo;
    if (ler.tipo !== 'ler' || !('artigos' in ler)) throw new Error('esperava Ler');
    const lido = marcarLidos(
      e,
      ler.normaId,
      ler.artigos.map((x) => x.endereco),
    );
    const b = puxar(a.estado, lido);
    expect(passoDe(b).passo.tipo).toBe('lembrar');
    expect(b.estado.etapa?.fechados[0]).toEqual({ como: 'ja_feito' });
    expect(b.estado.passosDados).toBe(1);
  });

  it('com tudo fechado, devolve o pouso com os fatos', () => {
    const e = entrada();
    let s = puxar(estadoInicial(), e).estado;
    for (let i = 0; i < 5; i++) {
      const r = puxar(s, e);
      if (r.proximo.tipo !== 'passo') break;
      s = concluirPasso(r.estado, fazer(r.proximo.passo));
    }
    const fim = puxar(s, e);
    expect(fim.proximo.tipo).toBe('pouso');
    if (fim.proximo.tipo !== 'pouso') return;
    expect(fim.proximo.pouso.fatos).toEqual([
      'Leu os arts. 1 e 2 (PENAL-LEI)',
      'Lembrou 1 de 2',
      'Guardou 1 Frase',
    ]);
  });
});

describe('abrir e parar (regra 10)', () => {
  it('parar salva o passo aberto; o próximo puxão o retoma', () => {
    const e = entrada();
    const a = puxar(estadoInicial(), e);
    const aberto = abrirPasso(a.estado);
    const b = puxar(aberto, e);
    expect(passoDe(b)).toMatchObject({ indice: 0, retomar: true });
    expect(abrirPasso(aberto)).toBe(aberto);
  });

  it('concluir tira a marca de aberto', () => {
    const e = entrada();
    const a = abrirPasso(puxar(estadoInicial(), e).estado);
    const b = concluirPasso(a, { tipo: 'ler', lidos: 2 });
    expect(b.etapa?.aberto).toBeUndefined();
    expect(passoDe(puxar(b, e)).retomar).toBe(false);
  });

  it('sem etapa, abrir, concluir e pular não fazem nada', () => {
    const s = estadoInicial();
    expect(abrirPasso(s)).toBe(s);
    expect(concluirPasso(s, { tipo: 'ler', lidos: 1 })).toBe(s);
    expect(pularPasso(s)).toBe(s);
  });
});

describe('concluir e o Guardar (regra 4)', () => {
  const comLembrar = () => {
    const e = entrada({ vencidos: 3 });
    const s = concluirPasso(puxar(estadoInicial(), e).estado, { tipo: 'ler', lidos: 2 });
    return { e, s };
  };

  it('Lembrar com erro puxa Guardar logo depois, com os artigos errados', () => {
    const { e, s } = comLembrar();
    const depois = concluirPasso(s, { tipo: 'lembrar', acertos: 1, erros: ['art-2'] });
    const p = passoDe(puxar(depois, e));
    expect(p.passo).toEqual({
      tipo: 'guardar',
      materiaId: 'penal',
      normaId: 'penal-lei',
      enderecos: ['art-2'],
    });
    // O Guardar divide o ponto do Lembrar: a fileira continua com 3.
    expect(p).toMatchObject({ indice: 2, posicao: 2, de: 3 });
  });

  it('sem erro, não há Guardar', () => {
    const { e, s } = comLembrar();
    const depois = concluirPasso(s, { tipo: 'lembrar', acertos: 2, erros: [] });
    expect(depois.etapa?.passos.map((p) => p.tipo)).not.toContain('guardar');
    expect(passoDe(puxar(depois, e)).passo.tipo).not.toBe('guardar');
  });

  it('erros fora do Lembrar e repetidos são ignorados', () => {
    const { s } = comLembrar();
    const depois = concluirPasso(s, {
      tipo: 'lembrar',
      acertos: 0,
      erros: ['art-1', 'art-1', 'art-99'],
    });
    expect(depois.etapa?.passos[2]).toMatchObject({ tipo: 'guardar', enderecos: ['art-1'] });
    const nada = concluirPasso(s, { tipo: 'lembrar', acertos: 0, erros: ['art-99'] });
    expect(nada.etapa?.passos.map((p) => p.tipo)).not.toContain('guardar');
  });

  it('a Frase que o próprio Lembrar já guardou não puxa o Guardar', () => {
    const { s } = comLembrar();
    const tudo = concluirPasso(s, {
      tipo: 'lembrar',
      acertos: 0,
      erros: ['art-1', 'art-2'],
      guardados: ['art-1', 'art-2'],
    });
    expect(tudo.etapa?.passos.map((p) => p.tipo)).not.toContain('guardar');
    const metade = concluirPasso(s, {
      tipo: 'lembrar',
      acertos: 0,
      erros: ['art-1', 'art-2'],
      guardados: ['art-1'],
    });
    expect(metade.etapa?.passos[2]).toMatchObject({ tipo: 'guardar', enderecos: ['art-2'] });
  });

  it('um resultado de outro tipo é ignorado', () => {
    const { s } = comLembrar();
    expect(concluirPasso(s, { tipo: 'revisar', revisados: 3, voltamAmanha: 0 })).toBe(s);
  });
});

describe('pular (regra 10)', () => {
  it('pular não custa nada e não volta na mesma etapa', () => {
    const e = entrada({ vencidos: 3 });
    const a = puxar(estadoInicial(), e);
    const s = pularPasso(a.estado);
    expect(s.etapa?.fechados.slice(0, 2)).toEqual([{ como: 'pulado' }, { como: 'pulado' }]);
    expect(passoDe(puxar(s, e)).passo.tipo).toBe('revisar');
    expect(s.passosDados).toBe(2);
  });

  it('pular o Lembrar não leva mais nada', () => {
    const e = entrada({ vencidos: 3 });
    const s = concluirPasso(puxar(estadoInicial(), e).estado, { tipo: 'ler', lidos: 2 });
    const t = pularPasso(s);
    expect(t.etapa?.fechados).toEqual([
      { como: 'feito', resultado: { tipo: 'ler', lidos: 2 } },
      { como: 'pulado' },
      undefined,
    ]);
  });
});

describe('pousar', () => {
  const etapaToda = (s0: EstadoDoFio, e: EntradaDoFio, como: 'fazer' | 'pular' = 'fazer') => {
    let s = s0;
    for (let i = 0; i < 12; i++) {
      const r = puxar(s, e);
      if (r.proximo.tipo !== 'passo') return r.estado;
      s = como === 'pular' ? pularPasso(r.estado) : concluirPasso(r.estado, fazer(r.proximo.passo));
    }
    throw new Error('etapa sem fim');
  };

  it('com passo pendente, nada muda', () => {
    const s = puxar(estadoInicial(), entrada()).estado;
    expect(pousar(s)).toEqual({ estado: s });
  });

  it('fecha a etapa, conta na matéria e guarda o pouso', () => {
    const s = etapaToda(estadoInicial(), entrada());
    const r = pousar(s);
    expect(r.pouso).toMatchObject({ etapa: 0, materia: 'Matéria penal', materiaId: 'penal' });
    expect(r.estado).toMatchObject({
      etapasFeitas: 1,
      etapasPorMateria: { penal: 1 },
      passosDados: 3,
    });
    expect(r.estado.etapa).toBeUndefined();
    expect(r.estado.pousos[0]).toEqual(r.pouso);
  });

  it('pulando tudo, o pouso não tem fatos (sem cobrança)', () => {
    const r = pousar(etapaToda(estadoInicial(), entrada(), 'pular'));
    expect(r.pouso?.fatos).toEqual([]);
    expect(r.estado.etapasFeitas).toBe(1);
  });

  it(`guarda só os últimos ${String(POUSOS_GUARDADOS)} pousos`, () => {
    let s = estadoInicial();
    const e = entrada({ materias: [materia('penal', { normas: [norma('cp', 200)] })] });
    for (let k = 0; k < POUSOS_GUARDADOS + 3; k++) s = pousar(etapaToda(s, e)).estado;
    expect(s.pousos).toHaveLength(POUSOS_GUARDADOS);
    expect(s.pousos[0]?.etapa).toBe(POUSOS_GUARDADOS + 2);
  });

  it('a porteira do fim conta só se foi feita; pulada, volta na próxima etapa da matéria', () => {
    const m = materia('penal', { normas: [norma('cp', 6, { mapa: [1, 2], lidos: [] })] });
    const e = entrada({ materias: [m], ciclo: undefined });
    const plano = planejarEtapa(e, estadoInicial());
    expect(plano?.porteiraDoFim).toBe(true);

    // Pula a porteira (o último passo), faz o resto.
    let s = puxar(estadoInicial(), e).estado;
    for (;;) {
      const r = puxar(s, e);
      if (r.proximo.tipo !== 'passo') break;
      s =
        r.proximo.passo.tipo === 'praticar'
          ? pularPasso(r.estado)
          : concluirPasso(r.estado, fazer(r.proximo.passo));
    }
    const pulou = pousar(s).estado;
    expect(pulou.porteirasDoFim).toEqual([]);

    const lido = marcarLidos(e, 'cp', ['art-1', 'art-2']);
    const outra = planejarEtapa(lido, pulou);
    expect(outra?.passos.at(-1)).toMatchObject({
      tipo: 'praticar',
      modo: 'porteira',
      porque: 'fim_do_mapa',
    });

    const feita = pousar(etapaToda(pulou, lido)).estado;
    expect(feita.porteirasDoFim).toEqual(['penal']);
  });
});

describe('o Fio de ponta a ponta', () => {
  it('30 etapas seguidas respeitam tamanho, matéria do Ciclo e o fim nunca em Ler', () => {
    let e = entrada({
      materias: [
        materia('penal', {
          normas: [norma('cp', 120, { mapa: [33, 14, 59, 18, 20, 23, 24, 25, 26, 27, 28, 29] })],
          sumulas: [{ id: 's1', rotulo: 'Súmula 711 do STF', fixada: false }],
          acheOErro: 4,
        }),
        materia('eca', { normas: [norma('eca', 80, { semGrifo: [3, 4] })] }),
        materia('const', { normas: [] }),
      ],
      ciclo: { blocos: ['penal', 'eca', 'const'], indice: 0 },
      vencidos: 9,
      tarefas: [{ id: 't', titulo: 'Aula de prisões' }],
    });
    let s = estadoInicial();
    for (let k = 0; k < 30; k++) {
      const etapa = puxar(s, e).estado.etapa;
      expect(etapa?.materiaId).toBe(['penal', 'eca', 'const'][k % 3]);
      const planejados = etapa?.passos.length ?? 0;
      expect(planejados).toBeLessThanOrEqual(tamanhoDaEtapa(k));
      const fimEmLer = etapa?.passos.at(-1)?.tipo === 'ler';
      if (fimEmLer) expect(etapa.passos.some((p) => p.tipo === 'lembrar')).toBe(false);

      s = puxar(s, e).estado;
      for (;;) {
        const r = puxar(s, e);
        if (r.proximo.tipo !== 'passo') break;
        const p = r.proximo.passo;
        if (p.tipo === 'ler' && 'artigos' in p) {
          e = marcarLidos(
            e,
            p.normaId,
            p.artigos.map((a) => a.endereco),
          );
        }
        s = concluirPasso(r.estado, fazer(p));
      }
      s = pousar(s).estado;
      e = {
        ...e,
        ciclo: { blocos: ['penal', 'eca', 'const'], indice: k + 1 },
        vencidos: k % 2 ? 9 : 2,
      };
      // O estado sobrevive a JSON a cada pouso, como no aparelho.
      expect(lerEstadoDoFio(JSON.parse(JSON.stringify(s)))).toEqual(s);
    }
    expect(s.etapasFeitas).toBe(30);
    expect(s.etapasPorMateria).toEqual({ penal: 10, eca: 10, const: 10 });
  });
});

describe('lerEstadoDoFio', () => {
  it('lixo vira o estado inicial', () => {
    for (const lixo of [null, undefined, 3, 'x', [], {}, { versao: 2 }]) {
      expect(lerEstadoDoFio(lixo)).toEqual(estadoInicial());
    }
  });

  it('volta igual depois de JSON, no meio da etapa', () => {
    const e = entrada({ vencidos: 9 });
    let s = abrirPasso(puxar(estadoInicial(), e).estado);
    s = concluirPasso(s, { tipo: 'revisar', revisados: 4, voltamAmanha: 1 });
    expect(lerEstadoDoFio(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('etapa estragada some e os contadores ficam', () => {
    const lido = lerEstadoDoFio({
      versao: 1,
      etapasFeitas: 4,
      passosDados: 17,
      etapasPorMateria: { penal: 3, eca: -1, ruim: 'x' },
      porteirasDoFim: ['penal'],
      pousos: [{ etapa: 3, materia: 'Penal', fatos: ['Leu o art. 1 (CP)'] }, { etapa: 'x' }],
      etapa: {
        numero: 4,
        materiaId: 'penal',
        materia: 'Penal',
        passos: [{ tipo: 'voar', materiaId: 'penal' }],
        fechados: [],
      },
    });
    expect(lido).toEqual({
      versao: 1,
      etapasFeitas: 4,
      passosDados: 17,
      etapasPorMateria: { penal: 3 },
      porteirasDoFim: ['penal'],
      pousos: [{ etapa: 3, materia: 'Penal', fatos: ['Leu o art. 1 (CP)'] }],
    });
  });

  it('o pouso guarda a matéria pelo id; pousos antigos, sem ele, seguem valendo, e id estragado some', () => {
    const lido = lerEstadoDoFio({
      versao: 1,
      etapasFeitas: 3,
      passosDados: 0,
      etapasPorMateria: {},
      porteirasDoFim: [],
      pousos: [
        { etapa: 2, materia: 'Penal', materiaId: 'penal', fatos: [] },
        { etapa: 1, materia: 'Civil', fatos: [] },
        { etapa: 0, materia: 'Eca', materiaId: 7, fatos: [] },
      ],
    });
    expect(lido.pousos).toEqual([
      { etapa: 2, materia: 'Penal', materiaId: 'penal', fatos: [] },
      { etapa: 1, materia: 'Civil', fatos: [] },
      { etapa: 0, materia: 'Eca', fatos: [] },
    ]);
  });

  it('recusa fechamento que não bate com o passo e aberto fora do lugar', () => {
    const base = {
      versao: 1,
      etapasFeitas: 0,
      passosDados: 0,
      etapasPorMateria: {},
      porteirasDoFim: [],
      pousos: [],
    };
    const passos = [{ tipo: 'revisar', materiaId: 'penal', quantidade: 4 }];
    expect(
      lerEstadoDoFio({
        ...base,
        etapa: {
          numero: 0,
          materiaId: 'penal',
          materia: 'P',
          passos,
          fechados: [{ como: 'feito', resultado: { tipo: 'ler' } }],
        },
      }).etapa,
    ).toBeUndefined();
    expect(
      lerEstadoDoFio({
        ...base,
        etapa: { numero: 0, materiaId: 'penal', materia: 'P', passos, fechados: [null], aberto: 7 },
      }).etapa,
    ).toEqual({ numero: 0, materiaId: 'penal', materia: 'P', passos, fechados: [undefined] });
  });
});
