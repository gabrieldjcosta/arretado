import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

async function abrir(rota: string, repo?: Repositorio) {
  const r = repo ?? (await repositorioDeTeste()).repo;
  window.location.hash = `#${rota}`;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(r)} />);
  await screen.findByRole('navigation', { name: 'Áreas' });
  return { repo: r, usuario };
}

describe('Sessão leve (A2)', () => {
  it('começa em um toque, sem preencher nada', async () => {
    const { repo, usuario } = await abrir('/sessao/iniciar');
    await usuario.click(await screen.findByRole('button', { name: 'Começar' }));
    expect(await screen.findByRole('heading', { name: 'Sessão' })).toBeInTheDocument();
    expect(screen.getByText('Sessão livre')).toBeInTheDocument();
    const [s] = await repo.colecao('sessoes').todosDoUsuario();
    expect(s).toMatchObject({ estado: 'ativa', tipo: 'livre' });
  });

  it('alvo e fronteira são opcionais e ficam gravados', async () => {
    const { repo, usuario } = await abrir('/sessao/iniciar');
    await usuario.click(await screen.findByText('Dizer o que e até onde (opcional)'));
    await usuario.type(screen.getByLabelText('O que vai estudar?'), 'Lei de Execução Penal');
    await usuario.type(screen.getByLabelText('Até onde?'), 'até o art. 15');
    await usuario.click(screen.getByRole('button', { name: 'Começar' }));
    expect(await screen.findByText('Lei de Execução Penal')).toBeInTheDocument();
    expect(screen.getByText('Até onde: até o art. 15')).toBeInTheDocument();
    const [s] = await repo.colecao('sessoes').todosDoUsuario();
    expect(s).toMatchObject({ fronteira: 'até o art. 15', alvo: { tipo: 'livre' } });
  });

  it('recebe o alvo da Próxima ação pela URL', async () => {
    const { repo, usuario } = await abrir(
      '/sessao/iniciar?tipo=revisao&rotulo=3%20cart%C3%B5es&origem=revisao_vencida&razao=Vencidos%20hoje',
    );
    expect(await screen.findByText('3 cartões')).toBeInTheDocument();
    expect(screen.getByText('Vencidos hoje')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Começar' }));
    await screen.findByRole('heading', { name: 'Sessão' });
    const [s] = await repo.colecao('sessoes').todosDoUsuario();
    expect(s).toMatchObject({
      tipo: 'estudo',
      alvo: { tipo: 'revisao', rotulo: '3 cartões' },
      origemDaAcao: { tipo: 'revisao_vencida', razao: 'Vencidos hoje' },
    });
  });

  it('pausa sem falha e volta', async () => {
    const { repo, usuario } = await abrir('/sessao/iniciar');
    await usuario.click(await screen.findByRole('button', { name: 'Começar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Pausar' }));
    expect(await screen.findByText(/Pausada\. Sem pressa/)).toBeInTheDocument();
    expect((await repo.colecao('sessoes').todosDoUsuario())[0]?.estado).toBe('pausada');
    await usuario.click(screen.getByRole('button', { name: 'Voltar à Sessão' }));
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
  });

  it('ao voltar, restaura a Sessão aberta em vez de criar outra', async () => {
    const { repo } = await repositorioDeTeste();
    const aberta = await iniciarSessao(repo, { fronteira: 'até o art. 3' });
    await abrir('/sessao/iniciar', repo);
    expect(await screen.findByText('Até onde: até o art. 3')).toBeInTheDocument();
    expect(await repo.colecao('sessoes').todosDoUsuario()).toHaveLength(1);
    expect((await repo.colecao('sessoes').todosDoUsuario())[0]?.id).toBe(aberta.id);
  });

  it('fecha com o próximo passo pré-preenchido, que se pode apagar', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { fronteira: 'o art. 15' });
    const { usuario } = await abrir('/sessao/fechar', repo);
    const campo = await screen.findByLabelText('Próximo passo (opcional)');
    expect(campo).toHaveValue('Continuar depois de o art. 15');
    await usuario.clear(campo);
    await usuario.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(await screen.findByText('Sessão encerrada')).toBeInTheDocument();
    const [s] = await repo.colecao('sessoes').todosDoUsuario();
    expect(s).toMatchObject({ estado: 'encerrada' });
    expect(s?.proximoPasso).toBeUndefined();
  });

  it('fecha guardando o próximo passo', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { alvo: { tipo: 'livre', rotulo: 'CP' } });
    const { usuario } = await abrir('/sessao/fechar', repo);
    expect(await screen.findByLabelText('Próximo passo (opcional)')).toHaveValue('Voltar a CP');
    await usuario.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(await screen.findByText('Próximo passo guardado: Voltar a CP')).toBeInTheDocument();
  });

  it('sem Sessão aberta, atual e fechar convidam sem erro', async () => {
    await abrir('/sessao/atual');
    expect(await screen.findByText('Nenhuma Sessão aberta')).toBeInTheDocument();
  });
});
