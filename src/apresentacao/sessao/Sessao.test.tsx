import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
    await usuario.click(await screen.findByText('Definir até onde (opcional)'));
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

  it('com o alvo conhecido (direto=1), começa sozinha e vai direto à revisão', async () => {
    const { repo } = await abrir(
      '/sessao/iniciar?tipo=revisao&rotulo=Revisar+frases&origem=revisao_vencida&direto=1',
    );
    await waitFor(() => {
      expect(window.location.hash).toBe('#/recall/frases/revisar');
    });
    const sessoes = await repo.colecao('sessoes').todosDoUsuario();
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0]).toMatchObject({ estado: 'ativa', alvo: { tipo: 'revisao' } });
  });

  it('leitura direta com o trecho do mapa (ir=) abre o Leitor no trecho, seguindo o mapa', async () => {
    const NORMA = '11111111-1111-4111-8111-111111111111';
    const { repo } = await abrir(
      `/sessao/iniciar?tipo=leitura&id=${NORMA}&rotulo=LEP&ir=art3&origem=leitura_salva&direto=1`,
    );
    await waitFor(() => {
      expect(window.location.hash).toBe(`#/biblioteca/normas/${NORMA}?ir=art3&foco=artigo&mapa=1`);
    });
    expect(await repo.colecao('sessoes').todosDoUsuario()).toHaveLength(1);
  });

  it('direto=1 sem tela própria para o alvo mostra o início normal', async () => {
    const { repo } = await abrir('/sessao/iniciar?tipo=ponto&rotulo=CP&direto=1');
    expect(await screen.findByRole('button', { name: 'Começar' })).toBeInTheDocument();
    expect(await repo.colecao('sessoes').todosDoUsuario()).toHaveLength(0);
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

  it('o bloquinho do canto guarda uma distração na própria Sessão e a mostra ao fechar', async () => {
    const { repo, usuario } = await abrir('/sessao/iniciar');
    await usuario.click(await screen.findByRole('button', { name: 'Começar' }));
    await usuario.click(await screen.findByRole('button', { name: /Abrir o bloquinho/ }));
    await usuario.type(screen.getByLabelText('Anotar uma distração'), 'ver o preço{Enter}');
    expect(await screen.findByText('Guardado para depois.')).toBeInTheDocument();
    expect((await repo.colecao('sessoes').todosDoUsuario())[0]?.estacionamento).toHaveLength(1);
    await usuario.click(screen.getAllByRole('link', { name: 'Encerrar' })[0]!);
    await usuario.click(await screen.findByLabelText('ver o preço'));
    await waitFor(async () => {
      expect(
        (await repo.colecao('sessoes').todosDoUsuario())[0]?.estacionamento?.[0]?.resolvidaEm,
      ).toBeDefined();
    });
  });

  it('o canto diz "N de M min" com temporizador, "N min" sem ele e "agora" no primeiro minuto', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, { temporizadorMin: 25 });
    await abrir('/sessao/atual', repo);
    expect(await screen.findByRole('button', { name: /bloquinho/ })).toHaveTextContent(
      'Sessão · agora',
    );
    cleanup();
    relogio.avancar(60_000);
    await abrir('/sessao/atual', repo);
    expect(await screen.findByRole('button', { name: /bloquinho/ })).toHaveTextContent(
      'Sessão · 1 de 25 min',
    );
    cleanup();
    relogio.avancar(11 * 60_000);
    await abrir('/sessao/atual', repo);
    const relogioDoCanto = await screen.findByRole('button', { name: /bloquinho/ });
    expect(relogioDoCanto).toHaveTextContent('Sessão · 12 de 25 min');
    expect(relogioDoCanto).toHaveAccessibleName('Sessão, 12 de 25 min. Abrir o bloquinho');
  });

  it('sem temporizador o canto mostra só os minutos', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, {});
    relogio.avancar(12 * 60_000);
    await abrir('/sessao/atual', repo);
    expect(await screen.findByRole('button', { name: /bloquinho/ })).toHaveTextContent(
      'Sessão · 12 min',
    );
  });

  it('passou do tempo: o canto volta a "N min" e o bloquinho avisa sem cobrar', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, { temporizadorMin: 25 });
    relogio.avancar(40 * 60_000);
    const { usuario } = await abrir('/sessao/atual', repo);
    const relogioDoCanto = await screen.findByRole('button', { name: /bloquinho/ });
    expect(relogioDoCanto).toHaveTextContent('Sessão · 40 min');
    expect(relogioDoCanto).not.toHaveTextContent('de 25');
    await usuario.click(relogioDoCanto);
    const bloquinho = await screen.findByRole('group', { name: 'Bloquinho da Sessão' });
    expect(within(bloquinho).getByText(/Os 25 min do temporizador passaram/)).toBeInTheDocument();
    expect(within(bloquinho).getByText(/Nada é cobrado/)).toBeInTheDocument();
  });

  it('dentro do prazo o bloquinho não traz aviso de tempo; ao completar, avisa sem cobrar', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, { temporizadorMin: 25 });
    relogio.avancar(24 * 60_000);
    const { usuario } = await abrir('/sessao/atual', repo);
    const dentro = await screen.findByRole('button', { name: /bloquinho/ });
    expect(dentro).toHaveTextContent('Sessão · 24 de 25 min');
    await usuario.click(dentro);
    const bloquinho = await screen.findByRole('group', { name: 'Bloquinho da Sessão' });
    expect(within(bloquinho).queryByText(/passaram/)).not.toBeInTheDocument();
    cleanup();
    relogio.avancar(60_000);
    await abrir('/sessao/atual', repo);
    const completo = await screen.findByRole('button', { name: /bloquinho/ });
    expect(completo).toHaveTextContent('Sessão · 25 de 25 min');
    await usuario.click(completo);
    expect(await screen.findByText(/Os 25 min do temporizador passaram/)).toBeInTheDocument();
  });

  it('na tela da Sessão o bloquinho não oferece "Ver a Sessão"', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, {});
    const { usuario } = await abrir('/sessao/atual', repo);
    await usuario.click(await screen.findByRole('button', { name: /Abrir o bloquinho/ }));
    const bloquinho = await screen.findByRole('group', { name: 'Bloquinho da Sessão' });
    expect(within(bloquinho).queryByRole('link', { name: 'Ver a Sessão' })).not.toBeInTheDocument();
    expect(within(bloquinho).getByRole('link', { name: 'Encerrar' })).toBeInTheDocument();
  });

  it('o aviso do bloquinho vem à vista: o painel rola por dentro em telas pequenas', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, {});
    const { usuario } = await abrir('/sessao/atual', repo);
    await usuario.click(await screen.findByRole('button', { name: /Abrir o bloquinho/ }));
    const rolar = vi.spyOn(Element.prototype, 'scrollIntoView');
    await usuario.type(screen.getByLabelText('Anotar uma distração'), 'ver o preço{Enter}');
    const aviso = await screen.findByText('Guardado para depois.');
    expect(rolar).toHaveBeenCalledWith({ block: 'nearest' });
    expect(rolar.mock.contexts).toContain(aviso);
  });

  it('só estudo liga e desliga pelo interruptor da própria Sessão', async () => {
    const { usuario } = await abrir('/sessao/iniciar');
    await usuario.click(await screen.findByRole('button', { name: 'Começar' }));
    const chave = await screen.findByRole('checkbox', { name: 'Só estudo' });
    await usuario.click(chave);
    await waitFor(() => {
      expect(document.body.dataset.soEstudo).toBe('true');
    });
    await usuario.click(screen.getByRole('checkbox', { name: 'Só estudo' }));
    await waitFor(() => {
      expect(document.body.dataset.soEstudo).toBeUndefined();
    });
  });
  it('canto da Sessão: não aparece na revisão sem Sessão aberta', async () => {
    const sem = await abrir('/recall/revisar');
    await screen.findByRole('heading', { name: 'Revisar' });
    expect(screen.queryByRole('button', { name: /bloquinho/ })).not.toBeInTheDocument();
    expect(sem.repo).toBeDefined();
  });

  it('canto da Sessão: pausar e voltar gravam o estado', async () => {
    const { repo } = await repositorioDeTeste();
    await iniciarSessao(repo, { alvo: { tipo: 'livre', rotulo: 'CP' } });
    await repo.colecao('cartoes').criar({
      frente: 'F',
      verso: 'V',
      origemTipo: 'manual',
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: '2000-01-01',
    });
    const { usuario } = await abrir('/recall/revisar', repo);
    await usuario.click(await screen.findByRole('button', { name: /Abrir o bloquinho/ }));
    const faixa = await screen.findByRole('group', { name: 'Bloquinho da Sessão' });
    await usuario.click(within(faixa).getByRole('button', { name: 'Pausar' }));
    await waitFor(async () => {
      expect((await repo.colecao('sessoes').todosDoUsuario())[0]?.estado).toBe('pausada');
    });
    await usuario.click(await within(faixa).findByRole('button', { name: 'Voltar' }));
    await waitFor(async () => {
      expect((await repo.colecao('sessoes').todosDoUsuario())[0]?.estado).toBe('ativa');
    });
    expect(within(faixa).getByRole('link', { name: 'Encerrar' })).toBeInTheDocument();
    // Fora da tela da Sessão o link de volta existe.
    expect(within(faixa).getByRole('link', { name: 'Ver a Sessão' })).toBeInTheDocument();
  });
});
