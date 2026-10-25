import type { EntradaDoIndice } from './esquemas';
import {
  agrupar,
  filtrarEntradas,
  normaParecida,
  SEM_DISCIPLINA,
  tamanhoLegivel,
  ufDaEntrada,
} from './agrupar';

const e = (id: string, grupo: string, disciplinas: string[], tipo = 'norma'): EntradaDoIndice =>
  ({
    id,
    tipo,
    titulo: id.toUpperCase(),
    grupo,
    vinculos: disciplinas.map((disciplina) => ({ disciplina })),
    avisos: [],
    tamanho: 10,
    versao: 1,
    hash: 'a'.repeat(64),
    coletadoEm: '2026-10-10',
  }) as EntradaDoIndice;

describe('agrupar o acervo', () => {
  const itens = [
    e('a', 'Leis', ['Penal', 'Civil']),
    e('b', 'Decretos', []),
    e('c', 'Leis', ['Civil']),
  ];

  it('por disciplina: repete o item em cada uma, "Sem disciplina" por último', () => {
    const g = agrupar(itens, 'disciplina');
    expect(g.map((x) => x.titulo)).toEqual(['Civil', 'Penal', SEM_DISCIPLINA]);
    expect(g[0]?.itens.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('por tipo: pelo grupo', () => {
    expect(agrupar(itens, 'tipo').map((x) => x.titulo)).toEqual(['Decretos', 'Leis']);
  });

  it('busca sem acento nem caixa, por tipo', () => {
    expect(filtrarEntradas(itens, 'norma', 'CIVIL').map((i) => i.id)).toEqual(['a', 'c']);
    expect(filtrarEntradas(itens, 'sumulas', '')).toEqual([]);
  });

  it('tamanho legível', () => {
    expect(tamanhoLegivel(500)).toBe('500 B');
    expect(tamanhoLegivel(2048)).toBe('2 KB');
    expect(tamanhoLegivel(1572864)).toBe('1,5 MB');
  });
});

describe('a UF do órgão que publica', () => {
  const de = (urlOficial?: string) => ufDaEntrada(urlOficial === undefined ? {} : { urlOficial });

  it('lê a UF do endereço oficial: assembleia, defensoria e tribunal do estado', () => {
    expect(de('https://www.al.sp.gov.br/repositorio/legislacao/lei/1998/lei-10177.html')).toBe(
      'sp',
    );
    expect(de('https://www.defensoria.sp.def.br/dpesp/Repositorio/1/x.pdf')).toBe('sp');
    expect(de('https://www.tjsp.jus.br/Download/x.pdf')).toBe('sp');
    expect(de('https://www.tjdft.jus.br/x')).toBe('dft');
    expect(de('https://www.al.ba.leg.br/x')).toBe('ba');
    expect(de('https://defensoria.ba.def.br/x')).toBe('ba');
  });

  it('não tem UF o que vale em todo o país: Planalto, tribunais superiores, CNJ, gov.br, exterior', () => {
    expect(de('https://www.planalto.gov.br/ccivil_03/leis/l8078.htm')).toBeUndefined();
    expect(de('https://atos.cnj.jus.br/atos/detalhar/3540')).toBeUndefined();
    expect(de('https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp')).toBeUndefined();
    expect(de('https://www.gov.br/mdh/pt-br/x')).toBeUndefined();
    expect(de('https://www2.camara.leg.br/legin/x')).toBeUndefined();
    expect(de(undefined)).toBeUndefined();
    expect(de('isto não é um endereço')).toBeUndefined();
  });
});

describe('a ordem abre pelo que vale em todo o país', () => {
  const com = (id: string, grupo: string, disciplinas: string[], urlOficial: string) => ({
    ...e(id, grupo, disciplinas),
    urlOficial,
  });
  const federal = 'https://www.planalto.gov.br/x';
  const paulista = 'https://www.al.sp.gov.br/x';
  const itens = [
    com('estadual-a', 'Leis estaduais', ['Administrativo'], paulista),
    com('constituicao-estadual', 'Constituições', ['Administrativo'], paulista),
    com('federal-a', 'Leis federais', ['Administrativo'], federal),
    com('federal-b', 'Leis federais', ['Administrativo'], federal),
    com('so-estado', 'Atos locais', ['Atribuições'], paulista),
    com('federal-c', 'Leis federais', ['Civil'], federal),
  ];

  it('por disciplina: dentro do grupo o estadual vem depois (sem trocar a ordem do resto), e o grupo só estadual por último', () => {
    const g = agrupar(itens, 'disciplina');
    expect(g.map((x) => x.titulo)).toEqual(['Administrativo', 'Civil', 'Atribuições']);
    expect(g[0]?.itens.map((i) => i.id)).toEqual([
      'federal-a',
      'federal-b',
      'estadual-a',
      'constituicao-estadual',
    ]);
  });

  it('por tipo: o grupo só estadual vai para o fim', () => {
    expect(agrupar(itens, 'tipo').map((x) => x.titulo)).toEqual([
      'Leis federais',
      'Atos locais',
      'Constituições',
      'Leis estaduais',
    ]);
  });

  it('"Sem disciplina" continua por último, mesmo com grupo só estadual antes dele', () => {
    const g = agrupar([com('sem', 'Leis', [], federal), ...itens], 'disciplina');
    expect(g.at(-1)?.titulo).toBe(SEM_DISCIPLINA);
  });
});

describe('normaParecida', () => {
  const lep = { ...e('lep', 'Leis', []), titulo: 'Lei de Execução Penal (Lei nº 7.210/1984)' };
  const colada = { tituloCurto: 'LEP', tipo: 'Lei', referencia: '7.210/1984' };

  it('acha a colada com a mesma referência e tipo', () => {
    expect(
      normaParecida(lep, [{ tituloCurto: 'Outra', tipo: 'Lei', referencia: '1/2000' }, colada]),
    ).toBe(colada);
  });

  it('ignora outro tipo, a que já veio do acervo e título sem número', () => {
    expect(normaParecida(lep, [{ ...colada, tipo: 'Decreto' }])).toBeUndefined();
    expect(normaParecida(lep, [{ ...colada, origemAcervo: { id: 'lep' } }])).toBeUndefined();
    expect(normaParecida({ titulo: 'Constituição de 1988' }, [colada])).toBeUndefined();
  });
});
