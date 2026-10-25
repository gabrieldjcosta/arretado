import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import type { Bloco } from '../../../core/seguranca/sanitizador';
import { FonteDeIncidencia } from '../../../dominios/legislacao/incidencia-fonte';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../../dominios/legislacao/leituras';
import { criarGrifo } from '../../../dominios/legislacao/marcacoes';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { ContextoFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { ChamadaDoMapa } from './ChamadaDoMapa';
import { MapaDaNorma } from './MapaDaNorma';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta a seguinte Lei:'),
  linha('CAPÍTULO I'),
  linha('DA EXECUÇÃO'),
  linha('Objeto da execução'),
  linha('Art. 1º A execução penal tem por objetivo:'),
  linha('I - efetivar as disposições de sentença;'),
  linha('Art. 2º A jurisdição penal será exercida.'),
  linha('CAPÍTULO II'),
  linha('DO CONDENADO'),
  linha('Art. 3º Ao condenado serão assegurados os direitos.'),
  linha('Art. 4º O Estado deverá recorrer à cooperação.'),
];

const ACERVO = 'lei-federal-7210-1984';
const INDICE = {
  versao: 1,
  recortes: [
    {
      id: 'fcc-defensor-sp',
      titulo: 'FCC × Defensor Público (SP)',
      questoes: 829,
      normas: [ACERVO],
    },
  ],
};
const MAPA = {
  versao: 1,
  recorte: 'fcc-defensor-sp',
  norma: ACERVO,
  artigos: [
    ['1', 1, 'alta'],
    ['2', 3, 'altissima'],
    ['3', 2, 'altissima'],
  ],
};

function fonte(arquivos: Record<string, unknown> | 'sem rede') {
  return new FonteDeIncidencia(
    '/incidencia',
    (entrada) => {
      if (arquivos === 'sem rede') return Promise.reject(new TypeError('sem rede'));
      const url =
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      const corpo = arquivos[url];
      return Promise.resolve(
        corpo === undefined
          ? new Response('', { status: 404 })
          : new Response(JSON.stringify(corpo)),
      );
    },
    () => Promise.resolve(undefined),
  );
}
const ARQUIVOS = {
  '/incidencia/indice.json': INDICE,
  [`/incidencia/fcc-defensor-sp/${ACERVO}.json`]: MAPA,
};

async function publicar(repo: Repositorio, doAcervo = true) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  if (!doAcervo) return norma;
  return repo
    .colecao('normas')
    .atualizar(norma.id, { origemAcervo: { id: ACERVO, versao: 1, hash: 'a'.repeat(64) } });
}

function abrir(repo: Repositorio, normaId: string, f: FonteDeIncidencia) {
  const usuario = userEvent.setup();
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ContextoFonteIncidencia.Provider value={f}>
        <MemoryRouter initialEntries={[`/biblioteca/normas/${normaId}/mapa`]}>
          <Routes>
            <Route path="/biblioteca/normas/:normaId/mapa" element={<MapaDaNorma />} />
          </Routes>
        </MemoryRouter>
      </ContextoFonteIncidencia.Provider>
    </ContextoRepositorio.Provider>,
  );
  return usuario;
}

