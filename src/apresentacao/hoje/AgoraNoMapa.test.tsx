import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { FonteDeIncidencia } from '../../dominios/legislacao/incidencia-fonte';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { ContextoFonteIncidencia } from '../dados/fonteIncidenciaContexto';

const DIA = 24 * 60 * 60_000;
const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta a seguinte Lei:'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal será exercida pelos juízes ou tribunais.'),
  linha('Art. 3º Ao condenado serão assegurados todos os direitos.'),
  linha('Art. 4º O Estado deverá recorrer à cooperação da comunidade.'),
];
const ACERVO = 'lei-federal-7210-1984';
const ARQUIVOS: Record<string, unknown> = {
  '/incidencia/indice.json': {
    versao: 1,
    recortes: [{ id: 'fcc-defensor-sp', titulo: 'FCC × Defensor (SP)', normas: [ACERVO] }],
  },
  [`/incidencia/fcc-defensor-sp/${ACERVO}.json`]: {
    versao: 1,
    recorte: 'fcc-defensor-sp',
    norma: ACERVO,
    artigos: [
      ['1', 1, 'alta'],
      ['3', 3, 'altissima'],
      ['4', 2, 'altissima'],
    ],
  },
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

/** Publica a LEP (do acervo, por padrão) e deixa a leitura salva no art. 1º. */
async function lerALep(repo: Repositorio, doAcervo = true) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  if (doAcervo) {
    await repo
      .colecao('normas')
      .atualizar(norma.id, { origemAcervo: { id: ACERVO, versao: 1, hash: 'a'.repeat(64) } });
  }
  const { nos } = await abrirNorma(repo, norma.id);
  const art1 = nos.find((n) => n.dispositivo.endereco === 'art1');
  if (!art1) throw new Error('sem art. 1º');
  await marcarLidoAte(repo, norma.id, art1.dispositivo.id);
  return norma.id;
}

function abrirHoje(repo: Repositorio, f: FonteDeIncidencia) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  render(
    <ContextoFonteIncidencia.Provider value={f}>
      <App abrir={() => Promise.resolve(repo)} />
    </ContextoFonteIncidencia.Provider>,
  );
  return usuario;
}

describe('Hoje › Agora no mapa (AP-04)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('o Agora é o trecho que mais cai, com a faixa e os minutos; "de onde parou" fica abaixo', async () => {
    const { repo } = await repositorioDeTeste();
    const normaId = await lerALep(repo);
    abrirHoje(repo, fonte(ARQUIVOS));
    // O art. 1º já está coberto; o próximo são os dois "cai muito" vizinhos (decisão F2, 27/10/2026).
    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(await within(agora).findByRole('heading', { name: 'Ler arts. 3º a 4º' })).toBeVisible();
    expect(agora).toHaveTextContent('Pelo mapa, o próximo trecho da LEP cai muito');
    expect(agora).toHaveTextContent('cerca de 2 min');
    const comecar = within(agora).getByRole('link', { name: 'Começar' });
    expect(comecar).toHaveAttribute('href', expect.stringContaining(`id=${normaId}`));
    expect(comecar).toHaveAttribute('href', expect.stringContaining('ir=art3'));
    expect(comecar).toHaveAttribute('href', expect.stringContaining('direto=1'));
    expect(document.body.textContent).not.toMatch(/atrasad|pendente|dívida|faltam/i);
    // A alternativa, uma linha abaixo da folha, segue onde a pessoa parou, sem o trecho.
    const continuar = screen.getByRole('link', { name: 'Continuar a leitura' });
    expect(continuar.parentElement).toHaveTextContent('Ou de onde parou, cerca de');
    expect(continuar).toHaveAttribute('href', expect.stringContaining(`id=${normaId}`));
    expect(continuar).not.toHaveAttribute('href', expect.stringContaining('ir='));
    expect(screen.queryByRole('link', { name: 'Continuar' })).toBeNull();
  });

  it('sem arquivo de incidência (norma fora do acervo, ou sem rede), o Agora é "Continuar a leitura"', async () => {
    const { repo } = await repositorioDeTeste();
    await lerALep(repo, false);
    abrirHoje(repo, fonte('sem rede'));
    await screen.findByRole('heading', { name: 'Continuar a leitura' });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Continuar' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/do mapa|Pelo mapa/)).not.toBeInTheDocument();
  });

  it('depois do lote por tempo, entra só quando o trecho cabe no tempo que sobra', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await lerALep(repo);
    for (let i = 1; i <= 12; i += 1)
      await criarCartaoManual(repo, { frente: `P${String(i)}`, verso: 'v' });
    relogio.avancar(DIA);
    const usuario = abrirHoje(repo, fonte(ARQUIVOS));
    const quatro = await screen.findByRole('group', { name: 'Quanto tempo você tem?' });
    // Sem escolher o tempo, a folha dos cartões não traz o mapa.
    expect(screen.queryByText(/do mapa|Pelo mapa/)).not.toBeInTheDocument();
    // 5 min: 10 cartões levam os 5 min; o trecho de 2 min não cabe.
    await usuario.click(within(quatro).getByRole('button', { name: '5 min' }));
    await screen.findByText(/10 cartões, os mais perto de esquecer/);
    expect(screen.queryByText(/do mapa|Pelo mapa/)).not.toBeInTheDocument();
    // 10 min: os 12 cartões levam 6 min; sobram 4, e o trecho cabe.
    await usuario.click(within(quatro).getByRole('button', { name: '10 min' }));
    await screen.findByText(/12 cartões, os mais perto de esquecer/);
    const ler = await screen.findByRole('link', { name: 'Ler arts. 3º a 4º' });
    expect(ler.parentElement).toHaveTextContent(
      'Sobra tempo para um trecho do mapa: cai muito, cerca de 2 min.',
    );
  });
});
