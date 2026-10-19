// @vitest-environment node
import { achatar, lerCsv, paraCsv, validar } from './nucleo.mjs';

const materia = {
  nome: 'Direito Fictício',
  totalQuestoes: 100,
  assuntos: [
    {
      nome: 'Aplicação da lei (arts. 1º a 12 do CP)',
      hierarquia: '01',
      url: 'f/aplicacao',
      totalQuestoes: 60,
      porcentagemMateria: 60,
      filhos: [
        {
          nome: 'Lei no tempo (art. 2º do CP)',
          hierarquia: '01.01',
          url: 'f/tempo',
          totalQuestoes: 20,
          porcentagemMateria: 20,
          filhos: [],
        },
      ],
    },
    {
      nome: 'Princípios',
      hierarquia: '02',
      url: 'f/principios',
      totalQuestoes: 40,
      porcentagemMateria: 40,
      filhos: [],
    },
  ],
};

describe('incidência TEC', () => {
  it('achata a árvore e identifica artigo e norma', () => {
    const l = achatar(materia);
    expect(l).toHaveLength(3);
    expect(l[0]).toMatchObject({ nivel: 'artigo', norma_ref: 'CP', dispositivo_ref: '1º a 12' });
    expect(l[2]).toMatchObject({ nivel: 'assunto', dispositivo_ref: '' });
  });

  it('CSV ida e volta passa na validação', () => {
    const volta = lerCsv(paraCsv(achatar(materia)));
    expect(volta).toHaveLength(3);
    const r = validar(volta);
    expect(r.erros).toEqual([]);
    expect(r.avisos.map((a) => a.regra)).toEqual([]);
  });

  it('acusa duplicata, assunto maior que a matéria e amostra fraca', () => {
    const l = achatar({ ...materia, totalQuestoes: 10 });
    const r = validar([...l, ...l.slice(0, 1)]);
    const regras = r.erros.map((e) => e.regra);
    expect(regras).toContain('recorte-duplicado');
    expect(regras).toContain('assunto-maior-que-materia');
    expect(r.avisos.map((a) => a.regra)).toContain('amostra-fraca');
  });
});
