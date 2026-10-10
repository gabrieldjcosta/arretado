import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import { sanitizarHtml, type Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma, lerJanela } from '../../dominios/legislacao/leitor';
import { gravarPosicao, marcarLidoAte, obterLeitura } from '../../dominios/legislacao/leituras';
import { criarGrifo } from '../../dominios/legislacao/marcacoes';
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

  it('vetado em uma linha atenuada, como o revogado: a nota ao expandir, sem repetir o "(VETADO)" (ECA, art. 89-A, do corpus; 8.10)', async () => {
    const { repo } = await repositorioDeTeste();
    const eca = await colado('eca');
    // O art. 89-A tem o inciso IX e o parágrafo único vetados, cada um com a nota da inclusão.
    const inicio = eca.findIndex((b) => textoDoBloco(b).startsWith('Art. 89-A.'));
    const fim = eca.findIndex((b) => textoDoBloco(b).startsWith('Art. 90.'));
    const norma = await publicar(repo, eca.slice(inicio, fim + 1), 'ECA');
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'ECA' });

    const vetado = await screen.findByRole('button', { name: /Parágrafo único — \(vetado\)/ });
    expect(dispositivo('art89A.parUnico')).toHaveClass('vetado');
    expect(vetado).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /IX — \(vetado\)/ })).toBeInTheDocument();
    expect(screen.queryByText(/VETADO/)).not.toBeInTheDocument();
    await usuario.click(vetado);
    expect(vetado).toHaveAttribute('aria-expanded', 'true');
    const aberto = dispositivo('art89A.parUnico');
    const notas = within(aberto).getByRole('list', { name: 'Notas de vigência' });
    expect(within(notas).getByText(/Incluído pela Lei nº 15\.426, de 2026/)).toBeInTheDocument();
    // O "(VETADO)" é o esqueleto que a legenda já diz: não vira texto ao abrir.
    expect(within(aberto).queryByText(/VETADO/)).not.toBeInTheDocument();
    // O inciso vigente ao lado continua com o texto.
    expect(within(dispositivo('art89A.incI')).getByText(/promover a defesa/)).toBeInTheDocument();
  }, 30_000);

  it('vetado só com o esqueleto (rubrica e texto "(VETADO)"): linha sem expansão; a redação anterior fica na linha fechada (8.10)', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, [
      ...LEI,
      linha('(VETADO)'),
      linha('Art. 4º (VETADO).'),
      { trechos: [{ texto: 'Art. 5º Texto antigo.', tachado: true }] },
      linha('Art. 5º (VETADO).'),
    ]);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await waitFor(() => {
      expect(within(dispositivo('art4')).getByText('Art. 4º — (vetado)')).toBeInTheDocument();
    });
    expect(within(dispositivo('art4')).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/VETADO/)).not.toBeInTheDocument();
    const quinto = screen.getByRole('button', { name: /Art\. 5º — \(vetado\)/ });
    expect(screen.queryByText(/Texto antigo/)).not.toBeInTheDocument();
    await usuario.click(quinto);
    const anteriores = within(dispositivo('art5')).getByRole('list', { name: 'Texto anterior' });
    expect(within(anteriores).getByText(/Texto antigo/)).toBeInTheDocument();
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

/** Prazo, condição, termo absoluto e pena; o art. 5º com a redação anterior tachada (8.6). */
const LEI_COM_DESTAQUES: Bloco[] = [
  ...LEI.slice(0, 3),
  linha('Art. 1º O juiz decidirá no prazo de 5 (cinco) dias, salvo motivo justificado.'),
  linha('Art. 2º Qualquer condenado poderá requerer.'),
  linha('Pena - reclusão, de 2 (dois) a 8 (oito) anos, e multa.'),
  { trechos: [{ texto: 'Art. 3º O recurso será julgado em 30 (trinta) dias.', tachado: true }] },
  linha(
    'Art. 3º O recurso será julgado em 60 (sessenta) dias. (Redação dada pela Lei nº 13.000, de 2015)',
  ),
];

describe('destaque automático (9.8)', () => {
  const destaques = (endereco: string) =>
    [...dispositivo(endereco).querySelectorAll('.destaque')].map((el) => [
      el.textContent,
      el.className,
    ]);

  it('desligado por padrão; o botão "Destaques" liga, grava a preferência global e mostra a legenda', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI_COM_DESTAQUES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await waitFor(() => {
      expect(dispositivo('art1')).toHaveTextContent('salvo motivo justificado');
    });
    const botao = screen.getByRole('button', { name: 'Destaques' });
    expect(botao).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('.destaque')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Legenda dos destaques' })).toBeNull();
    const textoAntes = dispositivo('art1').textContent;

    await usuario.click(botao);
    expect(botao).toHaveAttribute('aria-pressed', 'true');
    expect(destaques('art1')).toEqual([
      ['prazo de 5 (cinco) dias', 'destaque destaque-prazo'],
      ['salvo', 'destaque destaque-condicao'],
    ]);
    expect(destaques('art2')).toEqual([
      ['Qualquer', 'destaque destaque-absoluto'],
      ['reclusão, de 2 (dois) a 8 (oito) anos', 'destaque destaque-pena'],
      ['e multa', 'destaque destaque-pena'],
    ]);
    // O texto não muda: o destaque só parte os trechos.
    expect(dispositivo('art1').textContent).toBe(textoAntes);
    expect(screen.getByRole('list', { name: 'Legenda dos destaques' })).toBeInTheDocument();
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).destacarCondicionantesEPrazos).toBe(true);
    });

    await usuario.click(botao);
    expect(botao).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('.destaque')).toBeNull();
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).destacarCondicionantesEPrazos).toBe(false);
    });
  });

  it('com a preferência ligada, abre aceso; só o texto vigente acende (a redação anterior não)', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { destacarCondicionantesEPrazos: true });
    const norma = await publicar(repo, LEI_COM_DESTAQUES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await waitFor(() => {
      expect(destaques('art3')).toEqual([['60 (sessenta) dias', 'destaque destaque-prazo']]);
    });
    expect(screen.getByRole('button', { name: 'Destaques' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await usuario.click(
      within(dispositivo('art3')).getByRole('button', { name: /Mostrar 1 redação/ }),
    );
    const anterior = within(dispositivo('art3')).getByRole('list', { name: 'Texto anterior' });
    expect(anterior).toHaveTextContent('30 (trinta) dias');
    expect(anterior.querySelector('.destaque')).toBeNull();
  });
});

