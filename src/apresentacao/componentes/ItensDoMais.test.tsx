import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  criarRegistroDeItens,
  ProvedorDeItensDoMais,
  useItensDoMais,
  type ItemDoMais,
} from './ItensDoMais';
import { MaisGlobal } from './MaisGlobal';

const item = (id: string, resto: Partial<ItemDoMais> = {}): ItemDoMais => ({
  id,
  nome: `Item ${id}`,
  apoio: `Apoio de ${id}`,
  aoEscolher: () => undefined,
  ...resto,
});

describe('o registro dos itens do "+" (D-D24)', () => {
  it('sem tela, não há itens; a fonte é lida a cada pedido, nunca guardada', () => {
    const registro = criarRegistroDeItens();
    expect(registro.itens()).toEqual([]);

    let lidas = 0;
    registro.definir(() => {
      lidas += 1;
      return [item('a')];
    });
    expect(lidas).toBe(0);
    expect(registro.itens()).toHaveLength(1);
    registro.itens();
    expect(lidas).toBe(2);
  });

  it('uma tela só por vez: a que sai não leva embora a que já tomou o lugar dela', () => {
    const registro = criarRegistroDeItens();
    const primeira = () => [item('a')];
    const segunda = () => [item('b')];
    registro.definir(primeira);
    registro.definir(segunda);

    registro.limpar(primeira);
    expect(registro.itens().map((i) => i.id)).toEqual(['b']);
    registro.limpar(segunda);
    expect(registro.itens()).toEqual([]);
  });
});

function Tela({ itens }: { itens: () => readonly ItemDoMais[] }) {
  useItensDoMais(itens);
  return <p>Uma tela</p>;
}

describe('useItensDoMais', () => {
  it('a tela entra no registro ao montar e sai ao desmontar, e leva os itens dela', () => {
    const registro = criarRegistroDeItens();
    const { unmount } = render(
      <ProvedorDeItensDoMais value={registro}>
        <Tela itens={() => [item('a')]} />
      </ProvedorDeItensDoMais>,
    );
    expect(registro.itens().map((i) => i.id)).toEqual(['a']);
    unmount();
    expect(registro.itens()).toEqual([]);
  });

  it('sem casca em volta (um teste isolado), a tela monta e não há itens', () => {
    render(<Tela itens={() => [item('a')]} />);
    expect(screen.getByText('Uma tela')).toBeInTheDocument();
  });
});

/** O "+" e uma tela que lhe dá itens, dentro de uma casca de mentira. */
function montar(itens: () => readonly ItemDoMais[], comTela = true) {
  const registro = criarRegistroDeItens();
  const { unmount } = render(
    <MemoryRouter>
      <ProvedorDeItensDoMais value={registro}>
        <MaisGlobal />
        {comTela && <Tela itens={itens} />}
      </ProvedorDeItensDoMais>
    </MemoryRouter>,
  );
  const usuario = userEvent.setup();
  const mais = screen.getByRole('button', { name: 'Novo registro' });
  const painel = () => {
    const el = document.getElementById(mais.getAttribute('aria-controls') ?? '');
    if (!el) throw new Error('o painel não está aberto');
    return el;
  };
  /** Os nomes das opções, na ordem em que aparecem (só o título, sem a tecla nem o apoio). */
  const nomes = () =>
    Array.from(painel().querySelectorAll('.mais-item-titulo')).map(
      (el) => el.firstChild?.textContent,
    );
  return { usuario, mais, painel, nomes, unmount };
}

describe('o "+" com os itens da tela', () => {
  it('sem itens da tela, o painel é o da casca: o link do registro e o Lembrete', async () => {
    const { usuario, mais, painel, nomes } = montar(() => [], false);
    await usuario.click(mais);
    expect(nomes()).toEqual(['Registrar erro', 'Lembrete']);
    expect(within(painel()).getByRole('link', { name: /^Registrar erro/ })).toHaveAttribute(
      'href',
      '/recall/registrar',
    );
  });

  it('o "registrar-erro" da tela toma o lugar do link; os outros vêm depois; o Lembrete fica por último', async () => {
    const { usuario, mais, painel, nomes } = montar(() => [
      item('cartao', { nome: 'Cartão deste trecho', apoio: 'Do Art. 3º' }),
      item('registrar-erro', {
        nome: 'Registrar erro',
        apoio: 'Ligado ao Art. 3º',
        atalho: 'E',
      }),
    ]);
    await usuario.click(mais);

    // O registro da tela vem primeiro, mesmo entregue depois, e o link genérico sai.
    expect(nomes()).toEqual(['Registrar erro', 'Cartão deste trecho', 'Lembrete']);
    expect(within(painel()).queryByRole('link')).toBeNull();
    const erro = within(painel()).getByRole('button', { name: 'Registrar erro Ligado ao Art. 3º' });
    expect(erro).toHaveAttribute('aria-keyshortcuts', 'E');
  });

  it('escolher um item chama a ação, fecha o painel e deixa o foco no "+"', async () => {
    const ao = vi.fn();
    const { usuario, mais } = montar(() => [item('a', { nome: 'Fazer a', aoEscolher: ao })]);
    await usuario.click(mais);
    await usuario.click(screen.getByRole('button', { name: 'Fazer a Apoio de a' }));

    expect(ao).toHaveBeenCalledTimes(1);
    expect(mais).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^Fazer a/ })).toBeNull();
    expect(mais).toHaveFocus();
  });

  it('item indisponível fica apagado: o apoio diz por quê, a ação não roda e o painel segue aberto', async () => {
    const ao = vi.fn();
    const { usuario, mais } = montar(() => [
      item('a', {
        nome: 'Fazer a',
        apoio: 'Já feito',
        indisponivel: true,
        aoEscolher: ao,
      }),
    ]);
    await usuario.click(mais);
    const apagado = screen.getByRole('button', { name: 'Fazer a Já feito' });
    expect(apagado).toHaveAttribute('aria-disabled', 'true');
    await usuario.click(apagado);

    expect(ao).not.toHaveBeenCalled();
    expect(mais).toHaveAttribute('aria-expanded', 'true');
  });

  it('os itens são lidos quando o painel abre, não a cada renderização', async () => {
    const fonte = vi.fn(() => [item('a')]);
    const { usuario, mais } = montar(fonte);
    expect(fonte).not.toHaveBeenCalled();

    await usuario.click(mais);
    expect(fonte).toHaveBeenCalledTimes(1);
    // Fechar e abrir de novo lê outra vez: a tela pode ter rolado para outro artigo.
    await usuario.click(mais);
    await usuario.click(mais);
    expect(fonte).toHaveBeenCalledTimes(2);
  });

  it('a tecla E, com o painel aberto, fecha o painel: o que ela abre não fica com ele atrás', async () => {
    const { usuario, mais } = montar(() => [item('registrar-erro', { nome: 'Registrar erro' })]);
    await usuario.click(mais);
    expect(mais).toHaveAttribute('aria-expanded', 'true');
    await usuario.keyboard('e');
    expect(mais).toHaveAttribute('aria-expanded', 'false');
  });
});
