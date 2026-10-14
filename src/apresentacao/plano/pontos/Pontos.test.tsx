import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarDisciplina, criarPonto } from '../../../dominios/pontos';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

async function abrir(
  rota: string,
  preparar?: (r: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) => Promise<void>,
) {
  const { repo } = await repositorioDeTeste();
  await preparar?.(repo);
  window.location.hash = `#${rota}`;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

describe('Plano: pontos do programa (B3)', () => {
  it('lista por matéria com andamento e faixa separados, e filtra por andamento', async () => {
    const { repo, usuario } = await abrir('/plano/pontos', async (r) => {
      const d = await criarDisciplina(r, 'Execução Penal');
      const a = await criarPonto(r, d.id, 'Progressão de regime');
      await criarPonto(r, d.id, 'Remição');
      await r.colecao('pontos').atualizar(a.id, { faixa: 'alta' });
      await r.colecao('sessoes').criar({
        tipo: 'estudo',
        estado: 'encerrada',
        data: '2026-10-13',
        inicio: '2026-10-13T10:00:00.000Z',
        pausas: [],
        pontoId: a.id,
      });
    });
    const secao = await screen.findByRole('region', { name: 'Execução Penal' });
    const itens = within(secao).getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(within(itens[0]!).getByText('Primeira passada')).toBeInTheDocument();
    expect(within(itens[0]!).getByText('Alta')).toBeInTheDocument();
    expect(within(itens[0]!).getByText('1 sessão')).toBeInTheDocument();
    expect(within(itens[1]!).getByText('Não iniciado')).toBeInTheDocument();
    expect(within(itens[1]!).getByText('Nada registrado ainda')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Mostrar'), 'Não iniciado');
    expect(within(secao).getAllByRole('listitem')).toHaveLength(1);
    expect(repo).toBeTruthy();
  });

  it('adiciona matéria e ponto, e edita o ponto (título, faixa, adiar)', async () => {
    const { usuario } = await abrir('/plano/pontos');
    await usuario.click(await screen.findByText('Nova matéria'));
    await usuario.type(screen.getByLabelText('Nome da matéria'), 'Direito Civil');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar matéria' }));
    const secao = await screen.findByRole('region', { name: 'Direito Civil' });

    await usuario.click(within(secao).getByText('Adicionar ponto'));
    await usuario.type(within(secao).getByLabelText('Título do ponto'), 'Prescrição');
    await usuario.click(within(secao).getByRole('button', { name: 'Salvar ponto' }));
    await usuario.click(await within(secao).findByRole('link', { name: 'Prescrição' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prescrição' }),
    ).toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText('Faixa'), 'Altíssima');
    await usuario.click(await screen.findByText('Histórico da faixa'));
    expect(await screen.findByText(/sem faixa para Altíssima \(você\)/)).toBeInTheDocument();

    const titulo = screen.getByLabelText('Título');
    await usuario.clear(titulo);
    await usuario.type(titulo, 'Prescrição e decadência');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prescrição e decadência' }),
    ).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Adiar até'), '2099-01-01');
    await usuario.click(screen.getByRole('button', { name: 'Adiar' }));
    expect(await screen.findByText(/Adiado até 2099-01-01/)).toBeInTheDocument();
    expect(screen.getByText('Adiado')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Voltar agora' }));
    await waitFor(() => {
      expect(screen.queryByText(/Adiado até/)).not.toBeInTheDocument();
    });
  });

  it('excluir ponto pede confirmação e volta à lista', async () => {
    const { usuario } = await abrir('/plano/pontos', async (r) => {
      const d = await criarDisciplina(r, 'Penal');
      await criarPonto(r, d.id, 'Tipicidade');
    });
    await usuario.click(await screen.findByRole('link', { name: 'Tipicidade' }));
    await usuario.click(await screen.findByRole('button', { name: 'Excluir ponto' }));
    await usuario.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    const secao = await screen.findByRole('region', { name: 'Penal' });
    expect(within(secao).queryByRole('link', { name: 'Tipicidade' })).not.toBeInTheDocument();
  });
});
