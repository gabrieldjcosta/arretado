import { COMECOS, decidirProximaAcao } from './proxima-acao';

const leitura = { normaId: 'n1', tituloCurto: 'LEP', onde: 'Art. 41', minutos: 5 };

describe('decidirProximaAcao (A1)', () => {
  it('sem nada: vazio com os três começos', () => {
    expect(decidirProximaAcao({ cartoesVencidos: 0, frasesVencidas: 0 })).toEqual({
      tipo: 'vazio',
      comecos: COMECOS,
    });
    expect(COMECOS.map((c) => c.id)).toEqual(['escolher_concurso', 'ler_norma', 'registrar_erro']);
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

  it('estimativa: a camada de tela informa os minutos da rodada que o Recall serve', () => {
    const r = decidirProximaAcao({ cartoesVencidos: 100, frasesVencidas: 0, minutosDaRodada: 5 });
    expect(r).toMatchObject({ acao: { estimativaMin: 5 } });
  });

  it('leitura salva diz onde continuar e quanto falta; sem posição, só a norma', () => {
    expect(decidirProximaAcao({ cartoesVencidos: 0, frasesVencidas: 0, leitura })).toEqual({
      tipo: 'acao',
      acao: {
        tipo: 'leitura_salva',
        alvo: { tipo: 'leitura', id: 'n1', rotulo: 'LEP' },
        razao: 'Continuar a leitura no Art. 41 da LEP',
        estimativaMin: 5,
      },
    });
    const sem = decidirProximaAcao({
      cartoesVencidos: 0,
      frasesVencidas: 0,
      leitura: { normaId: 'n1', tituloCurto: 'LEP' },
    });
    expect(sem).toMatchObject({ acao: { razao: 'Continuar a leitura da LEP' } });
    expect(sem.tipo === 'acao' && sem.acao.estimativaMin).toBeUndefined();
  });

  it('com Mapa da norma, o Agora é o trecho que mais cai, e "de onde parou" fica como alternativa', () => {
    const trecho = { endereco: 'art3', rotulo: 'arts. 3º a 4º', faixa: 'cai muito', minutos: 2 };
    expect(
      decidirProximaAcao({
        cartoesVencidos: 0,
        frasesVencidas: 0,
        leitura: { ...leitura, trecho },
      }),
    ).toEqual({
      tipo: 'acao',
      acao: {
        tipo: 'leitura_salva',
        alvo: { tipo: 'leitura', id: 'n1', rotulo: 'LEP' },
        razao: 'Pelo mapa, o próximo trecho: cai muito',
        estimativaMin: 2,
        trecho: {
          endereco: 'art3',
          rotulo: 'arts. 3º a 4º',
          continuar: { razao: 'Continuar a leitura no Art. 41 da LEP', estimativaMin: 5 },
        },
      },
    });
  });

  it.each([
    ['Código Penal', 'raro'],
    ['CPP', 'cai'],
    ['Constituição da República Federativa do Brasil de 1988', 'cai muito'],
    ['Lei 8.069/1990 (ECA)', 'cai às vezes'],
  ])(
    'o motivo do trecho de %s não leva o nome da norma e fecha com a faixa "%s"',
    (tituloCurto, faixa) => {
      const trecho = { endereco: 'art3', rotulo: 'arts. 3º a 4º', faixa, minutos: 2 };
      const r = decidirProximaAcao({
        cartoesVencidos: 0,
        frasesVencidas: 0,
        leitura: { ...leitura, tituloCurto, trecho },
      });
      expect(r.tipo === 'acao' && r.acao.razao).toBe(`Pelo mapa, o próximo trecho: ${faixa}`);
    },
  );

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
  it('vem depois da revisão vencida e da tarefa da fila, e antes da leitura salva', () => {
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

  it('a tarefa que a pessoa escreveu vem antes do bloco do Ciclo', () => {
    const base = { cartoesVencidos: 0, frasesVencidas: 0, ciclo, leitura };
    const tarefa = { id: 't1', titulo: 'Reler o art. 5º' };
    expect(decidirProximaAcao({ ...base, tarefa })).toMatchObject({ acao: { tipo: 'tarefa' } });
    expect(decidirProximaAcao({ ...base, tarefa }, ['tarefa'])).toMatchObject({
      acao: { tipo: 'ciclo' },
    });
  });
});
