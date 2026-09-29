import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { sanitizarHtml, type Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma, lerJanela } from '../../dominios/legislacao/leitor';
import { gravarPosicao, obterLeitura } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { blocosDeNormaSintetica } from '../../testes/norma-sintetica';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('TÍTULO I'),
  linha('DO OBJETO'),
  linha('CAPÍTULO I'),
  linha('DA EXECUÇÃO'),
  linha('Objeto da execução'),
  linha('Art. 1º A execução penal tem por objetivo:'),
  linha('I - efetivar as disposições de sentença;'),
  linha('II - proporcionar condições:'),
  linha('a) para a harmônica integração;'),
  linha('§ 1º Este parágrafo tem incisos: (Incluído pela Lei nº 12.000, de 2009)'),
  linha('Art. 2º A jurisdição penal será exercida.'),
  linha('Art. 3º Ao condenado serão assegurados os direitos.'),
];

const COLADOS = import.meta.glob<string>('../../../corpus/normas/*.colado.html', {
  query: '?raw',
  import: 'default',
  eager: false,
});

/** Os blocos do colado do corpus (a página com todas as redações), como a tela Importar recebe. */
async function colado(id: string): Promise<Bloco[]> {
  const carregar = COLADOS[`../../../corpus/normas/${id}.colado.html`];
  if (!carregar) throw new Error(`sem colado: ${id}`);
  return sanitizarHtml(await carregar()).blocos;
}
const textoDoBloco = (b: Bloco) => b.trechos.map((t) => t.texto).join('');

async function publicar(repo: Repositorio, blocos: Bloco[], tituloCurto = 'LEP') {
  const { versao, norma } = await criarRascunho(repo, {
    blocos,
    origemEntrada: 'html',
    tituloCurto,
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  return norma;
}

function abrirLeitor(repo: Repositorio, caminho: string) {
  window.location.hash = caminho;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return usuario;
}

/** O dispositivo (por endereço) na tela. */
const dispositivo = (endereco: string) => {
  const el = document.querySelector<HTMLElement>(`[data-endereco="${endereco}"]`);
  if (!el) throw new Error(`sem ${endereco} na tela`);
  return el;
};

/** O jsdom não tem layout: cada linha mede 60 px, como se o navegador as medisse. */
let alturaOriginal: PropertyDescriptor | undefined;
beforeAll(() => {
  alturaOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 60,
  });
});
afterAll(() => {
  if (alturaOriginal) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', alturaOriginal);
});

