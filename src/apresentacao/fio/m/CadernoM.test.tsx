import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import { aderirAoItem } from '../../../dominios/acervo/adesao';
import type { ItemDoAcervo } from '../../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { criarFraseDeTrecho } from '../../../dominios/recall/servico';
import { simularMovimento } from '../../../testes/movimento';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { CadernoM } from './CadernoM';
import { FRASES_POR_PAGINA } from './caderno-dados';
import { ToastM } from './ToastM';
import { avisar, esconderAviso } from './toast';

type ComAnimate = { animate?: unknown };

const TEXTO_DA_LEI = 'A pena será cumprida em 30 dias, se o apenado for primário.';

const lep: ItemDoAcervo = {
  id: 'lep',
  versao: 1,
  norma: { tituloCurto: 'LEP', tipo: 'Lei', esfera: 'federal' },
  nos: [
    {
      endereco: 'art112',
      categoria: 'normativo',
      tipo: 'artigo',
      rotulo: 'Art. 112',
      status: 'vigente',
      confianca: 'alta',
      trechos: [{ texto: TEXTO_DA_LEI }],
    },
  ],
};

/** Onde a pessoa está, para os testes lerem a rota. */
function Aqui() {
  const l = useLocation();
  return <output data-testid="rota">{`${l.pathname}${l.search}`}</output>;
}

function Cena({
  repo,
  foco,
  aoFechar = () => undefined,
}: {
  repo: Repositorio;
  foco?: string;
  aoFechar?: () => void;
}) {
  return (
    <ContextoRepositorio.Provider value={repo}>
      <MemoryRouter initialEntries={['/varal']}>
        <main id="conteudo">
          <Routes>
            <Route path="/varal" element={<CadernoM aoFechar={aoFechar} foco={foco} />} />
            <Route path="*" element={<p>outra tela</p>} />
          </Routes>
          <Aqui />
          <ToastM />
        </main>
      </MemoryRouter>
    </ContextoRepositorio.Provider>
  );
}

/** O app com a LEP guardada e, de lá, o jeito de guardar uma Frase tirada do artigo dela ou escrita à mão. */
async function cenario() {
  const { repo, relogio } = await repositorioDeTeste();
  const fonte = await FonteEmMemoria.criar([{ item: lep }]);
  const [entrada] = (await fonte.listar()).itens;
  if (!entrada) throw new Error('o acervo do teste está vazio');
  const adesao = await aderirAoItem(repo, fonte, entrada);
  if (adesao.estado !== 'adicionada') throw new Error('a LEP não foi guardada');
  const aberta = await abrirNorma(repo, adesao.normaId);
  const artigo = aberta.nos.find((n) => n.dispositivo.endereco === 'art112');
  if (!artigo) throw new Error('sem o artigo 112');
  return {
    repo,
    relogio,
    /** Uma Frase tirada do artigo 112 (volta amanhã). */
    daLei: (texto: string) =>
      criarFraseDeTrecho(repo, {
        texto,
        trecho: {
          dispositivoId: artigo.dispositivo.id,
          versaoId: aberta.versao.id,
          texto: TEXTO_DA_LEI,
          inicio: 0,
          fim: TEXTO_DA_LEI.length,
        },
      }),
    /** Uma Frase escrita à mão (volta na data dada). */
    escrita: async (texto: string, proximaRevisao = '2026-09-30') => {
      const f = await repo.colecao('frases').criar({
        texto,
        origemTipo: 'manual',
        estado: 'ativa',
        proximaRevisao,
      });
      return f.id;
    },
  };
}

/** O mesmo repositório até `quebrar()`: dali em diante, abrir uma coleção falha (o banco que some no meio do caminho). */
function repositorioQueQuebra(repo: Repositorio) {
  let quebrado = false;
  const comFalha = new Proxy(repo, {
    get(alvo, chave) {
      if (chave === 'colecao' && quebrado) {
        return () => {
          throw new Error('o banco sumiu');
        };
      }
      const valor: unknown = Reflect.get(alvo, chave, alvo);
      return typeof valor === 'function' ? (valor as () => unknown).bind(alvo) : valor;
    },
  });
  return {
    repo: comFalha,
    quebrar: () => {
      quebrado = true;
    },
  };
}

const rota = () => screen.getByTestId('rota').textContent;
const abrirCaderno = () => screen.findByRole('dialog', { name: 'Suas Frases certas' });

