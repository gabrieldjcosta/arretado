import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { Depois } from './Depois';

const revisao: ProximaAcao = {
  tipo: 'revisao_vencida',
  alvo: { tipo: 'revisao', rotulo: 'Revisar cartões' },
  razao: '12 cartões vencidos',
  estimativaMin: 8,
};
const tarefa: ProximaAcao = {
  tipo: 'tarefa',
  alvo: { tipo: 'tarefa', id: 't1', rotulo: 'Ler arts. 1 a 5' },
  razao: 'A próxima da sua fila de tarefas',
  estimativaMin: 4,
};
const leitura: ProximaAcao = {
  tipo: 'leitura_salva',
  alvo: { tipo: 'leitura', id: 'n1', rotulo: 'LEP' },
  razao: 'Você parou no Art. 2º da LEP',
};

const resumo = () => screen.getByText('Em seguida').closest('summary');

describe('Hoje › Em seguida (Q5)', () => {
  it('fechado: o rótulo, a primeira atividade e quantas vêm depois; a lista só aberta', () => {
    const { container } = render(
      <Depois acoes={[revisao, tarefa]} opcoes={[revisao, tarefa, leitura]} aoTrocar={vi.fn()} />,
    );
    expect(screen.getByRole('region', { name: 'Em seguida' })).toBeInTheDocument();
    expect(container.querySelector('details.em-seguida-bloco')).not.toHaveAttribute('open');
    expect(resumo()).toHaveTextContent('Em seguidaRevisar cartões, mais 1');
    expect(container.querySelector('.em-seguida-lista')).not.toBeVisible();
  });

  it('uma só atividade em seguida não diz "mais"', () => {
    render(<Depois acoes={[leitura]} opcoes={[leitura]} aoTrocar={vi.fn()} />);
    expect(resumo()).toHaveTextContent('Em seguidaContinuar a leitura');
    expect(resumo()).not.toHaveTextContent('mais');
  });

  it('aberto: cada atividade com o nome, o tempo e o "Trocar"', async () => {
    const usuario = userEvent.setup();
    const { container } = render(
      <Depois acoes={[revisao, tarefa]} opcoes={[revisao, tarefa]} aoTrocar={vi.fn()} />,
    );
    await usuario.click(resumo()!);
    expect(container.querySelector('details.em-seguida-bloco')).toHaveAttribute('open');
    const [primeira, segunda] = screen.getAllByRole('listitem');
    expect(primeira).toHaveTextContent('Revisar cartõescerca de 8 minTrocar');
    expect(segunda).toHaveTextContent('Ler arts. 1 a 5cerca de 4 minTrocar');
    expect(primeira).toBeVisible();
  });

  it('com uma só outra atividade, não há o que trocar: a linha é só texto', () => {
    render(<Depois acoes={[leitura]} opcoes={[leitura]} aoTrocar={vi.fn()} />);
    expect(screen.queryByText('Trocar')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Trocar por' })).toBeNull();
  });

  it('"Trocar" mostra as atividades de hoje, e a da linha vem marcada', async () => {
    const usuario = userEvent.setup();
    render(
      <Depois acoes={[revisao, tarefa]} opcoes={[revisao, tarefa, leitura]} aoTrocar={vi.fn()} />,
    );
    await usuario.click(resumo()!);
    const primeira = screen.getAllByRole('listitem')[0]!;
    await usuario.click(within(primeira).getByText('Trocar'));
    const opcoes = within(primeira).getByRole('group', { name: 'Trocar por' });
    expect(
      within(opcoes)
        .getAllByRole('button')
        .map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
    ).toEqual([
      ['Revisar cartões', 'true'],
      ['Ler arts. 1 a 5', 'false'],
      ['Continuar a leitura', 'false'],
    ]);
    expect(opcoes).not.toHaveTextContent('amanhã');
  });

  it('tocar numa opção avisa o lugar e o tipo, sem fechar a linha', async () => {
    const usuario = userEvent.setup();
    const aoTrocar = vi.fn();
    render(
      <Depois acoes={[revisao, tarefa]} opcoes={[revisao, tarefa, leitura]} aoTrocar={aoTrocar} />,
    );
    await usuario.click(resumo()!);
    const segunda = screen.getAllByRole('listitem')[1]!;
    await usuario.click(within(segunda).getByText('Trocar'));
    await usuario.click(within(segunda).getByRole('button', { name: 'Continuar a leitura' }));
    expect(aoTrocar).toHaveBeenCalledExactlyOnceWith(1, 'leitura_salva');
    expect(segunda.querySelector('details.em-seguida-troca')).toHaveAttribute('open');
  });

  it('sem nada em seguida, não aparece', () => {
    const { container } = render(<Depois acoes={[]} opcoes={[]} aoTrocar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
