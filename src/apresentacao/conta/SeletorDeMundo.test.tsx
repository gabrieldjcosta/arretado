import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeletorDeMundo } from './SeletorDeMundo';

describe('SeletorDeMundo', () => {
  it('avisa ao tocar', () => {
    const aoTrocar = vi.fn();
    render(<SeletorDeMundo mundo="noite" aoTrocar={aoTrocar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Alternar entre noite e dia' }));
    expect(aoTrocar).toHaveBeenCalledTimes(1);
  });

  it('diz na marca se é noite', () => {
    render(<SeletorDeMundo mundo="dia" aoTrocar={() => undefined} />);
    expect(
      screen
        .getByRole('button', { name: 'Alternar entre noite e dia' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });
});
