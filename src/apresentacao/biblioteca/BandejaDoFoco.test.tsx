import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BandejaDoFoco, ESPERA_DA_BANDEJA, SetasDoCartao } from './BandejaDoFoco';

function montar(extra: Partial<Parameters<typeof BandejaDoFoco>[0]> = {}) {
  const funcoes = {
    trocarLente: vi.fn(),
    anterior: vi.fn(),
    proximo: vi.fn(),
    buscar: vi.fn(),
    filtrar: vi.fn(),
    acoes: vi.fn(),
    estrelar: vi.fn(),
    lidoAteAqui: vi.fn(),
    sair: vi.fn(),
  };
  const usuario = userEvent.setup({ delay: null });
  render(
    <BandejaDoFoco
      lente="cartao"
      podeCartao
      noPrimeiro={false}
      noUltimo={false}
      ocupada={false}
      {...funcoes}
      {...extra}
    />,
  );
  return { usuario, ...funcoes };
}
const mais = () => screen.getByRole('button', { name: 'Mais ações do foco' });

describe('BandejaDoFoco', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fica fechada por padrão e o ⋯ abre e fecha', async () => {
    const { usuario } = montar();
    expect(mais()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
    await usuario.click(mais());
    expect(mais()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    await usuario.click(mais());
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
  });

  it('fecha sozinha em 5 s sem interação', () => {
    vi.useFakeTimers();
    montar();
    fireEvent.click(mais());
    act(() => {
      vi.advanceTimersByTime(ESPERA_DA_BANDEJA + 50);
    });
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
  });

  it('não fecha em 5 s com o foco do teclado dentro dela', () => {
    vi.useFakeTimers();
    montar();
    fireEvent.click(mais());
    act(() => {
      screen.getByRole('button', { name: 'Buscar' }).focus();
    });
    act(() => {
      vi.advanceTimersByTime(ESPERA_DA_BANDEJA * 3);
    });
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('não fecha em 5 s enquanto está ocupada (diálogo ou seleção)', () => {
    vi.useFakeTimers();
    montar({ ocupada: true });
    fireEvent.click(mais());
    act(() => {
      mais().blur();
      vi.advanceTimersByTime(ESPERA_DA_BANDEJA * 3);
    });
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('Esc fecha a bandeja e o segundo Esc sai do foco', async () => {
    const { usuario, sair } = montar();
    await usuario.click(mais());
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull();
    expect(sair).not.toHaveBeenCalled();
    expect(mais()).toHaveFocus();
    await usuario.keyboard('{Escape}');
    expect(sair).toHaveBeenCalledTimes(1);
  });

  it('Esc não faz nada com a bandeja ocupada (o diálogo é dono da tecla)', async () => {
    const { usuario, sair } = montar({ ocupada: true });
    await usuario.keyboard('{Escape}');
    expect(sair).not.toHaveBeenCalled();
  });

  it('cada item chama a sua função', async () => {
    const f = montar();
    const abrir = () => f.usuario.click(mais());
    for (const [nome, fn] of [
      ['Buscar', f.buscar],
      ['Filtrar', f.filtrar],
      ['Ações', f.acoes],
      ['Estrelar', f.estrelar],
      ['Lido até aqui', f.lidoAteAqui],
      ['Sair do foco', f.sair],
    ] as const) {
      await abrir();
      await f.usuario.click(screen.getByRole('button', { name: nome }));
      expect(fn).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: nome })).toBeNull();
    }
    await abrir();
    await f.usuario.click(screen.getByRole('button', { name: 'Próximo artigo' }));
    await f.usuario.click(screen.getByRole('button', { name: 'Artigo anterior' }));
    expect(f.proximo).toHaveBeenCalledTimes(1);
    expect(f.anterior).toHaveBeenCalledTimes(1);
  });

  it('trocar a lente chama trocarLente com a outra; sem artigos o cartão fica indisponível', async () => {
    const f = montar();
    await f.usuario.click(mais());
    await f.usuario.click(screen.getByRole('button', { name: 'Texto corrido' }));
    expect(f.trocarLente).toHaveBeenCalledWith('corrido');
  });

  it('no corrido, "Um artigo por vez" volta ao cartão e some o par de setas da bandeja', async () => {
    const f = montar({ lente: 'corrido' });
    await f.usuario.click(mais());
    expect(screen.queryByRole('button', { name: 'Próximo artigo' })).toBeNull();
    await f.usuario.click(screen.getByRole('button', { name: 'Um artigo por vez' }));
    expect(f.trocarLente).toHaveBeenCalledWith('cartao');
  });

  it('sem artigos, o corrido não troca para o cartão', async () => {
    const f = montar({ lente: 'corrido', podeCartao: false });
    await f.usuario.click(mais());
    const botao = screen.getByRole('button', { name: 'Um artigo por vez' });
    expect(botao).toHaveAttribute('aria-disabled', 'true');
    await f.usuario.click(botao);
    expect(f.trocarLente).not.toHaveBeenCalled();
  });
});

describe('SetasDoCartao', () => {
  it('as setas têm nome, alvo alcançável por Tab e ficam desativadas nos extremos', async () => {
    const anterior = vi.fn();
    const proximo = vi.fn();
    const usuario = userEvent.setup();
    render(
      <SetasDoCartao anterior={anterior} proximo={proximo} noPrimeiro noUltimo={false}>
        <span>1 de 3</span>
      </SetasDoCartao>,
    );
    const ant = screen.getByRole('button', { name: 'Artigo anterior' });
    const prox = screen.getByRole('button', { name: 'Próximo artigo' });
    expect(ant).toHaveAttribute('aria-disabled', 'true');
    await usuario.tab();
    expect(ant).toHaveFocus();
    await usuario.tab();
    expect(prox).toHaveFocus();
    await usuario.click(prox);
    expect(proximo).toHaveBeenCalledTimes(1);
  });
});
