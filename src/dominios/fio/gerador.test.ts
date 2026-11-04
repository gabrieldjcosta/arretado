import { describe, expect, it } from 'vitest';
import { entrada, materia, norma } from './fixtures';
import { cota, escolherMateria, naRetaFinal, planejarEtapa, tamanhoDaEtapa, TETO } from './gerador';
import { estadoInicial } from './estado';
import type { EntradaDoFio, EstadoDoFio, Etapa, Passo, TipoDePasso } from './tipos';

const noNumero = (n: number, extra: Partial<EstadoDoFio> = {}): EstadoDoFio => ({
  ...estadoInicial(),
  etapasFeitas: n,
  ...extra,
});
const plano = (e: EntradaDoFio, s: EstadoDoFio = estadoInicial()): Etapa => {
  const p = planejarEtapa(e, s);
  if (!p) throw new Error('sem etapa');
  return p;
};
const tipos = (e: Etapa): TipoDePasso[] => e.passos.map((p) => p.tipo);
const lerDe = (e: Etapa) =>
  e.passos.find(
    (p): p is Extract<Passo, { tipo: 'ler'; artigos: unknown }> =>
      p.tipo === 'ler' && 'artigos' in p,
  );

/** Matéria farta: Mapa, súmulas, Ache o erro e o ponto que pesou. */
const farta = materia('penal', {
  normas: [norma('cp', 130, { mapa: [33, 14, 121, 59, 18, 20, 23, 24, 25, 26, 27, 28, 29, 30] })],
  sumulas: [
    { id: 's1', rotulo: 'Súmula 711 do STF', fixada: false },
    { id: 's2', rotulo: 'Súmula 593 do STJ', fixada: false },
  ],
  acheOErro: 5,
});

describe('tamanhos (regras 5 e 6)', () => {
  it('a etapa tem 3, 4 e depois 5 passos', () => {
    expect([0, 1, 2, 3, 20].map(tamanhoDaEtapa)).toEqual([3, 4, 5, 5, 5]);
  });

  it('a cota cresce 25% por etapa até o teto', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => cota('ler', n))).toEqual([2, 3, 3, 4, 5, 6]);
    expect(cota('ler', 40)).toBe(TETO.ler);
    expect(cota('revisar', 40)).toBe(TETO.revisar);
    expect(cota('frases', 40)).toBe(TETO.frases);
    expect([0, 10].map((n) => cota('porteira', n))).toEqual([3, 3]);
  });
});

describe('matéria da etapa (regra 2)', () => {
  it('segue o bloco seguinte do Ciclo', () => {
    expect(escolherMateria(entrada({ ciclo: { blocos: ['penal', 'eca'], indice: 1 } }))?.id).toBe(
      'eca',
    );
    // Índice além do fim dá a volta.
    expect(escolherMateria(entrada({ ciclo: { blocos: ['penal', 'eca'], indice: 3 } }))?.id).toBe(
      'eca',
    );
  });

  it('pula o bloco cuja matéria não existe mais', () => {
    const e = entrada({ ciclo: { blocos: ['sumiu', 'eca'], indice: 0 } });
    expect(escolherMateria(e)?.id).toBe('eca');
  });

  it('sem Ciclo, a última leitura; sem leitura, a prova; sem nada, a primeira matéria', () => {
    const semCiclo = entrada({ ciclo: undefined });
    expect(escolherMateria({ ...semCiclo, ultimaLeitura: 'eca' })?.id).toBe('eca');
    expect(escolherMateria({ ...semCiclo, prova: ['nao-ha', 'eca'] })?.id).toBe('eca');
    expect(escolherMateria(semCiclo)?.id).toBe('penal');
    expect(escolherMateria({ ...semCiclo, materias: [] })).toBeUndefined();
    expect(planejarEtapa({ ...semCiclo, materias: [] }, estadoInicial())).toBeUndefined();
  });

  it('todos os passos são da matéria da etapa', () => {
    const e = plano(entrada({ vencidos: 3, tarefas: [{ id: 't', titulo: 'Aula' }] }), noNumero(4));
    expect(e.materiaId).toBe('penal');
    expect(e.passos.every((p) => p.materiaId === 'penal')).toBe(true);
  });
});