describe('leitor da norma (9.6)', () => {
  it('a Biblioteca abre a norma ao tocar, com cabeçalhos aninhados e a rubrica acima do artigo', async () => {
    const { repo } = await repositorioDeTeste();
    await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, '#/biblioteca');
    await usuario.click(await screen.findByRole('link', { name: /LEP/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'LEP' })).toBeInTheDocument();
    // Título → capítulo → artigo: um nível a mais em cada degrau, a partir do 2.
    expect(await screen.findByRole('heading', { level: 2, name: /TÍTULO I/ })).toHaveTextContent(
      'DO OBJETO',
    );
    expect(screen.getByRole('heading', { level: 3, name: /CAPÍTULO I/ })).toHaveTextContent(
      'DA EXECUÇÃO',
    );
    const artigo1 = screen.getByRole('heading', { level: 4, name: 'Art. 1º' });
    const rubrica = screen.getByText('Objeto da execução');
    expect(
      rubrica.compareDocumentPosition(artigo1) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // A rubrica é dobrada no artigo: não vira linha nem cabeçalho à parte.
    expect(rubrica.closest('[data-endereco]')).toBe(dispositivo('art1'));
    expect(
      within(dispositivo('art1')).getByText(/A execução penal tem por objetivo/),
    ).toBeInTheDocument();

    // Recuo por nível abaixo do artigo: inciso 1, alínea 2.
    expect(dispositivo('art1.incI')).toHaveAttribute('data-recuo', '1');
    expect(dispositivo('art1.incII.alA')).toHaveAttribute('data-recuo', '2');
    expect(dispositivo('art1')).toHaveAttribute('data-recuo', '0');
    // A nota de vigência sai do texto e vem atenuada, ao fim.
    const paragrafo = dispositivo('art1.par1');
    expect(
      within(paragrafo).getByText('(Incluído pela Lei nº 12.000, de 2009)'),
    ).toBeInTheDocument();
    expect(within(paragrafo).getByRole('list', { name: 'Notas de vigência' })).toBeInTheDocument();
    // O "Voltar" leva à Biblioteca.
    await usuario.click(screen.getByRole('link', { name: '← Biblioteca' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Biblioteca' }),
    ).toBeInTheDocument();
  });

  it('só desenha o visível e só pede os textos dele: norma de 1 mil dispositivos', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, blocosDeNormaSintetica(1000), 'Sintética');
    const aberta = await abrirNorma(repo, norma.id);
    expect(aberta.nos.length).toBeGreaterThanOrEqual(1000);
    abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sintética' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelectorAll('.dispositivo').length).toBeGreaterThan(5);
    });
    expect(document.querySelectorAll('.dispositivo').length).toBeLessThan(60);
    // A altura total vem das linhas, não do que está desenhado.
    const lista = document.querySelector<HTMLElement>('.lista-leitor');
    expect(Number.parseInt(lista?.style.height ?? '0', 10)).toBeGreaterThan(20_000);
    // Os textos da primeira janela chegaram junto com a abertura.
    expect(document.querySelectorAll('.texto-carregando').length).toBe(0);
  });

  it('revogado em uma linha, expansível, com as notas e as redações (ECA, art. 233, do corpus)', async () => {
    const { repo } = await repositorioDeTeste();
    const eca = await colado('eca');
    // Do art. 232 ao art. 234: o art. 233 é todo tachado, com "(Revogado pela Lei…" sem fecho.
    const inicio = eca.findIndex((b) => textoDoBloco(b).startsWith('Art. 232.'));
    const fim = eca.findIndex((b) => textoDoBloco(b).startsWith('Art. 234.'));
    const norma = await publicar(repo, eca.slice(inicio, fim + 1), 'ECA');
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'ECA' });

    // Revogado: uma linha atenuada; o resto só ao expandir.
    const revogado = await screen.findByRole('button', { name: /Art\. 233 — \(revogado\)/ });
    expect(revogado).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/vigilância a tortura/)).not.toBeInTheDocument();
    await usuario.click(revogado);
    expect(revogado).toHaveAttribute('aria-expanded', 'true');
    const aberto = dispositivo('art233');
    const notas = within(aberto).getByRole('list', { name: 'Notas de vigência' });
    expect(within(notas).getByText(/Revogado pela Lei nº 9\.455/)).toBeInTheDocument();
    const anteriores = within(aberto).getByRole('list', { name: 'Texto anterior' });
    expect(within(anteriores).getByText(/vigilância a tortura/)).toBeInTheDocument();
    // Os §§ 1º a 3º, revogados do mesmo jeito, também numa linha só.
    expect(screen.getByRole('button', { name: /§ 1º — \(revogado\)/ })).toBeInTheDocument();
    await usuario.click(revogado);
    expect(screen.queryByText(/vigilância a tortura/)).not.toBeInTheDocument();
  }, 30_000);

  it('100% das redações anteriores ocultas: os indicadores da LEP com todas as redações somam as da norma', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, await colado('lep'), 'LEP');
    const aberta = await abrirNorma(repo, norma.id);
    const janela = [];
    for (let inicio = 0; inicio < aberta.nos.length; inicio += 200)
      janela.push(...(await lerJanela(repo, aberta, { inicio, quantidade: 200 })));
    const total = janela.reduce((n, i) => n + (i.texto?.redacoesAnteriores?.length ?? 0), 0);
    const revogadas = janela
      .filter((i) => i.dispositivo.status === 'revogado')
      .reduce((n, i) => n + (i.texto?.redacoesAnteriores?.length ?? 0), 0);
    expect(total).toBe(86);
    // A janela da tela cobre a norma inteira (o jsdom não tem layout: 60 px por linha).
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100_000 });
    try {
      abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
      await screen.findByRole('heading', { level: 1, name: 'LEP' });
      await waitFor(() => {
        expect(document.querySelectorAll('.texto-carregando')).toHaveLength(0);
        expect(dispositivo('art204')).toBeInTheDocument();
      });
      // Nenhum texto anterior à mostra; cada indicador diz quantas esconde.
      expect(screen.queryAllByRole('list', { name: 'Texto anterior' })).toHaveLength(0);
      const indicadores = screen.getAllByRole('button', { name: /^Mostrar \d+ redaç/ });
      const escondidas = indicadores.reduce(
        (n, b) => n + Number(/^Mostrar (\d+)/.exec(b.getAttribute('aria-label') ?? '')?.[1] ?? 0),
        0,
      );
      expect(escondidas + revogadas).toBe(total);
      // O revogado guarda as dele na linha fechada (art. 182: "Art. 182. ~~…~~ (Revogado…)").
      expect(screen.getByRole('button', { name: /Art\. 182 — \(revogado\)/ })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    } finally {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    }
  }, 60_000);

  it('o ajuste de tamanho é o global: muda a preferência e o texto de leitura', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });

    expect(await screen.findByLabelText('Tamanho atual do texto')).toHaveTextContent('18 px');
    await usuario.click(screen.getByRole('button', { name: /aumentar o texto/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Tamanho atual do texto')).toHaveTextContent('20 px');
    });
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--tamanho-leitura')).toBe('20px');
    });
    await usuario.click(screen.getByRole('button', { name: /diminuir o texto/ }));
    await usuario.click(screen.getByRole('button', { name: /diminuir o texto/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Tamanho atual do texto')).toHaveTextContent('16 px');
    });
  });

  it('norma sem versão vigente ou inexistente não abre e diz o motivo', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    expect(await screen.findByText(/ainda não foi publicada/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Biblioteca' })).toBeInTheDocument();

    act(() => {
      window.location.hash = '#/biblioteca/normas/nao-existe';
    });
    expect(await screen.findByText('Esta norma não existe mais.')).toBeInTheDocument();
  });
});

