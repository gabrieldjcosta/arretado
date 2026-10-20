import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cicloAtivo } from '../../../dominios/ciclos';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

async function abrir(rota: string) {
  const { repo } = await repositorioDeTeste();
  const penal = await repo.colecao('disciplinas').criar({ nome: 'Penal', ordem: 1 });
  const civil = await repo.colecao('disciplinas').criar({ nome: 'Civil', ordem: 2 });
  for (let i = 0; i < 4; i++)
    await repo
      .colecao('pontos')
      .criar({ titulo: `P${String(i)}`, disciplinaId: penal.id, faixa: 'alta' });
  await repo.colecao('pontos').criar({ titulo: 'C', disciplinaId: civil.id, faixa: 'media' });
  window.location.hash = rota;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Ciclo de estudo (C3)', () => {
  it('sem ciclo: convite; o assistente cria e a volta aparece com o bloco atual', async () => {
    const { repo, usuario } = await abrir('#/plano/ciclo');
    await usuario.click(await screen.findByRole('link', { name: 'Criar ciclo' }));

    await usuario.click(await screen.findByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('radio', { name: /Igual para todas/ }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/2 blocos por volta/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar ciclo' }));

    expect(await screen.findByRole('heading', { name: 'Volta 1' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Penal');
    expect((await cicloAtivo(repo))?.blocos).toHaveLength(2);
  });

  it('mais uma vez de uma matéria refaz a volta; pular avança o bloco atual', async () => {
    const { repo, usuario } = await abrir('#/plano/ciclo/novo');
    await usuario.click(await screen.findByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('radio', { name: /Igual para todas/ }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Criar ciclo' }));

    await usuario.click(await screen.findByRole('button', { name: 'Mais uma vez de Civil' }));
    expect((await cicloAtivo(repo))?.blocos).toHaveLength(3);

    await usuario.click(await screen.findByRole('button', { name: 'Pular este bloco' }));
    expect(await screen.findByRole('listitem', { current: 'step' })).not.toHaveTextContent('Penal');
  });
});

describe('Ajuste pelo desempenho (C5)', () => {
  it('sugere subir a matéria com mais erro; aceitar muda o peso e desfazer devolve', async () => {
    const { repo, usuario } = await abrir('#/plano/ciclo/novo');
    await usuario.click(await screen.findByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(screen.getByRole('radio', { name: /Igual para todas/ }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Criar ciclo' }));
    await screen.findByRole('heading', { name: 'Volta 1' });

    const pontos = await repo.colecao('pontos').todosDoUsuario();
    const penal = pontos.find((p) => p.titulo === 'P0')!;
    const civil = pontos.find((p) => p.titulo === 'C')!;
    const hoje = new Date().toISOString().slice(0, 10);
    const sessao = (pontoId: string, feitas: number, acertos: number) =>
      repo.colecao('sessoes').criar({
        tipo: 'estudo',
        data: hoje,
        inicio: new Date().toISOString(),
        fim: new Date().toISOString(),
        estado: 'encerrada',
        pausas: [],
        pontoId,
        questoesFeitas: feitas,
        questoesAcertadas: acertos,
      });
    await sessao(penal.id, 40, 20);
    await sessao(civil.id, 40, 38);

    await usuario.click(await screen.findByRole('button', { name: 'Aceitar' }));
    expect((await cicloAtivo(repo))?.blocos).toHaveLength(3);
    await usuario.click(await screen.findByRole('button', { name: 'Desfazer' }));
    expect((await cicloAtivo(repo))?.blocos).toHaveLength(2);
  });
});
