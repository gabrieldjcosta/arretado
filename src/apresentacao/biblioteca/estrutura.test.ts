import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma, type NormaAberta } from '../../dominios/legislacao/leitor';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  ehBloco,
  estadoDoBloco,
  indiceDaEstrutura,
  RAIZ,
  temEstrutura,
  vistaDaEstrutura,
} from './estrutura';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });

const LEI: Bloco[] = [
  linha('LEI Nº 100, DE 1 DE JANEIRO DE 2000.'),
  linha('Dispõe sobre a estrutura.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta:'),
  linha('TÍTULO I'),
  linha('DO OBJETO'),
  linha('CAPÍTULO I'),
  linha('Das Regras'),
  linha('Seção I'),
  linha('Disposições Gerais'),
  linha('Art. 1º Primeiro artigo.'),
  linha('Art. 2º Segundo artigo.'),
  linha('Seção II'),
  linha('Dos Regimes'),
  linha('Art. 3º Terceiro artigo.'),
  linha('CAPÍTULO II'),
  linha('Das Exceções'),
  linha('Art. 4º Quarto artigo.'),
  linha('TÍTULO II'),
  linha('DO FIM'),
  linha('Art. 5º Quinto artigo.'),
];

// Cada artigo tem a rubrica acima (a última linha de cada capítulo é a rubrica dobrada no artigo).
const COM_RUBRICA: Bloco[] = [
  linha('LEI Nº 102, DE 1 DE JANEIRO DE 2000.'),
  linha('Dispõe sobre rubricas.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta:'),
  linha('CAPÍTULO I'),
  linha('Das Regras'),
  linha('Do prazo'),
  linha('Art. 1º Primeiro artigo.'),
  linha('Da forma'),
  linha('Art. 2º Segundo artigo.'),
  linha('CAPÍTULO II'),
  linha('Das Exceções'),
  linha('Da ação'),
  linha('Art. 3º Terceiro artigo.'),
];

const SEM_ESTRUTURA: Bloco[] = [
  linha('LEI Nº 101, DE 1 DE JANEIRO DE 2000.'),
  linha('Dispõe sobre pouca coisa.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta:'),
  linha('Art. 1º Primeiro artigo.'),
  linha('Art. 2º Segundo artigo.'),
];

async function abrir(blocos: Bloco[]): Promise<NormaAberta> {
  const { repo } = await repositorioDeTeste();
  const { versao, norma } = await criarRascunho(repo, { blocos, origemEntrada: 'html' });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  return abrirNorma(repo, norma.id);
}

