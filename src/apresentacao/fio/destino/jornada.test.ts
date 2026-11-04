import dadosBrutos from './nordeste.json';
import {
  materiasDoMapa,
  montarJornada,
  type ArtigoDoMapa,
  type EntradaDaJornada,
  type MateriaDoMapa,
} from './jornada';
import type { DadosDoNordeste } from './nordeste';

const dados = dadosBrutos as unknown as DadosDoNordeste;

const NOMES = [
  'Execução Penal',
  'Direito Penal',
  'Processo Penal',
  'Constitucional',
  'Infância e Juventude',
  'Direitos Humanos',
  'Civil',
  'Processo Civil',
  'Administrativo',
  'Tributário',
  'Ambiental',
];
const materias: MateriaDoMapa[] = NOMES.map((nome, i) => ({ id: `m${String(i)}`, nome }));
const artigo = (n: number, lido = false): ArtigoDoMapa => ({
  normaId: 'lep',
  endereco: `art-${String(n)}`,
  rotulo: `LEP, Art. ${String(n)}`,
  lido,
});

function entrada(extra: Partial<EntradaDaJornada> = {}): EntradaDaJornada {
  return {
    materias: materias.slice(0, 5),
    atualId: 'm0',
    pousosPorMateria: {},
    portasAbertas: [],
    ...extra,
  };
}

describe('as matérias do mapa', () => {
  it('seguem o Ciclo, sem repetir, e depois as outras na ordem do app', () => {
    const lista = materiasDoMapa({
      materias: materias.slice(0, 4).map((m) => ({ ...m, normas: [], sumulas: [] })),
      ciclo: { blocos: ['m2', 'm0', 'm2', 'm9'], indice: 0 },
    });
    expect(lista.map((m) => m.id)).toEqual(['m2', 'm0', 'm1', 'm3']);
  });

  it('sem Ciclo, a ordem em que o app lista as matérias', () => {
    const lista = materiasDoMapa({
      materias: materias.slice(0, 3).map((m) => ({ ...m, normas: [], sumulas: [] })),
    });
    expect(lista.map((m) => m.nome)).toEqual(['Execução Penal', 'Direito Penal', 'Processo Penal']);
  });
});

