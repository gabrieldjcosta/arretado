import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { alterarPreferencias } from '../../core/preferencias';
import { fecharDia } from '../../dominios/dia/fechar';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { encerrarSessao, iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { conteudoDoDia } from './conteudo';
import { CHAVE_CHEGADA, CHAVE_ENTRADA, chegadaJaVista, entradaJaAbriu } from './regras';

const DIA = 24 * 60 * 60_000;
// O relógio padrão de `repositorioDeTeste` é 2026-09-23T12:00Z, ou seja, 09h00 em Brasília.
const HOJE = '2026-09-23';

/**
 * Guarda a decisão de cada abertura a frio: para afirmar que nada abriu, o teste espera a decisão
 * acabar (sem isto, "não abriu" valeria também para "ainda não decidiu").
 */
const decisoes = vi.hoisted(() => ({ promessas: [] as Promise<unknown>[] }));
vi.mock('./regras', async (original) => {
  const real = await original<typeof import('./regras')>();
  return {
    ...real,
    decidirNaAberturaAFrio: (...args: Parameters<typeof real.decidirNaAberturaAFrio>) => {
      const promessa = real.decidirNaAberturaAFrio(...args);
      decisoes.promessas.push(promessa);
      return promessa;
    },
  };
});

async function decisaoTerminou(aberturas = 1) {
  await waitFor(() => {
    expect(decisoes.promessas).toHaveLength(aberturas);
  });
  // A atualização do React sai do `then` da decisão: espera ela pintar o que a decisão mandou.
  await act(async () => {
    await Promise.all(decisoes.promessas);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

function abrirHoje(repo: Repositorio) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  const tela = render(<App abrir={() => Promise.resolve(repo)} />);
  return { usuario, ...tela };
}

/** Nenhuma das duas folhas está aberta. */
const folhas = () =>
  screen.queryByRole('dialog', { name: /^(Bom dia|Boa tarde|Boa noite|Boas-vindas)/ });

const paraTexto = (texto: string) => texto.replace(/\s+/g, ' ');

beforeEach(() => {
  decisoes.promessas.length = 0;
  localStorage.clear();
});

describe('Chegada › primeira vez neste aparelho', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_CHEGADA);
    localStorage.removeItem(CHAVE_ENTRADA);
  });

  it('abre a folha de boas-vindas com os caminhos reais, o foco no principal (escolher o concurso), e lembra que viu', async () => {
    const { repo } = await repositorioDeTeste();
    abrirHoje(repo);

    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    const escolher = within(folha).getByRole('link', { name: 'Escolher meu concurso' });
    expect(escolher).toHaveAttribute('href', '#/comecar');
    expect(escolher).toHaveClass('principal');
    expect(within(folha).getByRole('link', { name: 'Ler uma norma' })).toHaveAttribute(
      'href',
      '#/biblioteca',
    );
    const registrar = within(folha).getByRole('link', { name: 'Registrar um erro' });
    expect(registrar).toHaveAttribute('href', '#/recall/registrar');
    expect(registrar).not.toHaveClass('principal');
    expect(within(folha).getByRole('link', { name: /^Montar uma trilha/ })).toHaveAttribute(
      'href',
      '#/plano/onboarding',
    );
    expect(within(folha).getByRole('button', { name: 'Agora não' })).toBeVisible();
    await waitFor(() => {
      expect(escolher).toHaveFocus();
    });
    expect(chegadaJaVista()).toBe(true);
    // A Entrada do Dia não vem junto: o Dia da Chegada já tem a sua folha.
    expect(entradaJaAbriu(HOJE)).toBe(true);
  });

  it('"Agora não" fecha a folha e o Hoje fica como estava', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = abrirHoje(repo);
    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });

    await usuario.click(within(folha).getByRole('button', { name: 'Agora não' }));

    expect(folhas()).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  });

  it.each([
    ['Escolher meu concurso', 'Qual concurso você estuda?'],
    ['Registrar um erro', 'Registrar erro'],
  ])('"%s" leva à tela dele, sem a folha por cima', async (caminho, titulo) => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = abrirHoje(repo);
    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });

    await usuario.click(within(folha).getByRole('link', { name: caminho }));

    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
    expect(folhas()).toBeNull();
  });

  it('com um aparelho que já viu a Chegada, o Hoje abre sem ela', async () => {
    localStorage.setItem(CHAVE_CHEGADA, '{"vista":true}');
    const { repo } = await repositorioDeTeste();
    abrirHoje(repo);

    // Sem a Chegada, o que abre neste Dia é a Entrada.
    expect(await screen.findByRole('dialog', { name: 'Bom dia' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Boas-vindas ao Arretado!' })).toBeNull();
  });
});

describe('Entrada do Dia › primeira abertura de cada Dia', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_ENTRADA);
  });

  it('abre com a saudação, a Citação, a dica e o caminho para o Agora; o foco vai para ele', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    relogio.avancar(DIA);
    abrirHoje(repo);
    const par = await conteudoDoDia('2026-09-24');
    if (par === undefined) throw new Error('o conteúdo de partida deveria carregar');

    const entrada = await screen.findByRole('dialog', { name: 'Bom dia' });
    expect(within(entrada).getByRole('blockquote')).toHaveTextContent(paraTexto(par.citacao.texto));
    expect(entrada).toHaveTextContent(`${par.citacao.autor}, ${par.citacao.obra}`);
    expect(within(entrada).getByRole('heading', { level: 3, name: 'Dica de hoje' })).toBeVisible();
    expect(entrada).toHaveTextContent(paraTexto(`${par.dica.destaque} ${par.dica.texto}`));
    // A Citação e a dica são a descrição do diálogo: o leitor de tela as lê depois da saudação.
    expect(entrada).toHaveAccessibleDescription(
      expect.stringContaining(paraTexto(par.dica.destaque)),
    );

    const principal = within(entrada).getByRole('link', { name: 'Começar: Revisar cartões' });
    expect(principal).toHaveAttribute('href', expect.stringMatching(/^#\/sessao\/iniciar\?/));
    expect(within(entrada).getByRole('button', { name: 'Agora não' })).toBeVisible();
    await waitFor(() => {
      expect(principal).toHaveFocus();
    });
    expect(entradaJaAbriu('2026-09-24')).toBe(true);
    // Fala do produto: "Citação" na tela, nunca "Frase", e nada que cobre.
    expect(entrada).not.toHaveTextContent(/Frase\b/);
    expect(entrada).not.toHaveTextContent(/Você parou|atrasad|pendente/i);
  });

  it('o "Começar" leva à Sessão do Agora e a folha não fica por cima', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    relogio.avancar(DIA);
    const { usuario } = abrirHoje(repo);
    const entrada = await screen.findByRole('dialog', { name: 'Bom dia' });

    await usuario.click(within(entrada).getByRole('link', { name: 'Começar: Revisar cartões' }));

    expect(folhas()).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: 'Hoje' })).toBeNull();
  });

  it('sem Agora (o Hoje vazio), o botão principal é "Continuar" e só fecha', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = abrirHoje(repo);
    const entrada = await screen.findByRole('dialog', { name: 'Bom dia' });
    const continuar = within(entrada).getByRole('button', { name: 'Continuar' });
    expect(within(entrada).queryByRole('button', { name: 'Agora não' })).toBeNull();
    await waitFor(() => {
      expect(continuar).toHaveFocus();
    });

    await usuario.click(continuar);

    expect(folhas()).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
  });

  it('"Agora não" só fecha: o Hoje segue como estava', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    relogio.avancar(DIA);
    const { usuario } = abrirHoje(repo);
    const entrada = await screen.findByRole('dialog', { name: 'Bom dia' });

    await usuario.click(within(entrada).getByRole('button', { name: 'Agora não' }));

    expect(folhas()).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Agora' })).toBeVisible();
  });

  it('a saudação segue a hora de Brasília', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    relogio.avancar(8 * 60 * 60_000);
    abrirHoje(repo);

    expect(await screen.findByRole('dialog', { name: 'Boa tarde' })).toBeVisible();
  });

  it('o aplicativo fechado no meio não a traz de volta no mesmo Dia', async () => {
    const { repo } = await repositorioDeTeste({ nomeBanco: 'entrada-fechada-no-meio' });
    const primeira = abrirHoje(repo);
    await screen.findByRole('dialog', { name: 'Bom dia' });
    primeira.unmount();

    // Outra abertura a frio, sobre os mesmos dados.
    const { repo: reaberto } = await repositorioDeTeste({ nomeBanco: 'entrada-fechada-no-meio' });
    abrirHoje(reaberto);
    await decisaoTerminou(2);

    expect(folhas()).toBeNull();
  });

  it('voltar ao Hoje na mesma abertura, mesmo com o Dia virado, não abre outra', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const primeira = abrirHoje(repo);
    await screen.findByRole('dialog', { name: 'Bom dia' });
    primeira.unmount();

    relogio.avancar(DIA);
    abrirHoje(repo);
    await decisaoTerminou(2);

    expect(folhas()).toBeNull();
  });
});

describe('Entrada do Dia › quando não abre', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_ENTRADA);
  });

  it('com uma Sessão aberta', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, {});
    abrirHoje(repo);
    await decisaoTerminou();

    expect(folhas()).toBeNull();
    expect(entradaJaAbriu(HOJE)).toBe(false);
  });

  it('com o Retorno à vista (dias fora)', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const sessao = await iniciarSessao(repo, {});
    await encerrarSessao(repo, sessao.id);
    relogio.avancar(3 * DIA);
    abrirHoje(repo);
    await decisaoTerminou();

    expect(await screen.findByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    expect(folhas()).toBeNull();
  });

  it('com o "só estudo" ligado', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { modoSoEstudo: true });
    abrirHoje(repo);
    await decisaoTerminou();

    expect(folhas()).toBeNull();
  });

  it('com o Dia fechado', async () => {
    const { repo } = await repositorioDeTeste();
    await fecharDia(repo);
    abrirHoje(repo);
    await decisaoTerminou();

    expect(folhas()).toBeNull();
  });
});