describe('estrutura da norma (P4 do Ponto de luz)', () => {
  it('só os nós estruturais com rótulo são blocos; a rubrica (nome) e o artigo não', async () => {
    const aberta = await abrir(LEI);
    const blocos = aberta.nos.filter((no) => ehBloco(no)).map((no) => no.dispositivo.rotulo);
    expect(blocos).toEqual([
      'TÍTULO I',
      'CAPÍTULO I',
      'Seção I',
      'Seção II',
      'CAPÍTULO II',
      'TÍTULO II',
    ]);
  });

  it('norma sem título nem capítulo não tem estrutura', async () => {
    const com = indiceDaEstrutura((await abrir(LEI)).nos);
    const sem = indiceDaEstrutura((await abrir(SEM_ESTRUTURA)).nos);
    expect(temEstrutura(com)).toBe(true);
    expect(temEstrutura(sem)).toBe(false);
    expect(vistaDaEstrutura(sem, 0)).toEqual({ acima: [], itens: [], aqui: undefined });
  });

  it('acha o bloco mais fundo de cada nó, onde cada bloco termina e quem está dentro de quem', async () => {
    const aberta = await abrir(LEI);
    const ix = (rotulo: string) => aberta.nos.findIndex((n) => n.dispositivo.rotulo === rotulo);
    const e = indiceDaEstrutura(aberta.nos);
    // O preâmbulo está antes de qualquer bloco; o bloco contém a si mesmo e a rubrica dele.
    expect(e.dentroDe[0]).toBe(RAIZ);
    expect(e.dentroDe[ix('Seção II')]).toBe(ix('Seção II'));
    expect(e.dentroDe[ix('Seção II') + 1]).toBe(ix('Seção II'));
    expect(e.dentroDe[ix('Art. 3º')]).toBe(ix('Seção II'));
    expect(e.dentroDe[ix('Art. 4º')]).toBe(ix('CAPÍTULO II'));
    expect(e.dentroDe[ix('Art. 5º')]).toBe(ix('TÍTULO II'));
    // O bloco termina no próximo nó de nível igual ou menor.
    expect(e.fim[ix('Seção I')]).toBe(ix('Seção II'));
    expect(e.fim[ix('Seção II')]).toBe(ix('CAPÍTULO II'));
    expect(e.fim[ix('CAPÍTULO I')]).toBe(ix('CAPÍTULO II'));
    expect(e.fim[ix('TÍTULO I')]).toBe(ix('TÍTULO II'));
    expect(e.fim[ix('TÍTULO II')]).toBe(aberta.nos.length);
    // Pais e filhos.
    expect(e.pai[ix('Seção I')]).toBe(ix('CAPÍTULO I'));
    expect(e.pai[ix('CAPÍTULO II')]).toBe(ix('TÍTULO I'));
    expect(e.pai[ix('TÍTULO I')]).toBe(RAIZ);
    expect(e.filhos.get(RAIZ)).toEqual([ix('TÍTULO I'), ix('TÍTULO II')]);
    expect(e.filhos.get(ix('TÍTULO I'))).toEqual([ix('CAPÍTULO I'), ix('CAPÍTULO II')]);
    expect(e.filhos.get(ix('CAPÍTULO I'))).toEqual([ix('Seção I'), ix('Seção II')]);
    expect(e.filhos.get(ix('Seção I'))).toBeUndefined();
  });

  it('a vista lista o bloco de agora e os irmãos dele, com os blocos de dentro dele e o caminho acima', async () => {
    const aberta = await abrir(LEI);
    const ix = (rotulo: string) => aberta.nos.findIndex((n) => n.dispositivo.rotulo === rotulo);
    const e = indiceDaEstrutura(aberta.nos);
    const item = (rotulo: string, dentro: string[] = []) => ({
      bloco: ix(rotulo),
      dentro: dentro.map(ix),
    });
    // Dentro de uma seção: as seções irmãs, ela é a de agora, o título e o capítulo acima.
    expect(vistaDaEstrutura(e, ix('Art. 3º'))).toEqual({
      acima: [ix('TÍTULO I'), ix('CAPÍTULO I')],
      itens: [item('Seção I'), item('Seção II')],
      aqui: ix('Seção II'),
    });
    // Num capítulo sem seções: os capítulos irmãos, e o de agora sem nada dentro.
    expect(vistaDaEstrutura(e, ix('Art. 4º'))).toEqual({
      acima: [ix('TÍTULO I')],
      itens: [item('CAPÍTULO I'), item('CAPÍTULO II')],
      aqui: ix('CAPÍTULO II'),
    });
    // No cabeçalho do capítulo que tem seções: ele é o de agora, com as seções dele logo abaixo.
    expect(vistaDaEstrutura(e, ix('CAPÍTULO I'))).toEqual({
      acima: [ix('TÍTULO I')],
      itens: [item('CAPÍTULO I', ['Seção I', 'Seção II']), item('CAPÍTULO II')],
      aqui: ix('CAPÍTULO I'),
    });
    // No título: os títulos, ele de agora, com os capítulos dele abaixo. É o degrau de cima.
    expect(vistaDaEstrutura(e, ix('TÍTULO I'))).toEqual({
      acima: [],
      itens: [item('TÍTULO I', ['CAPÍTULO I', 'CAPÍTULO II']), item('TÍTULO II')],
      aqui: ix('TÍTULO I'),
    });
    // Título sem capítulos: os títulos irmãos, e nada dentro do de agora.
    expect(vistaDaEstrutura(e, ix('Art. 5º'))).toEqual({
      acima: [],
      itens: [item('TÍTULO I'), item('TÍTULO II')],
      aqui: ix('TÍTULO II'),
    });
    // Antes do primeiro bloco: os de cima, sem nenhum de agora.
    expect(vistaDaEstrutura(e, 0)).toEqual({
      acima: [],
      itens: [item('TÍTULO I'), item('TÍTULO II')],
      aqui: undefined,
    });
  });

  it('subir um nível é ir ao bloco do caminho: a lista passa a ser a dos irmãos dele', async () => {
    const aberta = await abrir(LEI);
    const ix = (rotulo: string) => aberta.nos.findIndex((n) => n.dispositivo.rotulo === rotulo);
    const e = indiceDaEstrutura(aberta.nos);
    // De dentro da Seção II, o caminho é [TÍTULO I, CAPÍTULO I]; ir ao CAPÍTULO I deixa os dois
    // capítulos à vista, e ir ao TÍTULO I, os dois títulos.
    const daSecao = vistaDaEstrutura(e, ix('Art. 3º'));
    const noCapitulo = vistaDaEstrutura(e, daSecao.acima[1] ?? -1);
    expect(noCapitulo.itens.map((i) => i.bloco)).toEqual([ix('CAPÍTULO I'), ix('CAPÍTULO II')]);
    const noTitulo = vistaDaEstrutura(e, daSecao.acima[0] ?? -1);
    expect(noTitulo.itens.map((i) => i.bloco)).toEqual([ix('TÍTULO I'), ix('TÍTULO II')]);
  });

  it('o estado do bloco vem do "lido até": falta, atual (dentro) e feito (passou do último nó)', async () => {
    const aberta = await abrir(LEI);
    const ix = (rotulo: string) => aberta.nos.findIndex((n) => n.dispositivo.rotulo === rotulo);
    const e = indiceDaEstrutura(aberta.nos);
    const estados = (lidoAte: number | undefined) =>
      ['Seção I', 'Seção II', 'CAPÍTULO II'].map((r) => estadoDoBloco(e, ix(r), lidoAte));
    // Sem "lido até", nada foi lido.
    expect(estados(undefined)).toEqual(['falta', 'falta', 'falta']);
    // No cabeçalho da Seção I: ela começou.
    expect(estados(ix('Seção I'))).toEqual(['atual', 'falta', 'falta']);
    // No primeiro artigo da Seção I: ainda dentro dela.
    expect(estados(ix('Art. 1º'))).toEqual(['atual', 'falta', 'falta']);
    // No último nó da Seção I: ela está feita, a Seção II ainda não.
    expect(estados(ix('Seção II') - 1)).toEqual(['feito', 'falta', 'falta']);
    // Dentro da Seção II.
    expect(estados(ix('Seção II'))).toEqual(['feito', 'atual', 'falta']);
    // No último nó do capítulo I: as duas seções estão feitas.
    expect(estados(ix('CAPÍTULO II') - 1)).toEqual(['feito', 'feito', 'falta']);
    // Num artigo do capítulo II, que tem um artigo só e a rubrica dele: dentro.
    expect(estados(ix('CAPÍTULO II'))).toEqual(['feito', 'feito', 'atual']);
    // No fim da norma, tudo feito.
    expect(estados(aberta.nos.length - 1)).toEqual(['feito', 'feito', 'feito']);
  });

  it('o "lido até" marca o dispositivo, nunca a rubrica: o bloco que termina numa rubrica fica feito no último artigo', async () => {
    const aberta = await abrir(COM_RUBRICA);
    const ix = (rotulo: string) => aberta.nos.findIndex((n) => n.dispositivo.rotulo === rotulo);
    const e = indiceDaEstrutura(aberta.nos);
    const estados = (lidoAte: number) =>
      ['CAPÍTULO I', 'CAPÍTULO II'].map((r) => estadoDoBloco(e, ix(r), lidoAte));
    // A rubrica vem logo depois do artigo na árvore, e fecha o capítulo (é o último nó dele).
    expect(aberta.nos[ix('Art. 2º') + 1]?.dispositivo.tipo).toBe('nome');
    expect(e.fim[ix('CAPÍTULO I')]).toBe(ix('CAPÍTULO II'));
    expect(e.ultimo[ix('CAPÍTULO I')]).toBe(ix('Art. 2º'));
    // No art. 2º, que o "lido até" alcança (a rubrica dele não), o capítulo I está feito.
    expect(estados(ix('Art. 1º'))).toEqual(['atual', 'falta']);
    expect(estados(ix('Art. 2º'))).toEqual(['feito', 'falta']);
    // No fim da norma, a última rubrica é do último artigo, e o último capítulo também fecha.
    expect(e.ultimo[ix('CAPÍTULO II')]).toBe(ix('Art. 3º'));
    expect(estados(ix('Art. 3º'))).toEqual(['feito', 'feito']);
  });
});
