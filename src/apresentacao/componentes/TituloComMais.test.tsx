import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

async function abrirHoje(
  antes?: (repo: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) => Promise<void>,
) {
  const { repo } = await repositorioDeTeste();
  await antes?.(repo);
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  const mais = await screen.findByRole('button', { name: 'Novo registro' });
  return { repo, usuario, mais };
}

/** O painel que o "+" abriu: o `aria-controls` do botão aponta para ele. */
function painelDe(mais: HTMLElement) {
  const painel = document.getElementById(mais.getAttribute('aria-controls') ?? '');
  if (!painel) throw new Error('o "+" está aberto, mas o painel não existe');
  return painel;
}

describe('"+" do título › Registrar erro e Lembrete', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fechado, não mostra opção alguma; aberto, mostra as duas, cada uma com a sua frase de apoio', async () => {
    const { usuario, mais } = await abrirHoje();
    expect(mais).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^Lembrete\b/ })).not.toBeInTheDocument();

    await usuario.click(mais);
    expect(mais).toHaveAttribute('aria-expanded', 'true');
    const painel = painelDe(mais);
    // O nome acessível traz o nome e a frase de apoio (o texto visível está dentro do nome, WCAG 2.5.3).
    const registrar = within(painel).getByRole('link', {
      name: 'Registrar erro A frase certa vira cartão',
    });
    expect(registrar).toHaveAttribute('href', '#/recall/registrar');
    within(painel).getByRole('button', { name: 'Lembrete Uma nota rápida, sem hora nem aviso' });

    // Tocar no "+" de novo recolhe o painel.
    await usuario.click(mais);
    expect(mais).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^Lembrete\b/ })).not.toBeInTheDocument();
  });

  it('"Registrar erro" leva ao registro', async () => {
    const { usuario, mais } = await abrirHoje();
    await usuario.click(mais);
    await usuario.click(within(painelDe(mais)).getByRole('link', { name: /^Registrar erro\b/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Registrar erro' }),
    ).toBeInTheDocument();
  });

  it('Esc fecha o painel e devolve o foco ao "+"; tocar fora também fecha', async () => {
    const { usuario, mais } = await abrirHoje();
    await usuario.click(mais);
    await usuario.keyboard('{Escape}');
    expect(mais).toHaveAttribute('aria-expanded', 'false');
    expect(mais).toHaveFocus();

    await usuario.click(mais);
    expect(mais).toHaveAttribute('aria-expanded', 'true');
    // O título é da mesma linha do "+": tocar nele não é tocar fora.
    await usuario.click(screen.getByRole('navigation', { name: 'Áreas' }));
    expect(mais).toHaveAttribute('aria-expanded', 'false');
  });

  it('"Lembrete" abre o diálogo com o campo em foco, mostra o que já estava guardado e guarda a nota', async () => {
    const { repo, usuario, mais } = await abrirHoje((r) =>
      alterarPreferencias(r, { lembrete: 'Renovar o passaporte' }).then(() => undefined),
    );
    await usuario.click(mais);
    await usuario.click(within(painelDe(mais)).getByRole('button', { name: /^Lembrete\b/ }));

    const dialogo = await screen.findByRole('dialog', { name: 'Lembrete' });
    expect(dialogo).toHaveAccessibleDescription(/Sem hora nem aviso/);
    // O painel se recolheu ao abrir o diálogo.
    expect(mais).toHaveAttribute('aria-expanded', 'false');
    const campo = await within(dialogo).findByRole('textbox', { name: 'Lembrete' });
    await waitFor(() => {
      expect(campo).toHaveFocus();
    });
    expect(campo).toHaveValue('Renovar o passaporte');

    await usuario.type(campo, ' e pagar a anuidade');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).lembrete).toBe(
        'Renovar o passaporte e pagar a anuidade',
      );
    });
    expect(await within(dialogo).findByText('Salvo.')).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog', { name: 'Lembrete' })).not.toBeInTheDocument();
    expect(mais).toHaveFocus();
  });

  it('fechar o diálogo com Esc guarda o que foi escrito e não salvo, e devolve o foco ao "+"', async () => {
    const { repo, usuario, mais } = await abrirHoje();
    await usuario.click(mais);
    await usuario.click(within(painelDe(mais)).getByRole('button', { name: /^Lembrete\b/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Lembrete' });
    const campo = await within(dialogo).findByRole('textbox', { name: 'Lembrete' });
    await usuario.type(campo, 'Ligar para o cartório');
    expect(within(dialogo).getByText('Ainda não salvo.')).toBeInTheDocument();

    // O Esc do navegador chega ao <dialog> como "cancel"; o campo some sem passar pelo blur.
    fireEvent(dialogo, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog', { name: 'Lembrete' })).not.toBeInTheDocument();
    await waitFor(async () => {
      expect((await obterPreferencias(repo)).lembrete).toBe('Ligar para o cartório');
    });
    expect(mais).toHaveFocus();
  });
});