beforeEach(() => {
  avisar('');
  esconderAviso();
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as ComAnimate).animate;
  vi.restoreAllMocks();
});

describe('o Caderno de Frases no quadro do mockup', () => {
  it('abre como diálogo nomeado, com a linha de cima, a frase quieta e a contagem para o leitor de tela', async () => {
    const { repo, escrita } = await cenario();
    await escrita('A progressão é decidida pelo juiz.');
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    expect(caderno).toHaveAttribute('aria-modal', 'true');
    expect(within(caderno).getByText('Varal · Frases')).toHaveClass('m-olho');
    expect(within(caderno).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Suas Frases certas',
    );
    expect(
      within(caderno).getByText(/Cada erro vira a frase certa e volta na revisão\./),
    ).toHaveClass('m-quieto');
    const estado = await within(caderno).findByRole('status');
    expect(estado).toHaveClass('m-so-leitor');
    await waitFor(() => {
      expect(estado).toHaveTextContent('1 Frase.');
    });
  });

  it('cada Frase diz de onde veio, o artigo e quando volta; só a que veio da lei leva "Ler na lei"', async () => {
    const { repo, relogio, daLei, escrita } = await cenario();
    await escrita('A progressão é decidida pelo juiz.');
    relogio.avancar(60_000);
    await daLei('Primário progride com 30 dias.');
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    const itens = await within(caderno).findAllByRole('listitem');
    // A mais nova primeiro.
    expect(itens.map((i) => i.querySelector('.m-texto')?.textContent)).toEqual([
      'Primário progride com 30 dias.',
      'A progressão é decidida pelo juiz.',
    ]);
    expect(itens.map((i) => i.querySelector('.m-meta')?.textContent)).toEqual([
      'Da lei · LEP, art. 112 · volta amanhã',
      'Escrita por você · volta em 7 dias',
    ]);
    expect(
      within(itens[0] as HTMLElement).getByRole('button', { name: 'Ler na lei' }),
    ).toBeVisible();
    expect(within(itens[1] as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
    // Só a mais nova acende a borda (a "nova" do mockup), mesmo que a escrita um minuto antes também seja de hoje.
    expect(itens[0]).toHaveClass('m-nova');
    expect(itens[1]).not.toHaveClass('m-nova');
  });

  it('"Ler na lei" abre e fecha o artigo, com os trechos que o app grifa', async () => {
    const { repo, daLei } = await cenario();
    await daLei('Primário progride com 30 dias.');
    const usuario = userEvent.setup();
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    const botao = await within(caderno).findByRole('button', { name: 'Ler na lei' });
    const lei = caderno.querySelector<HTMLElement>('.m-lei');
    expect(lei).toBeInTheDocument();
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(botao).toHaveAttribute('aria-controls', lei?.id);
    expect(lei).toHaveAttribute('hidden');
    // O botão é descrito pela Frase, para o leitor de tela saber de qual artigo se fala.
    const descricao = botao.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(descricao)).toHaveTextContent('Primário progride com 30 dias.');

    await usuario.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(lei).not.toHaveAttribute('hidden');
    expect(within(lei as HTMLElement).getByText('LEP, art. 112.')).toHaveClass('m-art');
    const grifos = [...(lei as HTMLElement).querySelectorAll('.m-grifo')].map((g) => g.textContent);
    expect(grifos.join(' ')).toMatch(/30 dias/);
    // O texto da lei inteiro, sem perder uma letra.
    expect((lei as HTMLElement).querySelectorAll('p')[1]?.textContent).toBe(TEXTO_DA_LEI);

    await usuario.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(lei).toHaveAttribute('hidden');
  });

  it('sem Frase nenhuma, diz como elas nascem e leva a uma norma, depois de a folha descer', async () => {
    const { repo } = await cenario();
    const aoFechar = vi.fn();
    const usuario = userEvent.setup();
    render(<Cena repo={repo} aoFechar={aoFechar} />);
    const caderno = await abrirCaderno();
    expect(await within(caderno).findByText(/Ainda não há Frases\./)).toBeInTheDocument();
    expect(within(caderno).getByRole('status')).toHaveTextContent('0 Frases.');
    await usuario.click(within(caderno).getByRole('button', { name: 'Ler uma norma' }));
    await waitFor(() => {
      expect(rota()).toBe('/varal/normas');
    });
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('as Frases vêm em páginas de 50, e "Mostrar mais" traz o resto', async () => {
    const { repo, relogio, escrita } = await cenario();
    for (let i = 0; i < FRASES_POR_PAGINA + 2; i++) {
      relogio.avancar(1000);
      await escrita(`Frase número ${String(i)}`);
    }
    const usuario = userEvent.setup();
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    await waitFor(() => {
      expect(within(caderno).getAllByRole('listitem')).toHaveLength(FRASES_POR_PAGINA);
    });
    expect(within(caderno).getByRole('status')).toHaveTextContent('50 Frases, e há mais.');
    // A mais nova abre a lista.
    expect(within(caderno).getAllByRole('listitem')[0]).toHaveTextContent('Frase número 51');
    await usuario.click(within(caderno).getByRole('button', { name: 'Mostrar mais' }));
    await waitFor(() => {
      expect(within(caderno).getAllByRole('listitem')).toHaveLength(FRASES_POR_PAGINA + 2);
    });
    expect(within(caderno).getByRole('status')).toHaveTextContent('52 Frases.');
    expect(within(caderno).queryByRole('button', { name: 'Mostrar mais' })).not.toBeInTheDocument();
  });

  it('se "Mostrar mais" não traz as Frases, avisa e a lista que já está na tela fica', async () => {
    const { repo, relogio, escrita } = await cenario();
    for (let i = 0; i < FRASES_POR_PAGINA + 2; i++) {
      relogio.avancar(1000);
      await escrita(`Frase número ${String(i)}`);
    }
    const { repo: frágil, quebrar } = repositorioQueQuebra(repo);
    const usuario = userEvent.setup();
    render(<Cena repo={frágil} />);
    const caderno = await abrirCaderno();
    await waitFor(() => {
      expect(within(caderno).getAllByRole('listitem')).toHaveLength(FRASES_POR_PAGINA);
    });
    quebrar();
    await usuario.click(within(caderno).getByRole('button', { name: 'Mostrar mais' }));
    expect(await screen.findByText('Não deu para trazer mais Frases agora.')).toBeInTheDocument();
    // A lista fica, e dá para tentar de novo.
    expect(within(caderno).getAllByRole('listitem')).toHaveLength(FRASES_POR_PAGINA);
    expect(within(caderno).getByRole('button', { name: 'Mostrar mais' })).toBeEnabled();
    expect(
      within(caderno).queryByText('Não deu para abrir o caderno agora.'),
    ).not.toBeInTheDocument();
  });

  it('"Abrir a lista completa" leva à tela de antes, depois de a folha descer', async () => {
    const { repo, escrita } = await cenario();
    await escrita('A progressão é decidida pelo juiz.');
    const aoFechar = vi.fn();
    const usuario = userEvent.setup();
    render(<Cena repo={repo} aoFechar={aoFechar} />);
    const caderno = await abrirCaderno();
    await usuario.click(
      await within(caderno).findByRole('button', { name: 'Abrir a lista completa' }),
    );
    await waitFor(() => {
      expect(rota()).toBe('/recall/frases');
    });
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('Escape fecha a folha e avisa quem a abriu', async () => {
    const { repo } = await cenario();
    const aoFechar = vi.fn();
    render(<Cena repo={repo} aoFechar={aoFechar} />);
    await abrirCaderno();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalledTimes(1);
    });
    expect(rota()).toBe('/varal');
  });

  it('se as Frases não abrem, diz isso e não oferece o que depende delas', async () => {
    // Um repositório que não responde: a leitura falha e a folha continua fechável.
    const repo = {} as unknown as Repositorio;
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    expect(
      await within(caderno).findByText('Não deu para abrir o caderno agora.'),
    ).toBeInTheDocument();
    expect(
      within(caderno).getByText(
        'Feche o caderno e abra de novo; as suas Frases continuam guardadas.',
      ),
    ).toBeInTheDocument();
    expect(within(caderno).queryByRole('button', { name: 'Mostrar mais' })).not.toBeInTheDocument();
    expect(
      within(caderno).queryByRole('button', { name: 'Abrir a lista completa' }),
    ).not.toBeInTheDocument();
  });
});

describe('a Frase que a busca achou', () => {
  it('segue pelas páginas até achá-la, rola até ela, a foca e deixa as outras como estão', async () => {
    const { repo, relogio, escrita } = await cenario();
    const ids: string[] = [];
    for (let i = 0; i < FRASES_POR_PAGINA + 5; i++) {
      relogio.avancar(1000);
      ids.push(await escrita(`Frase número ${String(i)}`));
    }
    const maisAntiga = ids[0] ?? '';
    const rolar = vi.spyOn(Element.prototype, 'scrollIntoView');
    render(<Cena repo={repo} foco={maisAntiga} />);
    const caderno = await abrirCaderno();
    // O foco inicial da folha passa primeiro (60 ms); a Frase achada o toma depois.
    await waitFor(
      () => {
        expect(document.activeElement).toHaveAttribute('data-frase', maisAntiga);
      },
      { timeout: 3000 },
    );
    expect(document.activeElement).toHaveTextContent('Frase número 0');
    expect(rolar).toHaveBeenCalledWith({ block: 'center' });
    // Sem movimento (o padrão dos testes) não passa brilho nenhum: nada fica no estilo da Frase.
    expect((document.activeElement as HTMLElement).style.boxShadow).toBe('');
    // A mais antiga estava na segunda página: as 55 vieram, e não sobrou outra.
    expect(within(caderno).getAllByRole('listitem')).toHaveLength(FRASES_POR_PAGINA + 5);
    expect(within(caderno).queryByRole('button', { name: 'Mostrar mais' })).not.toBeInTheDocument();
  });

  it('uma Frase que já não existe deixa a folha aberta na lista, sem foco em lugar nenhum', async () => {
    const { repo, escrita } = await cenario();
    await escrita('A progressão é decidida pelo juiz.');
    render(<Cena repo={repo} foco="frase-que-sumiu" />);
    const caderno = await abrirCaderno();
    expect(
      await within(caderno).findByText('A progressão é decidida pelo juiz.'),
    ).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(document.activeElement).not.toHaveAttribute('data-frase');
  });
});

describe('o movimento do Caderno no Vivo', () => {
  function animarDeMentira() {
    const animate = vi.fn(() => ({
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
    }));
    (Element.prototype as ComAnimate).animate = animate;
    simularMovimento('normal');
    return () =>
      animate.mock.calls as unknown as Array<[Keyframe[], KeyframeAnimationOptions | undefined]>;
  }

  it('as Frases descem uma a uma (420 ms, 120 ms de espera mais 60 por Frase), só as doze primeiras', async () => {
    const { repo, relogio, escrita } = await cenario();
    for (let i = 0; i < 14; i++) {
      relogio.avancar(1000);
      await escrita(`Frase número ${String(i)}`);
    }
    const chamadas = animarDeMentira();
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    await waitFor(() => {
      expect(within(caderno).getAllByRole('listitem')).toHaveLength(14);
    });
    const entradas = chamadas().filter(([, opc]) => opc?.duration === 420);
    expect(entradas.map(([, opc]) => opc?.delay)).toEqual([
      120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780,
    ]);
    expect(entradas[0]?.[0]).toEqual([
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'none' },
    ]);
  });

  it('"Ler na lei" desce em 320 ms ao abrir, e o primeiro desenho da folha não é um abrir', async () => {
    const { repo, daLei } = await cenario();
    await daLei('Primário progride com 30 dias.');
    const chamadas = animarDeMentira();
    const usuario = userEvent.setup();
    render(<Cena repo={repo} />);
    const caderno = await abrirCaderno();
    const botao = await within(caderno).findByRole('button', { name: 'Ler na lei' });
    expect(chamadas().filter(([, opc]) => opc?.duration === 320)).toHaveLength(0);
    await usuario.click(botao);
    const abrindo = chamadas().filter(([, opc]) => opc?.duration === 320);
    expect(abrindo).toHaveLength(1);
    expect(abrindo[0]?.[0]).toEqual([
      { opacity: 0, transform: 'translateY(-6px)' },
      { opacity: 1, transform: 'none' },
    ]);
    // Fechar o artigo não anima.
    await usuario.click(botao);
    expect(chamadas().filter(([, opc]) => opc?.duration === 320)).toHaveLength(1);
  });

  it('a Frase achada pela busca ganha o brilho que passa (1400 ms)', async () => {
    const { repo, escrita } = await cenario();
    const id = await escrita('A progressão é decidida pelo juiz.');
    const chamadas = animarDeMentira();
    render(<Cena repo={repo} foco={id} />);
    await abrirCaderno();
    await waitFor(() => {
      expect(chamadas().filter(([, opc]) => opc?.duration === 1400)).toHaveLength(1);
    });
    const brilho = chamadas().find(([, opc]) => opc?.duration === 1400);
    expect(brilho?.[0]).toHaveLength(3);
    expect(brilho?.[1]?.easing).toBe('ease-out');
  });
});
