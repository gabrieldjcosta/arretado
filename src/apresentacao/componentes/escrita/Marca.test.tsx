import { fireEvent, render, waitFor } from '@testing-library/react';
import { alterarPreferencias } from '../../../core/preferencias';
import type { Repositorio } from '../../../core/persistencia';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { simularMovimento } from '../../../testes/movimento';
import { ContextoRepositorio } from '../../dados/contexto';
import { lembrarDaEscrita } from './frequencia';
import { Marca } from './Marca';
import { ContextoDaAbertura, type VezDaEscrita } from './vez-da-escrita';

const CHAVE = 'arretado:escrita-do-nome:v1';
const HOJE = '2026-10-20T12:00:00.000Z';

beforeEach(() => {
  window.localStorage.clear();
  // O setup semeia o Dia no futuro (aparelho que já viu a Abertura); aqui o nome ainda não foi escrito.
  window.localStorage.removeItem(CHAVE);
  simularMovimento('normal');
});

async function montar(opcoes: { perfil?: 'calmo' | 'guiado'; repo?: Repositorio } = {}) {
  const { repo } = opcoes.repo ? { repo: opcoes.repo } : await repositorioDeTeste({ inicio: HOJE });
  if (opcoes.perfil) await alterarPreferencias(repo, { perfilDeEstudo: opcoes.perfil });
  const vista = render(
    <ContextoRepositorio.Provider value={repo}>
      <Marca />
    </ContextoRepositorio.Provider>,
  );
  const escrita = () => vista.container.querySelector('svg.eb');
  // O lockup parado (Q2) tem o ponto de luz em `.lockup-ponto`; a escrita, não.
  const parado = () => vista.container.querySelector('svg.lockup .lockup-ponto');
  return { ...vista, repo, escrita, parado };
}

const guardado = () => window.localStorage.getItem(CHAVE);

// A escrita aparece no DOM antes do efeito que guarda o Dia e liga o toque que pula; sob carga o
// `waitFor` do DOM termina antes dele. Quem afirma sobre o que o efeito faz espera o Dia guardado.
const diaGuardado = (dia: string) =>
  waitFor(() => {
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia });
  });

describe('Marca do cabeçalho (D-D9, Q6)', () => {
  it('primeira abertura: espera as Preferências e escreve o nome inteiro', async () => {
    const { container, escrita } = await montar();
    // Antes da leitura, só o espaço do lockup (sem escrita, sem salto de layout).
    expect(escrita()).toBeNull();
    expect(container.querySelector('svg.lockup')).toHaveAttribute('aria-hidden', 'true');
    await waitFor(() => {
      expect(escrita()).not.toBeNull();
    });
    expect(escrita()).not.toHaveClass('curta');
    expect(escrita()).not.toHaveClass('calmo');
    expect(escrita()).not.toHaveClass('pulou');
    await diaGuardado('2026-10-20');
  });

  it('nas demais aberturas do Dia: o lockup parado na hora, sem esperar nem gravar de novo', async () => {
    lembrarDaEscrita(new Date('2026-10-20T08:00:00Z'));
    const antes = guardado();
    const { escrita, parado } = await montar();
    expect(escrita()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(guardado()).toBe(antes);
  });

  it('primeira do Dia: a escrita curta, e o Dia novo fica guardado', async () => {
    lembrarDaEscrita(new Date('2026-10-19T12:00:00Z'));
    const { escrita } = await montar();
    await waitFor(() => {
      expect(escrita()).toHaveClass('curta');
    });
    expect(escrita()).not.toHaveClass('pulou');
    await diaGuardado('2026-10-20');
  });

  it('um toque pula para o quadro final', async () => {
    const { escrita } = await montar();
    await waitFor(() => {
      expect(escrita()).not.toBeNull();
    });
    await diaGuardado('2026-10-20');
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(escrita()).toHaveClass('pulou');
    });
  });

  it('uma tecla também pula', async () => {
    const { escrita } = await montar();
    await waitFor(() => {
      expect(escrita()).not.toBeNull();
    });
    await diaGuardado('2026-10-20');
    fireEvent.keyDown(document.body, { key: 'Tab' });
    await waitFor(() => {
      expect(escrita()).toHaveClass('pulou');
    });
  });

  it('perfil Calmo: o desenho só esmaece', async () => {
    const { escrita } = await montar({ perfil: 'calmo' });
    await waitFor(() => {
      expect(escrita()).toHaveClass('calmo');
    });
    expect(escrita()).not.toHaveClass('pulou');
  });

  it('outros perfis escrevem por inteiro', async () => {
    const { escrita } = await montar({ perfil: 'guiado' });
    await waitFor(() => {
      expect(escrita()).not.toBeNull();
    });
    expect(escrita()).not.toHaveClass('calmo');
  });

  it('movimento reduzido do sistema: o lockup parado, e a primeira vez não é gasta', async () => {
    simularMovimento('reduzido');
    const { escrita, parado } = await montar();
    expect(escrita()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(guardado()).toBeNull();
    // Quando a pessoa deixar de reduzir, a primeira vez ainda está lá.
    simularMovimento('normal');
    const segunda = await montar();
    await waitFor(() => {
      expect(segunda.escrita()).not.toBeNull();
    });
    expect(segunda.escrita()).not.toHaveClass('pulou');
  });

  it('se as Preferências não leem, esmaece em vez de escrever no escuro', async () => {
    const repo = {
      ctx: { agora: () => new Date(HOJE) },
      colecao: () => {
        throw new Error('sem banco');
      },
    } as unknown as Repositorio;
    const { escrita } = await montar({ repo });
    await waitFor(() => {
      expect(escrita()).toHaveClass('calmo');
    });
  });

  it('enquanto espera as Preferências, não conta como vista', async () => {
    const repo = {
      ctx: { agora: () => new Date(HOJE) },
      colecao: () => ({ listarPagina: () => new Promise(() => undefined) }),
    } as unknown as Repositorio;
    const { escrita, container } = await montar({ repo });
    expect(escrita()).toBeNull();
    expect(container.querySelector('svg.lockup')).not.toBeNull();
    expect(guardado()).toBeNull();
  });
});

