import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Privacidade } from './Privacidade';

const montar = () =>
  render(
    <MemoryRouter>
      <Privacidade />
    </MemoryRouter>,
  );

describe('Conta › Privacidade (A7)', () => {
  it('mostra a política v3 e mantém os marcadores a definir visíveis', () => {
    montar();
    expect(
      screen.getByRole('heading', { level: 1, name: /Política de privacidade \(versão 3\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cópia cifrada na nuvem' })).toBeInTheDocument();
    expect(screen.getAllByText(/\[A DEFINIR PELO GABRIEL/).length).toBeGreaterThanOrEqual(3);
  });

  it('a v2 fica acessível como versão anterior, fechada por padrão', () => {
    montar();
    const anterior = screen.getByText(/Versão anterior \(política v2,/).closest('details');
    expect(anterior).not.toBeNull();
    expect(anterior).not.toHaveAttribute('open');
    expect(
      within(anterior as HTMLElement).getByText(/Importar uma lei por endereço/),
    ).toBeInTheDocument();
  });

  it('não usa rótulo clínico', () => {
    const { container } = montar();
    const texto = container.textContent;
    expect(texto).not.toMatch(/TDAH|autis|transtorno/i);
  });
});
