import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvisosDoFio, useAvisos } from './AvisosDoFio';

function Gatilho({ desfazer }: { desfazer: () => void }) {
  const avisar = useAvisos();
  return (
    <button
      type="button"
      onClick={() => {
        avisar({ texto: 'Cartão criado', desfazer });
      }}
    >
      criar
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AvisosDoFio', () => {
  it('mostra o aviso, desfaz e fecha', async () => {
    const desfazer = vi.fn();
    render(
      <AvisosDoFio>
        <Gatilho desfazer={desfazer} />
      </AvisosDoFio>,
    );
    await userEvent.click(screen.getByText('criar'));
    expect(screen.getByText('Cartão criado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(desfazer).toHaveBeenCalledOnce();
    expect(screen.queryByText('Cartão criado')).not.toBeInTheDocument();
  });

  it('some sozinho depois de 5 s', () => {
    vi.useFakeTimers();
    render(
      <AvisosDoFio>
        <Gatilho desfazer={vi.fn()} />
      </AvisosDoFio>,
    );
    act(() => {
      screen.getByText('criar').click();
    });
    expect(screen.getByText('Cartão criado')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.queryByText('Cartão criado')).not.toBeInTheDocument();
  });
});
