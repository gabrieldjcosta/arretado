import { StrictMode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { alterarPreferencias } from '../../../core/preferencias';
import { simularMovimento } from '../../../testes/movimento';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { Marca } from '../../componentes/escrita/Marca';
import { lembrarDaEscrita } from '../../componentes/escrita/frequencia';
import { useAberturaEmCurso, type OndeEscrever } from '../../componentes/escrita/vez-da-escrita';
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

/** Quem abre por cima do app (a Chegada) pergunta isto: aqui só mostra a resposta. */
function Sonda() {
  return <p data-testid="sonda">{useAberturaEmCurso() ? 'espera' : 'livre'}</p>;
}

async function montar(opcoes: { estrito?: boolean; soEstudo?: boolean } = {}) {
  const { repo } = await repositorioDeTeste({ inicio: HOJE });
  if (opcoes.soEstudo) await alterarPreferencias(repo, { modoSoEstudo: true });
  const arvore = (
    <ContextoRepositorio.Provider value={repo}>
      <ProvedorDaAbertura>
        <a className="marca" href="#/">
          <Marca />
        </a>
        <Sonda />
      </ProvedorDaAbertura>
    </ContextoRepositorio.Provider>
  );
  const vista = render(opcoes.estrito ? <StrictMode>{arvore}</StrictMode> : arvore);
  const camada = () => vista.container.querySelector('.abertura');
  // A escrita do cabeçalho (`svg.eb` dentro de `.marca`) e o lockup parado (com o ponto de luz).
  const escritaNoCabecalho = () => vista.container.querySelector('.marca svg.eb');
  const parado = () => vista.container.querySelector('.marca .lockup-ponto');
  const sonda = () => vista.queryByTestId('sonda')?.textContent ?? null;
  return { ...vista, camada, escritaNoCabecalho, parado, sonda };
}

const guardado = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null') as unknown;

describe('ProvedorDaAbertura: quem escreve o nome (M2 do Zé)', () => {
  it('primeira vez: o cabeçalho espera, a tela cheia escreve e o cabeçalho nasce parado', async () => {
    const { camada, escritaNoCabecalho, parado, sonda, container } = await montar();
    // Decidindo: nenhuma das duas escreve, e o app (o cabeçalho, quem abre por cima) ainda nem montou.
    expect(camada()).toBeNull();
    expect(escritaNoCabecalho()).toBeNull();
    expect(parado()).toBeNull();
    expect(sonda()).toBeNull();

    await waitFor(() => {
      expect(camada()).not.toBeNull();
    });
    expect(camada()?.querySelector('svg.eb')).not.toBeNull();
    expect(camada()?.querySelector('svg.eb')).not.toHaveClass('curta');
    // O nome não se escreve nos dois lugares: o cabeçalho tem o lockup parado, com o ponto de luz.
    expect(escritaNoCabecalho()).toBeNull();
    await waitFor(() => {
      expect(parado()).not.toBeNull();
    });
    expect(container.querySelectorAll('svg.eb')).toHaveLength(1);
    expect(sonda()).toBe('espera');
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('um toque pula: a camada sai, a espera acaba e o cabeçalho segue parado', async () => {
    const { camada, escritaNoCabecalho, parado, sonda } = await montar();
    await waitFor(() => {
      expect(camada()).not.toBeNull();
    });
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(camada()).toBeNull();
    });
    expect(sonda()).toBe('livre');
    expect(escritaNoCabecalho()).toBeNull();
    expect(parado()).not.toBeNull();
  });

  it('primeira abertura do Dia seguinte: a tela cheia escreve no modo curto', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { camada } = await montar();
    await waitFor(() => {
      expect(camada()?.querySelector('svg.eb')).toHaveClass('curta');
    });
    expect(guardado()).toEqual({ dia: '2026-10-20' });
  });

  it('demais aberturas do Dia: nada de camada nem de espera, o cabeçalho parado na hora', async () => {
    lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
    const { camada, escritaNoCabecalho, parado, sonda } = await montar();
    expect(camada()).toBeNull();
    expect(escritaNoCabecalho()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(sonda()).toBe('livre');
  });

  it('movimento reduzido do sistema: nenhuma camada, o cabeçalho parado, a primeira vez guardada', async () => {
    simularMovimento('reduzido');
    const { camada, parado, sonda } = await montar();
    expect(camada()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(sonda()).toBe('livre');
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
  });

  it('com o "só estudo" ligado a tela cheia não abre: o cabeçalho escreve como sempre escreveu', async () => {
    const { camada, escritaNoCabecalho, parado, sonda } = await montar({ soEstudo: true });
    expect(sonda()).toBeNull();
    await waitFor(() => {
      expect(escritaNoCabecalho()).not.toBeNull();
    });
    expect(camada()).toBeNull();
    expect(parado()).toBeNull();
    expect(sonda()).toBe('livre');
    await waitFor(() => {
      expect(guardado()).toEqual({ dia: '2026-10-20' });
    });
  });

  it('no StrictMode (efeitos em dobro) a escrita é de um lugar só', async () => {
    const { camada, escritaNoCabecalho, container } = await montar({ estrito: true });
    await waitFor(() => {
      expect(camada()).not.toBeNull();
    });
    expect(escritaNoCabecalho()).toBeNull();
    expect(container.querySelectorAll('.abertura')).toHaveLength(1);
    expect(container.querySelectorAll('svg.eb')).toHaveLength(1);
  });

  describe('o app espera a decisão', () => {
    it('decidindo, o app ainda não monta; decidido, monta no mesmo quadro da camada', async () => {
      let decidir: (d: OndeEscrever) => void = () => undefined;
      vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(
        new Promise<OndeEscrever>((resolver) => {
          decidir = resolver;
        }),
      );
      const { container, camada, sonda } = await montar();
      expect(container.querySelector('.marca')).toBeNull();
      expect(sonda()).toBeNull();
      expect(camada()).toBeNull();
      await act(async () => {
        decidir({ onde: 'tela', escrita: 'completa', calmo: false });
        await Promise.resolve();
      });
      expect(camada()).not.toBeNull();
      expect(container.querySelector('.marca')).not.toBeNull();
      expect(sonda()).toBe('espera');
    });

    it('a Abertura não abre (só estudo): o app monta quando a leitura acaba e o cabeçalho escreve', async () => {
      const { container, camada, escritaNoCabecalho } = await montar({ soEstudo: true });
      expect(container.querySelector('.marca')).toBeNull();
      await waitFor(() => {
        expect(escritaNoCabecalho()).not.toBeNull();
      });
      expect(camada()).toBeNull();
    });

    it('nas demais aberturas do Dia e com movimento reduzido o app monta na hora: nada a decidir', async () => {
      lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
      const demais = await montar();
      expect(demais.container.querySelector('.marca')).not.toBeNull();
      demais.unmount();
      simularMovimento('reduzido');
      const reduzido = await montar();
      expect(reduzido.container.querySelector('.marca')).not.toBeNull();
    });

    it('a espera não é curta demais: com a decisão pendente, aos 0,2 s o app ainda não montou', async () => {
      vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(new Promise(() => undefined));
      const { container } = await montar();
      await new Promise((resolver) => setTimeout(resolver, 200));
      expect(container.querySelector('.marca')).toBeNull();
    });

    it('se a decisão demora, o app aparece depois de 0,4 s: a Abertura nunca atrasa o uso', async () => {
      vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(new Promise(() => undefined));
      const { container, sonda } = await montar();
      expect(container.querySelector('.marca')).toBeNull();
      await waitFor(
        () => {
          expect(container.querySelector('.marca')).not.toBeNull();
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

      it('fica enquanto a Abertura decide e sai por baixo da camada, no quadro em que o app monta', async () => {
        const { camada, container } = await montar();
        expect(container.querySelector('.marca')).toBeNull();
        expect(tela()).not.toHaveAttribute('data-saindo');

        await waitFor(() => {
          expect(camada()).not.toBeNull();
        });
        expect(container.querySelector('.marca')).not.toBeNull();
        await waitFor(() => {
          expect(tela()).toHaveAttribute('data-saindo');
        });
      });

      it('sai quando o app monta sem a camada (o "só estudo" veta)', async () => {
        const { camada, container } = await montar({ soEstudo: true });
        expect(tela()).not.toHaveAttribute('data-saindo');
        await waitFor(() => {
          expect(container.querySelector('.marca')).not.toBeNull();
        });
        await waitFor(() => {
          expect(tela()).toHaveAttribute('data-saindo');
        });
        expect(camada()).toBeNull();
      });

      it('se a decisão demora, sai quando o app aparece no teto de 0,4 s', async () => {
        vi.mocked(decidirNaAberturaDoApp).mockReturnValueOnce(new Promise(() => undefined));
        const { container } = await montar();
        expect(tela()).not.toHaveAttribute('data-saindo');
        await waitFor(
          () => {
            expect(container.querySelector('.marca')).not.toBeNull();
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
