// @vitest-environment node
import { artigosDe, pesoPorArtigo } from './artigos.mjs';
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

describe('peso por artigo', () => {
  const linha = (assunto: string, qtd: number, norma = 'CP', ref = '') => ({
    assunto_tec: assunto,
    norma_ref: norma,
    dispositivo_ref: ref,
    qtd_questoes: String(qtd),
  });

  it('lê intervalos, listas e ignora § e inciso', () => {
    expect(artigosDe('arts. 32 a 42 e 53')).toContain('40');
    expect(artigosDe('arts. 32 a 42 e 53')).toContain('53');
    expect(artigosDe('art. 14, inciso I,')).toEqual(['14']);
    expect(artigosDe('arts. 20, §1º, e 21')).toEqual(['20', '21']);
    expect(artigosDe('arts. 217-A a 226')).toContain('217-A');
  });

  it('usa o intervalo do nome, não o herdado do pai, e deixa a linha mais específica ganhar', () => {
    const r = pesoPorArtigo([
      linha('Das Penas (arts. 32 a 99 do CP)', 9, 'CP', 'arts. 32 a 99'),
      linha('Espécies de Penas (arts. 32 a 58)', 4, 'CP', 'arts. 32 a 99'),
      linha('Erro de Tipo (art. 20 do CP)', 3, 'CP', 'art. 20'),
    ]);
    const por = (a: string) => r.find((x) => x.artigo === a);
    expect(por('20')?.peso).toBe(3);
    expect(por('40')?.fonte).toMatch(/Espécies/);
    expect(por('90')?.fonte).toMatch(/Das Penas/);
    expect(por('20')?.faixa).toBe('Altíssima');
  });

  it('ignora normas fora do acervo', () => {
    expect(pesoPorArtigo([linha('Lei X (art. 1º da Lei X)', 5, 'Lei X', 'art. 1º')])).toEqual([]);
  });
});
