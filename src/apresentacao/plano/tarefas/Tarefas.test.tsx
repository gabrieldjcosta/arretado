import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarDisciplina, criarPonto } from '../../../dominios/pontos';
import { criarTarefa } from '../../../dominios/tarefas';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { App } from '../../App';

async function abrir(
  preparar?: (r: Awaited<ReturnType<typeof repositorioDeTeste>>['repo']) => Promise<void>,
) {
  const { repo } = await repositorioDeTeste();
  await preparar?.(repo);
  window.localStorage.clear();
  window.location.hash = '#/plano/tarefas';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

describe('Plano: tarefas e sugestões (B4)', () => {
  it('adiciona, conclui, divide e adia sem virar atraso', async () => {
    const { usuario } = await abrir();
    expect(await screen.findByText('Nenhuma tarefa na fila')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('O que fazer?'), 'Estudar execução penal');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));
    const fila = await screen.findByRole('region', { name: 'Fila' });
    expect(await within(fila).findByText('Estudar execução penal')).toBeInTheDocument();

    await usuario.click(within(fila).getByText('Mais'));
    await usuario.type(
      within(fila).getByLabelText('Dividir (uma parte por linha)'),
      'Ler arts. 1 a 5{Enter}Ler arts. 6 a 10',
    );
    await usuario.click(within(fila).getByRole('button', { name: 'Dividir esta tarefa' }));
    expect(await within(fila).findByText('Ler arts. 1 a 5')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(fila).queryByText('Estudar execução penal')).not.toBeInTheDocument();
    });
    expect(within(fila).getByText('Ler arts. 6 a 10')).toBeInTheDocument();

    await usuario.click(within(fila).getAllByRole('button', { name: 'Feita' })[0]!);
    expect(await screen.findByText('Feitas (1)')).toBeInTheDocument();
    expect(within(fila).queryByText('Ler arts. 1 a 5')).not.toBeInTheDocument();
    expect(within(fila).getAllByRole('link', { name: 'Começar' })[0]).toHaveAttribute(
      'href',
      expect.stringMatching(/tipo=tarefa.*tarefa=/),
    );
  });

  it('sugestão mostra o porquê, entra na fila e "Não agora" a esconde', async () => {
    const { usuario } = await abrir(async (r) => {
      const d = await criarDisciplina(r, 'Execução Penal');
      const p = await criarPonto(r, d.id, 'Progressão de regime');
      await r.colecao('pontos').atualizar(p.id, { faixa: 'altissima' });
      const q = await criarPonto(r, d.id, 'Remição');
      await r.colecao('pontos').atualizar(q.id, { faixa: 'alta' });
      await criarTarefa(r, { titulo: 'Tarefa antiga' });
    });
    const sugestoes = await screen.findByRole('region', { name: 'Sugestões' });
    expect(within(sugestoes).getByText('Começar Progressão de regime')).toBeInTheDocument();
    expect(within(sugestoes).getByText(/Por quê: Faixa altíssima/)).toBeInTheDocument();

    await usuario.click(within(sugestoes).getAllByRole('button', { name: 'Não agora' })[0]!);
    expect(within(sugestoes).queryByText('Começar Progressão de regime')).not.toBeInTheDocument();
    await usuario.click(within(sugestoes).getByRole('button', { name: 'Adicionar à fila' }));
    const fila = await screen.findByRole('region', { name: 'Fila' });
    expect(await within(fila).findByText('Começar Remição')).toBeInTheDocument();
    expect(within(fila).getByText('Sugerida')).toBeInTheDocument();
  });
});
