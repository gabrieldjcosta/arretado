import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  estimarAltura,
  janelasQueCobrem,
  linhaDoNo,
  montarLinhas,
  referenciaDoNo,
  TEXTOS_POR_PEDIDO,
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
