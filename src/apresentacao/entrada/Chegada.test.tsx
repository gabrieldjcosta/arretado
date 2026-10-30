import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { criarEncontro, type OfertaDaChegada } from '../componentes/escrita/encontro';
import { ContextoDaAbertura } from '../componentes/escrita/vez-da-escrita';
import { caminhoDoOlho } from '../componentes/ze/geometria';
import { ProvedorConta } from '../conta/entrar/ContextoConta';
import { aceiteDoLoginPendente } from '../conta/entrar/aceite';
import { ServicoDeContaFalso } from '../../integracoes/conta';
import { Chegada } from './Chegada';
import { PASSOS } from './passeio/passos';
import { CHAVE_CHEGADA, CHAVE_ENTRADA } from './regras';

const DIA = '2026-09-23';

function abrir(
  props: ComponentProps<typeof Chegada> = { dia: DIA },
  conta = new ServicoDeContaFalso(),
) {
  const usuario = userEvent.setup();
  const aoFechar = vi.fn();
  const tela = render(
    <ProvedorConta servico={conta}>
      <MemoryRouter>
        <Chegada aoFechar={aoFechar} {...props} />
      </MemoryRouter>
    </ProvedorConta>,
  );
  return { usuario, aoFechar, conta, ...tela };
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
  async function ateOComecar(conta?: ServicoDeContaFalso) {
    const utilidades = abrir({ dia: DIA }, conta);
    await utilidades.usuario.click(botao('Vamos'));
    await utilidades.usuario.click(botao('Pular o passeio'));
    return utilidades;
  }

  it('com a conta ligada: o Google (para a tela Entrar), a nota do convite e a saída sem conta', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    await ateOComecar();
    const folha = comecar();
    const google = within(folha).getByRole('button', { name: 'Entrar com o Google' });
    expect(google.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(google.querySelectorAll('svg path')).toHaveLength(4);
    expect(
      within(folha).getByText(/Em fase de teste: por enquanto só e-mails convidados entram\./),
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

  it('"Entrar com o Google" grava o aceite e abre o login direto, sem passar pela tela Entrar', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const conta = new ServicoDeContaFalso();
    const entrar = vi.spyOn(conta, 'entrarComGoogle');
    const { usuario } = await ateOComecar(conta);
    expect(aceiteDoLoginPendente()).toBeNull();
    await usuario.click(screen.getByRole('button', { name: 'Entrar com o Google' }));
    expect(entrar).toHaveBeenCalledTimes(1);
    expect(aceiteDoLoginPendente()).not.toBeNull();
  });

  it('o aviso do aceite descreve o botão do Google (quem usa leitor de tela o ouve antes de tocar)', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    await ateOComecar();
    expect(screen.getByRole('button', { name: 'Entrar com o Google' })).toHaveAccessibleDescription(
      /Ao entrar, seu estudo passa a ser guardado na sua conta/,
    );
  });

  it('o aviso do que sai do Aparelho fica à vista e leva à tela Entrar', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const { usuario, aoFechar } = await ateOComecar();
    expect(within(comecar()).getByText(/Ao entrar, seu estudo passa a ser guardado/)).toBeVisible();
    await usuario.click(screen.getByRole('link', { name: 'Ver o que sai do Aparelho' }));
    expect(aberta()).toBeNull();
    expect(aoFechar).toHaveBeenCalled();
  });

  it('o Google que falha (sem rede) avisa na folha e deixa tentar de novo', async () => {
    vi.stubEnv('VITE_CONTA', '1');
    const { usuario } = await ateOComecar(new ServicoDeContaFalso({ semRede: true }));
    await usuario.click(screen.getByRole('button', { name: 'Entrar com o Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar agora');
    expect(screen.getByRole('button', { name: 'Entrar com o Google' })).toBeEnabled();
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

describe('Chegada › a primeira vez com a luz da Abertura a caminho (M3b)', () => {
  /** O que a Abertura diz a quem abre por cima: a luz vai ao Zé (`voa`), ou a camada só está na tela (`emCurso`). */
  const abertura = (emCurso: boolean, voaParaAChegada: boolean, encontro = criarEncontro()) => ({
    vez: { estado: 'decidida', onde: 'tela', escrita: 'completa', calmo: false, chegada: true },
    emCurso,
    voaParaAChegada,
    encontro,
  });

  function abrirComAbertura(
    estado: ReturnType<typeof abertura>,
    props: ComponentProps<typeof Chegada> = { dia: DIA },
  ) {
    const aoFechar = vi.fn();
    const tela = render(
      <ContextoDaAbertura.Provider value={estado as never}>
        <MemoryRouter>
          <Chegada aoFechar={aoFechar} {...props} />
        </MemoryRouter>
      </ContextoDaAbertura.Provider>,
    );
    const janela = () => screen.getByRole('dialog', { hidden: true });
    const zona = () => tela.container.querySelector('.chegada-tela');
    /** A oferta que a Chegada fez à luz. */
    const oferta = async (): Promise<OfertaDaChegada | null> => {
      const pedido = estado.encontro.esperar(50, new AbortController().signal);
      return pedido;
    };
    /** A Abertura saiu: o contexto passa a dizer que nada está em curso. */
    const abrirCaminho = () => {
      tela.rerender(
        <ContextoDaAbertura.Provider value={abertura(false, false, estado.encontro) as never}>
          <MemoryRouter>
            <Chegada aoFechar={aoFechar} {...props} />
          </MemoryRouter>
        </ContextoDaAbertura.Provider>,
      );
    };
    return { ...tela, aoFechar, janela, zona, oferta, abrirCaminho };
  }

  it('nasce na espera: escondida, parada, e ainda não conta como vista', () => {
    esvaziar();
    const { janela, zona } = abrirComAbertura(abertura(true, true));
    expect(janela()).toHaveClass('dialogo-chegada', 'dialogo-chegada-espera');
    expect(zona()).toHaveAttribute('data-entrada', 'espera');
    // Escondida por baixo do nome, ela ainda não foi vista: fechar o aplicativo agora a traz de volta.
    expect(guardado()).toEqual({});
    // A tela existe e o foco já está nela, para quem usa leitor de tela não esperar a luz.
    expect(within(janela()).getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('se oferece à luz; quando ela pousa, a classe muda, o Zé se desenha e só então a Chegada conta como vista', async () => {
    esvaziar();
    const { janela, zona, oferta } = abrirComAbertura(abertura(true, true));
    const recebida = await oferta();
    expect(recebida).not.toBeNull();
    act(() => {
      recebida?.receber();
    });
    expect(janela()).toHaveClass('dialogo-chegada', 'dialogo-chegada-desenha');
    expect(janela()).not.toHaveClass('dialogo-chegada-espera');
    expect(zona()).toHaveAttribute('data-entrada', 'desenhar');
    expect(guardado()).toEqual({
      [CHAVE_CHEGADA]: '{"vista":true}',
      [CHAVE_ENTRADA]: `{"dia":"${DIA}"}`,
    });
    // Receber duas vezes é inofensivo: nada recomeça.
    act(() => {
      recebida?.receber();
    });
    expect(zona()).toHaveAttribute('data-entrada', 'desenhar');
  });

  it('o Zé se desenha uma vez só: quem segue e volta às boas-vindas o encontra pronto', async () => {
    const usuario = userEvent.setup();
    const { janela, zona, oferta } = abrirComAbertura(abertura(true, true));
    const recebida = await oferta();
    act(() => {
      recebida?.receber();
    });
    expect(zona()).toHaveAttribute('data-entrada', 'desenhar');
    await usuario.click(botao('Vamos'));
    expect(passo(1, 'Hoje')).toBeInTheDocument();
    await usuario.click(botao('Voltar às boas-vindas'));
    expect(zona()).toHaveAttribute('data-entrada', 'pronta');
    expect(janela()).not.toHaveClass('dialogo-chegada-desenha');
  });

  it('Esc na espera não faz nada: a camada que está por cima é dela', () => {
    const { janela, aoFechar } = abrirComAbertura(abertura(true, true));
    fireEvent(janela(), new Event('cancel', { cancelable: true }));
    expect(janela()).toBeInTheDocument();
    expect(aoFechar).not.toHaveBeenCalled();
    expect(janela()).toHaveClass('dialogo-chegada-espera');
  });

  it('a Abertura sai sem a luz pousar (pulada, ou a luz foi ao cabeçalho): o Zé aparece pronto e a Chegada conta como vista', () => {
    esvaziar();
    const { janela, zona, abrirCaminho } = abrirComAbertura(abertura(true, true));
    expect(zona()).toHaveAttribute('data-entrada', 'espera');
    abrirCaminho();
    expect(janela()).toHaveClass('dialogo-chegada');
    expect(janela()).not.toHaveClass('dialogo-chegada-espera', 'dialogo-chegada-desenha');
    expect(zona()).toHaveAttribute('data-entrada', 'pronta');
    expect(guardado()[CHAVE_CHEGADA]).toBe('{"vista":true}');
  });

  it('depois de pronta, Esc volta a valer, como em toda Chegada', () => {
    const { janela, abrirCaminho } = abrirComAbertura(abertura(true, true));
    abrirCaminho();
    fireEvent(janela(), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a luz que chega depois de a Abertura sair não encontra a oferta', async () => {
    const encontro = criarEncontro();
    const { abrirCaminho } = abrirComAbertura(abertura(true, true, encontro));
    abrirCaminho();
    expect(await encontro.esperar(1, AbortSignal.abort())).toBeNull();
  });

  it.each([
    [
      'sem luz a caminho (a camada do Dia, o Calmo, sem Zé à vista)',
      abertura(true, false),
      { dia: DIA },
    ],
    ['com a Abertura já fora', abertura(false, false), { dia: DIA }],
    ['passeio refeito, sem `dia` (Ajuda)', abertura(true, true), {}],
  ])('%s: nasce pronta, sem se esconder', (_nome, estado, props) => {
    const { janela, zona } = abrirComAbertura(estado, props);
    expect(janela()).toHaveClass('dialogo-chegada');
    expect(janela()).not.toHaveClass('dialogo-chegada-espera');
    expect(zona()).toHaveAttribute('data-entrada', 'pronta');
  });

  it('aberta direto num passo (a Conta), com a luz a caminho ou não, nunca se esconde', () => {
    const { janela } = abrirComAbertura(abertura(true, true), { inicio: 'passo' });
    expect(janela()).toHaveClass('dialogo-chegada');
    expect(janela()).not.toHaveClass('dialogo-chegada-espera');
    expect(screen.getByRole('dialog', { name: 'Passo 1 de 4 Hoje' })).toBeInTheDocument();
  });
});