describe('a jornada no mapa', () => {
  it('sem matéria nenhuma, o caminho começa no primeiro lugar e nada está aberto', () => {
    const j = montarJornada(dados, entrada({ materias: [], atualId: undefined }));
    expect(j.estados.every((e) => e.situacao === 'livre')).toBe(true);
    expect(j.aqui).toBe(0);
    expect(j.abertos.some(Boolean)).toBe(false);
    expect(j.andado).toEqual([]);
    expect(j.estrelas).toEqual([]);
  });

  it('cada matéria ganha um estado, na ordem; o resto fica livre', () => {
    const j = montarJornada(dados, entrada());
    expect(j.estados.map((e) => e.uf)).toEqual([
      'MA',
      'PI',
      'CE',
      'RN',
      'PB',
      'PE',
      'AL',
      'SE',
      'BA',
    ]);
    expect(j.estados.slice(0, 5).map((e) => e.materia?.nome)).toEqual(NOMES.slice(0, 5));
    expect(j.estados.slice(5).every((e) => e.situacao === 'livre')).toBe(true);
  });

  it('o estado da pessoa é "agora", o de ao lado "seguinte" e os que ela já visitou aparecem', () => {
    const j = montarJornada(
      dados,
      entrada({ atualId: 'm1', pousosPorMateria: { m0: 2, m1: 1, m4: 0 } }),
    );
    expect(j.estados.slice(0, 5).map((e) => e.situacao)).toEqual([
      'visitado',
      'agora',
      'seguinte',
      'sombra',
      'sombra',
    ]);
    expect(j.atual.uf).toBe('PI');
  });

  it('o primeiro lugar abre com o estado em uso e cada pouso na matéria abre o seguinte', () => {
    const sem = montarJornada(dados, entrada());
    expect(sem.atual.abertos).toBe(1);
    expect(sem.aqui).toBe(0);
    expect(sem.andado).toEqual([]);

    const dois = montarJornada(dados, entrada({ pousosPorMateria: { m0: 1 } }));
    expect(dois.atual.abertos).toBe(2);
    expect(dois.aqui).toBe(1);
    expect(dois.abertos.slice(0, 4)).toEqual([true, true, false, false]);
    expect(dois.andado).toEqual([
      [
        { seg: 0, t: 0 },
        { seg: 0, t: 1 },
      ],
    ]);
  });

  it('o estado enche e para: Maranhão tem três lugares', () => {
    const j = montarJornada(dados, entrada({ pousosPorMateria: { m0: 9 } }));
    expect(j.atual.abertos).toBe(3);
    expect(j.aqui).toBe(2);
  });

  it('o estado visitado mostra os lugares que a pessoa abriu, mesmo longe dele', () => {
    const j = montarJornada(dados, entrada({ atualId: 'm0', pousosPorMateria: { m2: 2 } }));
    const ce = j.estados.find((e) => e.uf === 'CE');
    expect(ce?.situacao).toBe('visitado');
    expect(ce?.abertos).toBe(3);
    expect(j.abertos[ce?.inicio ?? -1]).toBe(true);
  });

  it('a porteira fica fechada, pronta quando o Mapa acaba e aberta depois de passar', () => {
    const lidos = [artigo(1, true), artigo(2, true)];
    const faltando = [artigo(1, true), artigo(2)];

    const fechada = montarJornada(dados, entrada({ artigos: faltando, comMapa: true }));
    expect(fechada.portas[0]?.situacao).toBe('fechada');

    const pronta = montarJornada(dados, entrada({ artigos: lidos, comMapa: true }));
    expect(pronta.portas[0]?.situacao).toBe('pronta');
    expect(pronta.portas[1]?.situacao).toBe('fechada');

    // Sem Mapa não há fim do Mapa: ler tudo não deixa a porteira pronta.
    const semMapa = montarJornada(dados, entrada({ artigos: lidos, comMapa: false }));
    expect(semMapa.portas[0]?.situacao).toBe('fechada');

    const aberta = montarJornada(
      dados,
      entrada({
        artigos: lidos,
        comMapa: true,
        portasAbertas: ['m0'],
        pousosPorMateria: { m0: 2 },
      }),
    );
    expect(aberta.portas[0]?.situacao).toBe('aberta');
    expect(aberta.portas[0]?.materia?.id).toBe('m0');
    // O trecho que sai do estado acende junto com a porteira.
    const saida = aberta.portas[0]?.seg ?? -1;
    expect(aberta.andado).toContainEqual([
      { seg: saida, t: 0 },
      { seg: saida, t: 1 },
    ]);
  });

  it('porteira "pronta" sem artigo nenhum não existe', () => {
    const j = montarJornada(dados, entrada({ artigos: [], comMapa: true }));
    expect(j.portas[0]?.situacao).toBe('fechada');
  });

  it('os artigos que caem viram pontos no caminho, os que mais caem maiores e acesos se lidos', () => {
    const artigos = Array.from({ length: 12 }, (_, i) => artigo(i + 1, i < 3));
    const j = montarJornada(dados, entrada({ artigos }));
    expect(j.estrelas).toHaveLength(10);
    expect(j.estrelas.map((e) => e.tam)).toEqual([16, 16, 12, 12, 12, 12, 12, 12, 12, 12]);
    expect(j.estrelas.slice(0, 3).every((e) => e.artigo.lido)).toBe(true);
    expect(j.estrelas[3]?.artigo.lido).toBe(false);
    // Os contadores são de todos os artigos que caem, não só dos que têm ponto.
    expect(j.total).toBe(12);
    expect(j.lidos).toBe(3);
  });

  it('com poucos artigos, só tantos pontos quanto artigos', () => {
    const j = montarJornada(dados, entrada({ artigos: [artigo(1), artigo(2)] }));
    expect(j.estrelas).toHaveLength(2);
  });

  it('o caminho é nítido até o fim do estado de ao lado', () => {
    const j = montarJornada(dados, entrada({ atualId: 'm0' }));
    // Maranhão (3) + Piauí (4): o último lugar do Piauí é o sétimo.
    expect(j.nitidaAte).toBe(6);
    const naBahia = montarJornada(dados, {
      materias,
      atualId: 'm8',
      pousosPorMateria: {},
      portasAbertas: [],
    });
    expect(naBahia.nitidaAte).toBe(dados.ordem.length - 1);
  });

  it('passando de nove matérias, as últimas ficam fora do mapa e o mapa diz quantas', () => {
    const j = montarJornada(dados, entrada({ materias }));
    expect(j.estados.every((e) => e.materia !== undefined)).toBe(true);
    expect(j.foraDoMapa).toBe(2);
    expect(montarJornada(dados, entrada()).foraDoMapa).toBe(0);
  });

  it('a matéria atual que não está no mapa cai no primeiro estado, sem quebrar', () => {
    const j = montarJornada(dados, entrada({ materias, atualId: 'm10' }));
    expect(j.atual.uf).toBe('MA');
  });
});
