import type { Bloco } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  aplicarFiltro,
  fimDaSubarvore,
  nomeDoCriterio,
  type CriterioDoFiltro,
  type FontesDoFiltro,
} from './filtros';
import {
  arvoreDaEstrela,
  estrelar,
  desestrelar,
  estrelasDaNorma,
  estrelasEfetivas,
  porAlvo,
} from './estrelas';
import { abrirNorma, type NormaAberta } from './leitor';
import { criarRascunho, publicarVersao } from './servico';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
// Título I > Capítulo I > { Seção I > (arts. 1–2, Subseção I > art. 3), Seção II > (arts. 4–5) }.
const LEI: Bloco[] = [
  linha('LEI Nº 1, DE 1 DE JANEIRO DE 2000.'),
  linha('Dispõe sobre testes.'),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES'),
  linha('CAPÍTULO I'),
  linha('DO OBJETO'),
  linha('Seção I'),
  linha('Da Pena'),
  linha('Art. 1º A pena é esta.'),
  linha('Art. 2º A outra pena.'),
  linha('§ 1º O parágrafo.'),
  linha('I - o inciso;'),
  linha('Subseção I'),
  linha('Da Multa Leve'),
  linha('Art. 3º A multa leve.'),
  linha('Seção II'),
  linha('Da Multa'),
  linha('Art. 4º A multa.'),
  linha('Art. 5º (VETADO).'),
];

async function publicada() {
  const { repo } = await repositorioDeTeste();
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'Teste',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  const aberta = await abrirNorma(repo, norma.id);
  const indice = (endereco: string) => {
    const i = aberta.nos.findIndex((n) => n.dispositivo.endereco === endereco);
    if (i < 0) throw new Error(`sem ${endereco}`);
    return i;
  };
  const id = (endereco: string) => aberta.nos[indice(endereco)]?.dispositivo.id ?? '';
  return { repo, aberta, indice, id, normaId: norma.id };
}

const SEM_FONTES: FontesDoFiltro = {
  estrelas: new Map(),
  marcados: new Set(),
  comErros: new Set(),
};

/** Os endereços dos nós, na ordem de leitura. */
const enderecos = (aberta: NormaAberta, indices: ReadonlySet<number>) =>
  [...indices]
    .sort((a, b) => a - b)
    .map((i) => aberta.nos[i]?.dispositivo.endereco)
    .filter((e) => e !== undefined);

/** O filtro sobre a árvore, sem os nós de rubrica (o leitor os dobra na linha do pai). */
function filtrar(aberta: NormaAberta, criterio: CriterioDoFiltro, fontes: FontesDoFiltro) {
  const r = aplicarFiltro(aberta.nos, aberta.indiceDe, criterio, fontes);
  return {
    casados: enderecos(aberta, r.casados),
    contexto: enderecos(aberta, r.visiveis).filter(
      (e) => !enderecos(aberta, r.casados).includes(e),
    ),
  };
}

