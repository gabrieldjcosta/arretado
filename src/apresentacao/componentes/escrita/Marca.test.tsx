import { fireEvent, render, waitFor } from '@testing-library/react';
import { alterarPreferencias } from '../../../core/preferencias';
import type { Repositorio } from '../../../core/persistencia';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { simularMovimento } from '../../../testes/movimento';
import { ContextoRepositorio } from '../../dados/contexto';
import { lembrarDaEscrita } from './frequencia';
import { Marca } from './Marca';

const CHAVE = 'arretado:escrita-do-nome:v1';
const HOJE = '2026-10-20T12:00:00.000Z';

beforeEach(() => {
  window.localStorage.clear();
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
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia: '2026-10-20' });
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
    expect(JSON.parse(guardado() ?? 'null')).toEqual({ dia: '2026-10-20' });
  });

  it('um toque pula para o quadro final', async () => {
    const { escrita } = await montar();
    await waitFor(() => {
      expect(escrita()).not.toBeNull();
    });
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
