import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ProvaM } from './ProvaM';

afterEach(cleanup);

function Onde() {
  return <p data-testid="onde">{useLocation().pathname}</p>;
}

function montar() {
  return render(
    <MemoryRouter initialEntries={['/fio/prova']}>
      <Routes>
        <Route path="/fio/prova" element={<ProvaM />} />
        <Route path="*" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProvaM: a tela prova do mockup', () => {
  it('faz uma pergunta só e oferece as quatro respostas do mockup, com o texto dele', () => {
    montar();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pra qual prova você estuda?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Uma pergunta só')).toBeInTheDocument();
    const respostas = screen.getAllByRole('button');
    expect(respostas.map((b) => b.textContent)).toEqual([
      'DefensoriaSP, banca FCC',
      'Magistraturaestadual e federal',
      'Ministério Públicoestadual',
      'Ainda não seicomeço pelo que mais cai',
    ]);
    expect(
      screen.getByText('Sem conta, sem edital. Isso fica para depois, se você quiser.'),
    ).toBeInTheDocument();
  });

  it.each([
    ['Defensoria', '/comecar/defensoria-publica'],
    ['Magistratura', '/comecar/magistratura'],
    ['Ministério Público', '/comecar/ministerio-publico'],
    ['Ainda não sei', '/biblioteca/acervo'],
  ])('escolher "%s" leva a %s', async (nome, rota) => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${nome}`) }));
    await waitFor(() => {
      expect(screen.getByTestId('onde')).toHaveTextContent(rota);
    });
  });

  it('acende o nó escolhido e não aceita uma segunda escolha', async () => {
    montar();
    const defensoria = screen.getByRole('button', { name: /^Defensoria/ });
    await userEvent.click(defensoria);
    await waitFor(() => {
      expect(screen.getByTestId('onde')).toBeInTheDocument();
    });
  });
});