describe('filtros do leitor', () => {
  it('estrelados: a Seção I propaga, o artigo em exceção sai, e o contexto sobe até o título', async () => {
    const { repo, aberta, id } = await publicada();
    const arvore = arvoreDaEstrela(aberta.norma.id, aberta.nos);
    await estrelar(repo, arvore, id('tit1.cap1.sec1'));
    await desestrelar(repo, arvore, id('art2'));
    const estrelas = estrelasEfetivas(
      arvore,
      porAlvo(await estrelasDaNorma(repo, aberta.norma.id)),
    );

    const { casados, contexto } = filtrar(
      aberta,
      { tipo: 'estrelados' },
      { ...SEM_FONTES, estrelas },
    );

    // A Seção I e o que está dentro dela, menos o art. 2 (exceção) e o que ele guarda (parágrafo,
    // inciso: a exceção só corta o nó, não o que está abaixo; abaixo dele a herança passa sem acender).
    expect(casados).toContain('tit1.cap1.sec1');
    expect(casados).toContain('art1');
    expect(casados).toContain('art3');
    expect(casados).not.toContain('art2');
    expect(casados).not.toContain('art4');
    // O contexto: o capítulo e o título acima da Seção I.
    expect(contexto).toEqual(['tit1', 'tit1.cap1']);
  });

  it('marcados e com erros: o dispositivo e os de cima dele, e só esses', async () => {
    const { aberta, id } = await publicada();
    const marcados = filtrar(
      aberta,
      { tipo: 'marcados' },
      { ...SEM_FONTES, marcados: new Set([id('art2.par1.incI')]) },
    );
    expect(marcados.casados).toEqual(['art2.par1.incI']);
    // Do inciso ao título: o parágrafo, o artigo (o caput), a Seção I, o capítulo e o título.
    expect(marcados.contexto).toEqual(['tit1', 'tit1.cap1', 'tit1.cap1.sec1', 'art2', 'art2.par1']);

    const erros = filtrar(
      aberta,
      { tipo: 'com_erros' },
      { ...SEM_FONTES, comErros: new Set([id('art4'), id('art1')]) },
    );
    expect(erros.casados).toEqual(['art1', 'art4']);
    expect(erros.contexto).toEqual(['tit1', 'tit1.cap1', 'tit1.cap1.sec1', 'tit1.cap1.sec2']);
  });

  it('nada que case: nenhum nó, nem contexto', async () => {
    const { aberta } = await publicada();
    for (const tipo of ['estrelados', 'marcados', 'com_erros'] as const) {
      const r = aplicarFiltro(aberta.nos, aberta.indiceDe, { tipo }, SEM_FONTES);
      expect(r.casados.size).toBe(0);
      expect(r.visiveis.size).toBe(0);
    }
  });

  it('trecho: de um artigo a outro com tudo o que está dentro do último; em qualquer ordem', async () => {
    const { aberta, indice } = await publicada();
    const esperado = [
      'art2',
      'art2.par1',
      'art2.par1.incI',
      'tit1.cap1.sec1.subsec1',
      'tit1.cap1.sec1.subsec1.nome',
      'art3',
    ];
    const direto = filtrar(
      aberta,
      {
        tipo: 'trecho',
        de: indice('art2'),
        ate: indice('art3'),
      },
      SEM_FONTES,
    );
    const invertido = filtrar(
      aberta,
      {
        tipo: 'trecho',
        de: indice('art3'),
        ate: indice('art2'),
      },
      SEM_FONTES,
    );
    expect(direto.casados).toEqual(esperado);
    expect(invertido).toEqual(direto);
    // O contexto do trecho: o título, o capítulo e a Seção I.
    expect(direto.contexto).toEqual(['tit1', 'tit1.cap1', 'tit1.cap1.sec1']);
  });

  it('trecho de um bloco: o nó e tudo o que há dentro dele (de === ate)', async () => {
    const { aberta, indice } = await publicada();
    const sec2 = indice('tit1.cap1.sec2');
    const r = aplicarFiltro(
      aberta.nos,
      aberta.indiceDe,
      { tipo: 'trecho', de: sec2, ate: sec2 },
      SEM_FONTES,
    );
    expect(enderecos(aberta, r.casados)).toEqual([
      'tit1.cap1.sec2',
      'tit1.cap1.sec2.nome',
      'art4',
      'art5',
    ]);
    expect(fimDaSubarvore(aberta.nos, sec2)).toBe(Math.max(...r.casados));
    // O último artigo da norma, sem filhos: o fim é ele mesmo.
    const ultimo = indice('art5');
    expect(fimDaSubarvore(aberta.nos, ultimo)).toBe(ultimo);
  });

  it('o nome do critério na frase da tela', () => {
    expect(nomeDoCriterio({ tipo: 'estrelados' })).toBe('estrelados');
    expect(nomeDoCriterio({ tipo: 'marcados' })).toBe('com grifo ou nota');
    expect(nomeDoCriterio({ tipo: 'com_erros' })).toBe('com erro vinculado');
    expect(nomeDoCriterio({ tipo: 'trecho', de: 1, ate: 2 }, 'Art. 1º a Art. 2º')).toBe(
      'Art. 1º a Art. 2º',
    );
  });
});
