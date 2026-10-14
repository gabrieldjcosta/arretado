import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { registrarBackup } from '../../core/persistencia';
import { registrarErro } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const DIA = 24 * 60 * 60_000;

async function abrirHoje(repo: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await screen.findByRole('navigation', { name: 'Áreas' });
  return usuario;
}

describe('Hoje › lembrete de backup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sem dados, não aparece', async () => {
    const { repo } = await repositorioDeTeste();
    await abrirHoje(repo);
    await screen.findByRole('heading', { name: 'Hoje' });
    expect(screen.queryByText(/ainda não fez backup|do último backup/)).toBeNull();
  });

  it('com dados e sem backup, lembra uma vez e "Depois" dispensa', async () => {
    const { repo } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    const usuario = await abrirHoje(repo);
    expect(await screen.findByText('Você ainda não fez backup.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fazer agora' })).toHaveAttribute(
      'href',
      '#/conta/dados',
    );
    await usuario.click(screen.getByRole('button', { name: 'Depois' }));
    expect(screen.queryByText('Você ainda não fez backup.')).toBeNull();
  });

  it('backup antigo mostra os dias; backup de hoje some', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    await registrarBackup(repo);
    relogio.avancar(9 * DIA);
    await abrirHoje(repo);
    expect(await screen.findByText('Faz 9 dias do último backup.')).toBeInTheDocument();
  });
});