describe('o artigo (regra 3)', () => {
  it('vem do Mapa, o que mais cai primeiro', () => {
    const e = plano(entrada({ materias: [farta] }), noNumero(3));
    expect(lerDe(e)?.artigos.map((a) => a.rotulo)).toEqual([
      'Art. 33',
      'Art. 14',
      'Art. 121',
      'Art. 59',
    ]);
    expect(lerDe(e)?.porque).toBe('mapa');
  });

  it('sem Mapa, na ordem do código, pulando o já lido', () => {
    const m = materia('penal', { normas: [norma('cp', 10, { lidos: [1, 2] })] });
    const e = plano(entrada({ materias: [m] }));
    expect(lerDe(e)?.artigos.map((a) => a.rotulo)).toEqual(['Art. 3', 'Art. 4']);
    expect(lerDe(e)?.porque).toBe('codigo');
  });

  it('sem norma, o Ler vira "Adicionar a lei desta matéria"', () => {
    const m = materia('penal', { normas: [] });
    const e = plano(entrada({ materias: [m] }));
    expect(e.passos[0]).toEqual({ tipo: 'ler', materiaId: 'penal', adicionarNorma: true });
  });

  it('um Ler fica numa norma só; esgotada a primeira, vai à próxima (regra 6)', () => {
    const m = materia('penal', {
      normas: [norma('cp', 3, { mapa: [1, 2], lidos: [1] }), norma('lcp', 5, { mapa: [4, 5] })],
    });
    const primeira = plano(entrada({ materias: [m] }), noNumero(5));
    expect(lerDe(primeira)?.normaId).toBe('cp');
    expect(lerDe(primeira)?.artigos.map((a) => a.rotulo)).toEqual(['Art. 2']);
    const m2 = { ...m, normas: [norma('cp', 3, { mapa: [1, 2], lidos: [1, 2] }), m.normas[1]!] };
    expect(lerDe(plano(entrada({ materias: [m2] }), noNumero(5)))?.normaId).toBe('lcp');
  });

  it('esgotado o Mapa, o alcance cresce: súmulas, depois o resto da norma', () => {
    const lidoTudo = norma('cp', 6, { mapa: [1, 2], lidos: [1, 2] });
    const comSumula = materia('penal', {
      normas: [lidoTudo],
      sumulas: [{ id: 's', rotulo: 'Súmula 711 do STF', fixada: false }],
    });
    const a = plano(entrada({ materias: [comSumula] }), noNumero(0, { porteirasDoFim: ['penal'] }));
    expect(a.passos[0]?.tipo).toBe('fixar_sumula');
    const semSumula = materia('penal', { normas: [lidoTudo] });
    const b = plano(entrada({ materias: [semSumula] }), noNumero(0, { porteirasDoFim: ['penal'] }));
    expect(lerDe(b)?.artigos.map((x) => x.rotulo)).toEqual(['Art. 3', 'Art. 4']);
    expect(lerDe(b)?.porque).toBe('codigo');
  });
});

describe('Ler puxa Lembrar (regra 4)', () => {
  it('o Lembrar vem logo depois do Ler, só com os artigos que têm grifo', () => {
    const m = materia('penal', { normas: [norma('cp', 10, { semGrifo: [2] })] });
    const e = plano(entrada({ materias: [m] }), noNumero(3));
    const i = e.passos.findIndex((p) => p.tipo === 'ler');
    const lembrar = e.passos[i + 1];
    expect(lembrar?.tipo).toBe('lembrar');
    if (lembrar?.tipo !== 'lembrar') return;
    expect(lembrar.artigos.map((a) => a.rotulo)).toEqual(['Art. 1', 'Art. 3', 'Art. 4']);
  });

  it('artigo sem grifo não gera Lembrar', () => {
    const m = materia('penal', { normas: [norma('cp', 10, { semGrifo: [1, 2] })] });
    const e = plano(entrada({ materias: [m], vencidos: 2 }));
    // Sem lugar para outra leitura com o Lembrar dela, a etapa fica com dois passos.
    expect(tipos(e)).toEqual(['ler', 'revisar']);
    expect(e.passos.find((p) => p.tipo === 'lembrar')).toBeUndefined();
  });

  it('o plano nunca traz Guardar: ele nasce de um erro no Lembrar', () => {
    for (let n = 0; n < 12; n++) {
      expect(tipos(plano(entrada({ materias: [farta], vencidos: n }), noNumero(n)))).not.toContain(
        'guardar',
      );
    }
  });
});

describe('Revisar (regra 1)', () => {
  it('com 8 ou mais vencidos, a etapa abre com Revisar', () => {
    const e = plano(entrada({ vencidos: 8 }));
    expect(tipos(e)).toEqual(['revisar', 'ler', 'lembrar']);
    expect(e.passos[0]).toMatchObject({ quantidade: 4 });
  });

  it('com menos, Revisar entra no meio', () => {
    expect(tipos(plano(entrada({ vencidos: 3 }), noNumero(1)))).toEqual([
      'ler',
      'lembrar',
      'revisar',
    ]);
  });

  it('revisa só o que venceu, até a cota', () => {
    const e = plano(entrada({ vencidos: 2 }), noNumero(10));
    expect(e.passos.find((p) => p.tipo === 'revisar')).toMatchObject({ quantidade: 2 });
    const f = plano(entrada({ vencidos: 50 }), noNumero(40));
    expect(f.passos[0]).toMatchObject({ tipo: 'revisar', quantidade: TETO.revisar });
  });

  it('sem vencido, não há Revisar', () => {
    for (let n = 0; n < 8; n++) {
      expect(tipos(plano(entrada(), noNumero(n)))).not.toContain('revisar');
    }
  });
});

