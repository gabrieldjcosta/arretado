import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { alterarPreferencias } from '../../core/preferencias';
import { fecharDia } from '../../dominios/dia/fechar';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { encerrarSessao, iniciarSessao } from '../../dominios/sessao/servico';
import { simularMovimento } from '../../testes/movimento';
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

  it('abre as Boas-vindas com o Zé e só dois botões, o foco no título, e lembra que viu', async () => {
    const { repo } = await repositorioDeTeste();
    abrirHoje(repo);

    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    expect(
      within(folha)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Agora não', 'Vamos']);
    // "Escolher meu concurso" saiu da folha: o Hoje vazio é quem o oferece.
    expect(within(folha).queryAllByRole('link')).toEqual([]);
    expect(folha.querySelector('svg.ze')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(folha).getByRole('heading', { level: 2 })).toHaveFocus();
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

  it('dispensada a Chegada, voltar ao Hoje na mesma abertura do aplicativo não a abre de novo', async () => {
    const { repo } = await repositorioDeTeste();
    const primeira = abrirHoje(repo);
    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    await primeira.usuario.click(within(folha).getByRole('button', { name: 'Agora não' }));
    expect(folhas()).toBeNull();
    primeira.unmount();

    // A pessoa foi a outra tela e voltou: o Hoje monta de novo, com o mesmo repositório e sem recarregar.
    abrirHoje(repo);
    await screen.findByRole('heading', { level: 1, name: 'Hoje' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(folhas()).toBeNull();
  });

  it('"Vamos" abre o passeio; "Pular o passeio" leva ao Começar, e "Experimentar sem conta" deixa o Hoje, que oferece "Escolher meu concurso"', async () => {
    const { repo } = await repositorioDeTeste();
    const { usuario } = abrirHoje(repo);
    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });

    await usuario.click(within(folha).getByRole('button', { name: 'Vamos' }));
    expect(await screen.findByRole('dialog', { name: 'Passo 1 de 4 Hoje' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Pular o passeio' }));
    expect(await screen.findByRole('dialog', { name: 'Vamo começar?' })).toBeInTheDocument();
    await usuario.click(
      screen.getByRole('button', {
        name: 'Experimentar sem conta e salvar seus dados manualmente',
      }),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    const comecos = screen.getByRole('region', { name: 'Por onde começar' });
    expect(within(comecos).getByRole('link', { name: 'Escolher meu concurso' })).toHaveAttribute(
      'href',
      '#/comecar',
    );
  });

  it('"Rever as boas-vindas" reabre a folha de qualquer tela, sem gravar nada; o passeio refeito termina em "Concluir"', async () => {
    localStorage.setItem(CHAVE_CHEGADA, '{"vista":true}');
    localStorage.setItem(CHAVE_ENTRADA, '{"dia":"2026-09-23"}');
    const { repo } = await repositorioDeTeste();
    const { usuario } = abrirHoje(repo);
    await screen.findByRole('heading', { level: 1, name: 'Hoje' });
    await usuario.click(screen.getByRole('button', { name: 'Ajuda' }));
    await usuario.click(screen.getByRole('button', { name: 'Rever as boas-vindas' }));
    const folha = await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
    await usuario.click(within(folha).getByRole('button', { name: 'Vamos' }));
    for (let i = 0; i < 3; i += 1)
      await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await usuario.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(folhas()).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Vamo começar?' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeVisible();
    expect(localStorage.getItem(CHAVE_CHEGADA)).toBe('{"vista":true}');
    expect(localStorage.getItem(CHAVE_ENTRADA)).toBe('{"dia":"2026-09-23"}');
  });

  it('com um aparelho que já viu a Chegada, o Hoje abre sem ela', async () => {
    localStorage.setItem(CHAVE_CHEGADA, '{"vista":true}');
    const { repo } = await repositorioDeTeste();
    abrirHoje(repo);

    // Sem a Chegada, o que aparece neste Dia é a linha da Entrada.
    await waitFor(() => {
      expect(document.querySelector('.linha-do-dia')).toHaveTextContent(/^Bom dia./);
    });
    expect(screen.queryByRole('dialog', { name: 'Boas-vindas ao Arretado!' })).toBeNull();
  });
});

/** A linha quieta da Entrada do Dia (S4), abaixo do Agora. */
const linha = () => document.querySelector('.linha-do-dia');

describe('Entrada do Dia › primeira abertura de cada Dia', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_ENTRADA);
  });

  it('é uma linha abaixo do Agora, com a saudação e a dica; nada de folha nem de Citação', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    relogio.avancar(DIA);
    abrirHoje(repo);
    const par = await conteudoDoDia('2026-09-24');
    if (par === undefined) throw new Error('o conteúdo de partida deveria carregar');

    await waitFor(() => {
      expect(linha()).not.toBeNull();
    });
    expect(linha()).toHaveTextContent(paraTexto(`Bom dia. ${par.dica.destaque} ${par.dica.texto}`));
    expect(linha()).not.toHaveTextContent(par.citacao.texto.slice(0, 20));
    expect(folhas()).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Depois do Agora, na ordem do documento, e fora dele: o Começar não desce por causa da dica.
    const agora = screen.getByRole('region', { name: 'Agora' });
    const posicao = agora.compareDocumentPosition(linha()!);
    expect(posicao & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(agora.contains(linha())).toBe(false);
    // O registro da abertura sai num efeito depois da linha: espera, em vez de supor a ordem.
    await waitFor(() => {
      expect(entradaJaAbriu('2026-09-24')).toBe(true);
    });
    // Fala do produto: nada que cobre.
    expect(linha()).not.toHaveTextContent(/Você parou|atrasad|pendente|Frase\b/i);
  });

  it('o Agora segue como a ação principal, sem nenhum botão da linha', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    relogio.avancar(DIA);
    abrirHoje(repo);
    await waitFor(() => {
      expect(linha()).not.toBeNull();
    });
    expect(linha()?.querySelector('a, button')).toBeNull();
    expect(screen.getByRole('region', { name: 'Agora' })).toBeVisible();
  });

  it('a saudação segue a hora de Brasília', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    relogio.avancar(8 * 60 * 60_000);
    abrirHoje(repo);

    await waitFor(() => {
      expect(linha()).toHaveTextContent(/^Boa tarde\./);
    });
  });

  it('o aplicativo fechado no meio não a traz de volta no mesmo Dia', async () => {
    const { repo } = await repositorioDeTeste({ nomeBanco: 'entrada-fechada-no-meio' });
    const primeira = abrirHoje(repo);
    await waitFor(() => {
      expect(linha()).not.toBeNull();
    });
    primeira.unmount();

    // Outra abertura a frio, sobre os mesmos dados.
    const { repo: reaberto } = await repositorioDeTeste({ nomeBanco: 'entrada-fechada-no-meio' });
    abrirHoje(reaberto);
    await decisaoTerminou(2);

    expect(linha()).toBeNull();
  });

  it('voltar ao Hoje na mesma abertura, mesmo com o Dia virado, mostra a mesma linha e não decide de novo', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const primeira = abrirHoje(repo);
    await waitFor(() => {
      expect(linha()).not.toBeNull();
    });
    const texto = linha()?.textContent;
    primeira.unmount();

    relogio.avancar(DIA);
    abrirHoje(repo);

    await waitFor(() => {
      expect(linha()).not.toBeNull();
    });
    expect(linha()?.textContent).toBe(texto);
    expect(decisoes.promessas).toHaveLength(1);
  });
});

