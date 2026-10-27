import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../../core/persistencia';
import type { Bloco } from '../../../core/seguranca/sanitizador';
import { FonteDeIncidencia } from '../../../dominios/legislacao/incidencia-fonte';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';
import { ContextoFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { artigosFeitos } from './feitos';

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

const fonte = () =>
  new FonteDeIncidencia(
    '/incidencia',
    (entrada) => {
      const url =
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      const corpo = ARQUIVOS[url];
      return Promise.resolve(
        corpo === undefined
          ? new Response('', { status: 404 })
          : new Response(JSON.stringify(corpo)),
      );
    },
    () => Promise.resolve(undefined),
  );

async function publicar(repo: Repositorio) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  await repo
    .colecao('normas')
    .atualizar(norma.id, { origemAcervo: { id: ACERVO, versao: 1, hash: 'a'.repeat(64) } });
  return norma.id;
}

describe('Ler seguindo o mapa', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('o fim de cada trecho pula ao seguinte, guarda o que foi lido e o último encerra o roteiro', async () => {
    const { repo } = await repositorioDeTeste();
    const normaId = await publicar(repo);
    window.location.hash = `#/biblioteca/normas/${normaId}?ir=art3&foco=artigo&mapa=1`;
    const usuario = userEvent.setup();
    render(
      <ContextoFonteIncidencia.Provider value={fonte()}>
        <App abrir={() => Promise.resolve(repo)} />
      </ContextoFonteIncidencia.Provider>,
    );

    expect(await screen.findByText(/Seguindo o mapa: arts\. 3º a 4º, trecho 1 de 2/)).toBeVisible();
    expect(screen.getByLabelText(/^Art\. 3º,/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Próximo artigo' }));
    expect(screen.getByLabelText(/^Art\. 4º,/)).toBeInTheDocument();
    expect(artigosFeitos(normaId)).toEqual([]);

    // Fim do trecho 1: o Próximo vai ao art. 1º, o começo do trecho 2, sem tocar no "lido até".
    await usuario.click(screen.getByRole('button', { name: 'Próximo artigo' }));
    expect(await screen.findByText(/trecho 2 de 2/)).toBeVisible();
    expect(screen.getByLabelText(/^Art\. 1º,/)).toBeInTheDocument();
    expect(artigosFeitos(normaId)).toHaveLength(2);

    // Fim do roteiro: guarda o último trecho, e a linha do mapa sai.
    await usuario.click(screen.getByRole('button', { name: 'Próximo artigo' }));
    await waitFor(() => {
      expect(screen.queryByText(/Seguindo o mapa/)).toBeNull();
    });
    expect(artigosFeitos(normaId)).toHaveLength(3);
  });

  it('"Parar" volta ao artigo por artigo de sempre', async () => {
    const { repo } = await repositorioDeTeste();
    const normaId = await publicar(repo);
    window.location.hash = `#/biblioteca/normas/${normaId}?ir=art3&foco=artigo&mapa=1`;
    const usuario = userEvent.setup();
    render(
      <ContextoFonteIncidencia.Provider value={fonte()}>
        <App abrir={() => Promise.resolve(repo)} />
      </ContextoFonteIncidencia.Provider>,
    );
    await screen.findByText(/Seguindo o mapa/);
    await usuario.click(screen.getByRole('button', { name: 'Parar' }));
    expect(screen.queryByText(/Seguindo o mapa/)).toBeNull();
    expect(window.location.hash).toBe(`#/biblioteca/normas/${normaId}?foco=artigo`);
  });
});
