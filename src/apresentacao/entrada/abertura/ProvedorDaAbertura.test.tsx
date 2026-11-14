import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { alterarPreferencias } from '../../../core/preferencias';
import { simularMovimento } from '../../../testes/movimento';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { lembrarDaEscrita } from '../../componentes/escrita/frequencia';
import { useEstadoDaAbertura, type OndeEscrever } from '../../componentes/escrita/vez-da-escrita';
import { ContextoRepositorio } from '../../dados/contexto';
import { ProvedorDaAbertura } from './ProvedorDaAbertura';
import type * as Regras from './regras';
import { decidirNaAberturaDoApp } from './regras';

// A decisão de verdade, mas que um teste pode segurar: a leitura que ainda não voltou.
vi.mock('./regras', async () => {
  const original = await vi.importActual<typeof Regras>('./regras');
  return { ...original, decidirNaAberturaDoApp: vi.fn(original.decidirNaAberturaDoApp) };
});

const CHAVE = 'arretado:escrita-do-nome:v1';
const HOJE = '2026-10-20T12:00:00.000Z';

beforeEach(() => {
  window.localStorage.clear();
  // O setup semeia o Dia no futuro (aparelho que já viu a Abertura); aqui o nome ainda não foi escrito.
  window.localStorage.removeItem(CHAVE);
  simularMovimento('normal');
});

/**
 * O que o quadro do Fio e a Chegada perguntam à Abertura: aqui só mostra a resposta. `data-camada`: a escrita que o
 * quadro mostra (`camadaDoFio`), ou "nenhuma"; `data-voa`: a luz visita o Zé das Boas-vindas; o botão pula a abertura,
 * como o quadro faz ao toque.
 */
function Sonda() {
  const { camadaDoFio, emCurso, voaParaAChegada } = useEstadoDaAbertura();
  return (
    <div>
      <p
        data-testid="sonda"
        data-camada={camadaDoFio ? camadaDoFio.escrita : 'nenhuma'}
        data-voa={voaParaAChegada ? 'sim' : 'nao'}
      >
        {emCurso ? 'espera' : 'livre'}
      </p>
      <button
        type="button"
        onClick={() => {
          camadaDoFio?.aoSair('pulou');
        }}
      >
        pular
      </button>
    </div>
  );
}

async function montar(opcoes: { estrito?: boolean; soEstudo?: boolean; rota?: string } = {}) {
  const { repo } = await repositorioDeTeste({ inicio: HOJE });
  if (opcoes.soEstudo) await alterarPreferencias(repo, { modoSoEstudo: true });
  const arvore = (
    <MemoryRouter initialEntries={[opcoes.rota ?? '/']}>
      <ContextoRepositorio.Provider value={repo}>
        <ProvedorDaAbertura>
          <p data-testid="app">o app</p>
          <Sonda />
        </ProvedorDaAbertura>
      </ContextoRepositorio.Provider>
    </MemoryRouter>
  );
  const vista = render(opcoes.estrito ? <StrictMode>{arvore}</StrictMode> : arvore);
  const lido = (atributo: string) => vista.queryByTestId('sonda')?.getAttribute(atributo) ?? null;
  return {
    ...vista,
    camada: () => lido('data-camada'),
    voa: () => lido('data-voa'),
    sonda: () => vista.queryByTestId('sonda')?.textContent ?? null,
    app: () => vista.queryByTestId('app'),
    pular: () => {
      fireEvent.click(vista.getByRole('button', { name: 'pular' }));
    },
  };
}

const guardado = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null') as unknown;