describe('Entrada do Dia › quando não aparece', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_ENTRADA);
  });

  it('com uma Sessão aberta', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, {});
    abrirHoje(repo);
    await decisaoTerminou();

    expect(linha()).toBeNull();
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
    expect(linha()).toBeNull();
    expect(folhas()).toBeNull();
  });

  it('com o "só estudo" ligado', async () => {
    const { repo } = await repositorioDeTeste();
    await alterarPreferencias(repo, { modoSoEstudo: true });
    abrirHoje(repo);
    await decisaoTerminou();

    expect(linha()).toBeNull();
  });

  it('com o Dia fechado', async () => {
    const { repo } = await repositorioDeTeste();
    await fecharDia(repo);
    abrirHoje(repo);
    await decisaoTerminou();

    expect(linha()).toBeNull();
  });
});

describe('Chegada › espera o nome em tela cheia (Abertura, M2 do Zé)', () => {
  beforeEach(() => {
    localStorage.removeItem(CHAVE_CHEGADA);
    localStorage.removeItem(CHAVE_ENTRADA);
    // O setup semeia o Dia no futuro; aqui o nome ainda não foi escrito, então a tela cheia abre.
    localStorage.removeItem('arretado:escrita-do-nome:v1');
  });

  it('na primeira vez o nome escreve primeiro: a Chegada só abre depois que a Abertura sai', async () => {
    simularMovimento('normal');
    const { repo } = await repositorioDeTeste();
    abrirHoje(repo);
    await waitFor(() => {
      expect(document.querySelector('.abertura')).not.toBeNull();
    });
    // A decisão da Chegada já saiu (o Hoje carregou), mas ela fica quieta: um <dialog> modal aberto agora
    // ficaria por cima do popover do nome.
    await decisaoTerminou();
    expect(screen.queryByRole('dialog', { name: 'Boas-vindas ao Arretado!' })).toBeNull();
    expect(chegadaJaVista()).toBe(false);

    fireEvent.pointerDown(document.body);
    expect(
      await screen.findByRole('dialog', { name: 'Boas-vindas ao Arretado!' }),
    ).toBeInTheDocument();
    expect(document.querySelector('.abertura')).toBeNull();
    expect(chegadaJaVista()).toBe(true);
  });
});
