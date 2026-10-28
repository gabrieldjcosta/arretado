import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { FonteDeIncidencia } from '../../dominios/legislacao/incidencia-fonte';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { marcarLidoAte } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { criarCartaoManual, registrarErro } from '../../dominios/recall/servico';
import { estacionar } from '../../dominios/sessao/estacionamento';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { ContextoFonteIncidencia } from '../dados/fonteIncidenciaContexto';

const MIN = 60_000;
const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta a seguinte Lei:'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal será exercida pelos juízes ou tribunais.'),
  linha('Art. 3º Ao condenado serão assegurados todos os direitos.'),
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
    ],
  },
};

const fonteComMapa = () =>
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

/** A LEP do acervo com a leitura salva no art. 1º: o Agora é o trecho do mapa (arts. 3º). */
async function lerALep(repo: Repositorio) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  await repo
    .colecao('normas')
    .atualizar(norma.id, { origemAcervo: { id: ACERVO, versao: 1, hash: 'a'.repeat(64) } });
  const { nos } = await abrirNorma(repo, norma.id);
  const art1 = nos.find((n) => n.dispositivo.endereco === 'art1');
  if (!art1) throw new Error('sem art. 1º');
  await marcarLidoAte(repo, norma.id, art1.dispositivo.id);
}

async function umCartaoVencido(repo: Repositorio) {
  const c = await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
  await repo.colecao('cartoes').atualizar(c.id, { proximaRevisao: '2000-01-01' });
}

/** Abre o fechamento da Sessão aberta e encerra. */
async function encerrar(repo: Repositorio, fonte?: FonteDeIncidencia) {
  window.location.hash = '#/sessao/fechar';
  const usuario = userEvent.setup();
  render(
    fonte ? (
      <ContextoFonteIncidencia.Provider value={fonte}>
        <App abrir={() => Promise.resolve(repo)} />
      </ContextoFonteIncidencia.Provider>
    ) : (
      <App abrir={() => Promise.resolve(repo)} />
    ),
  );
  await usuario.click(await screen.findByRole('button', { name: /^Encerrar$/ }));
  await screen.findByRole('heading', { name: 'Sessão encerrada' });
  return usuario;
}

describe('Sessão encerrada: a ponte é o Agora do Hoje', () => {
  it('com o mapa da norma, "Seguir" é o trecho do mapa e leva ao mesmo lugar que o Começar do Agora', async () => {
    const { repo } = await repositorioDeTeste();
    await lerALep(repo);
    await iniciarSessao(repo, {});
    const usuario = await encerrar(repo, fonteComMapa());
    const ponte = await screen.findByRole('link', { name: 'Seguir: Ler art. 3º' });
    expect(ponte).toHaveAttribute('href', expect.stringContaining('ir=art3'));
    const destino = ponte.getAttribute('href');
    await usuario.click(screen.getByRole('link', { name: 'Ir para o Hoje' }));
    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(await within(agora).findByRole('heading', { name: 'Ler art. 3º' })).toBeVisible();
    expect(within(agora).getByRole('link', { name: 'Começar' })).toHaveAttribute('href', destino);
  });

  it('sem o mapa, "Seguir" é o cartão vencido e leva ao mesmo lugar que o Começar do Agora', async () => {
    const { repo } = await repositorioDeTeste();
    await umCartaoVencido(repo);
    await iniciarSessao(repo, { atividade: 'questoes' });
    const usuario = await encerrar(repo);
    const ponte = await screen.findByRole('link', { name: 'Seguir: Revisar cartões' });
    const destino = ponte.getAttribute('href');
    expect(destino).toContain('/sessao/iniciar?tipo=revisao');
    await usuario.click(screen.getByRole('link', { name: 'Ir para o Hoje' }));
    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(await within(agora).findByRole('link', { name: 'Começar' })).toHaveAttribute(
      'href',
      destino,
    );
  });

  it('sem ação no Agora não há ponte; "Ver os erros" vai à lista de Erros', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await registrarErro(repo, { fraseCorreta: 'O prazo é de cinco dias.', sessaoId: s.id });
    await encerrar(repo);
    // O erro e o Agora chegam juntos do repositório: com o erro na tela, a falta da ponte é de verdade.
    expect(await screen.findByText(/1 erro guardado/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Seguir:/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver os erros' })).toHaveAttribute(
      'href',
      '#/recall/erros',
    );
    expect(screen.getByRole('link', { name: 'Ir para o Hoje' })).toHaveClass('principal');
  });

  it('a ponte vem depois do botão principal e não é a ação principal', async () => {
    const { repo } = await repositorioDeTeste();
    await umCartaoVencido(repo);
    await iniciarSessao(repo, {});
    await encerrar(repo);
    const ponte = await screen.findByRole('link', { name: /^Seguir:/ });
    expect(ponte).not.toHaveClass('principal');
    expect(document.querySelectorAll('main .principal')).toHaveLength(1);
  });
});

describe('Sessão encerrada: o resumo', () => {
  it('conta os Erros guardados pelo registro comum durante a Sessão, no singular', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'questoes' });
    relogio.avancar(MIN);
    await registrarErro(repo, { fraseCorreta: 'A progressão exige bom comportamento.' });
    relogio.avancar(MIN);
    await encerrar(repo);
    expect(await screen.findByText('1 erro guardado: entra nas suas revisões')).toBeVisible();
    expect(screen.getByText('2 min · Questões')).toBeVisible();
  });

  it('anotação marcada como resolvida no fechamento não conta como guardada para depois', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await estacionar(repo, s.id, 'ligar para o cartório');
    await estacionar(repo, s.id, 'comprar café');
    await estacionar(repo, s.id, 'pedir a certidão');
    window.location.hash = '#/sessao/fechar';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    await usuario.click(await screen.findByRole('checkbox', { name: 'ligar para o cartório' }));
    await usuario.click(screen.getByRole('checkbox', { name: 'comprar café' }));
    await usuario.click(screen.getByRole('button', { name: /^Encerrar$/ }));
    expect(await screen.findByText('1 anotação guardada para depois')).toBeVisible();
    expect(screen.queryByText(/3 anotações/)).toBeNull();
  });

  it('"1 de 1 questão certa" no singular', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { atividade: 'questoes' });
    await repo.colecao('sessoes').atualizar(s.id, { questoesFeitas: 1, questoesAcertadas: 1 });
    await encerrar(repo);
    expect(await screen.findByText('1 de 1 questão certa')).toBeVisible();
  });
});

describe('Sessão encerrada: parada, não relê os dados', () => {
  it('com a tela assentada não volta a ler o repositório (`carregar` estável)', async () => {
    const { repo } = await repositorioDeTeste();
    await umCartaoVencido(repo);
    await iniciarSessao(repo, { atividade: 'questoes' });
    await encerrar(repo);
    await screen.findByRole('link', { name: /^Seguir:/ });
    await new Promise((r) => setTimeout(r, 150));
    const leituras = vi.spyOn(repo, 'colecao');
    await new Promise((r) => setTimeout(r, 400));
    // Com uma seta nova a cada desenho, o `useDados` refazia a leitura sem parar (milhares por segundo).
    expect(leituras.mock.calls.length).toBeLessThan(3);
    leituras.mockRestore();
  });
});
