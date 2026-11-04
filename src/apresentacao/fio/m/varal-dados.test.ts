import { aderirAoItem } from '../../../dominios/acervo/adesao';
import type { ItemDoAcervo } from '../../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { FonteDeIncidencia } from '../../../dominios/legislacao/incidencia-fonte';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../../dominios/legislacao/leituras';
import { repositorioDeTeste } from '../../../testes/repositorio';
import {
  carregarDadosDoVaral,
  carregarLinhasDeColecoes,
  carregarLinhasDeNormas,
} from './varal-dados';

const no = (endereco: string, rotulo: string, tipo: 'artigo' | 'sumula') => ({
  endereco,
  categoria: 'normativo' as const,
  tipo,
  rotulo,
  status: 'vigente' as const,
  confianca: 'alta' as const,
  trechos: [{ texto: `Texto de ${rotulo}.` }],
});

const lei = (id: string, tituloCurto: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto, tipo: 'Lei', esfera: 'federal' },
  nos: [
    no('art1', 'Art. 1º', 'artigo'),
    no('art2', 'Art. 2º', 'artigo'),
    no('art3', 'Art. 3º', 'artigo'),
  ],
});

const colecao = (id: string, tituloCurto: string, especie: 'sumulas' | 'teses'): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto, tipo: 'Súmulas', esfera: 'federal', especie },
  nos: [no('s593', 'Súmula 593', 'sumula'), no('s594', 'Súmula 594', 'sumula')],
});

/** Uma fonte do Mapa que responde por `fetch`, como o app: o índice e o arquivo da norma `lei-a`. */
function fonteDoMapa(artigos: [string, number, string][], semResposta = false) {
  const arquivos: Record<string, unknown> = {
    '/incidencia/indice.json': {
      versao: 1,
      recortes: [{ id: 'fcc-dp', titulo: 'FCC × Defensor', normas: ['lei-a'] }],
    },
    '/incidencia/fcc-dp/lei-a.json': { versao: 1, recorte: 'fcc-dp', norma: 'lei-a', artigos },
  };
  const buscar: typeof fetch = (entrada) => {
    if (semResposta) return new Promise<Response>(() => undefined);
    const url =
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const corpo = arquivos[url];
    return Promise.resolve(
      corpo === undefined
        ? new Response('não', { status: 404 })
        : new Response(JSON.stringify(corpo), { status: 200 }),
    );
  };
  return new FonteDeIncidencia('/incidencia', buscar, () => Promise.resolve(undefined));
}

async function cenario() {
  const { repo, relogio } = await repositorioDeTeste();
  const fonte = await FonteEmMemoria.criar([
    {
      item: lei('lei-a', 'LEP'),
      vinculos: [{ disciplina: 'Execução Penal' }, { disciplina: 'Penal' }],
    },
    { item: lei('lei-b', 'ECA'), vinculos: [{ disciplina: 'Infância e Juventude' }] },
    { item: colecao('sumulas-stj', 'Súmulas STJ', 'sumulas') },
    { item: colecao('teses-stj', 'Teses STJ', 'teses') },
  ]);
  const indice = await fonte.listar();
  const ids: Record<string, string> = {};
  for (const entrada of indice.itens) {
    const r = await aderirAoItem(repo, fonte, entrada);
    if (r.estado === 'adicionada') ids[entrada.id] = r.normaId;
  }
  return { repo, relogio, ids };
}

describe('o que o Varal conta', () => {
  it('um app vazio: nada guardado, nada para retomar, nenhum lembrete', async () => {
    const { repo } = await repositorioDeTeste();
    const d = await carregarDadosDoVaral(repo);
    expect(d).toMatchObject({
      normaIds: [],
      colecaoIds: [],
      retomar: undefined,
      textos: 0,
      frases: 0,
      frasesVencidas: 0,
      cartoes: 0,
      cartoesVencidos: 0,
      lembrete: false,
    });
  });

  it('separa as normas das coleções de súmulas e de teses', async () => {
    const { repo, ids } = await cenario();
    const d = await carregarDadosDoVaral(repo);
    expect([...d.normaIds].sort()).toEqual([ids['lei-a'], ids['lei-b']].sort());
    expect([...d.colecaoIds].sort()).toEqual([ids['sumulas-stj'], ids['teses-stj']].sort());
  });

  it('"Retomar" diz a norma lida por último e o artigo onde parou, como se cita', async () => {
    const { repo, ids } = await cenario();
    expect((await carregarDadosDoVaral(repo)).retomar).toBeUndefined();
    const aberta = await abrirNorma(repo, ids['lei-a'] ?? '');
    const art2 = aberta.nos.find((n) => n.dispositivo.rotulo === 'Art. 2º')?.dispositivo.id;
    await marcarLidoAte(repo, ids['lei-a'] ?? '', art2 ?? '');
    expect((await carregarDadosDoVaral(repo)).retomar).toBe('LEP, art. 2º');
  });
});

