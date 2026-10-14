import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

describe('Hoje › Agora (A1)', () => {
  it('uma ação com o motivo; "Escolher outra coisa" leva ao vazio com três começos', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    relogio.avancar(2 * 24 * 60 * 60_000);
    window.location.hash = '#/';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(agora).toHaveTextContent('1 cartão vencido');
    expect(screen.getByRole('link', { name: 'Começar' })).toHaveAttribute(
      'href',
      '#/sessao/iniciar?acao=revisao_vencida&alvo=revisao&rotulo=cartoes',
    );

    await usuario.click(screen.getByRole('button', { name: 'Escolher outra coisa' }));
    expect(await screen.findByRole('heading', { name: 'Por onde começar?' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /lei para ler|matéria|sessão curta/i }),
    ).toHaveLength(3);

    await usuario.click(screen.getByRole('button', { name: 'Voltar à sugestão' }));
    expect(await screen.findByRole('link', { name: 'Começar' })).toBeInTheDocument();
  });
});
