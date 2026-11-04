import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeletorDeMundo } from './SeletorDeMundo';

describe('SeletorDeMundo', () => {
  it('na noite oferece o tema claro e avisa ao tocar', () => {
    const aoTrocar = vi.fn();
    render(<SeletorDeMundo mundo="noite" aoTrocar={aoTrocar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trocar para o tema claro' }));
    expect(aoTrocar).toHaveBeenCalledTimes(1);
  });

  it('no dia oferece o tema escuro', () => {
    render(<SeletorDeMundo mundo="dia" aoTrocar={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Trocar para o tema escuro' })).toBeTruthy();
  });
});
