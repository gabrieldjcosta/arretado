import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { caminhoDoOlho } from '../componentes/ze/geometria';
import { Chegada } from './Chegada';
import { PASSOS } from './passeio/passos';
import { CHAVE_CHEGADA, CHAVE_ENTRADA } from './regras';

const DIA = '2026-09-23';

function abrir(props: ComponentProps<typeof Chegada> = { dia: DIA }) {
  const usuario = userEvent.setup();
  const aoFechar = vi.fn();
  const tela = render(
    <MemoryRouter>
      <Chegada aoFechar={aoFechar} {...props} />
    </MemoryRouter>,
  );
  return { usuario, aoFechar, ...tela };
}

const boasVindas = () => screen.getByRole('dialog', { name: 'Boas-vindas ao Arretado!' });
const passo = (n: number, nome: string) =>
  screen.getByRole('dialog', { name: `Passo ${String(n)} de 4 ${nome}` });
const comecar = () => screen.getByRole('dialog', { name: 'Vamo começar?' });
const esc = () => {
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
};
const aberta = () => screen.queryByRole('dialog');
const botao = (nome: string) => screen.getByRole('button', { name: nome });
/** Tudo o que há guardado, por chave. */
const guardado = () =>
  Object.fromEntries(
    Array.from({ length: localStorage.length }, (_, i) => {
      const chave = localStorage.key(i) ?? '';
      return [chave, localStorage.getItem(chave)] as const;
    }),
  );
