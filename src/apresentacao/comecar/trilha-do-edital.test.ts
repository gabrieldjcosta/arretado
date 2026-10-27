import type { CarreiraDoCatalogo, EditalDoCatalogo } from '../../dominios/catalogo';
import { CatalogoIndisponivel, type FonteDoCatalogo } from '../../dominios/catalogo';
import { repositorioDeTeste } from '../../testes/repositorio';
import { montarTrilha, trilhaOferecida } from './trilha-do-edital';

function edital(
  id: string,
  ano: number | null,
  disciplinas: [string, string[]][],
): EditalDoCatalogo {
  return {
    id,
    orgao: id.toUpperCase(),
    uf: null,
    banca: null,
    ano,
    cargo: null,
    fase: null,
    situacao: 'completo',
    fonteUrl: 'https://exemplo.org/edital',
    rotulo: ano === null ? null : `baseado no edital ${id.toUpperCase()} de ${String(ano)}`,
    disciplinas: disciplinas.map(([nome, itens], i) => ({
      nomeNoEdital: nome,
      ordem: i + 1,
      itens: itens.map((assunto) => ({
        numero: null,
        assunto,
        faixa: null,
        obsFaixa: null,
        recorrencia: null,
        fonteUrl: 'https://exemplo.org/edital',
      })),
    })),
  };
}

const carreira: CarreiraDoCatalogo = {
  versao: 1,
  carreira: 'Carreira X',
  slug: 'carreira-x',
  editais: [
    edital('velho', 2019, [['Constitucional', ['Princípios', 'Direitos']]]),
    edital('novo', 2026, [
      ['Constitucional', ['Princípios fundamentais', 'Direitos e garantias', 'Organização']],
      ['Civil', ['Pessoas', 'Bens']],
    ]),
    edital('sem-rotulo', null, [['Penal', ['Crimes']]]),
  ],
  disciplinas: [],
};

const fonte: FonteDoCatalogo = {
  listar: () => Promise.reject(new Error('não usado')),
  obter: (slug) =>
    slug === 'carreira-x'
      ? Promise.resolve(carreira)
      : Promise.reject(new CatalogoIndisponivel('nao_encontrado', slug)),
};

describe('a Trilha oferecida em "Para começar"', () => {
  it('é o edital mais recente da carreira, inteiro, com a conta de matérias e Pontos', async () => {
    const { repo } = await repositorioDeTeste();
    const oferta = await trilhaOferecida(repo, fonte, 'carreira-x');
    expect(oferta?.edital.id).toBe('novo');
    expect(oferta?.rotulo).toBe('baseado no edital NOVO de 2026');
    expect(oferta?.materias).toBe(2);
    expect(oferta?.pontos).toBe(5);
  });

  it('não existe para carreira fora do catálogo, nem quando a Trilha já tem Pontos', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await trilhaOferecida(repo, fonte, 'carreira-y')).toBeNull();

    const oferta = await trilhaOferecida(repo, fonte, 'carreira-x');
    if (!oferta) throw new Error('sem oferta');
    await montarTrilha(repo, oferta);
    expect(await trilhaOferecida(repo, fonte, 'carreira-x')).toBeNull();
  });

  it('montar grava os Pontos como uma importação que dá para desfazer', async () => {
    const { repo } = await repositorioDeTeste();
    const oferta = await trilhaOferecida(repo, fonte, 'carreira-x');
    if (!oferta) throw new Error('sem oferta');
    await montarTrilha(repo, oferta);

    const pontos = await repo.colecao('pontos').todosDoUsuario();
    const disciplinas = await repo.colecao('disciplinas').todosDoUsuario();
    expect(pontos.map((p) => p.titulo).sort()).toEqual([
      'Bens',
      'Direitos e garantias',
      'Organização',
      'Pessoas',
      'Princípios fundamentais',
    ]);
    expect(disciplinas.map((d) => d.nome).sort()).toEqual(['Civil', 'Constitucional']);
    const logs = await repo.colecao('logsImportacao').todosDoUsuario();
    expect(logs.map((l) => l.descricao)).toEqual([
      'Trilha pelo catálogo (baseado no edital NOVO de 2026)',
    ]);
    expect(logs[0]?.snapshotId).toBeDefined();
  });

  it('outra falha do catálogo que não seja "indisponível" sobe', async () => {
    const { repo } = await repositorioDeTeste();
    const quebrada: FonteDoCatalogo = {
      listar: () => Promise.reject(new Error('não usado')),
      obter: () => Promise.reject(new Error('disco')),
    };
    await expect(trilhaOferecida(repo, quebrada, 'carreira-x')).rejects.toThrow('disco');
  });
});
