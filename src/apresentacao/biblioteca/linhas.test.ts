import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  blocosAcima,
  estimarAltura,
  fimDaUnidade,
  janelasQueCobrem,
  linhaDoNo,
  montarLinhas,
  referenciaDe,
  referenciaDoNo,
  TEXTOS_POR_PEDIDO,
  unidadeDaLinha,
  unidadesDeLeitura,
} from './linhas';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('TÍTULO I'),
  linha('DO OBJETO'),
  linha('Objeto da execução'),
  linha('Art. 1º A execução penal tem por objetivo:'),
  linha('I - efetivar as disposições de sentença;'),
  linha('II - proporcionar condições:'),
  linha('a) para a harmônica integração;'),
  linha('§ 1º Este parágrafo tem incisos:'),
  linha('I - um;'),
  linha('Art. 2º A jurisdição penal será exercida.'),
  linha('Parágrafo único. Esta lei se aplica ao preso provisório.'),
];

async function abrir(blocos: Bloco[]) {
  const { repo } = await repositorioDeTeste();
  const { versao, norma } = await criarRascunho(repo, { blocos, origemEntrada: 'html' });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  return abrirNorma(repo, norma.id);
}

describe('linhas do leitor (9.6)', () => {
  it('dobra a rubrica no artigo e o nome no título, e dá o recuo abaixo do artigo', async () => {
    const aberta = await abrir(LEI);
    const linhas = montarLinhas(aberta.nos);
    const descrever = linhas.map((l) => {
      const no = aberta.nos[l.indice]!.dispositivo;
      const nome =
        l.indiceNome === undefined ? '' : ` +${aberta.nos[l.indiceNome]!.dispositivo.tipo}`;
      return `${no.rotulo ?? no.tipo}${nome} n${String(l.nivel)} r${String(l.recuo)}`;
    });
    expect(descrever).toEqual([
      'preambulo n0 r0',
      'TÍTULO I +nome n0 r0',
      'Art. 1º +nome n1 r0',
      'I n2 r1',
      'II n2 r1',
      'a) n3 r2',
      '§ 1º n2 r1',
      'I n3 r2',
      'Art. 2º n1 r0',
      'Parágrafo único n2 r1',
    ]);
    // Cada nó aparece uma vez: as linhas mais os nomes dobrados dão a árvore inteira.
    expect(linhas.length + linhas.filter((l) => l.indiceNome !== undefined).length).toBe(
      aberta.nos.length,
    );
  });

  it('o nome que não vem logo depois do pai vira linha própria', async () => {
    const aberta = await abrir(LEI);
    const nos = aberta.nos.slice();
    // Troca a rubrica de lugar: agora o pai dela não é o nó de antes.
    const i = nos.findIndex(
      (n, k) => n.dispositivo.tipo === 'nome' && nos[k - 1]?.dispositivo.tipo === 'artigo',
    );
    expect(i).toBeGreaterThan(0);
    const [nome] = nos.splice(i, 1);
    nos.splice(i + 1, 0, nome!);
    const linhas = montarLinhas(nos);
    expect(linhas.length).toBe(nos.length - 1);
    expect(linhas.some((l) => nos[l.indice]?.dispositivo.tipo === 'nome')).toBe(true);
  });
});

describe('posição no leitor (9.7)', () => {
  it('cada nó tem a sua linha; a rubrica e o nome dobrados valem a linha do pai', async () => {
    const aberta = await abrir(LEI);
    const linhas = montarLinhas(aberta.nos);
    const linhaDe = (endereco: string) => {
      const indice = aberta.nos.findIndex((n) => n.dispositivo.endereco === endereco);
      const linha = linhaDoNo(linhas, indice);
      return linha === undefined
        ? undefined
        : aberta.nos[linhas[linha]!.indice]!.dispositivo.endereco;
    };
    for (const endereco of ['preambulo', 'tit1', 'art1', 'art1.incII.alA', 'art2.parUnico']) {
      expect(linhaDe(endereco)).toBe(endereco);
    }
    expect(linhaDe('art1.nome')).toBe('art1');
    expect(linhaDe('tit1.nome')).toBe('tit1');
    // Toda linha é achada pelo próprio nó.
    linhas.forEach((l, i) => {
      expect(linhaDoNo(linhas, l.indice)).toBe(i);
    });
    expect(linhaDoNo([], 0)).toBeUndefined();
    expect(linhaDoNo(linhas.slice(1), 0)).toBeUndefined();
  });

  it('a referência do "lido até" vai do artigo ao nó', async () => {
    const aberta = await abrir(LEI);
    const referencia = (endereco: string) =>
      referenciaDoNo(
        aberta.nos,
        aberta.indiceDe,
        aberta.nos.findIndex((n) => n.dispositivo.endereco === endereco),
      );
    expect(referencia('art1')).toBe('Art. 1º');
    expect(referencia('art1.incII.alA')).toBe('Art. 1º, II, a)');
    expect(referencia('art1.par1.incI')).toBe('Art. 1º, § 1º, I');
    expect(referencia('art2.parUnico')).toBe('Art. 2º, Parágrafo único');
    expect(referencia('tit1')).toBe('TÍTULO I');
  });
});

