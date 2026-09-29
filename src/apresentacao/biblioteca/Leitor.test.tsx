import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma, lerJanela } from '../../dominios/legislacao/leitor';
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

  it('revogado em uma linha, expansível; redação anterior oculta, com indicador', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo, LEI);
    const aberta = await abrirNorma(repo, norma.id);
    const janela = await lerJanela(repo, aberta, { inicio: 0, quantidade: 50 });
    const de = (endereco: string) => {
      const item = janela.find((i) => i.dispositivo.endereco === endereco);
      if (!item?.texto) throw new Error(`sem ${endereco}`);
      return item;
    };
    // Art. 2º revogado, sem texto; Art. 3º vigente com uma redação anterior.
    const art2 = de('art2');
    await repo.colecao('dispositivos').atualizar(art2.dispositivo.id, { status: 'revogado' });
    await repo.colecao('textosDispositivo').atualizar(art2.texto!.id, {
      trechos: [],
      notasVigencia: [{ texto: '(Revogado pela Lei nº 10.792, de 2003)' }],
    });
    const art3 = de('art3');
    await repo.colecao('textosDispositivo').atualizar(art3.texto!.id, {
      redacoesAnteriores: [
        {
          trechos: [{ texto: 'Ao condenado serão assegurados alguns direitos.', tachado: true }],
          nota: '(Redação anterior)',
          origemDeteccao: 'tachado',
          confirmada: true,
        },
      ],
    });
    const usuario = abrirLeitor(repo, `#/biblioteca/normas/${norma.id}`);
    await screen.findByRole('heading', { level: 1, name: 'LEP' });

    // Revogado: uma linha atenuada; o resto só ao expandir.
    const revogado = await screen.findByRole('button', { name: /Art\. 2º — \(revogado\)/ });
    expect(revogado).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('(Revogado pela Lei nº 10.792, de 2003)')).not.toBeInTheDocument();
    await usuario.click(revogado);
    expect(revogado).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('(Revogado pela Lei nº 10.792, de 2003)')).toBeInTheDocument();
    await usuario.click(revogado);
    expect(screen.queryByText('(Revogado pela Lei nº 10.792, de 2003)')).not.toBeInTheDocument();

    // Redação anterior: oculta, com o indicador; a expansão mostra o texto anterior.
    const indicador = screen.getByRole('button', {
      name: 'Mostrar 1 redação anterior (texto anterior, oculto)',
    });
    expect(indicador).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/alguns direitos/)).not.toBeInTheDocument();
    await usuario.click(indicador);
    const anterior = screen.getByRole('list', { name: 'Texto anterior' });
    expect(within(anterior).getByText(/alguns direitos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar 1 redação anterior' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await usuario.click(screen.getByRole('button', { name: 'Ocultar 1 redação anterior' }));
    expect(screen.queryByText(/alguns direitos/)).not.toBeInTheDocument();
  });

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