describe('régua de leitura (fatia 4)', () => {
  const comRegua = () => document.querySelectorAll('[data-regua]');

  it('desligada por padrão: nenhuma linha recebe o realce', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI_COM_DESTAQUES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await usuario.hover(within(dispositivo('art1')).getByText(/prazo de 5/));
    expect(comRegua()).toHaveLength(0);
  });

  it('ligada: realça só a linha sob o ponteiro, que muda com ele, e o foco também', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { reguaDeLeitura: true });
    const norma = await publicar(repo, LEI_COM_DESTAQUES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await waitFor(() => {
      expect(dispositivo('art1')).toBeInTheDocument();
    });
    await usuario.hover(within(dispositivo('art1')).getByText(/prazo de 5/));
    await waitFor(() => {
      expect(comRegua()).toHaveLength(1);
    });
    expect(dispositivo('art1').closest('.linha-leitor')).toHaveAttribute('data-regua');
    await usuario.hover(within(dispositivo('art2')).getByText(/Qualquer condenado/));
    await waitFor(() => {
      expect(dispositivo('art2').closest('.linha-leitor')).toHaveAttribute('data-regua');
    });
    expect(comRegua()).toHaveLength(1);
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

describe('modo foco (11.1)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.modoFoco;
  });

  const barraDoLeitor = () => screen.queryByRole('group', { name: 'Tamanho do texto' });

  it('"Modo foco" deixa só o texto (rota ?foco=texto, moldura escondida) e "Sair do foco" desfaz a entrada do histórico', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    // Com a legenda dos destaques e a linha do "lido até" à vista fora do modo foco.
    await alterarPreferencias(repo, { destacarCondicionantesEPrazos: true });
    const art1 = aberta.nos.find((n) => n.dispositivo.endereco === 'art1')!.dispositivo.id;
    await marcarLidoAte(repo, norma.id, art1);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    await waitFor(() => {
      expect(dispositivo('art2')).toBeInTheDocument();
    });
    expect(barraDoLeitor()).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Legenda dos destaques' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir ao lido até' })).toBeInTheDocument();
    const entrada = (window.history.state as { idx?: number } | null)?.idx;
    const entrar = screen.getByRole('button', { name: 'Modo foco' });
    expect(entrar).toHaveAttribute('aria-keyshortcuts', 'F');

    await usuario.click(entrar);
    const sair = await screen.findByRole('button', { name: 'Sair do foco' });
    // O mesmo botão: o foco do teclado continua nele.
    expect(sair).toBe(entrar);
    expect(sair).toHaveFocus();
    expect(sair).toHaveAttribute('aria-keyshortcuts', 'F Escape');
    expect(window.location.hash).toBe(`#/biblioteca/normas/${norma.id}?foco=texto`);
    expect(document.documentElement).toHaveAttribute('data-modo-foco', 'texto');
    expect(barraDoLeitor()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Destaques' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '← Biblioteca' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Legenda dos destaques' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ir ao lido até' })).not.toBeInTheDocument();
    // A marca do "lido até" é do texto: continua na linha.
    expect(dispositivo('art1').parentElement).toHaveTextContent(/Lido até aqui$/);
    // O título fica para o leitor de tela; o texto e o "Lido até aqui" continuam.
    expect(screen.getByRole('heading', { level: 1, name: 'LEP' })).toHaveClass(
      'visualmente-oculto',
    );
    expect(dispositivo('art1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lido até aqui' })).toBeInTheDocument();
    expect(screen.getByText('Modo foco: só o texto.')).toHaveAttribute('role', 'status');

    await usuario.click(sair);
    await waitFor(() => {
      expect(window.location.hash).toBe(`#/biblioteca/normas/${norma.id}`);
    });
    expect(await screen.findByRole('group', { name: 'Tamanho do texto' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-modo-foco');
    expect(screen.getByRole('button', { name: 'Modo foco' })).toHaveFocus();
    // Voltou à entrada de antes (navigate(-1)), sem empilhar nem trocar uma nova.
    expect((window.history.state as { idx?: number } | null)?.idx).toBe(entrada);
  });

  it('atalho: F entra e sai, Esc sai; nunca em campo de texto, em diálogo aberto, com Ctrl ou com a tecla presa', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });
    const emFoco = () => document.documentElement.hasAttribute('data-modo-foco');

    await usuario.keyboard('f');
    await waitFor(() => {
      expect(emFoco()).toBe(true);
    });
    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(emFoco()).toBe(false);
    });
    await usuario.keyboard('F');
    await waitFor(() => {
      expect(emFoco()).toBe(true);
    });
    await usuario.keyboard('f');
    await waitFor(() => {
      expect(emFoco()).toBe(false);
    });
    // Esc fora do modo foco não faz nada.
    await usuario.keyboard('{Escape}');
    expect(emFoco()).toBe(false);

    // Com o foco num controle da barra do leitor, que sai: o foco vai para o botão do canto.
    act(() => {
      screen.getByRole('button', { name: 'Destaques' }).focus();
    });
    await usuario.keyboard('f');
    expect(await screen.findByRole('button', { name: 'Sair do foco' })).toHaveFocus();
    await usuario.keyboard('f');
    expect(await screen.findByRole('button', { name: 'Modo foco' })).toHaveFocus();
    act(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });

    // Ctrl+F é a busca do navegador; a tecla presa não alterna sem parar.
    await usuario.keyboard('{Control>}f{/Control}');
    expect(emFoco()).toBe(false);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', repeat: true }));
    });
    expect(emFoco()).toBe(false);

    // Num campo de texto (e num diálogo aberto), a tecla é do campo.
    const campo = document.createElement('input');
    document.body.append(campo);
    await usuario.click(campo);
    await usuario.keyboard('f');
    expect(campo).toHaveValue('f');
    expect(emFoco()).toBe(false);
    campo.remove();
    const dialogo = document.createElement('dialog');
    dialogo.setAttribute('open', '');
    const botao = document.createElement('button');
    dialogo.append(botao);
    document.body.append(dialogo);
    botao.focus();
    await usuario.keyboard('f');
    expect(emFoco()).toBe(false);
    dialogo.remove();
  });

  it('aberto pela rota com ?foco=texto (recarregar, endereço salvo): já no modo foco, e sair troca a rota no lugar', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    const sair = await screen.findByRole('button', { name: 'Sair do foco' });
    expect(document.documentElement).toHaveAttribute('data-modo-foco', 'texto');
    expect(barraDoLeitor()).not.toBeInTheDocument();
    const entradas = window.history.length;

    await usuario.click(sair);
    expect(await screen.findByRole('group', { name: 'Tamanho do texto' })).toBeInTheDocument();
    expect(window.location.hash).toBe(`#/biblioteca/normas/${norma.id}`);
    expect(window.history.length).toBe(entradas);
    expect(document.documentElement).not.toHaveAttribute('data-modo-foco');
  });

  it('sair da norma no modo foco devolve a moldura e grava a posição', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    await screen.findByRole('button', { name: 'Sair do foco' });
    expect(document.documentElement).toHaveAttribute('data-modo-foco', 'texto');

    // O atalho "E" do Shell (registrar erro) continua valendo e leva para fora do leitor.
    await usuario.keyboard('e');
    expect(await screen.findByRole('heading', { level: 1, name: /Registrar erro/ })).toBeVisible();
    expect(document.documentElement).not.toHaveAttribute('data-modo-foco');
    expect((await obterLeitura(repo, norma.id))?.posicaoId).toBe(aberta.nos[0]!.dispositivo.id);
  });
});

