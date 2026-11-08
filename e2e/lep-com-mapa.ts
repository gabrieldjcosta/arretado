import type { Page } from '@playwright/test';
import type { ItemDoAcervo } from '../src/dominios/acervo/esquemas';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';

// A LEP de fixture com o Mapa da norma (acervo e incidência servidos por `page.route`), usada pelos E2E do Mapa e do Fio.

export const ID = 'lei-federal-7210-1984';

const no = (
  endereco: string,
  tipo: ItemDoAcervo['nos'][number]['tipo'],
  texto: string,
  rotulo?: string,
  pai?: string,
): ItemDoAcervo['nos'][number] => ({
  endereco,
  categoria: tipo === 'capitulo' || tipo === 'nome' ? 'estrutural' : 'normativo',
  tipo,
  ...(rotulo === undefined ? {} : { rotulo }),
  ...(pai === undefined ? {} : { pai }),
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
});

export const LEP: ItemDoAcervo = {
  id: ID,
  versao: 1,
  norma: { tituloCurto: 'LEP', tipo: 'Lei', esfera: 'federal' },
  nos: [
    no('cap1', 'capitulo', '', 'CAPÍTULO I'),
    no('cap1.nome', 'nome', 'DO OBJETO E DA APLICAÇÃO', undefined, 'cap1'),
    no(
      'art1',
      'artigo',
      'A execução penal tem por objetivo efetivar as disposições de sentença, no prazo de 10 (dez) dias, vedado em qualquer hipótese o excesso.',
      'Art. 1º',
      'cap1',
    ),
    no('art1.nome', 'nome', 'Objeto', undefined, 'art1'),
    no(
      'art2',
      'artigo',
      'A jurisdição penal será exercida pelos juízes ou tribunais, no mínimo por 3 (três) juízes, sempre que possível.',
      'Art. 2º',
      'cap1',
    ),
    no(
      'art3',
      'artigo',
      'Ao condenado serão assegurados todos os direitos não atingidos, no prazo máximo de 5 (cinco) dias, sendo vedado qualquer excesso.',
      'Art. 3º',
      'cap1',
    ),
    no('cap2', 'capitulo', '', 'CAPÍTULO II'),
    no('cap2.nome', 'nome', 'DO CONDENADO', undefined, 'cap2'),
    no(
      'art4',
      'artigo',
      'O Estado deverá recorrer à cooperação da comunidade, no mínimo 2 (dois) meses antes, sempre que houver necessidade.',
      'Art. 4º',
      'cap2',
    ),
    no(
      'art5',
      'artigo',
      'Os condenados serão classificados segundo os seus antecedentes, no prazo de 30 (trinta) dias, sendo obrigatória a Comissão.',
      'Art. 5º',
      'cap2',
    ),
    no('art6', 'artigo', 'A classificação será feita por Comissão Técnica.', 'Art. 6º', 'cap2'),
    // Mais 34 artigos sem questão: a norma passa da tela, para o "Lido até aqui" ter o que marcar.
    ...Array.from({ length: 34 }, (_, i) =>
      no(
        `art${String(i + 7)}`,
        'artigo',
        `Disposição de número ${String(i + 7)} da lei.`,
        `Art. ${String(i + 7)}`,
        'cap2',
      ),
    ),
  ],
};

const INDICE = {
  versao: 1,
  recortes: [
    {
      id: 'fcc-defensor-sp',
      titulo: 'FCC × Defensor Público (SP)',
      questoes: 829,
      periodo: '2006 a 2026',
      normas: [ID],
    },
  ],
};
const MAPA = {
  versao: 1,
  recorte: 'fcc-defensor-sp',
  norma: ID,
  artigos: [
    ['1', 1, 'alta'],
    ['2', 3, 'altissima'],
    ['3', 0.5, 'media'],
    ['4', 0.2, 'baixa'],
    ['5', 2, 'altissima'],
  ],
};

export async function servir(page: Page) {
  const fonte = await FonteEmMemoria.criar([
    { item: LEP, vinculos: [{ disciplina: 'Execução Penal' }] },
  ]);
  const indice = await fonte.listar();
  await page.route('**/acervo/*.json', (rota) => {
    const nome = /\/acervo\/([^/]+)\.json$/.exec(rota.request().url())?.[1] ?? '';
    if (nome === 'indice') return rota.fulfill({ json: indice });
    return nome === ID
      ? rota.fulfill({ json: LEP })
      : rota.fulfill({ status: 404, body: 'não encontrado' });
  });
  await page.route('**/incidencia/**', (rota) => {
    const url = rota.request().url();
    if (url.endsWith('/incidencia/indice.json')) return rota.fulfill({ json: INDICE });
    if (url.endsWith(`/incidencia/fcc-defensor-sp/${ID}.json`)) return rota.fulfill({ json: MAPA });
    return rota.fulfill({ status: 404, body: 'não encontrado' });
  });
}