describe('forma da etapa (regra 5)', () => {
  it('com material de sobra, cada etapa tem o tamanho certo', () => {
    for (let n = 0; n < 8; n++) {
      const e = plano(
        entrada({ materias: [farta], vencidos: 5, tarefas: [{ id: 't', titulo: 'Aula' }] }),
        noNumero(n),
      );
      expect(e.passos).toHaveLength(tamanhoDaEtapa(n));
    }
  });

  it('o último passo só é Ler quando nada cabe depois da leitura sem grifo', () => {
    const variantes: EntradaDoFio[] = [];
    for (const vencidos of [0, 3, 9]) {
      for (const semGrifo of [[], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]) {
        for (const sumulas of [[], [{ id: 's', rotulo: 'Súmula 1', fixada: false }]]) {
          const m = materia('penal', { normas: [norma('cp', 30, { semGrifo })], sumulas });
          variantes.push(entrada({ materias: [m], vencidos }));
        }
      }
    }
    for (const v of variantes) {
      for (let n = 0; n < 10; n++) {
        const e = plano(v, noNumero(n));
        // Só termina em Ler a leitura principal sem grifo, sem nada que caiba depois dela.
        if (e.passos.at(-1)?.tipo === 'ler') {
          expect(e.passos.filter((p) => p.tipo === 'ler')).toHaveLength(1);
          expect(e.passos.some((p) => p.tipo === 'lembrar')).toBe(false);
        }
        expect(e.passos.length).toBeLessThanOrEqual(tamanhoDaEtapa(n));
        expect(e.passos.length).toBeGreaterThan(0);
      }
    }
  });

  it('matéria só com leitura sem grifo: a etapa é o Ler, o único caso que termina nele', () => {
    const m = materia('penal', { normas: [norma('cp', 1, { semGrifo: [1] })] });
    expect(tipos(plano(entrada({ materias: [m] })))).toEqual(['ler']);
  });

  it('os fechamentos começam vazios, um por passo', () => {
    const e = plano(entrada({ materias: [farta] }), noNumero(4));
    expect(e.fechados).toEqual(e.passos.map(() => undefined));
  });
});

