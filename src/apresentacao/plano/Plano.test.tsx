import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const CSV =
  'Disciplina;Código;Ponto;Faixa\nExecução Penal;1;Progressão de regime;Alta\nExecução Penal;2;Remição;Média\n';

describe('Plano: importar pontos (6.10)', () => {
  it('importa com prévia, lista por disciplina e oferece o vínculo no erro', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);

    await usuario.upload(
      await screen.findByLabelText('Arquivo CSV'),
      new File([CSV], 'ciclo.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByText('2 pontos em 1 disciplinas.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Importar pontos' }));

    const secao = await screen.findByRole('region', { name: 'Execução Penal' });
    expect(within(secao).getByText('1. Progressão de regime')).toBeInTheDocument();
    expect(within(secao).getByText('Alta')).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: 'Registrar erro' }));
    // Ponto fora de "mais detalhes" (D25): opcional e lembrado.
    const ponto = await screen.findByLabelText('Ponto do edital (opcional)');
    expect(within(ponto).getByRole('option', { name: '2 Remição' })).toBeInTheDocument();
  });

  it('CSV sem as colunas mostra o que falta', async () => {
    const { repo } = await repositorioDeTeste();
    window.location.hash = '#/plano';
    const usuario = userEvent.setup();
    render(<App abrir={() => Promise.resolve(repo)} />);
    await usuario.upload(
      await screen.findByLabelText('Arquivo CSV'),
      new File(['a;b\n1;2'], 'x.csv'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/Disciplina.*Ponto/);
  });
});
