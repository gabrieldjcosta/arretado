import {
  blocosDoFolheto,
  BLOCO_DOS_FIXADOS,
  contar,
  haQuantoTempo,
  subtituloDoFolheto,
  textoDaLinha,
  type LinhaDoFolheto,
} from './varal-lista';
import type { Organizacao } from './organizar';

function linha(nome: string, extra: Partial<LinhaDoFolheto> = {}): LinhaDoFolheto {
  return {
    id: nome.toLowerCase().replace(/\s+/g, '-'),
    nome,
    disciplinas: [],
    cai: undefined,
    textoCai: undefined,
    recencia: 0,
    textoData: 'guardada hoje',
    versaoNova: false,
    vez: false,
    oficial: false,
    para: '/x',
    ...extra,
  };
}

const org = (parte: Partial<Organizacao> = {}): Organizacao => ({
  ordem: 'cai',
  vista: 'cai',
  grupo: false,
  fixos: {},
  tirados: {},
  mostrarTirados: false,
  ...parte,
});

const LINHAS = [
  linha('Código Penal', { disciplinas: ['Penal'], cai: 44, recencia: 4 }),
  linha('LEP', { disciplinas: ['Execução Penal', 'Penal'], cai: 26, recencia: 9 }),
  linha('ECA', { disciplinas: ['Infância e Juventude'], cai: 20, recencia: 5 }),
  linha('Lei de Drogas', { disciplinas: ['Penal'], cai: 12, recencia: 1 }),
  linha('Minha lei', { recencia: 0 }),
];

const nomes = (blocos: ReturnType<typeof blocosDoFolheto>) =>
  blocos.flatMap((b) => b.linhas.map((l) => l.nome));

describe('a ordem do folheto (o `cmp` do mockup)', () => {
  it('"O que mais cai": mais artigos primeiro; sem o dado, por último, por nome', () => {
    expect(nomes(blocosDoFolheto(LINHAS, org(), 'normas'))).toEqual([
      'Código Penal',
      'LEP',
      'ECA',
      'Lei de Drogas',
      'Minha lei',
    ]);
  });

  it('"Recentes": a aberta há menos tempo vem primeiro; as nunca abertas, no fim', () => {
    expect(nomes(blocosDoFolheto(LINHAS, org({ ordem: 'rec' }), 'normas'))).toEqual([
      'LEP',
      'ECA',
      'Código Penal',
      'Lei de Drogas',
      'Minha lei',
    ]);
  });

  it('"Nome": em ordem alfabética, com os números por valor (Lei 8 antes da 11)', () => {
    const lista = [linha('Lei 11.340'), linha('Lei 8.078'), linha('Constituição')];
    expect(nomes(blocosDoFolheto(lista, org({ ordem: 'nome' }), 'normas'))).toEqual([
      'Constituição',
      'Lei 8.078',
      'Lei 11.340',
    ]);
  });

  it('"Disciplina": pela primeira disciplina e, dentro dela, o que mais cai', () => {
    expect(nomes(blocosDoFolheto(LINHAS, org({ ordem: 'disc' }), 'normas'))).toEqual([
      'LEP',
      'ECA',
      'Código Penal',
      'Lei de Drogas',
      'Minha lei',
    ]);
  });

  it('os fixados no alto vêm antes, por folheto, e cada um na ordem escolhida', () => {
    const o = org({ fixos: { normas: ['eca', 'minha-lei'] } });
    expect(nomes(blocosDoFolheto(LINHAS, o, 'normas'))).toEqual([
      'ECA',
      'Minha lei',
      'Código Penal',
      'LEP',
      'Lei de Drogas',
    ]);
    // O fixo de outro folheto não vale aqui.
    expect(nomes(blocosDoFolheto(LINHAS, o, 'sumulas'))[0]).toBe('Código Penal');
  });

  it('não muda a lista que recebeu', () => {
    const copia = [...LINHAS];
    blocosDoFolheto(LINHAS, org({ ordem: 'nome' }), 'normas');
    expect(LINHAS).toEqual(copia);
  });
});

describe('o que a pessoa tirou do varal', () => {
  const tirou = org({ tirados: { normas: ['eca'] } });

  it('some da lista, só neste folheto', () => {
    expect(nomes(blocosDoFolheto(LINHAS, tirou, 'normas'))).not.toContain('ECA');
    expect(nomes(blocosDoFolheto(LINHAS, tirou, 'sumulas'))).toContain('ECA');
  });

  it('volta, no lugar dela, com "mostrar as que tirei"', () => {
    const e = { ...tirou, mostrarTirados: true };
    expect(nomes(blocosDoFolheto(LINHAS, e, 'normas'))).toContain('ECA');
  });
});