describe('referência para citar (11.5)', () => {
  it('em minúsculas, com o título curto: "art. 1º, II, a), LEP"', async () => {
    const aberta = await abrir(LEI);
    const referencia = (endereco: string) =>
      referenciaDe(
        aberta.nos,
        aberta.indiceDe,
        aberta.nos.findIndex((n) => n.dispositivo.endereco === endereco),
        'LEP',
      );
    expect(referencia('art1')).toBe('art. 1º, LEP');
    expect(referencia('art1.incII.alA')).toBe('art. 1º, II, a), LEP');
    expect(referencia('art1.par1.incI')).toBe('art. 1º, § 1º, I, LEP');
    expect(referencia('art2.parUnico')).toBe('art. 2º, Parágrafo único, LEP');
    expect(referencia('tit1')).toBe('TÍTULO I, LEP');
  });
});

describe('janelas do leitor (9.6)', () => {
  it('cobrem o intervalo com janelas fixas alinhadas ao início', () => {
    const n = TEXTOS_POR_PEDIDO;
    expect(janelasQueCobrem(0, 10, 500)).toEqual([0]);
    expect(janelasQueCobrem(n - 1, n, 500)).toEqual([0, 1]);
    expect(janelasQueCobrem(-30, 5, 500)).toEqual([0]);
    expect(janelasQueCobrem(480, 900, 500)).toEqual([9]);
    expect(janelasQueCobrem(0, 10, 0)).toEqual([]);
    expect(janelasQueCobrem(700, 800, 500)).toEqual([]);
  });

  it('estima a altura pelo tipo e pelo tamanho do texto', () => {
    expect(estimarAltura('artigo', 18)).toBeGreaterThan(estimarAltura('inciso', 18));
    expect(estimarAltura('artigo', 24)).toBeGreaterThan(estimarAltura('artigo', 18));
  });
});

describe('unidades do artigo por artigo (11.8)', () => {
  it('uma unidade por artigo, com o que há abaixo dele; o título não é unidade', async () => {
    const aberta = await abrir(LEI);
    const linhas = montarLinhas(aberta.nos);
    const unidades = unidadesDeLeitura(linhas, aberta.nos);
    const rotulo = (i: number) => aberta.nos[linhas[i]!.indice]!.dispositivo.rotulo;
    // O preâmbulo (sem rótulo) é a primeira unidade; o título não é.
    expect(unidades.map(rotulo)).toEqual([undefined, 'Art. 1º', 'Art. 2º']);
    expect(fimDaUnidade(linhas, unidades, 1)).toBe(unidades[2]);
    expect(fimDaUnidade(linhas, unidades, 2)).toBe(linhas.length);
    // O art. 1º leva o caput, os incisos, a alínea e o § 1º com o inciso dele.
    expect(unidades[2]! - unidades[1]!).toBe(6);
  });

  it('acha a unidade de qualquer linha; o título vale o artigo que vem abaixo dele', async () => {
    const aberta = await abrir(LEI);
    const linhas = montarLinhas(aberta.nos);
    const unidades = unidadesDeLeitura(linhas, aberta.nos);
    const tituloI = linhas.findIndex(
      (l) => aberta.nos[l.indice]!.dispositivo.rotulo === 'TÍTULO I',
    );
    expect(unidadeDaLinha(linhas, unidades, tituloI)).toBe(1);
    expect(unidadeDaLinha(linhas, unidades, unidades[1]! + 3)).toBe(1);
    expect(unidadeDaLinha(linhas, unidades, unidades[2]!)).toBe(2);
    expect(unidadeDaLinha(linhas, unidades, linhas.length - 1)).toBe(2);
    expect(unidadeDaLinha(linhas, [], 0)).toBeUndefined();
  });

  it('os blocos acima do artigo, do mais alto ao mais baixo', async () => {
    const aberta = await abrir(LEI);
    const art1 = aberta.nos.findIndex((n) => n.dispositivo.rotulo === 'Art. 1º');
    const acima = blocosAcima(aberta.nos, aberta.indiceDe, art1);
    expect(acima.map((i) => aberta.nos[i]!.dispositivo.rotulo)).toEqual(['TÍTULO I']);
    // O parágrafo também enxerga o título, pelo artigo.
    const par = aberta.nos.findIndex((n) => n.dispositivo.rotulo === '§ 1º');
    expect(blocosAcima(aberta.nos, aberta.indiceDe, par)).toEqual(acima);
  });
});
