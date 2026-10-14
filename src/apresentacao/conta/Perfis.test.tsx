import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { alterarPreferencias, obterPreferencias } from '../../core/preferencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

async function abrir() {
  const { repo } = await repositorioDeTeste();
  window.location.hash = '#/conta/perfis';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await screen.findByRole('heading', { name: 'Perfis de estudo' });
  return { repo, usuario };
}

describe('Conta › Perfis de estudo (F3-A, pacote 4)', () => {
  it('nada é obrigatório: sem perfil escolhido, nada é gravado', async () => {
    const { repo } = await abrir();
    expect((await obterPreferencias(repo)).perfilDeEstudo).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument();
  });

  it('mostra a prévia, só grava ao aplicar e desfaz exatamente', async () => {
    const { repo, usuario } = await abrir();
    await alterarPreferencias(repo, { tamanhoFonte: 24 });
    await usuario.click(await screen.findByLabelText(/^Leitura/));
    expect(
      await screen.findByText(/Tamanho do texto de leitura: 24 px → 20 px/),
    ).toBeInTheDocument();
    expect((await obterPreferencias(repo)).perfilDeEstudo).toBeUndefined();

    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(async () => {
      expect(await obterPreferencias(repo)).toMatchObject({
        perfilDeEstudo: 'leitura',
        tamanhoFonte: 20,
        reguaDeLeitura: true,
      });
    });

    await usuario.click(await screen.findByRole('button', { name: 'Voltar ao que estava' }));
    await waitFor(async () => {
      const p = await obterPreferencias(repo);
      expect(p.tamanhoFonte).toBe(24);
      expect(p.reguaDeLeitura).toBeUndefined();
      expect(p.perfilDeEstudo).toBeUndefined();
    });
  });

  it('"Ficar sem perfil" mantém os ajustes', async () => {
    const { repo, usuario } = await abrir();
    await usuario.click(await screen.findByLabelText(/^Guiado/));
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Ficar sem perfil' }));
    await waitFor(async () => {
      const p = await obterPreferencias(repo);
      expect(p.perfilDeEstudo).toBeUndefined();
      expect(p.temporizadorPadraoMin).toBe(25);
    });
  });
});
