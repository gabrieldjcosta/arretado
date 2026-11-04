import { estadoInicial, type EstadoDoFio } from '../../../dominios/fio';
import { entrada, materia, norma } from '../../../dominios/fio/fixtures';
import { entradaDaJornada } from './entrada-da-jornada';

const estado = (extra: Partial<EstadoDoFio> = {}): EstadoDoFio => ({
  ...estadoInicial(),
  ...extra,
});

describe('do que o Fio sabe ao que o mapa precisa', () => {
  it('as matérias vêm na ordem do Ciclo', () => {
    const e = entrada({
      materias: [materia('penal'), materia('eca'), materia('civil')],
      ciclo: { blocos: ['eca', 'civil', 'penal'], indice: 0 },
    });
    const j = entradaDaJornada(e, estado());
    expect(j.materias.map((m) => m.id)).toEqual(['eca', 'civil', 'penal']);
  });

  it('a pessoa está na matéria do último pouso', () => {
    const e = entrada({ ciclo: { blocos: ['penal', 'eca'], indice: 1 } });
    const s = estado({
      etapasFeitas: 1,
      pousos: [{ etapa: 0, materia: 'Matéria penal', materiaId: 'penal', fatos: [] }],
    });
    expect(entradaDaJornada(e, s).atualId).toBe('penal');
  });

  it('sem pouso com matéria, vale a etapa aberta e depois a da vez', () => {
    const e = entrada({ ciclo: { blocos: ['penal', 'eca'], indice: 1 } });
    // Pouso antigo, sem o id da matéria.
    const antigo = estado({ pousos: [{ etapa: 0, materia: 'Matéria penal', fatos: [] }] });
    expect(entradaDaJornada(e, antigo).atualId).toBe('eca');
    expect(entradaDaJornada(e, estado()).atualId).toBe('eca');
    const aberta = estado({
      etapa: { numero: 0, materiaId: 'penal', materia: 'Matéria penal', passos: [], fechados: [] },
    });
    expect(entradaDaJornada(e, aberta).atualId).toBe('penal');
  });

  it('o pouso de uma matéria que saiu do app não vale: cai na da vez', () => {
    const e = entrada({ ciclo: { blocos: ['penal', 'eca'], indice: 0 } });
    const s = estado({ pousos: [{ etapa: 0, materia: 'Antiga', materiaId: 'sumiu', fatos: [] }] });
    expect(entradaDaJornada(e, s).atualId).toBe('penal');
  });

  it('o que o Fio guardou segue: pousos por matéria e porteiras abertas', () => {
    const j = entradaDaJornada(
      entrada(),
      estado({ etapasPorMateria: { penal: 2 }, porteirasDoFim: ['penal'] }),
    );
    expect(j.pousosPorMateria).toEqual({ penal: 2 });
    expect(j.portasAbertas).toEqual(['penal']);
  });

  it('os artigos que caem vêm na ordem do Mapa, com o nome da norma, e dizem se há Mapa', () => {
    const e = entrada({
      materias: [
        materia('penal', { normas: [norma('cp', 20, { mapa: [12, 3, 20], lidos: [3] })] }),
        materia('eca'),
      ],
      ciclo: { blocos: ['penal', 'eca'], indice: 0 },
    });
    const j = entradaDaJornada(e, estado());
    expect(j.atualId).toBe('penal');
    expect(j.comMapa).toBe(true);
    expect(j.artigos?.map((a) => a.rotulo)).toEqual(['CP, Art. 12', 'CP, Art. 3', 'CP, Art. 20']);
    expect(j.artigos?.map((a) => a.lido)).toEqual([false, true, false]);
    expect(j.artigos?.[0]).toMatchObject({ normaId: 'cp', endereco: 'art-12' });
  });

  it('sem Mapa, são todos os artigos na ordem do código, e não há fim do Mapa', () => {
    const e = entrada({
      materias: [materia('penal', { normas: [norma('cp', 3)] })],
      ciclo: { blocos: ['penal'], indice: 0 },
    });
    const j = entradaDaJornada(e, estado());
    expect(j.comMapa).toBe(false);
    expect(j.artigos?.map((a) => a.rotulo)).toEqual(['CP, Art. 1', 'CP, Art. 2', 'CP, Art. 3']);
  });

  it('com duas normas, os artigos se intercalam pela posição no Mapa de cada uma', () => {
    const e = entrada({
      materias: [
        materia('penal', {
          normas: [norma('cp', 10, { mapa: [5, 6] }), norma('lep', 10, { mapa: [9, 2] })],
        }),
      ],
      ciclo: { blocos: ['penal'], indice: 0 },
    });
    const j = entradaDaJornada(e, estado());
    expect(j.artigos?.map((a) => a.rotulo)).toEqual([
      'CP, Art. 5',
      'LEP, Art. 9',
      'CP, Art. 6',
      'LEP, Art. 2',
    ]);
  });

  it('matéria que o Fio não abriu (sem artigos) não traz artigos nem Mapa', () => {
    const e = entrada({
      materias: [materia('penal', { normas: [{ id: 'cp', tituloCurto: 'CP', artigos: [] }] })],
      ciclo: { blocos: ['penal'], indice: 0 },
    });
    const j = entradaDaJornada(e, estado());
    expect(j.artigos).toBeUndefined();
    expect(j.comMapa).toBeUndefined();
  });

  it('sem matéria nenhuma, nada para mostrar', () => {
    const j = entradaDaJornada(entrada({ materias: [], ciclo: undefined }), estado());
    expect(j.materias).toEqual([]);
    expect(j.atualId).toBeUndefined();
  });
});