describe('busca dentro da norma (11.6)', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('por texto, sem acento e sem caixa: o achado vai ao alto da tela, marcado, sem mexer no "lido até"', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });

    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Buscar na norma' });
    const campo = within(dialogo).getByRole('searchbox', { name: 'Texto ou endereço' });
    expect(campo).toHaveFocus();
    // F e E no campo são letras, não atalhos (modo foco, registrar erro).
    await usuario.type(campo, 'FE');
    expect(window.location.hash).not.toContain('foco=');
    await usuario.clear(campo);
    await usuario.type(campo, 'HARMONICA');
    expect(await within(dialogo).findByText('1 achado no texto.')).toBeInTheDocument();
    const achado = within(dialogo).getByRole('button', { name: /^Art\. 1º, II, a\)/ });
    expect(within(achado).getByText('harmônica', { selector: 'mark' })).toBeInTheDocument();

    await usuario.click(achado);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Na busca: Art. 1º, II, a).')).toHaveAttribute('role', 'status');
    await waitFor(() => {
      expect(dispositivo('art1.incII.alA').closest('.linha-leitor')).toHaveClass('achado-da-busca');
    });
    expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBeUndefined();

    // Reabrir mostra a mesma consulta e os mesmos achados (o Esc do diálogo nativo não roda no jsdom).
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('searchbox')).toHaveValue('HARMONICA');
    expect(screen.getByText('1 achado no texto.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('por endereço ("art. 2", "§ 1º do 1"); o que a norma não tem leva ao mais próximo; Enter vai', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });

    // O atalho "/" abre a busca (e não vai parar no campo).
    await usuario.keyboard('/');
    const campo = await screen.findByRole('searchbox', { name: 'Texto ou endereço' });
    expect(campo).toHaveValue('');
    await usuario.type(campo, '§ 1º do 1');
    expect(
      await screen.findByRole('button', { name: 'Ir para Art. 1º, § 1º' }),
    ).toBeInTheDocument();

    await usuario.clear(campo);
    await usuario.type(campo, '§ 9º do 1');
    expect(
      await screen.findByText('Esse dispositivo não existe nesta norma. O mais próximo:'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para Art. 1º' })).toBeInTheDocument();

    await usuario.clear(campo);
    await usuario.type(campo, 'art. 99');
    expect(
      await screen.findByText('Nenhum dispositivo com esse endereço nesta norma.'),
    ).toBeInTheDocument();

    await usuario.clear(campo);
    await usuario.type(campo, 'art. 3{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Na busca: Art. 3º.')).toHaveAttribute('role', 'status');
    await waitFor(() => {
      expect(dispositivo('art3').closest('.linha-leitor')).toHaveClass('achado-da-busca');
    });
  });

  it('no modo foco, a busca fica no grupo fixo e não sai do modo foco', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    await screen.findByRole('button', { name: 'Sair do foco' });
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    await usuario.type(await screen.findByRole('searchbox'), 'jurisdicao{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.hash).toContain('foco=texto');
    expect(screen.getByRole('button', { name: 'Sair do foco' })).toBeInTheDocument();
    await waitFor(() => {
      expect(dispositivo('art2').closest('.linha-leitor')).toHaveClass('achado-da-busca');
    });
  });
});