describe('Mapa da norma', () => {
  it('um quadrado por artigo com a faixa do arquivo, a concentração e o próximo trecho', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo);
    abrir(repo, norma.id, fonte(ARQUIVOS));
    const grade = await screen.findByRole('group', { name: /Mapa dos 4 artigos/ });
    const quadrados = within(grade).getAllByRole('button');
    expect(quadrados.map((q) => q.getAttribute('aria-label'))).toEqual([
      'Art. 1º, cai',
      'Art. 2º, cai muito, próximo trecho',
      'Art. 3º, cai muito, próximo trecho',
      'Art. 4º, sem questão',
    ]);
    expect(quadrados[1]).toHaveAttribute('data-classe', 'altissima');
    expect(quadrados[3]).toHaveAttribute('data-classe', 'sem');
    expect(screen.getByText(/3 dos 4 artigos/).parentElement).toHaveTextContent(
      '3 dos 4 artigos concentram 100% do que caiu neste recorte.',
    );
    expect(screen.queryByText(/Você cobriu/)).not.toBeInTheDocument();
    expect(
      screen.getByText('FCC × Defensor Público (SP) · 829 questões lidas'),
    ).toBeInTheDocument();
    // O próximo trecho: os dois "cai muito" vizinhos, mesmo cruzando o capítulo.
    const agora = screen.getByRole('region', { name: 'Agora' });
    expect(within(agora).getByRole('heading', { name: 'Ler Arts. 2º a 3º' })).toBeInTheDocument();
    expect(agora).toHaveTextContent('cai muito');
    expect(agora).toHaveTextContent('cerca de 2 min');
    expect(within(agora).getByRole('link', { name: 'Começar' })).toHaveAttribute(
      'href',
      `/biblioteca/normas/${norma.id}?ir=art2`,
    );
    // O primeiro quadrado do trecho é o que entra no Tab.
    expect(quadrados[1]).toHaveAttribute('tabindex', '0');
    expect(quadrados[0]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('list', { name: 'Legenda do mapa' })).toHaveTextContent(
      'cai muitocaicai às vezesrarosem questãojá cobripróximo trecho',
    );
  });

  it('a cobertura soma o "lido até" e o artigo com marca, e o trecho pula o coberto', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo);
    const aberta = await abrirNorma(repo, norma.id);
    const art2 = aberta.nos.find((n) => n.dispositivo.endereco === 'art2')?.dispositivo;
    const art4 = aberta.nos.find((n) => n.dispositivo.endereco === 'art4')?.dispositivo;
    await marcarLidoAte(repo, norma.id, art2!.id);
    await criarGrifo(
      repo,
      {
        normaId: norma.id,
        dispositivoId: art4!.id,
        versaoId: aberta.versao.id,
        inicio: 0,
        fim: 8,
      },
      1,
    );
    const usuario = abrir(repo, norma.id, fonte(ARQUIVOS));
    const grade = await screen.findByRole('group', { name: /Mapa dos 4 artigos/ });
    const quadrados = within(grade).getAllByRole('button');
    expect(quadrados.map((q) => q.getAttribute('aria-label'))).toEqual([
      'Art. 1º, cai, você já cobriu',
      'Art. 2º, cai muito, você já cobriu',
      'Art. 3º, cai muito, próximo trecho',
      'Art. 4º, sem questão, você já cobriu',
    ]);
    expect(quadrados[0]).toHaveAttribute('data-coberto');
    // Pela massa: 1 + 3 de 6.
    expect(screen.getByText(/Você cobriu/)).toHaveTextContent('Você cobriu 67%');
    expect(screen.getByRole('heading', { name: 'Ler Art. 3º' })).toBeInTheDocument();

    // Tocar num quadrado diz o artigo em palavras, com a rubrica, e leva ao Leitor.
    await usuario.click(quadrados[0]!);
    const status = screen.getByRole('status');
    await waitFor(() => {
      expect(status).toHaveTextContent('Art. 1º · Objeto da execução · cai · você já cobriu');
    });
    expect(within(status).getByRole('link', { name: 'Ler' })).toHaveAttribute(
      'href',
      `/biblioteca/normas/${norma.id}?ir=art1`,
    );
    expect(quadrados[0]).toHaveAttribute('aria-pressed', 'true');
    // As setas percorrem a grade com um só quadrado no Tab.
    expect(quadrados[0]).toHaveFocus();
    await usuario.keyboard('{ArrowRight}');
    expect(quadrados[1]).toHaveFocus();
    expect(quadrados[1]).toHaveAttribute('tabindex', '0');
    await usuario.keyboard('{End}');
    expect(quadrados[3]).toHaveFocus();
    await usuario.keyboard('{Home}');
    expect(quadrados[0]).toHaveFocus();
  });

  it('sem rede e sem cópia, avisa e mostra só a cobertura; norma fora do acervo também', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await publicar(repo);
    const aberta = await abrirNorma(repo, norma.id);
    await marcarLidoAte(
      repo,
      norma.id,
      aberta.nos.find((n) => n.dispositivo.endereco === 'art1')!.dispositivo.id,
    );
    abrir(repo, norma.id, fonte('sem rede'));
    expect(await screen.findByText(/Sem rede para baixar as faixas/)).toBeInTheDocument();
    expect(screen.getByText(/Você cobriu/)).toHaveTextContent('Você cobriu 25% (1 de 4 artigos)');
    expect(screen.queryByRole('region', { name: 'Agora' })).not.toBeInTheDocument();
    const grade = screen.getByRole('group', { name: /Mapa dos 4 artigos/ });
    expect(
      within(grade)
        .getAllByRole('button')
        .every((q) => q.dataset.classe === 'sem'),
    ).toBe(true);
  });

  it('a chamada do Leitor só aparece para a norma do acervo que está no índice', async () => {
    const { repo } = await repositorioDeTeste();
    const doAcervo = await publicar(repo);
    const colada = await publicar(repo, false);
    const f = fonte(ARQUIVOS);
    const { unmount } = render(
      <ContextoRepositorio.Provider value={repo}>
        <ContextoFonteIncidencia.Provider value={f}>
          <MemoryRouter>
            <ChamadaDoMapa norma={doAcervo} />
          </MemoryRouter>
        </ContextoFonteIncidencia.Provider>
      </ContextoRepositorio.Provider>,
    );
    expect(await screen.findByRole('link', { name: 'Mapa da norma' })).toHaveAttribute(
      'href',
      `/biblioteca/normas/${doAcervo.id}/mapa`,
    );
    unmount();
    render(
      <ContextoFonteIncidencia.Provider value={f}>
        <MemoryRouter>
          <ChamadaDoMapa norma={colada} />
        </MemoryRouter>
      </ContextoFonteIncidencia.Provider>,
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('link', { name: 'Mapa da norma' })).not.toBeInTheDocument();
  });
});
