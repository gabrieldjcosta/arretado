import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AcaoAgora } from './AcaoAgora';
import { BarraFina } from './BarraFina';
import { DiasDaSemana } from './DiasDaSemana';
import { LinhaDepois } from './LinhaDepois';
import { LinhaLista } from './LinhaLista';
import { Selo } from './Selo';

describe('AcaoAgora', () => {
  it('mostra título, estimativa e botão', () => {
    render(
      <AcaoAgora
        titulo="Revisar 10 cartões"
        estimativa={5}
        rotuloBotao="Começar"
        aoClicar={() => undefined}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Revisar 10 cartões' })).toBeInTheDocument();
    expect(screen.getByText('cerca de 5 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar' })).toBeInTheDocument();
  });

  it('sem estimativa não mostra a linha', () => {
    render(<AcaoAgora titulo="X" rotuloBotao="Ir" aoClicar={() => undefined} />);
    expect(screen.queryByText(/cerca de/)).not.toBeInTheDocument();
  });

  it('com rota, o botão é um link', () => {
    render(
      <MemoryRouter>
        <AcaoAgora titulo="X" rotuloBotao="Ir" para="/recall/revisar" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Ir' })).toHaveAttribute('href', '/recall/revisar');
    expect(screen.getByRole('link', { name: 'Ir' })).toHaveClass('botao');
  });
});

describe('LinhaDepois', () => {
  it('não renderiza sem filhos', () => {
    const { container } = render(<LinhaDepois />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prefixa "Depois:" em texto', () => {
    render(<LinhaDepois>registrar um erro</LinhaDepois>);
    expect(screen.getByText('Depois: registrar um erro')).toBeInTheDocument();
  });
});

describe('BarraFina', () => {
  it('expõe valores, rótulo e o texto', () => {
    render(<BarraFina valor={3} max={10} rotulo="Cartões revisados" />);
    const barra = screen.getByRole('progressbar', { name: 'Cartões revisados' });
    expect(barra).toHaveAttribute('aria-valuenow', '3');
    expect(barra).toHaveAttribute('aria-valuemin', '0');
    expect(barra).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('3 de 10')).toBeInTheDocument();
  });

  it('limita entre 0 e o máximo', () => {
    const { rerender } = render(<BarraFina valor={15} max={10} rotulo="r" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
    rerender(<BarraFina valor={-2} max={10} rotulo="r" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('DiasDaSemana', () => {
  it('conta os dias no texto', () => {
    render(<DiasDaSemana dias={[true, false, true, true, false, true, false]} />);
    expect(screen.getByText('4 dos últimos 7 dias')).toBeInTheDocument();
  });

  it('sem nenhum dia, sem tom de cobrança', () => {
    render(<DiasDaSemana dias={[false, false, false, false, false, false, false]} />);
    expect(screen.getByText('Nenhum dia nos últimos 7')).toBeInTheDocument();
  });

  it('as marcas são decorativas', () => {
    const { container } = render(
      <DiasDaSemana dias={[true, false, false, false, false, false, false]} />,
    );
    const marcas = container.querySelector('[aria-hidden="true"]');
    expect(marcas?.children).toHaveLength(7);
  });
});

describe('LinhaLista e Selo (fatia 6)', () => {
  it('a linha é um link com título, apoio e selo; a seta é decorativa', () => {
    render(
      <MemoryRouter>
        <LinhaLista
          para="/biblioteca/lep"
          titulo="LEP"
          apoio="Lei de Execução Penal"
          selo={<Selo>Há versão nova</Selo>}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /LEP/ });
    expect(link).toHaveAttribute('href', '/biblioteca/lep');
    expect(screen.getByText('Lei de Execução Penal')).toBeInTheDocument();
    expect(screen.getByText('Há versão nova')).toHaveClass('selo');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
