import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { andamentoDaRolagem } from './andamento-da-rolagem';
import { FioDaRolagem } from './FioDaRolagem';

describe('andamentoDaRolagem', () => {
  it('vai de 0 a 1 sobre o caminho que há para rolar', () => {
    expect(andamentoDaRolagem(0, 2000, 800)).toBe(0);
    expect(andamentoDaRolagem(600, 2000, 800)).toBe(0.5);
    expect(andamentoDaRolagem(1200, 2000, 800)).toBe(1);
  });
  it('não passa dos limites e fica em 0 quando o texto cabe na tela', () => {
    expect(andamentoDaRolagem(-50, 2000, 800)).toBe(0);
    expect(andamentoDaRolagem(5000, 2000, 800)).toBe(1);
    expect(andamentoDaRolagem(0, 600, 800)).toBe(0);
  });
});

describe('FioDaRolagem', () => {
  it('fica fora da árvore de acessibilidade e começa sem traço', () => {
    const { container } = render(<FioDaRolagem />);
    const fio = container.querySelector('.fio-da-rolagem');
    expect(fio?.getAttribute('aria-hidden')).toBe('true');
    expect(fio?.getAttribute('data-comeco')).toBe('sim');
  });
});