describe('a porteira (regra 7)', () => {
  const comMapa = (lidos: number[]) =>
    materia('penal', { normas: [norma('cp', 10, { mapa: [1, 2, 3, 4], lidos })] });
  const porteira = (e: Etapa) =>
    e.passos.find((p) => p.tipo === 'praticar' && p.modo === 'porteira');

  it('fecha a etapa que chega ao fim do Mapa', () => {
    const e = plano(entrada({ materias: [comMapa([1, 2])] }), noNumero(1));
    expect(tipos(e)).toEqual(['ler', 'lembrar', 'praticar']);
    expect(e.passos.at(-1)).toMatchObject({
      modo: 'porteira',
      porque: 'fim_do_mapa',
      quantidade: 3,
    });
    expect(e.porteiraDoFim).toBe(true);
  });

  it('não volta depois de passada', () => {
    const e = plano(
      entrada({ materias: [comMapa([1, 2, 3, 4])] }),
      noNumero(1, { porteirasDoFim: ['penal'] }),
    );
    expect(porteira(e)).toBeUndefined();
    expect(e.porteiraDoFim).toBeUndefined();
  });

  it('aparece a cada 4 etapas da mesma matéria', () => {
    const m = materia('penal', { normas: [norma('cp', 60, { lidos: [1] })] });
    const vez = (feitas: number) =>
      porteira(
        plano(entrada({ materias: [m] }), noNumero(9, { etapasPorMateria: { penal: feitas } })),
      );
    expect([0, 1, 2, 3, 4, 6, 7].map((k) => vez(k) !== undefined)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(vez(3)).toMatchObject({ porque: 'quarta_etapa' });
  });

  it('não aparece fora dessas horas, nem como complemento', () => {
    for (let n = 0; n < 10; n++) {
      const e = plano(entrada({ materias: [farta], vencidos: 3 }), noNumero(n));
      expect(porteira(e)).toBeUndefined();
    }
  });

  it('sem grifo lido, não há porteira', () => {
    const m = materia('penal', { normas: [norma('cp', 4, { mapa: [1], semGrifo: [1, 2, 3, 4] })] });
    expect(porteira(plano(entrada({ materias: [m] }), noNumero(1)))).toBeUndefined();
  });
});

describe('Seu passo e o ponto que pesou (regra 8)', () => {
  it('a tarefa é o quarto passo das etapas de cinco', () => {
    const e = plano(
      entrada({ tarefas: [{ id: 't1', titulo: 'Ver a aula de Prisões' }], vencidos: 3 }),
      noNumero(2),
    );
    expect(e.passos[3]).toEqual({
      tipo: 'seu_passo',
      materiaId: 'penal',
      tarefaId: 't1',
      titulo: 'Ver a aula de Prisões',
    });
    expect(
      tipos(plano(entrada({ tarefas: [{ id: 't1', titulo: 'x' }] }), noNumero(1))),
    ).not.toContain('seu_passo');
  });

  it('sem tarefa, o ponto que pesou vira uma leitura curta, com o Lembrar dela', () => {
    const m = {
      ...farta,
      pesou: {
        rotulo: 'Prisão em flagrante',
        erros: 3,
        normaId: 'cp',
        artigo: { endereco: 'art-302', rotulo: 'Art. 302', grifos: 3, lido: true },
      },
    };
    const e = plano(entrada({ materias: [m], vencidos: 3 }), noNumero(2));
    expect(tipos(e)).toEqual(['ler', 'lembrar', 'revisar', 'ler', 'lembrar']);
    expect(e.passos[3]).toMatchObject({ porque: 'pesou', artigos: [{ rotulo: 'Art. 302' }] });
  });

  it('com a porteira devida, o ponto que pesou cede o lugar', () => {
    const m = {
      ...materia('penal', { normas: [norma('cp', 60, { lidos: [1] })] }),
      pesou: {
        rotulo: 'x',
        erros: 2,
        normaId: 'penal-lei',
        artigo: { endereco: 'art-9', rotulo: 'Art. 9', grifos: 1, lido: false },
      },
    };
    const e = plano(
      entrada({ materias: [m], vencidos: 3 }),
      noNumero(2, { etapasPorMateria: { penal: 3 } }),
    );
    expect(
      e.passos.filter((p) => p.tipo === 'ler' && 'porque' in p && p.porque === 'pesou'),
    ).toEqual([]);
    expect(e.passos.at(-1)).toMatchObject({ tipo: 'praticar', modo: 'porteira' });
  });
});

describe('reta final (regra 9)', () => {
  const comProva = (dataDaProva: string) =>
    entrada({ materias: [farta], vencidos: 3, dataDaProva });

  it('vale nos últimos 30 dias, com o dia da prova', () => {
    expect(naRetaFinal({ hoje: '2026-11-04', dataDaProva: '2026-12-04' })).toBe(true);
    expect(naRetaFinal({ hoje: '2026-11-04', dataDaProva: '2026-12-05' })).toBe(false);
    expect(naRetaFinal({ hoje: '2026-11-04', dataDaProva: '2026-11-04' })).toBe(true);
    expect(naRetaFinal({ hoje: '2026-11-04', dataDaProva: '2026-11-03' })).toBe(false);
    expect(naRetaFinal({ hoje: '2026-11-04', dataDaProva: 'lixo' })).toBe(false);
    expect(naRetaFinal({ hoje: '2026-11-04' })).toBe(false);
  });

  it('metade das etapas troca o Ler por Revisar e Praticar', () => {
    const perto = comProva('2026-11-20');
    const impar = plano(perto, noNumero(3));
    expect(tipos(impar)).not.toContain('ler');
    expect(tipos(impar).slice(0, 2)).toEqual(['revisar', 'praticar']);
    expect(impar.passos[1]).toMatchObject({ porque: 'reta_final' });
    expect(tipos(plano(perto, noNumero(4)))).toContain('ler');
  });

  it('longe da prova, nada muda', () => {
    expect(plano(comProva('2027-06-01'), noNumero(3))).toEqual(
      plano(entrada({ materias: [farta], vencidos: 3 }), noNumero(3)),
    );
  });
});

describe('determinismo', () => {
  it('a mesma entrada e o mesmo estado dão sempre a mesma etapa', () => {
    const e = entrada({ materias: [farta], vencidos: 9, tarefas: [{ id: 't', titulo: 'Aula' }] });
    for (let n = 0; n < 6; n++) expect(plano(e, noNumero(n))).toEqual(plano(e, noNumero(n)));
  });

  it('entrada estranha não quebra: vencidos negativos ou fracionados', () => {
    expect(tipos(plano(entrada({ vencidos: -4 })))).toEqual(['ler', 'lembrar']);
    expect(plano(entrada({ vencidos: 8.7 })).passos[0]).toMatchObject({
      tipo: 'revisar',
      quantidade: 4,
    });
    expect(tipos(plano(entrada({ vencidos: Number.NaN })))).toEqual(['ler', 'lembrar']);
  });
});
