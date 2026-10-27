import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AbasDaBiblioteca, type AbaDaBiblioteca } from './AbasDaBiblioteca';

function abrir(atual: AbaDaBiblioteca) {
  render(
    <MemoryRouter>
      <AbasDaBiblioteca atual={atual} />
    </MemoryRouter>,
  );
}

describe('AbasDaBiblioteca (S5)', () => {
  it('tem três abas e nenhuma escolha extra em Normas', () => {
    abrir('norma');
    const abas = screen.getByRole('navigation', { name: 'Seções da Biblioteca' });
    expect(abas.querySelectorAll('a')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Normas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('navigation', { name: 'Súmulas e teses' })).not.toBeInTheDocument();
  });

  it.each([
    ['sumulas', 'Súmulas e teses', 'Súmulas'],
    ['teses', 'Súmulas e teses', 'Teses'],
    ['resumos', 'Meus textos', 'Resumos'],
    ['precedentes', 'Meus textos', 'Precedentes'],
  ] as const)('%s marca a aba "%s" e a escolha "%s"', (atual, aba, pagina) => {
    abrir(atual);
    expect(screen.getByRole('link', { name: aba })).toHaveAttribute('aria-current', 'page');
    const sub = screen.getByRole('navigation', { name: aba });
    expect(sub.querySelectorAll('a')).toHaveLength(2);
    expect(screen.getByRole('link', { name: pagina })).toHaveAttribute('aria-current', 'page');
  });
});