describe('Marca com a Abertura em tela cheia (M2 do Zé)', () => {
  async function montarCom(vez: VezDaEscrita) {
    const { repo } = await repositorioDeTeste({ inicio: HOJE });
    const arvore = (v: VezDaEscrita) => (
      <ContextoRepositorio.Provider value={repo}>
        <ContextoDaAbertura.Provider value={{ vez: v, emCurso: v.estado === 'pendente' }}>
          <Marca />
        </ContextoDaAbertura.Provider>
      </ContextoRepositorio.Provider>
    );
    const vista = render(arvore(vez));
    return {
      ...vista,
      trocar: (v: VezDaEscrita) => {
        vista.rerender(arvore(v));
      },
      escrita: () => vista.container.querySelector('svg.eb'),
      parado: () => vista.container.querySelector('svg.lockup .lockup-ponto'),
    };
  }

  it('a Abertura tomou a escrita: o cabeçalho nasce parado, mesmo na primeira vez, e não guarda nada', async () => {
    const { escrita, parado } = await montarCom({
      estado: 'decidida',
      onde: 'tela',
      escrita: 'completa',
      calmo: false,
    });
    expect(escrita()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(guardado()).toBeNull();
  });

  it('enquanto a Abertura decide, o cabeçalho espera: nem escreve nem conta como visto', async () => {
    const { escrita, parado, container } = await montarCom({ estado: 'pendente' });
    // Dá tempo de as Preferências lerem: ainda assim, nada de escrita.
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(escrita()).toBeNull();
    expect(parado()).toBeNull();
    expect(container.querySelector('svg.lockup')).not.toBeNull();
    expect(guardado()).toBeNull();
  });

  it('a Abertura toma a escrita depois da espera: do vazio ao lockup parado, sem escrever nada', async () => {
    const { trocar, escrita, parado } = await montarCom({ estado: 'pendente' });
    await new Promise((resolver) => setTimeout(resolver, 50));
    trocar({ estado: 'decidida', onde: 'tela', escrita: 'completa', calmo: false });
    expect(escrita()).toBeNull();
    expect(parado()).not.toBeNull();
    expect(guardado()).toBeNull();
  });

  it('a Abertura não abre (só estudo, Sessão aberta): o cabeçalho escreve como sempre e guarda o Dia', async () => {
    const { trocar, escrita } = await montarCom({ estado: 'pendente' });
    trocar({ estado: 'decidida', onde: 'cabecalho', escrita: 'completa' });
    await waitFor(() => {
      expect(escrita()).not.toBeNull();
    });
    expect(escrita()).not.toHaveClass('curta');
    await diaGuardado('2026-10-20');
  });
});
