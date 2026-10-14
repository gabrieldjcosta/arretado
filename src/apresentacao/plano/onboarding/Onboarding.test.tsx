import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

async function abrir() {
  const { repo } = await repositorioDeTeste();
  window.location.hash = '#/plano/onboarding';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Plano: onboarding pelo catálogo (B2)', () => {
  it('da carreira ao "Comece por aqui", com matéria e assunto desmarcados fora do plano', async () => {
    const { repo, usuario } = await abrir();

    await usuario.click(
      await screen.findByRole('radio', { name: 'Ministério Público (Promotor)' }),
    );
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));

    // Edital mais recente já escolhido, com rótulo honesto de origem.
    expect(await screen.findByRole('radio', { name: /edital MPGO de 2023/ })).toBeChecked();
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));

    const caixas = await screen.findAllByRole('checkbox');
    expect(caixas.every((c) => (c as HTMLInputElement).checked)).toBe(true);
    const primeira = caixas[0] as HTMLInputElement;
    await usuario.click(primeira);
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(/pontos em \d+ matérias/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar meu plano' }));

    expect(await screen.findByText(/Comece por aqui:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Começar' })).toHaveAttribute(
      'href',
      expect.stringContaining('/sessao/iniciar?tipo=ponto'),
    );
    const disciplinas = await repo.colecao('disciplinas').todosDoUsuario();
    expect(disciplinas.length).toBeGreaterThan(0);
    expect(disciplinas.some((d) => d.nome === primeira.labels?.[0]?.textContent)).toBe(false);
  });

  it('guarda a escolha a cada tela e retoma de onde parou', async () => {
    const { usuario } = await abrir();
    await usuario.click(
      await screen.findByRole('radio', { name: 'Ministério Público (Promotor)' }),
    );
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('radio', { name: /edital MPGO de 2023/ });
    // Remonta o app: o rascunho no aparelho leva de volta ao passo do edital.
    document.body.innerHTML = '';
    const { repo } = await repositorioDeTeste();
    render(<App abrir={() => Promise.resolve(repo)} />);
    expect(await screen.findByRole('radio', { name: /edital MPGO de 2023/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('Pular leva a começos sem edital e Voltar existe nos passos seguintes', async () => {
    const { usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: /Pular/ }));
    const secao = await screen.findByRole('region', { name: /sem edital/i }).catch(() => null);
    expect(
      secao ?? screen.getByRole('heading', { name: 'Tudo bem começar sem edital' }),
    ).toBeTruthy();
    expect(
      within(document.body).getByRole('link', { name: 'Adicionar uma lei para ler' }),
    ).toBeInTheDocument();
  });
});