describe('grifos e notas (11.4)', () => {
  afterEach(() => {
    document.getSelection()?.removeAllRanges();
    delete document.documentElement.dataset.modoFoco;
  });

  /** O nó de texto do dispositivo que contém o texto dado. */
  function noDe(endereco: string, texto: string): Text {
    const andar = document.createTreeWalker(dispositivo(endereco), NodeFilter.SHOW_TEXT);
    for (let no = andar.nextNode(); no; no = andar.nextNode()) {
      if (no.textContent?.includes(texto)) return no as Text;
    }
    throw new Error(`sem "${texto}" em ${endereco}`);
  }

  /** Seleciona do texto `de` (no endereço) até o fim do texto `ate`, como o mouse ou o toque. */
  function selecionar(endereco: string, de: string, ate = de, enderecoFim = endereco) {
    const a = noDe(endereco, de);
    const b = noDe(enderecoFim, ate);
    act(() => {
      document
        .getSelection()
        ?.setBaseAndExtent(a, a.data.indexOf(de), b, b.data.indexOf(ate) + ate.length);
      document.dispatchEvent(new Event('selectionchange'));
    });
  }

  const anuncio = () => document.querySelector('.acoes-leitor [role="status"]');

  const marcacoesGravadas = (repo: Repositorio) =>
    repo
      .colecao('marcacoes')
      .listarPagina({ limite: 50 })
      .then((p) => p.itens);

  it('selecionar troca o grupo fixo pelas cores; grifar, escolher o grifo, trocar a cor e tirar', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A execução penal tem por objetivo/);

    selecionar('art1', 'execução penal');
    const acoes = await screen.findByRole('group', { name: 'Marcar o trecho selecionado' });
    expect(screen.queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument();
    expect(anuncio()).toHaveTextContent('Trecho selecionado');
    await usuario.click(within(acoes).getByRole('button', { name: 'Grifar com a cor 2' }));

    const grifo = await waitFor(() => {
      const el = dispositivo('art1').querySelector('mark.grifo');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(grifo).toHaveTextContent('execução penal');
    expect(grifo).toHaveClass('grifo-2');
    // O grupo fixo volta, e o grifo está gravado com a âncora no texto gravado.
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    const [gravada] = await marcacoesGravadas(repo);
    expect(gravada).toMatchObject({
      tipo: 'grifo',
      cor: 2,
      status: 'valida',
      ancora: { texto: 'execução penal', inicio: 2, fim: 16 },
    });

    // Tocar no grifo o escolhe: trocar a cor e tirar.
    await usuario.click(grifo);
    const doGrifo = await screen.findByRole('group', { name: 'Grifo escolhido' });
    expect(within(doGrifo).getByRole('button', { name: 'Cor 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(grifo).toHaveClass('grifo-escolhido');
    await usuario.click(within(doGrifo).getByRole('button', { name: 'Cor 3' }));
    await waitFor(() => {
      expect(dispositivo('art1').querySelector('mark.grifo')).toHaveClass('grifo-3');
    });
    expect((await marcacoesGravadas(repo))[0]?.cor).toBe(3);
    await usuario.click(
      within(screen.getByRole('group', { name: 'Grifo escolhido' })).getByRole('button', {
        name: 'Tirar o grifo',
      }),
    );
    await waitFor(() => {
      expect(dispositivo('art1').querySelector('mark.grifo')).toBeNull();
    });
    expect(await marcacoesGravadas(repo)).toEqual([]);
    expect(anuncio()).toHaveTextContent('Grifo tirado.');
  });

  it('a seleção que passa do dispositivo fica só no primeiro; fora do texto vigente não marca', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    // A rubrica não é texto vigente.
    selecionar('art1', 'Objeto da execução');
    expect(screen.queryByRole('group', { name: 'Marcar o trecho selecionado' })).toBeNull();

    selecionar('art2', 'penal será', 'condenado', 'art3');
    const acoes = await screen.findByRole('group', { name: 'Marcar o trecho selecionado' });
    expect(acoes).toHaveTextContent('Só no Art. 2º');
    await usuario.click(within(acoes).getByRole('button', { name: 'Grifar com a cor 1' }));
    await waitFor(() => {
      expect(dispositivo('art2').querySelector('mark.grifo-1')).toHaveTextContent(
        'penal será exercida.',
      );
    });
    expect(dispositivo('art3').querySelector('mark')).toBeNull();
  });

  it('nota: anotar o trecho, abrir pelo marcador, editar e tirar, sem mexer na rolagem', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    const rolagem = window.scrollY;

    selecionar('art2', 'jurisdição penal');
    await usuario.click(await screen.findByRole('button', { name: 'Nota' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nota' });
    expect(within(dialogo).getByText('jurisdição penal')).toBeInTheDocument();
    const campo = within(dialogo).getByRole('textbox', { name: 'Texto da nota' });
    expect(campo).toHaveFocus();
    await usuario.type(campo, 'Juiz da execução: art. 65.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const marcador = await screen.findByRole('button', { name: 'Nota: jurisdição penal' });
    // O marcador vem logo depois do trecho anotado e não conta no texto (nem no offset).
    expect(dispositivo('art2')).toHaveTextContent('A jurisdição penal✎ será exercida.');
    expect(await marcacoesGravadas(repo)).toEqual([
      expect.objectContaining({
        tipo: 'nota',
        nota: 'Juiz da execução: art. 65.',
        ancora: { texto: 'jurisdição penal', inicio: 2, fim: 18 },
      }),
    ]);

    await usuario.click(marcador);
    let aberta = await screen.findByRole('dialog', { name: 'Nota' });
    expect(within(aberta).getByText('Juiz da execução: art. 65.')).toBeInTheDocument();
    await usuario.click(within(aberta).getByRole('button', { name: 'Editar' }));
    const edicao = within(aberta).getByRole('textbox', { name: 'Texto da nota' });
    await usuario.clear(edicao);
    await usuario.type(edicao, 'Competência: art. 65 da LEP.');
    await usuario.click(within(aberta).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () => {
      expect((await marcacoesGravadas(repo))[0]?.nota).toBe('Competência: art. 65 da LEP.');
    });

    await usuario.click(screen.getByRole('button', { name: 'Nota: jurisdição penal' }));
    aberta = await screen.findByRole('dialog', { name: 'Nota' });
    await usuario.click(within(aberta).getByRole('button', { name: 'Tirar a nota' }));
    await usuario.click(within(aberta).getByRole('button', { name: 'Tirar mesmo' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Nota:/ })).not.toBeInTheDocument();
    });
    expect(await marcacoesGravadas(repo)).toEqual([]);
    expect(window.scrollY).toBe(rolagem);
  });

  it('no modo foco, as ações ficam no mesmo grupo; Esc desfaz a seleção sem sair do modo foco', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    await screen.findByRole('button', { name: 'Sair do foco' });
    await screen.findByText(/A jurisdição penal/);

    selecionar('art2', 'exercida');
    expect(
      await screen.findByRole('group', { name: 'Marcar o trecho selecionado' }),
    ).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Marcar o trecho selecionado' })).toBeNull();
    expect(window.location.hash).toContain('foco=texto');
    expect(screen.getByRole('button', { name: 'Sair do foco' })).toBeInTheDocument();
  });
});

describe('estrela (11.2)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.modoFoco;
  });

  const estrelasGravadas = (repo: Repositorio) =>
    repo
      .colecao('estrelas')
      .listarPagina({ limite: 50 })
      .then((p) => p.itens.map((e) => e.origemTipo).sort());
  const linhaDe = (endereco: string) => dispositivo(endereco).closest('.linha-leitor');

  it('estrelar o Capítulo propaga; desmarcar um artigo vira exceção; estrelar de novo desfaz', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    const capitulo = screen.getByRole('button', { name: 'Estrela: CAPÍTULO I' });
    expect(capitulo).toHaveAttribute('aria-pressed', 'false');
    await usuario.click(capitulo);
    expect(
      await screen.findByRole('button', { name: 'Estrela: CAPÍTULO I (direta)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // Tudo dentro herda, com a origem no nome; o Título (acima) não.
    expect(
      screen.getByRole('button', { name: 'Estrela: Art. 2º (herdada de CAPÍTULO I)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Estrela: Art. 1º, II, a) (herdada de CAPÍTULO I)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Estrela: TÍTULO I' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(linhaDe('art2')).toHaveAttribute('data-estrelada');
    expect(linhaDe('tit1')).not.toHaveAttribute('data-estrelada');
    // A origem por extenso, visível por um instante, e anunciada.
    expect(document.querySelector('.aviso-da-estrela')).toHaveTextContent(
      'CAPÍTULO I: estrela direta.',
    );
    expect(document.querySelector('.acoes-leitor [role="status"]')).toHaveTextContent(
      'CAPÍTULO I: estrela direta.',
    );
    expect(await estrelasGravadas(repo)).toEqual(['direta']);

    // Desmarcar o art. 2 grava a exceção.
    await usuario.click(
      screen.getByRole('button', { name: 'Estrela: Art. 2º (herdada de CAPÍTULO I)' }),
    );
    const excecao = await screen.findByRole('button', {
      name: 'Estrela: Art. 2º (exceção: fora da estrela de CAPÍTULO I)',
    });
    expect(excecao).toHaveAttribute('aria-pressed', 'false');
    expect(excecao).toHaveAttribute('data-origem', 'excecao');
    expect(linhaDe('art2')).not.toHaveAttribute('data-estrelada');
    expect(await estrelasGravadas(repo)).toEqual(['direta', 'excecao']);

    // Estrelar de novo o art. 2 apaga a exceção: volta a herdar.
    await usuario.click(excecao);
    await screen.findByRole('button', { name: 'Estrela: Art. 2º (herdada de CAPÍTULO I)' });
    expect(await estrelasGravadas(repo)).toEqual(['direta']);
  });

  it('fora do texto vigente (a seleção não conta o botão), também no modo foco e depois de recarregar', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    await screen.findByText(/A jurisdição penal/);

    const botao = screen.getByRole('button', { name: 'Estrela: Art. 3º' });
    expect(botao.closest('.texto-vigente')).toBeNull();
    expect(botao).toHaveAttribute('data-fora-do-texto');
    await usuario.click(botao);
    await screen.findByRole('button', { name: 'Estrela: Art. 3º (direta)' });
    expect(window.location.hash).toContain('foco=texto');
    expect(screen.getByRole('button', { name: 'Sair do foco' })).toBeInTheDocument();
  });
});

describe('filtros (11.3)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.modoFoco;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  const linhaDe = (endereco: string) => dispositivo(endereco).closest('.linha-leitor');
  const naTela = (endereco: string) =>
    document.querySelector(`[data-endereco="${endereco}"]`) !== null;

  /** Abre o diálogo, escolhe o filtro pelo nome e aplica. */
  async function filtrar(usuario: ReturnType<typeof userEvent.setup>, escolha: RegExp) {
    await usuario.click(screen.getByRole('button', { name: /^(Filtrar|Filtrado)/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Filtrar a norma' });
    await usuario.click(within(dialogo).getByRole('radio', { name: escolha }));
    return dialogo;
  }

  it('estrelados: só o que tem estrela e o contexto atenuado; estrelar de novo não faz a linha sumir; "Mostrar tudo" volta', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    await usuario.click(screen.getByRole('button', { name: 'Estrela: Art. 2º' }));
    await screen.findByRole('button', { name: 'Estrela: Art. 2º (direta)' });

    const dialogo = await filtrar(usuario, /Só os estrelados/);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // O art. 2 casa; o capítulo e o título acima dele ficam como contexto; os outros artigos saem.
    expect(naTela('art2')).toBe(true);
    expect(linhaDe('art2')).not.toHaveAttribute('data-contexto');
    expect(linhaDe('tit1')).toHaveAttribute('data-contexto');
    expect(linhaDe('tit1.cap1')).toHaveAttribute('data-contexto');
    expect(naTela('art1')).toBe(false);
    expect(naTela('art3')).toBe(false);
    expect(document.querySelector('.filtro-ativo')).toHaveTextContent(
      'Mostrando só: estrelados (1 dispositivo)',
    );
    expect(document.querySelector('.acoes-leitor [role="status"]')).toHaveTextContent(
      'Mostrando só: estrelados, 1 dispositivo.',
    );
    // O botão do grupo fixo diz que o filtro está ligado.
    const botao = screen.getByRole('button', { name: 'Filtrado: estrelados. Mudar o filtro' });
    expect(botao).toHaveClass('filtro-ligado');

    // Tirar a estrela de um artigo à vista não o tira da tela: a linha fica até "Atualizar".
    await usuario.click(screen.getByRole('button', { name: 'Estrela: Art. 2º (direta)' }));
    await screen.findByRole('button', { name: 'Estrela: Art. 2º' });
    expect(naTela('art2')).toBe(true);
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(await screen.findByText(/Nenhum dispositivo estrelado nesta norma/)).toBeInTheDocument();
    expect(naTela('art2')).toBe(false);

    await usuario.click(screen.getByRole('button', { name: 'Mostrar tudo' }));
    expect(naTela('art1')).toBe(true);
    expect(naTela('art3')).toBe(true);
    expect(linhaDe('tit1')).not.toHaveAttribute('data-contexto');
    expect(screen.getByRole('button', { name: 'Filtrar' })).not.toHaveClass('filtro-ligado');
  });

  it('com grifo ou nota: o dispositivo marcado e o que está acima dele', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    const art3 = aberta.nos.find((n) => n.dispositivo.endereco === 'art3')?.dispositivo.id ?? '';
    await criarGrifo(
      repo,
      { normaId: norma.id, versaoId: aberta.versao.id, dispositivoId: art3, inicio: 3, fim: 12 },
      1,
    );
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    const dialogo = await filtrar(usuario, /Só com grifo ou nota/);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));

    expect(naTela('art3')).toBe(true);
    expect(linhaDe('art3')).not.toHaveAttribute('data-contexto');
    expect(linhaDe('tit1.cap1')).toHaveAttribute('data-contexto');
    expect(naTela('art1')).toBe(false);
    expect(naTela('art2')).toBe(false);
    // O grifo continua desenhado no texto filtrado.
    expect(within(dispositivo('art3')).getByText('condenado', { selector: 'mark' })).toBeTruthy();
  });

  it('com erro vinculado: o erro que aponta o dispositivo (o descartado não conta)', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    const idDe = (e: string) =>
      aberta.nos.find((n) => n.dispositivo.endereco === e)?.dispositivo.id;
    await repo.colecao('erros').criar({
      resultado: 'errou',
      oQueFoi: 'Confundi o art. 2',
      status: 'aberto',
      dispositivoId: idDe('art2'),
    });
    await repo.colecao('erros').criar({
      resultado: 'errou',
      oQueFoi: 'Erro já descartado no art. 3',
      status: 'descartado',
      dispositivoId: idDe('art3'),
    });
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    const dialogo = await filtrar(usuario, /Só com erro vinculado/);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));

    await waitFor(() => {
      expect(naTela('art1')).toBe(false);
    });
    expect(naTela('art2')).toBe(true);
    expect(naTela('art3')).toBe(false);
    expect(document.querySelector('.filtro-ativo')).toHaveTextContent(
      'com erro vinculado (1 dispositivo)',
    );
  });

  it('um trecho: de um artigo a outro, por bloco, e o que a norma não tem não aplica', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    const dialogo = await filtrar(usuario, /Só um trecho/);
    await usuario.type(within(dialogo).getByLabelText('De'), '2');
    await usuario.type(within(dialogo).getByLabelText('até'), '99');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Não encontrei “99”');
    expect(naTela('art1')).toBe(true);

    await usuario.clear(within(dialogo).getByLabelText('até'));
    await usuario.type(within(dialogo).getByLabelText('até'), '3');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(naTela('art1')).toBe(false);
    expect(naTela('art2')).toBe(true);
    expect(naTela('art3')).toBe(true);
    expect(linhaDe('tit1.cap1')).toHaveAttribute('data-contexto');
    expect(document.querySelector('.filtro-ativo')).toHaveTextContent(
      'Mostrando só: Art. 2º a Art. 3º (2 dispositivos)',
    );

    // Por bloco: o capítulo e tudo o que está dentro dele.
    await usuario.click(screen.getByRole('button', { name: /^Filtrado/ }));
    const outro = await screen.findByRole('dialog', { name: 'Filtrar a norma' });
    await usuario.selectOptions(within(outro).getByLabelText('Ou um bloco da norma'), [
      'TÍTULO I › CAPÍTULO I',
    ]);
    await usuario.click(within(outro).getByRole('button', { name: 'Mostrar' }));
    expect(naTela('art1')).toBe(true);
    expect(naTela('art3')).toBe(true);
    expect(linhaDe('tit1.cap1')).not.toHaveAttribute('data-contexto');
    expect(linhaDe('tit1')).toHaveAttribute('data-contexto');
  });

  it('no modo foco o botão fica no grupo; o filtro vazio avisa e "Mostrar tudo" desfaz', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    await screen.findByText(/A jurisdição penal/);

    const dialogo = await filtrar(usuario, /Só os estrelados/);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));

    // Sem a barra do leitor, a frase do filtro some, mas o vazio explica e oferece a saída.
    expect(document.querySelector('.barra-leitor')).toBeNull();
    expect(await screen.findByText(/Nenhum dispositivo estrelado nesta norma/)).toBeInTheDocument();
    expect(window.location.hash).toContain('foco=texto');
    await usuario.click(screen.getByRole('button', { name: 'Mostrar tudo' }));
    expect(await screen.findByText(/A jurisdição penal/)).toBeInTheDocument();
    expect(window.location.hash).toContain('foco=texto');
  });

  it('ir a um achado da busca que o filtro escondeu desliga o filtro', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    await usuario.click(screen.getByRole('button', { name: 'Estrela: Art. 2º' }));
    await screen.findByRole('button', { name: 'Estrela: Art. 2º (direta)' });
    const dialogo = await filtrar(usuario, /Só os estrelados/);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Mostrar' }));
    expect(naTela('art3')).toBe(false);

    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    const busca = await screen.findByRole('dialog', { name: 'Buscar na norma' });
    await usuario.type(within(busca).getByRole('searchbox'), 'Ao condenado');
    await usuario.click(await within(busca).findByRole('button', { name: /^Art\. 3º/ }));

    expect(await screen.findByText(/Filtro desligado para mostrar o achado/)).toBeInTheDocument();
    expect(naTela('art3')).toBe(true);
    expect(naTela('art1')).toBe(true);
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument();
  });
});