/** Rola a janela no jsdom (que não rola): a posição e o evento, como o navegador faria. */
function rolarPara(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('posição lembrada e "lido até" (9.7)', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('sair da norma grava a posição, e a Biblioteca oferece "Continuar leitura"', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    const usuario = abrirLeitor(repo, '#/biblioteca');
    await usuario.click(await screen.findByRole('link', { name: /LEP/ }));
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    // Abrir sem rolar não grava nada ainda.
    expect(await obterLeitura(repo, norma.id)).toBeUndefined();

    await usuario.click(screen.getByRole('link', { name: '← Biblioteca' }));
    const continuar = await screen.findByRole('link', { name: 'Continuar leitura: LEP' });
    expect(continuar).toHaveAttribute('href', `#/biblioteca/normas/${norma.id}`);
    expect(screen.getByRole('region', { name: 'Normas' })).toHaveTextContent('Última leitura:');
    // No alto da tela estava a primeira linha.
    expect((await obterLeitura(repo, norma.id))?.posicaoId).toBe(aberta.nos[0]!.dispositivo.id);
  });

  it('"Lido até aqui" marca o dispositivo no alto da tela; rolar não mexe nele', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    const idDe = (endereco: string) =>
      aberta.nos.find((n) => n.dispositivo.endereco === endereco)!.dispositivo.id;
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await waitFor(() => {
      expect(dispositivo('art2')).toBeInTheDocument();
    });

    // Cada linha mede 60 px: a 5ª (índice 4) é o inciso I do art. 1º.
    rolarPara(4 * 60);
    await usuario.click(screen.getByRole('button', { name: 'Lido até aqui' }));
    expect(screen.getByText('Lido até Art. 1º, I.')).toHaveAttribute('role', 'status');
    expect(dispositivo('art1.incI').parentElement).toHaveTextContent(/Lido até aqui$/);
    expect(document.querySelectorAll('.marca-lido-ate')).toHaveLength(1);
    expect(screen.getByText('Art. 1º, I', { selector: 'strong' })).toBeInTheDocument();
    await waitFor(async () => {
      expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBe(idDe('art1.incI'));
    });

    // Rolar e esconder a página grava a posição na hora (sem esperar a rolagem parar), e o
    // "lido até" fica onde o usuário o pôs.
    rolarPara(8 * 60);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await waitFor(
      async () => {
        expect(await obterLeitura(repo, norma.id)).toMatchObject({
          posicaoId: idDe('art2'),
          lidoAteId: idDe('art1.incI'),
        });
      },
      { timeout: 400 },
    );

    // Parar de rolar também grava.
    rolarPara(3 * 60);
    await waitFor(
      async () => {
        expect((await obterLeitura(repo, norma.id))?.posicaoId).toBe(idDe('art1'));
      },
      { timeout: 2000 },
    );
    expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBe(idDe('art1.incI'));
  });

  it('posição num dispositivo que a versão não tem: abre no começo, sem erro', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, crypto.randomUUID());
    abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'LEP' })).toBeInTheDocument();
    await waitFor(() => {
      expect(dispositivo('art1')).toBeInTheDocument();
    });
    expect(document.querySelector('.lista-leitor')).not.toHaveClass('voltando');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