/** O setup semeia as chaves de "já visto"; para provar que nada se grava, o aparelho começa vazio. */
const esvaziar = () => {
  for (const chave of Object.keys(guardado())) localStorage.removeItem(chave);
};

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Chegada › Boas-vindas (primeira vez neste aparelho)', () => {
  it('mostra o Zé, a frase e só dois botões, "Vamos" e "Agora não", sem nenhum link', () => {
    abrir();
    const folha = boasVindas();
    expect(within(folha).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Boas-vindas ao Arretado!',
    );
    expect(
      within(folha).getByText(
        'Bora conhecer a ferramenta que vai facilitar de verdade seus estudos?',
      ),
    ).toBeVisible();
    expect(folha.querySelector('svg.ze')).toBeInTheDocument();
    expect(
      within(folha)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Agora não', 'Vamos']);
    expect(within(folha).queryAllByRole('link')).toEqual([]);
    expect(within(folha).queryByText('Escolher meu concurso')).not.toBeInTheDocument();
  });

  it('põe o foco no título (o leitor de tela lê a tela) e "Vamos" descreve-se pela frase', () => {
    abrir();
    const folha = boasVindas();
    expect(within(folha).getByRole('heading', { level: 2 })).toHaveFocus();
    expect(botao('Vamos')).toHaveAccessibleDescription(
      'Bora conhecer a ferramenta que vai facilitar de verdade seus estudos?',
    );
  });

  it('grava ao aparecer (a Chegada vista e o Dia da Entrada) e o Zé é decorativo', () => {
    abrir();
    expect(localStorage.getItem(CHAVE_CHEGADA)).toBe('{"vista":true}');
    expect(localStorage.getItem(CHAVE_ENTRADA)).toBe(`{"dia":"${DIA}"}`);
    expect(boasVindas().querySelector('svg.ze')).toHaveAttribute('aria-hidden', 'true');
  });

  it('"Agora não" fecha a folha e avisa quem a abriu', async () => {
    const { usuario, aoFechar } = abrir();
    await usuario.click(botao('Agora não'));
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('Esc fecha as Boas-vindas', () => {
    const { aoFechar } = abrir();
    esc();
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});

describe('Chegada › o Passeio', () => {
  it('"Vamos" abre o primeiro passo: nome, frase e itens do menu, e o diálogo diz o passo', async () => {
    const { usuario } = abrir();
    await usuario.click(botao('Vamos'));
    const folha = passo(1, 'Hoje');
    expect(within(folha).getByRole('heading', { level: 2 })).toHaveTextContent('Hoje');
    expect(within(folha).getByRole('heading', { level: 2 })).toHaveFocus();
    expect(within(folha).getByText('Passo 1 de 4')).toBeVisible();
    expect(
      within(folha).getByText('Aqui você vê o que tem pra fazer, sem agonia pra decidir.'),
    ).toBeVisible();
    expect(within(folha).getAllByRole('listitem')).toHaveLength(PASSOS[0]?.itens.length ?? -1);
    expect(
      within(folha)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Pular o passeio', 'Seguir', 'Voltar às boas-vindas']);
    // O passo só explica: nenhum link nem atalho para outra tela.
    expect(within(folha).queryAllByRole('link')).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('Passo 1 de 4: Hoje');
  });

  it('"Seguir" anda pelos quatro menus, na ordem das abas, com o ícone da aba de cada um', async () => {
    const { usuario } = abrir();
    await usuario.click(botao('Vamos'));
    for (const [i, menu] of PASSOS.entries()) {
      const folha = passo(i + 1, menu.nome);
      expect(within(folha).getByRole('heading', { level: 2 })).toHaveFocus();
      expect(folha.querySelector('svg.passo-icone path:not(.passo-neon)')).toHaveAttribute(
        'd',
        menu.icone,
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        `Passo ${String(i + 1)} de 4: ${menu.nome}`,
      );
      if (i < PASSOS.length - 1) await usuario.click(botao('Seguir'));
    }
  });

  it('a cópia da barra de abas e os pontos são decorativos e marcam o passo de agora', async () => {
    const { usuario } = abrir();
    await usuario.click(botao('Vamos'));
    await usuario.click(botao('Seguir'));
    const folha = passo(2, 'Trilha');
    const abas = folha.querySelector('.passo-abas');
    expect(abas).toHaveAttribute('aria-hidden', 'true');
    expect(abas?.querySelectorAll('.passo-aba')).toHaveLength(4);
    expect(
      [...(abas?.querySelectorAll('.passo-aba[data-atual]') ?? [])].map((a) => a.textContent),
    ).toEqual(['Trilha']);
    expect(abas?.querySelector<HTMLElement>('.passo-traco')?.style.transform).toBe(
      'translateX(100%)',
    );
    const pontos = folha.querySelector('.passo-pontos');
    expect(pontos).toHaveAttribute('aria-hidden', 'true');
    expect([...(pontos?.querySelectorAll('i') ?? [])].map((p) => p.dataset.estado)).toEqual([
      'feito',
      'atual',
      undefined,
      undefined,
    ]);
  });

  it('"Voltar" desfaz um passo e, no primeiro, volta às Boas-vindas', async () => {
    const { usuario } = abrir();
    await usuario.click(botao('Vamos'));
    await usuario.click(botao('Seguir'));
    await usuario.click(botao('Voltar'));
    passo(1, 'Hoje');
    await usuario.click(botao('Voltar às boas-vindas'));
    expect(boasVindas()).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Boas-vindas ao Arretado!');
  });

  it('o último passo diz "Seguir" e leva ao Começar; o passeio nunca chama o Zé de outra cara no meio', async () => {
    const { usuario } = abrir();
    await usuario.click(botao('Vamos'));
    for (let i = 0; i < PASSOS.length - 1; i += 1) await usuario.click(botao('Seguir'));
    passo(4, 'Biblioteca');
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
    await usuario.click(botao('Seguir'));
    expect(comecar()).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Vamo começar?');
    expect(within(comecar()).getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('"Pular o passeio" leva ao Começar, de qualquer passo', async () => {
    const { usuario } = abrir();
    await usuario.click(botao('Vamos'));
    await usuario.click(botao('Seguir'));
    await usuario.click(botao('Pular o passeio'));
    expect(comecar()).toBeVisible();
  });

  it('Esc num passo é "Pular o passeio": leva ao Começar e não fecha a folha', async () => {
    const { usuario, aoFechar } = abrir();
    await usuario.click(botao('Vamos'));
    esc();
    expect(comecar()).toBeVisible();
    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe('Chegada › o Começar', () => {
  async function ateOComecar() {
    const utilidades = abrir();
    await utilidades.usuario.click(botao('Vamos'));
    await utilidades.usuario.click(botao('Pular o passeio'));
    return utilidades;
  }

  it('com a conta ligada: o Google (para a tela Entrar), a nota do convite e a saída sem conta', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    await ateOComecar();
    const folha = comecar();
    const google = within(folha).getByRole('link', { name: 'Entrar com o Google' });
    expect(google).toHaveAttribute('href', '/conta/entrar');
    expect(google.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(google.querySelectorAll('svg path')).toHaveLength(4);
    expect(
      within(folha).getByText('Em fase de teste: por enquanto só e-mails convidados entram.'),
    ).toBeVisible();
    const semConta = within(folha).getByRole('button', {
      name: 'Experimentar sem conta e salvar seus dados manualmente',
    });
    expect(semConta).not.toHaveClass('principal');
  });

  it('o Zé do Começar fica contente: os dois olhos viram arcos', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    await ateOComecar();
    const olhos = [...comecar().querySelectorAll('.z-pupila')].map((o) => o.getAttribute('d'));
    expect(olhos).toEqual([caminhoDoOlho(1), caminhoDoOlho(1)]);
  });

  it('"Entrar com o Google" tira a folha do caminho e deixa a tela Entrar abrir', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const { usuario, aoFechar } = await ateOComecar();
    await usuario.click(screen.getByRole('link', { name: 'Entrar com o Google' }));
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalled();
  });

  it('"Experimentar sem conta" fecha a folha: o Hoje vazio já oferece "Escolher meu concurso"', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const { usuario, aoFechar } = await ateOComecar();
    await usuario.click(
      screen.getByRole('button', {
        name: 'Experimentar sem conta e salvar seus dados manualmente',
      }),
    );
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('sem a conta ligada (a compilação de teste) o Google e a nota não existem e a saída é o principal', async () => {
    vi.stubEnv('VITE_CONTA', '0');
    await ateOComecar();
    const folha = comecar();
    expect(within(folha).queryByRole('link')).not.toBeInTheDocument();
    expect(within(folha).queryByText(/e-mails convidados/)).not.toBeInTheDocument();
    expect(
      within(folha).getByRole('button', {
        name: 'Experimentar sem conta e salvar seus dados manualmente',
      }),
    ).toHaveClass('principal');
  });

  it('Esc no Começar fecha a folha', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const { aoFechar } = await ateOComecar();
    esc();
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('não há "Agora não" no alto do Começar: a saída de baixo faz o mesmo', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    await ateOComecar();
    expect(screen.queryByRole('button', { name: 'Agora não' })).not.toBeInTheDocument();
  });
});

describe('Chegada › o passeio refeito (sem `dia`: Ajuda e Conta)', () => {
  it('Ajuda › "Rever as boas-vindas": não grava nada e o último passo diz "Concluir" e fecha, sem Começar', async () => {
    esvaziar();
    const { usuario, aoFechar } = abrir({ dia: undefined });
    expect(guardado()).toEqual({});
    await usuario.click(botao('Vamos'));
    for (let i = 0; i < PASSOS.length - 1; i += 1) await usuario.click(botao('Seguir'));
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();
    await usuario.click(botao('Concluir'));
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(guardado()).toEqual({});
  });

  it('"Pular o passeio" e Esc fecham a folha em vez de ir ao Começar', async () => {
    const primeira = abrir({ dia: undefined });
    await primeira.usuario.click(botao('Vamos'));
    await primeira.usuario.click(botao('Pular o passeio'));
    expect(aberta()).toBeNull();
    primeira.unmount();

    const segunda = abrir({ dia: undefined });
    await segunda.usuario.click(botao('Vamos'));
    esc();
    expect(aberta()).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Vamo começar?' })).not.toBeInTheDocument();
  });

  it('Conta › "Passeio pelos menus": abre direto no primeiro passo e "Voltar ao app" fecha', async () => {
    esvaziar();
    const { usuario, aoFechar } = abrir({ dia: undefined, inicio: 'passo' });
    passo(1, 'Hoje');
    expect(
      screen.queryByRole('dialog', { name: 'Boas-vindas ao Arretado!' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar às boas-vindas' })).not.toBeInTheDocument();
    await usuario.click(botao('Voltar ao app'));
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(guardado()).toEqual({});
  });

  it('do segundo passo em diante o botão é "Voltar" também na Conta', async () => {
    const { usuario } = abrir({ dia: undefined, inicio: 'passo' });
    await usuario.click(botao('Seguir'));
    passo(2, 'Trilha');
    await usuario.click(botao('Voltar'));
    passo(1, 'Hoje');
  });
});
