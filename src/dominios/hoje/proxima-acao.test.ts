import { COMECOS, decidirProximaAcao } from './proxima-acao';

const leitura = { normaId: 'n1', tituloCurto: 'LEP', onde: 'Art. 41', minutos: 5 };

describe('decidirProximaAcao (A1)', () => {
  it('sem nada: vazio com os três começos', () => {
    expect(decidirProximaAcao({ cartoesVencidos: 0, frasesVencidas: 0 })).toEqual({
      tipo: 'vazio',
      comecos: COMECOS,
    });
    expect(COMECOS.map((c) => c.id)).toEqual([
      'adicionar_material',
      'escolher_materia',
      'sessao_curta',
    ]);
  });

  it('revisão vencida vem antes da leitura salva', () => {
    expect(decidirProximaAcao({ cartoesVencidos: 2, frasesVencidas: 0, leitura })).toEqual({
      tipo: 'acao',
      acao: {
        tipo: 'revisao_vencida',
        alvo: { tipo: 'revisao', rotulo: 'Revisar cartões' },
        razao: '2 cartões vencidos',
        estimativaMin: 1,
      },
    });
  });

  it('só Frases: a rodada é de Frases; singular e plural', () => {
    const r = decidirProximaAcao({ cartoesVencidos: 0, frasesVencidas: 1 });
    expect(r).toMatchObject({
      acao: { alvo: { rotulo: 'Revisar frases' }, razao: '1 frase para rever' },
    });
    const dois = decidirProximaAcao({ cartoesVencidos: 1, frasesVencidas: 3 });
    expect(dois).toMatchObject({ acao: { razao: '1 cartão vencido e 3 frases para rever' } });
  });

  it('estimativa: 30 s por item, no máximo 40 itens', () => {
    const r = decidirProximaAcao({ cartoesVencidos: 100, frasesVencidas: 0 });
    expect(r).toMatchObject({ acao: { estimativaMin: 20 } });
  });

  it('leitura salva diz onde parou e quanto falta; sem posição, só a norma', () => {
    expect(decidirProximaAcao({ cartoesVencidos: 0, frasesVencidas: 0, leitura })).toEqual({
      tipo: 'acao',
      acao: {
        tipo: 'leitura_salva',
        alvo: { tipo: 'leitura', id: 'n1', rotulo: 'LEP' },
        razao: 'Você parou no Art. 41 da LEP',
        estimativaMin: 5,
      },
    });
    const sem = decidirProximaAcao({
      cartoesVencidos: 0,
      frasesVencidas: 0,
      leitura: { normaId: 'n1', tituloCurto: 'LEP' },
    });
    expect(sem).toMatchObject({ acao: { razao: 'Você estava lendo a LEP' } });
    expect(sem.tipo === 'acao' && sem.acao.estimativaMin).toBeUndefined();
  });

  it('"Escolher outra coisa": dispensar passa ao seguinte e, no fim, ao vazio', () => {
    const entrada = { cartoesVencidos: 1, frasesVencidas: 0, leitura };
    expect(decidirProximaAcao(entrada, ['revisao_vencida'])).toMatchObject({
      acao: { tipo: 'leitura_salva' },
    });
    expect(decidirProximaAcao(entrada, ['revisao_vencida', 'leitura_salva']).tipo).toBe('vazio');
  });

  it('a primeira tarefa da fila vem depois da revisão vencida e antes da leitura salva', () => {
    const tarefa = { id: 't1', titulo: 'Ler arts. 10 a 13', estimativaMin: 15 };
    expect(decidirProximaAcao({ cartoesVencidos: 0, frasesVencidas: 0, tarefa, leitura })).toEqual({
      tipo: 'acao',
      acao: {
        tipo: 'tarefa',
        alvo: { tipo: 'tarefa', id: 't1', rotulo: 'Ler arts. 10 a 13' },
        razao: 'A próxima da sua fila de tarefas',
        estimativaMin: 15,
      },
    });
    const comRevisao = decidirProximaAcao({ cartoesVencidos: 1, frasesVencidas: 0, tarefa });
    expect(comRevisao).toMatchObject({ acao: { tipo: 'revisao_vencida' } });
    const semTarefa = decidirProximaAcao(
      { cartoesVencidos: 0, frasesVencidas: 0, tarefa, leitura },
      ['tarefa'],
    );
    expect(semTarefa).toMatchObject({ acao: { tipo: 'leitura_salva' } });
  });
});

describe('bloco do ciclo na Próxima ação', () => {
  const ciclo = { id: 'c1', disciplina: 'Penal', blocoOrdem: 2, total: 8, volta: 3, minutos: 40 };
  it('vem depois da revisão vencida e antes da tarefa e da leitura salva', () => {
    const base = { cartoesVencidos: 0, frasesVencidas: 0, ciclo, leitura };
    const r = decidirProximaAcao(base);
    expect(r).toMatchObject({
      tipo: 'acao',
      acao: {
        tipo: 'ciclo',
        alvo: { tipo: 'ciclo', id: 'c1', rotulo: 'Penal' },
        razao: 'Bloco 3 de 8 da volta 3 do seu ciclo',
        estimativaMin: 40,
        blocoOrdem: 2,
      },
    });
    expect(decidirProximaAcao({ ...base, cartoesVencidos: 1 })).toMatchObject({
      acao: { tipo: 'revisao_vencida' },
    });
    expect(decidirProximaAcao(base, ['ciclo'])).toMatchObject({ acao: { tipo: 'leitura_salva' } });
  });
});