describe('agrupar por disciplina', () => {
  it('um bloco por disciplina em ordem alfabética, com os fixados primeiro e "Outros" no fim', () => {
    const o = org({ grupo: true, fixos: { normas: ['lei-de-drogas'] } });
    const blocos = blocosDoFolheto(LINHAS, o, 'normas');
    expect(blocos.map((b) => b.titulo)).toEqual([
      BLOCO_DOS_FIXADOS,
      'Execução Penal',
      'Infância e Juventude',
      'Penal',
      'Outros',
    ]);
    expect(blocos.map((b) => b.linhas.map((l) => l.nome))).toEqual([
      ['Lei de Drogas'],
      ['LEP'],
      ['ECA'],
      ['Código Penal'],
      ['Minha lei'],
    ]);
  });

  it('sem agrupar, é um bloco só e sem título', () => {
    expect(blocosDoFolheto(LINHAS, org(), 'normas')).toHaveLength(1);
    expect(blocosDoFolheto(LINHAS, org(), 'normas')[0]?.titulo).toBeNull();
  });

  it('sem fixados, o bloco dos fixados não existe', () => {
    const titulos = blocosDoFolheto(LINHAS, org({ grupo: true }), 'normas').map((b) => b.titulo);
    expect(titulos).not.toContain(BLOCO_DOS_FIXADOS);
  });
});

describe('o que a linha mostra (o `sec` do mockup)', () => {
  const l = linha('LEP', {
    disciplinas: ['Execução Penal', 'Penal'],
    textoCai: '26 artigos que caem',
    textoData: 'guardada há 3 dias',
  });

  it('"O que cai": o texto do Mapa', () => {
    expect(textoDaLinha(l, 'cai', false)).toBe('26 artigos que caem');
  });

  it('"Disciplina": as disciplinas; com a lista em blocos, o título já diz e a linha volta ao que cai', () => {
    expect(textoDaLinha(l, 'disc', false)).toBe('Execução Penal, Penal');
    expect(textoDaLinha(l, 'disc', true)).toBe('26 artigos que caem');
    expect(textoDaLinha(linha('X'), 'disc', false)).toBe('sem disciplina');
  });

  it('"Atualização": a data, ou o aviso de versão nova', () => {
    expect(textoDaLinha(l, 'data', false)).toBe('guardada há 3 dias');
    expect(textoDaLinha({ ...l, versaoNova: true }, 'data', false)).toBe(
      'há versão nova no acervo',
    );
  });

  it('sem o dado do Mapa, a linha mostra a data em vez de ficar vazia', () => {
    expect(textoDaLinha(linha('X'), 'cai', false)).toBe('guardada hoje');
  });
});

describe('o subtítulo, o tempo e a conta', () => {
  it('"7 · o que mais cai" e, escolhendo vários, "1 escolhido" e "2 escolhidos"', () => {
    expect(subtituloDoFolheto(7, 'cai', null)).toBe('7 · o que mais cai');
    expect(subtituloDoFolheto(3, 'nome', null)).toBe('3 · nome');
    expect(subtituloDoFolheto(7, 'cai', 0)).toBe('0 escolhidos');
    expect(subtituloDoFolheto(7, 'cai', 1)).toBe('1 escolhido');
    expect(subtituloDoFolheto(7, 'cai', 2)).toBe('2 escolhidos');
  });

  it('quanto faz: hoje, ontem, dias, meses, anos; data ilegível, nada', () => {
    const agora = new Date('2026-11-04T12:00:00Z');
    const faz = (dias: number) =>
      haQuantoTempo(new Date(agora.getTime() - dias * 86_400_000).toISOString(), agora);
    expect(faz(0)).toBe('hoje');
    expect(faz(1)).toBe('ontem');
    expect(faz(3)).toBe('há 3 dias');
    expect(faz(29)).toBe('há 29 dias');
    expect(faz(30)).toBe('há 1 mês');
    expect(faz(75)).toBe('há 2 meses');
    expect(faz(400)).toBe('há 1 ano');
    expect(faz(800)).toBe('há 2 anos');
    expect(haQuantoTempo('amanhã talvez', agora)).toBeUndefined();
    expect(haQuantoTempo(undefined, agora)).toBeUndefined();
    // Um relógio atrasado não faz "há -2 dias".
    expect(haQuantoTempo('2026-11-06T12:00:00Z', agora)).toBe('hoje');
  });

  it('conta com o singular', () => {
    expect(contar(1, 'súmula', 'súmulas')).toBe('1 súmula');
    expect(contar(12, 'súmula', 'súmulas')).toBe('12 súmulas');
    expect(contar(0, 'súmula', 'súmulas')).toBe('0 súmulas');
  });
});