describe('ProvedorDaAbertura: quem escreve o nome', () => {
  it('primeira vez: o app espera e o quadro do Fio escreve o nome completo', async () => {
    const { camada, sonda, app } = await montar();
    // Decidindo: o app ainda nem montou.
    expect(app()).toBeNull();
    expect(sonda()).toBeNull();

    await waitFor(() => {
      expect(camada()).toBe('completa');
    });
    expect(sonda()).toBe('espera');
    expect(app()).not.toBeNull();
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('o pulo entra na conta do Dia', async () => {
    lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
    const { camada, pular } = await montar();
    await waitFor(() => {
      expect(camada()).toBe('depressa');
    });
    pular();
    await waitFor(() => {
      expect(camada()).toBe('nenhuma');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20', puladas: 1 });
  });

  it('três aberturas seguidas puladas calam a escrita até o Dia seguinte: a quarta não abre, na hora', async () => {
    window.localStorage.setItem(CHAVE, '{"dia":"2026-10-20","puladas":3}');
    const { camada, sonda } = await montar();
    expect(camada()).toBe('nenhuma');
    expect(sonda()).toBe('livre');
  });

  it('um toque pula: a camada sai e a espera acaba', async () => {
    const { camada, sonda, pular } = await montar();
    await waitFor(() => {
      expect(camada()).toBe('completa');
    });
    pular();
    await waitFor(() => {
      expect(camada()).toBe('nenhuma');
    });
    expect(sonda()).toBe('livre');
  });

  it('primeira abertura do Dia seguinte: o nome se escreve em 2,4 s', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { camada } = await montar();
    await waitFor(() => {
      expect(camada()).toBe('doDia');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('demais aberturas do Dia: o nome se escreve em 1,6 s (D-D14)', async () => {
    lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
    const { camada } = await montar();
    await waitFor(() => {
      expect(camada()).toBe('depressa');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('um Dia guardado no futuro (a semente dos testes): nada de camada nem de espera', async () => {
    window.localStorage.setItem(CHAVE, '{"dia":"9999-12-31"}');
    const { camada, sonda } = await montar();
    expect(camada()).toBe('nenhuma');
    expect(sonda()).toBe('livre');
  });

  it('movimento reduzido do sistema: nenhuma camada e a primeira vez não é guardada', async () => {
    simularMovimento('reduzido');
    const { camada, sonda } = await montar();
    expect(camada()).toBe('nenhuma');
    expect(sonda()).toBe('livre');
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
  });

  it('com o "só estudo" ligado a escrita completa não abre', async () => {
    const { camada, sonda } = await montar({ soEstudo: true });
    expect(sonda()).toBeNull();
    await waitFor(() => {
      expect(sonda()).toBe('livre');
    });
    expect(camada()).toBe('nenhuma');
    // Sem camada, ninguém escreve o nome: o Dia não é guardado (o cabeçalho de antes é que o guardava).
    expect(guardado()).toBeNull();
  });

  it('no StrictMode (efeitos em dobro) a decisão e a camada são de um lugar só', async () => {
    const { camada, pular } = await montar({ estrito: true });
    await waitFor(() => {
      expect(camada()).toBe('completa');
    });
    pular();
    await waitFor(() => {
      expect(camada()).toBe('nenhuma');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20', puladas: 1 });
  });

  describe('o app espera a decisão', () => {
    it('decidindo, o app ainda não monta; decidido, monta no mesmo quadro da camada', async () => {
      let decidir: (d: OndeEscrever) => void = () => undefined;
      vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(
        new Promise<OndeEscrever>((resolver) => {
          decidir = resolver;
        }),
      );
      const { camada, sonda, app } = await montar();
      expect(app()).toBeNull();
      expect(sonda()).toBeNull();
      await act(async () => {
        decidir({ onde: 'tela', escrita: 'completa', calmo: false, chegada: false });
        await Promise.resolve();
      });
      expect(camada()).toBe('completa');
      expect(app()).not.toBeNull();
      expect(sonda()).toBe('espera');
    });

    it('a Abertura não abre (só estudo): o app monta quando a leitura acaba', async () => {
      const { app, camada } = await montar({ soEstudo: true });
      expect(app()).toBeNull();
      await waitFor(() => {
        expect(app()).not.toBeNull();
      });
      expect(camada()).toBe('nenhuma');
    });

    it('com o Dia guardado no futuro e com movimento reduzido o app monta na hora: nada a decidir', async () => {
      window.localStorage.setItem(CHAVE, '{"dia":"9999-12-31"}');
      const semente = await montar();
      expect(semente.app()).not.toBeNull();
      semente.unmount();
      simularMovimento('reduzido');
      const reduzido = await montar();
      expect(reduzido.app()).not.toBeNull();
    });

    it('a espera não é curta demais: com a decisão pendente, aos 0,2 s o app ainda não montou', async () => {
      vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(new Promise(() => undefined));
      const { app } = await montar();
      await new Promise((resolver) => setTimeout(resolver, 200));
      expect(app()).toBeNull();
    });

    it('se a decisão demora, o app aparece depois de 0,4 s: a Abertura nunca atrasa o uso', async () => {
      vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(new Promise(() => undefined));
      const { app, sonda } = await montar();
      expect(app()).toBeNull();
      await waitFor(
        () => {
          expect(app()).not.toBeNull();
        },
        { timeout: 1500 },
      );
      expect(sonda()).toBe('espera');
    });

    describe('a tela de carregamento do index.html', () => {
      const tela = () => document.getElementById('carregamento');
      beforeEach(() => {
        document.body.insertAdjacentHTML(
          'afterbegin',
          '<div id="carregamento" role="status"></div>',
        );
      });
      afterEach(() => {
        tela()?.remove();
      });

      it('fica enquanto a Abertura decide e sai no quadro em que o app monta', async () => {
        const { app } = await montar();
        expect(app()).toBeNull();
        expect(tela()).not.toHaveAttribute('data-saindo');

        await waitFor(() => {
          expect(app()).not.toBeNull();
        });
        await waitFor(() => {
          expect(tela()).toHaveAttribute('data-saindo');
        });
      });

      it('sai quando o app monta sem a camada (o "só estudo" veta)', async () => {
        const { app, camada } = await montar({ soEstudo: true });
        expect(tela()).not.toHaveAttribute('data-saindo');
        await waitFor(() => {
          expect(app()).not.toBeNull();
        });
        await waitFor(() => {
          expect(tela()).toHaveAttribute('data-saindo');
        });
        expect(camada()).toBe('nenhuma');
      });

      it('se a decisão demora, sai quando o app aparece no teto de 0,4 s', async () => {
        vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(new Promise(() => undefined));
        const { app } = await montar();
        expect(tela()).not.toHaveAttribute('data-saindo');
        await waitFor(
          () => {
            expect(app()).not.toBeNull();
          },
          { timeout: 1500 },
        );
        await waitFor(() => {
          expect(tela()).toHaveAttribute('data-saindo');
        });
      });
    });
  });
});

describe('ProvedorDaAbertura: a luz não visita o Zé das Boas-vindas', () => {
  it('no Fio a Chegada não espera a luz, nem na primeira vez com a Chegada por vir', async () => {
    vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(
      Promise.resolve<OndeEscrever>({
        onde: 'tela',
        escrita: 'completa',
        calmo: false,
        chegada: true,
      }),
    );
    const { camada, voa } = await montar();
    await waitFor(() => {
      expect(camada()).toBe('completa');
    });
    expect(voa()).toBe('nao');
  });
});

describe('ProvedorDaAbertura: a abertura é uma tela do quadro do Fio', () => {
  it('entrega a abertura ao quadro (sem camada de tela cheia)', async () => {
    const { camada, sonda, container } = await montar();
    await waitFor(() => {
      expect(camada()).toBe('completa');
    });
    expect(sonda()).toBe('espera');
    expect(container.querySelector('.abertura')).toBeNull();
  });

  it('numa rota fora do quadro ela sai quieta, sem contar pulo, e a espera acaba', async () => {
    const { sonda } = await montar({ rota: '/biblioteca' });
    await waitFor(() => {
      expect(sonda()).toBe('livre');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });
});
