import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import { criarCartaoManual, registrarErro } from '../../dominios/recall/servico';
import { estacionar } from '../../dominios/sessao/estacionamento';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const MIN = 60_000;

async function umCartaoVencido(repo: Repositorio) {
  const c = await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
  await repo.colecao('cartoes').atualizar(c.id, { proximaRevisao: '2000-01-01' });
}

/** Abre o fechamento da Sessão aberta e encerra. */
async function encerrar(repo: Repositorio) {
  window.location.hash = '#/sessao/fechar';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await usuario.click(await screen.findByRole('button', { name: /^Encerrar$/ }));
  await screen.findByRole('heading', { name: 'Sessão encerrada' });
  return usuario;
}

describe('Sessão encerrada: o caminho é um só, de volta ao Agora', () => {
  it('com cartão vencido à espera, a tela não escolhe um segundo passo: quem escolhe é o Agora', async () => {
    const { repo } = await repositorioDeTeste();
    await umCartaoVencido(repo);
    const s = await iniciarSessao(repo, { atividade: 'questoes' });
    await registrarErro(repo, { fraseCorreta: 'O prazo é de cinco dias.', sessaoId: s.id });
    await encerrar(repo);
    const agora = screen.getByRole('link', { name: 'Ir para o Agora' });
    expect(agora).toHaveAttribute('href', '#/');
    expect(agora).toHaveClass('principal');
    // O erro chega do repositório: com ele na tela, a falta de um segundo caminho é de verdade.
    expect(await screen.findByText(/1 erro guardado/)).toBeInTheDocument();
    expect(document.querySelectorAll('main .principal')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /^Seguir/ })).toBeNull();
    expect(document.querySelectorAll('main a[href*="/sessao/iniciar"]')).toHaveLength(0);
  });

  it('"Ver os erros" vai à lista de Erros e não é a ação principal', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await registrarErro(repo, { fraseCorreta: 'O prazo é de cinco dias.', sessaoId: s.id });
    await encerrar(repo);
    expect(await screen.findByText(/1 erro guardado/)).toBeInTheDocument();
    const erros = screen.getByRole('link', { name: 'Ver os erros' });
    expect(erros).toHaveAttribute('href', '#/recall/erros');
    expect(erros).not.toHaveClass('principal');
    expect(screen.getByRole('link', { name: 'Ir para o Agora' })).toHaveClass('principal');
  });
});

describe('Sessão encerrada: o resumo', () => {
  it('conta os Erros guardados pelo registro comum durante a Sessão, no singular', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await iniciarSessao(repo, { atividade: 'questoes' });
    relogio.avancar(MIN);
    await registrarErro(repo, { fraseCorreta: 'A progressão exige bom comportamento.' });
    relogio.avancar(MIN);
    await encerrar(repo);
    expect(await screen.findByText('1 erro guardado: entra nas suas revisões')).toBeVisible();
    expect(screen.getByText('2 min · Questões')).toBeVisible();
  });

  it('anotação marcada como resolvida no fechamento não conta como guardada para depois', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await estacionar(repo, s.id, 'ligar para o cartório');
    await estacionar(repo, s.id, 'comprar café');
    await estacionar(repo, s.id, 'pedir a certidão');
    window.location.hash = '#/sessao/fechar';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    await usuario.click(await screen.findByRole('checkbox', { name: 'ligar para o cartório' }));
    await usuario.click(screen.getByRole('checkbox', { name: 'comprar café' }));
    await usuario.click(screen.getByRole('button', { name: /^Encerrar$/ }));
    expect(await screen.findByText('1 anotação guardada para depois')).toBeVisible();
    expect(screen.queryByText(/3 anotações/)).toBeNull();
  });

  it('"1 de 1 questão certa" no singular', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { atividade: 'questoes' });
    await repo.colecao('sessoes').atualizar(s.id, { questoesFeitas: 1, questoesAcertadas: 1 });
    await encerrar(repo);
    expect(await screen.findByText('1 de 1 questão certa')).toBeVisible();
  });
});

describe('Sessão encerrada: parada, não relê os dados', () => {
  it('com a tela assentada não volta a ler o repositório (`carregar` estável)', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, { atividade: 'questoes' });
    await registrarErro(repo, { fraseCorreta: 'O prazo é de cinco dias.', sessaoId: s.id });
    await encerrar(repo);
    await screen.findByRole('link', { name: 'Ver os erros' });
    await new Promise((r) => setTimeout(r, 150));
    const leituras = vi.spyOn(repo, 'colecao');
    await new Promise((r) => setTimeout(r, 400));
    // Com uma seta nova a cada desenho, o `useDados` refazia a leitura sem parar (milhares por segundo).
    expect(leituras.mock.calls.length).toBeLessThan(3);
    leituras.mockRestore();
  });
});
