import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ContextoRepositorio } from '../../dados/contexto';
import { PaletaDoFio } from './PaletaDoFio';

const repo = {
  colecao: () => ({ todosDoUsuario: () => Promise.resolve([]) }),
} as never;

function montar() {
  return render(
    <MemoryRouter>
      <ContextoRepositorio.Provider value={repo}>
        <PaletaDoFio />
      </ContextoRepositorio.Provider>
    </MemoryRouter>,
  );
}

describe('PaletaDoFio', () => {
  it('abre com Ctrl+K, filtra, navega com Enter e fecha com Esc', async () => {
    montar();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Buscar' })).toBeInTheDocument();
    await userEvent.keyboard('varal');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.keyboard('{Control>}k{/Control}{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('as setas movem a seleção', async () => {
    montar();
    await userEvent.keyboard('{Control>}k{/Control}{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });
});
