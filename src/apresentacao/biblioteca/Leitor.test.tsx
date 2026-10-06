import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import { sanitizarHtml, type Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma, lerJanela } from '../../dominios/legislacao/leitor';
import { gravarPosicao, marcarLidoAte, obterLeitura } from '../../dominios/legislacao/leituras';
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