describe('as linhas do folheto das Normas', () => {
  it('uma por norma guardada (sem as coleções), com disciplinas em ordem, o Mapa e a data', async () => {
    const { repo, relogio, ids } = await cenario();
    const fonte = fonteDoMapa([
      ['1', 3, 'altissima'],
      ['2', 1, 'baixa'],
      ['3', 2, 'media'],
    ]);
    const linhas = await carregarLinhasDeNormas(repo, fonte, relogio.agora);
    expect(linhas.map((l) => l.nome).sort()).toEqual(['ECA', 'LEP']);
    const lep = linhas.find((l) => l.nome === 'LEP');
    expect(lep).toMatchObject({
      id: ids['lei-a'],
      disciplinas: ['Execução Penal', 'Penal'],
      cai: 2,
      textoCai: '2 artigos que caem',
      textoData: 'guardada hoje',
      versaoNova: false,
      vez: false,
      para: `/biblioteca/normas/${ids['lei-a'] ?? ''}`,
    });
    // Sem Mapa no acervo (a ECA não está no recorte), a linha não inventa número.
    const eca = linhas.find((l) => l.nome === 'ECA');
    expect(eca?.cai).toBeUndefined();
    expect(eca?.textoCai).toBeUndefined();
    expect(eca?.disciplinas).toEqual(['Infância e Juventude']);
  });

  it('um artigo que cai é um da faixa média para cima; um só diz "artigo que cai"', async () => {
    const { repo, relogio } = await cenario();
    const fonte = fonteDoMapa([
      ['1', 3, 'alta'],
      ['2', 1, 'baixa'],
    ]);
    const linhas = await carregarLinhasDeNormas(repo, fonte, relogio.agora);
    expect(linhas.find((l) => l.nome === 'LEP')?.textoCai).toBe('1 artigo que cai');
  });

  it('o Mapa que não chega a tempo não segura a lista', async () => {
    const { repo, relogio } = await cenario();
    const linhas = await carregarLinhasDeNormas(repo, fonteDoMapa([], true), relogio.agora, 30);
    expect(linhas).toHaveLength(2);
    expect(linhas.every((l) => l.cai === undefined)).toBe(true);
  });

  it('a norma lida por último leva a marca de "vez" e a mais recente nas Recentes', async () => {
    const { repo, relogio, ids } = await cenario();
    const aberta = await abrirNorma(repo, ids['lei-b'] ?? '');
    const primeiro = aberta.nos[0]?.dispositivo.id ?? '';
    relogio.avancar(60_000);
    await marcarLidoAte(repo, ids['lei-b'] ?? '', primeiro);
    const linhas = await carregarLinhasDeNormas(repo, fonteDoMapa([]), relogio.agora);
    const eca = linhas.find((l) => l.nome === 'ECA');
    const lep = linhas.find((l) => l.nome === 'LEP');
    expect(eca?.vez).toBe(true);
    expect(lep?.vez).toBe(false);
    expect(eca?.recencia).toBeGreaterThan(0);
    expect(lep?.recencia).toBe(0);
  });
});

describe('as linhas do folheto de Súmulas e teses', () => {
  it('uma por coleção que a pessoa puxou, com quantos itens ela tem', async () => {
    const { repo, relogio, ids } = await cenario();
    const linhas = await carregarLinhasDeColecoes(repo, relogio.agora);
    expect(linhas.map((l) => l.nome).sort()).toEqual(['Súmulas STJ', 'Teses STJ']);
    const sumulas = linhas.find((l) => l.nome === 'Súmulas STJ');
    expect(sumulas).toMatchObject({
      id: ids['sumulas-stj'],
      cai: 2,
      textoCai: '2 súmulas',
      textoData: 'guardada hoje',
    });
    expect(linhas.find((l) => l.nome === 'Teses STJ')?.textoCai).toBe('2 teses');
  });
});