describe('ações por dispositivo (11.5)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.modoFoco;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  /** Abre as ações do dispositivo no alto da tela. */
  async function abrirAcoes(usuario: ReturnType<typeof userEvent.setup>) {
    // Alto da tela num artigo (no jsdom, 60 px por linha).
    rolarPara(60 * 8);
    await usuario.click(screen.getByRole('button', { name: 'Ações' }));
    const dialogo = await screen.findByRole('dialog', { name: /^Ações de / });
    // A referência de citar, no alto do diálogo: "art. 1º, LEP".
    const referencia = dialogo.querySelector('p.dica')?.textContent ?? '';
    expect(referencia).toMatch(/^art\. \d+º, LEP$/);
    return { dialogo, referencia };
  }

  it('registrar erro: já com a referência, dois campos, vinculado ao dispositivo; depois aparece nos vinculados', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    const { dialogo, referencia } = await abrirAcoes(usuario);
    expect(within(dialogo).getByText('Nenhum erro vinculado a este dispositivo.')).toBeVisible();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar erro' }));
    const campo = within(dialogo).getByLabelText('O que foi');
    expect(campo).toHaveValue(`${referencia}: `);
    // Só a referência não basta; falta também o resultado.
    const salvar = within(dialogo).getByRole('button', { name: 'Salvar' });
    expect(salvar).toBeDisabled();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Errei' }));
    expect(salvar).toBeDisabled();
    await usuario.type(campo, 'troquei o prazo');
    await usuario.click(salvar);

    expect(await within(dialogo).findByText(/Erro registrado e vinculado/)).toBeInTheDocument();
    const erros = (await repo.colecao('erros').listarPagina({ limite: 10 })).itens;
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatchObject({
      resultado: 'errou',
      oQueFoi: `${referencia}: troquei o prazo`,
      status: 'aberto',
    });
    expect(erros[0]?.dispositivoId).toBeDefined();
    // A lista dos vinculados recarrega com o erro novo, com o link para o erro.
    const link = await within(dialogo).findByRole('link', { name: /troquei o prazo/ });
    expect(link).toHaveAttribute('href', `#/recall/erros/${erros[0]?.id ?? ''}`);
  });

  it('cartão deste trecho: frente com a referência, verso com o texto vigente, uma vez só', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);

    const { dialogo, referencia } = await abrirAcoes(usuario);
    const criar = within(dialogo).getByRole('button', { name: 'Criar cartão deste trecho' });
    await usuario.dblClick(criar);

    expect(await within(dialogo).findByText(/Cartão criado/)).toBeInTheDocument();
    expect(criar).toBeDisabled();
    const cartoes = (await repo.colecao('cartoes').listarPagina({ limite: 10 })).itens;
    expect(cartoes).toHaveLength(1);
    expect(cartoes[0]).toMatchObject({
      frente: `O que diz o ${referencia}?`,
      origemTipo: 'dispositivo',
      estado: 'ativo',
      caixa: 1,
    });
    expect(cartoes[0]?.origemId).toBeDefined();
    expect(cartoes[0]?.verso?.length).toBeGreaterThan(0);
  });

  it('copiar a referência e fechar, também no modo foco', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=texto`);
    await screen.findByText(/A jurisdição penal/);

    const { dialogo, referencia } = await abrirAcoes(usuario);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Copiar referência' }));
    expect(await within(dialogo).findByText(`Copiado: ${referencia}.`)).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(referencia);

    await usuario.click(within(dialogo).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /^Ações de / })).toBeNull();
    });
    expect(window.location.hash).toContain('foco=texto');
  });
});

describe('leitura artigo por artigo (11.8)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.modoFoco;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  /** O cartão do artigo mostrado (a região rotulada). */
  const cartao = (nome: RegExp | string) => screen.findByRole('region', { name: nome });
  const idDe = async (repo: Repositorio, normaId: string, endereco: string) =>
    (await abrirNorma(repo, normaId)).nos.find((n) => n.dispositivo.endereco === endereco)!
      .dispositivo.id;

  it('"Por artigo" mostra o artigo inteiro no cartão e os vizinhos esmaecidos, sem interação', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art1'));
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    expect(screen.queryByRole('region', { name: /^Art\./ })).not.toBeInTheDocument();

    rolarPara(3 * 60);
    await usuario.click(screen.getByRole('button', { name: 'Por artigo' }));
    const secao = await cartao(/^Art\. 1º, \d+ de \d+$/);
    expect(window.location.hash).toBe(`#/biblioteca/normas/${norma.id}?foco=artigo`);
    expect(document.documentElement).toHaveAttribute('data-modo-foco', 'texto');
    // O artigo inteiro: caput, incisos, alínea e parágrafo; o contexto discreto no alto.
    for (const endereco of ['art1', 'art1.incI', 'art1.incII.alA', 'art1.par1']) {
      expect(
        within(secao).getByText((_, el) => el?.getAttribute('data-endereco') === endereco),
      ).toBeTruthy();
    }
    expect(within(secao).queryByText(/A jurisdição penal/)).not.toBeInTheDocument();
    expect(secao.querySelector('.contexto-artigo')).toHaveTextContent(
      'TÍTULO I DO OBJETO › CAPÍTULO I DA EXECUÇÃO',
    );
    // Os vizinhos: o artigo de antes e o de depois, fora do cartão e sem interação.
    const vizinhos = document.querySelectorAll('.vizinho');
    expect(vizinhos).toHaveLength(2);
    for (const v of vizinhos) expect(v).toHaveAttribute('inert');
    expect(vizinhos[1]).toHaveTextContent(/Art\. 2º\s*A jurisdição penal/);
    expect(screen.getByRole('button', { name: 'Por artigo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Sair do foco' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Tamanho do texto' })).not.toBeInTheDocument();
  });

  it('anterior e próximo por botão e por seta; o "lido até" avança ao passar e nunca recua sozinho', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const art1 = await idDe(repo, norma.id, 'art1');
    const art2 = await idDe(repo, norma.id, 'art2');
    await gravarPosicao(repo, norma.id, art1);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    rolarPara(3 * 60);
    await usuario.click(screen.getByRole('button', { name: 'Por artigo' }));
    await cartao(/^Art\. 1º, /);
    expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBeUndefined();

    const proximo = screen.getByRole('button', { name: /Próximo/ });
    await usuario.click(proximo);
    const dois = await cartao(/^Art\. 2º, /);
    expect(within(dois).getByText(/A jurisdição penal/)).toBeInTheDocument();
    // Passar ao próximo é ter lido o art. 1º.
    await waitFor(async () => {
      expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBe(art1);
    });
    // O foco fica no botão tocado (repetir Enter funciona); o leitor de tela ouve o artigo.
    expect(proximo).toHaveFocus();
    expect(document.querySelector('.acoes-leitor [role="status"]')).toHaveTextContent(
      /^Art\. 2º, \d+ de \d+\.$/,
    );

    await usuario.keyboard('{ArrowRight}');
    await cartao(/^Art\. 3º, /);
    await waitFor(async () => {
      expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBe(art2);
    });
    // Voltar nunca recua o "lido até".
    await usuario.keyboard('{ArrowLeft}');
    await cartao(/^Art\. 2º, /);
    await usuario.keyboard('{ArrowLeft}');
    await cartao(/^Art\. 1º, /);
    expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBe(art2);
    // A marca "Lido até aqui" aparece no art. 2º, e o botão do grupo continua marcando o artigo mostrado.
    await usuario.keyboard('{ArrowRight}');
    const marcado = await cartao(/^Art\. 2º, /);
    expect(within(marcado).getByText('Lido até aqui', { selector: 'p' })).toBeInTheDocument();
    await usuario.keyboard('{ArrowLeft}');
    await cartao(/^Art\. 1º, /);
    await usuario.click(screen.getByRole('button', { name: 'Lido até aqui' }));
    await waitFor(async () => {
      expect((await obterLeitura(repo, norma.id))?.lidoAteId).toBe(art1);
    });
  });

  it('o primeiro e o último têm o botão só no papel; as setas não passam do fim', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art3'));
    abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=artigo`);
    const ultimo = await cartao(/^Art\. 3º, /);
    expect(screen.getByRole('button', { name: /Próximo/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: /Anterior/ })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    const usuario = userEvent.setup();
    await usuario.keyboard('{ArrowRight}');
    expect(await cartao(/^Art\. 3º, /)).toBe(ultimo);
  });

  it('as setas são do campo de texto e do diálogo; com trecho selecionado, não viram o artigo', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art1'));
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=artigo`);
    await cartao(/^Art\. 1º, /);
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    const busca = await screen.findByRole('dialog', { name: /Buscar/ });
    await usuario.type(within(busca).getByRole('searchbox'), 'ab{ArrowRight}{ArrowLeft}');
    await cartao(/^Art\. 1º, /);
    await usuario.keyboard('{Escape}');
    // Com Shift a seta é da seleção; com Ctrl é do navegador.
    await usuario.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await cartao(/^Art\. 1º, /);
    await usuario.keyboard('{Control>}{ArrowRight}{/Control}');
    await cartao(/^Art\. 1º, /);
  });

  it('deslizar de lado vira o artigo; para cima e para baixo, ou com trecho selecionado, não', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art1'));
    abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=artigo`);
    await cartao(/^Art\. 1º, /);
    const area = document.querySelector('.area-artigo')!;
    const deslizar = (de: [number, number], para: [number, number]) => {
      fireEvent.touchStart(area, { touches: [{ clientX: de[0], clientY: de[1] }] });
      fireEvent.touchEnd(area, { changedTouches: [{ clientX: para[0], clientY: para[1] }] });
    };
    // Rolar o cartão (mais para cima que de lado) e um toque curto não viram.
    deslizar([200, 300], [190, 100]);
    deslizar([200, 300], [160, 300]);
    expect(screen.getByRole('region', { name: /^Art\. 1º, / })).toBeInTheDocument();
    // Com o trecho selecionado, o gesto é da seleção.
    const selecao = document.getSelection()!;
    selecao.selectAllChildren(screen.getByRole('region', { name: /^Art\. 1º, / }));
    deslizar([300, 300], [100, 300]);
    expect(screen.getByRole('region', { name: /^Art\. 1º, / })).toBeInTheDocument();
    selecao.removeAllRanges();
    // Da direita para a esquerda é o próximo; da esquerda para a direita, o anterior.
    deslizar([300, 300], [100, 310]);
    await cartao(/^Art\. 2º, /);
    deslizar([100, 300], [300, 290]);
    await cartao(/^Art\. 1º, /);
  });

  it('"Texto corrido" troca no lugar e a lista volta ao artigo do cartão; "Sair do foco" também', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art1'));
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    const entrada = (window.history.state as { idx?: number } | null)?.idx;
    rolarPara(3 * 60);
    await usuario.click(screen.getByRole('button', { name: 'Por artigo' }));
    await cartao(/^Art\. 1º, /);
    await usuario.click(screen.getByRole('button', { name: /Próximo/ }));
    await cartao(/^Art\. 2º, /);

    // Do artigo para o texto corrido: continua no modo foco, rota trocada no lugar.
    await usuario.click(screen.getByRole('button', { name: 'Por artigo' }));
    await waitFor(() => {
      expect(window.location.hash).toBe(`#/biblioteca/normas/${norma.id}?foco=texto`);
    });
    expect(screen.queryByRole('region', { name: /^Art\./ })).not.toBeInTheDocument();
    expect(await screen.findByText(/A jurisdição penal/)).toBeInTheDocument();
    expect(document.querySelectorAll('.lista-leitor')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Por artigo' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // De novo no artigo (o do alto da tela) e fora do modo foco com "Sair do foco".
    await usuario.click(screen.getByRole('button', { name: 'Por artigo' }));
    await cartao(/^Art\. \d+º, /);
    await usuario.click(screen.getByRole('button', { name: 'Sair do foco' }));
    await waitFor(() => {
      expect(window.location.hash).toBe(`#/biblioteca/normas/${norma.id}`);
    });
    expect(await screen.findByRole('group', { name: 'Tamanho do texto' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-modo-foco');
    // Uma entrada só no histórico para o modo foco inteiro (do artigo ao texto e de volta).
    expect((window.history.state as { idx?: number } | null)?.idx).toBe(entrada);
  });

  it('a posição guardada é o artigo mostrado, e recarregar no cartão volta a ele', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const art2 = await idDe(repo, norma.id, 'art2');
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art1'));
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=artigo`);
    await cartao(/^Art\. 1º, /);
    await usuario.click(screen.getByRole('button', { name: /Próximo/ }));
    await cartao(/^Art\. 2º, /);
    await waitFor(
      async () => {
        expect((await obterLeitura(repo, norma.id))?.posicaoId).toBe(art2);
      },
      { timeout: 3000 },
    );
  });

  it('segue o filtro: só os artigos que ficaram; "Ações" age sobre o artigo do cartão', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    await gravarPosicao(repo, norma.id, await idDe(repo, norma.id, 'art1'));
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/A jurisdição penal/);
    await usuario.click(screen.getByRole('button', { name: 'Estrela: Art. 3º' }));
    await screen.findByRole('button', { name: 'Estrela: Art. 3º (direta)' });
    rolarPara(3 * 60);
    await usuario.click(screen.getByRole('button', { name: 'Por artigo' }));
    await cartao(/^Art\. 1º, /);

    // O filtro do leitor vale no cartão: o artigo 1 saiu, o 3 é o único que ficou.
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    const filtro = await screen.findByRole('dialog', { name: 'Filtrar a norma' });
    await usuario.click(within(filtro).getByRole('radio', { name: /Só os estrelados/ }));
    await usuario.click(within(filtro).getByRole('button', { name: 'Mostrar' }));
    const unico = await cartao(/^Art\. 3º, 1 de 1$/);
    expect(screen.getByRole('button', { name: /Próximo/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: /Anterior/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(document.querySelectorAll('.vizinho')).toHaveLength(0);
    expect(within(unico).getByText(/Ao condenado/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Ações' }));
    expect(await screen.findByRole('dialog', { name: 'Ações de Art. 3º' })).toBeInTheDocument();
  });
});

describe('prévia de remissões (11.9)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.modoFoco;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  const LEI_COM_REMISSOES: Bloco[] = [
    linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
    linha('Institui a Lei de Execução Penal.'),
    linha('Art. 1º A execução penal tem por objetivo efetivar a sentença.'),
    linha('Art. 2º Aplica-se o disposto no art. 3º, salvo o art. 99.'),
    linha('Art. 3º Ao condenado serão assegurados os direitos.'),
  ];

  it('a citação que a norma resolve vira botão; a que não existe fica texto comum', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI_COM_REMISSOES);
    abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/Ao condenado/);
    const citacoes = document.querySelectorAll('[data-remissao]');
    expect(citacoes).toHaveLength(1);
    expect(citacoes[0]).toHaveTextContent('art. 3º');
    expect(citacoes[0]).toHaveAttribute('role', 'button');
    expect(screen.queryByRole('button', { name: /art\. 99/ })).not.toBeInTheDocument();
  });

  it('tocar abre a prévia com o texto; "Ir para" fecha e oferece "Voltar", que desfaz', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI_COM_REMISSOES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/Ao condenado/);

    await usuario.click(screen.getByRole('button', { name: /art\. 3º/ }));
    const previa = await screen.findByRole('dialog', { name: 'Art. 3º' });
    expect(await within(previa).findByText(/Ao condenado/)).toBeInTheDocument();

    await usuario.click(within(previa).getByRole('button', { name: 'Ir para Art. 3º' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Art. 3º' })).not.toBeInTheDocument();
    });
    const voltar = await screen.findByRole('button', { name: /Voltar a Art\. 2º/ });
    await usuario.click(voltar);
    expect(screen.queryByRole('button', { name: /Voltar a/ })).not.toBeInTheDocument();
  });

  it('Fechar não empilha nada', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI_COM_REMISSOES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByText(/Ao condenado/);
    await usuario.click(screen.getByRole('button', { name: /art\. 3º/ }));
    const previa = await screen.findByRole('dialog', { name: 'Art. 3º' });
    await usuario.click(within(previa).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Art. 3º' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Voltar a/ })).not.toBeInTheDocument();
  });

  it('o cartão do artigo por artigo lista as remissões do artigo', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI_COM_REMISSOES);
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}?foco=artigo`);
    const secao = await screen.findByRole('region', { name: /^Art\. \dº, \d+ de \d+$/ });
    expect(secao).toBeInTheDocument();
    // Vai ao Art. 2º, que cita o 3º.
    await usuario.click(screen.getByRole('button', { name: /Próximo/ }));
    const cartao2 = await screen.findByRole('region', { name: /^Art\. 2º, / });
    const rodape = await within(cartao2).findByRole('heading', { name: 'Remissões deste artigo' });
    const botao = within(rodape.parentElement!).getByRole('button', { name: 'Art. 3º' });
    await usuario.click(botao);
    expect(await screen.findByRole('dialog', { name: 'Art. 3º' })).toBeInTheDocument();
  });
});
