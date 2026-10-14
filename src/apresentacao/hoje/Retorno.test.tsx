import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { encerrarSessao, iniciarSessao } from '../../dominios/sessao/servico';
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

describe('Hoje › Retorno e Fechar o Dia (A3b)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('depois de dias fora, acolhe sem dívida e leva ao passo deixado; "Agora não" dispensa', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { alvo: { tipo: 'livre', rotulo: 'CP' } });
    await encerrarSessao(repo, s.id, { proximoPasso: 'Voltar a CP' });
    relogio.avancar(5 * DIA);
    const usuario = await abrirHoje(repo);

    const bloco = await screen.findByRole('region', { name: 'Bem-vindo de volta' });
    expect(bloco).toHaveTextContent('Que bom ter você de volta');
    expect(bloco).toHaveTextContent('Voltar a CP');
    expect(bloco.textContent).not.toMatch(/atras|pendên|sequência|dias seguidos|perdeu/i);
    expect(screen.getByRole('link', { name: 'Retomar daqui' })).toHaveAttribute(
      'href',
      expect.stringContaining('/sessao/iniciar'),
    );
    await usuario.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByRole('region', { name: 'Bem-vindo de volta' })).toBeNull();
  });

  it('sem pausa longa, não aparece retorno', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await encerrarSessao(repo, s.id);
    await abrirHoje(repo);
    await screen.findByRole('region', { name: 'Fechar o Dia' });
    expect(screen.queryByRole('region', { name: 'Bem-vindo de volta' })).toBeNull();
  });

  it('fecha o Dia e reabre', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { fronteira: 'o art. 2' });
    await encerrarSessao(repo, s.id, { proximoPasso: 'Continuar depois de o art. 2' });
    const usuario = await abrirHoje(repo);

    const bloco = await screen.findByRole('region', { name: 'Fechar o Dia' });
    expect(bloco).toHaveTextContent('1 Sessão');
    await usuario.click(screen.getByRole('button', { name: 'Fechar o Dia' }));
    expect(await screen.findByText('Dia fechado')).toBeInTheDocument();
    expect(screen.getByText('Continuar depois de o art. 2')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reabrir o Dia' }));
    expect(await screen.findByRole('button', { name: 'Fechar o Dia' })).toBeInTheDocument();
  });

  it('sem nada feito hoje, o Dia não oferece fechar', async () => {
    const { repo } = await repositorioDeTeste();
    await abrirHoje(repo);
    await screen.findByRole('heading', { name: 'Hoje' });
    expect(screen.queryByRole('region', { name: 'Fechar o Dia' })).toBeNull();
  });
});
