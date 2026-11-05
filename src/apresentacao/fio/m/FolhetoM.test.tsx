import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { disciplinasDaNorma } from '../../../dominios/acervo/vinculos';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { fonteDoMapaDoVaral, guardarNoVaral, OFICIAL_DA_LEP } from '../../../testes/varal';
import { ContextoRepositorio } from '../../dados/contexto';
import { ContextoFonteAcervo } from '../../dados/fonteAcervoContexto';
import { ContextoFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import type * as Conferir from './conferir-planalto';
import { conferirComOPlanalto } from './conferir-planalto';
import { FolhetoM } from './FolhetoM';
import { esquecerOrganizacao, organizacaoAgora } from './organizar';
import { ToastM } from './ToastM';
import { avisar, esconderAviso } from './toast';

// A conferência de verdade, mas sem rede: cada teste diz o que o Planalto respondeu.
vi.mock('./conferir-planalto', async () => {
  const original = await vi.importActual<typeof Conferir>('./conferir-planalto');
  return { ...original, conferirComOPlanalto: vi.fn() };
});

/** Onde a pessoa está, para os testes lerem a rota. */
function Aqui() {
  const l = useLocation();
  return <output data-testid="rota">{`${l.pathname}${l.search}`}</output>;
}

async function abrir(opcoes: { rota?: string; vazio?: boolean } = {}) {
  const { repo } = await repositorioDeTeste({ inicio: new Date().toISOString() });
  const { fonte, ids } = await guardarNoVaral(repo, opcoes);
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ContextoFonteAcervo.Provider value={fonte}>
        <ContextoFonteIncidencia.Provider value={fonteDoMapaDoVaral()}>
          <MemoryRouter initialEntries={[opcoes.rota ?? '/varal/normas']}>
            <main id="conteudo">
              <Routes>
                <Route path="/varal/:folheto" element={<FolhetoM />} />
                <Route path="*" element={<p>outra tela</p>} />
              </Routes>
              <Aqui />
              <ToastM />
            </main>
          </MemoryRouter>
        </ContextoFonteIncidencia.Provider>
      </ContextoFonteAcervo.Provider>
    </ContextoRepositorio.Provider>,
  );
  return { repo, ids, usuario: userEvent.setup() };
}

const rota = () => screen.getByTestId('rota').textContent;
/** Os nomes das linhas, na ordem em que estão na tela. */
const nomes = () =>
  [...document.querySelectorAll('.m-linha-item .m-nome')].map((n) => n.textContent);
/** O botão que abre a linha (o nome pode vir com a marca "fixada no alto" na frente: acha pelo `.m-nome`). */
function linha(nome: string): HTMLElement {
  const botao = screen.getByText(nome, { selector: '.m-nome' }).closest('button');
  if (!botao) throw new Error(`Sem linha para ${nome}`);
  return botao;
}
const maisAcoes = (nome: string) => screen.getByRole('button', { name: `Mais ações de ${nome}` });
/** O que está sob o título do folheto ("2 · o que mais cai", "1 escolhido"). */
const subtitulo = () => document.querySelector('.m-titulo-folheto p')?.textContent;

/** Abre o "Mudar disciplina" de uma linha e devolve a folha (a única que tem o "Pronto" fora do pé do folheto). */
async function abrirDisciplinas(usuario: UserEvent, nome: string): Promise<HTMLElement> {
  await usuario.click(maisAcoes(nome));
  await usuario.click(
    within(await screen.findByRole('dialog', { name: nome })).getByRole('button', {
      name: 'Mudar disciplina',
    }),
  );
  const pronto = await screen.findByRole('button', { name: 'Pronto' });
  const folha = pronto.closest<HTMLElement>('[role="dialog"]');
  if (!folha) throw new Error('A folha das disciplinas não abriu.');
  return folha;
}

beforeEach(() => {
  esquecerOrganizacao();
  // O aviso é um só, do quadro todo: o texto de um teste não pode sobrar para o outro.
  avisar('');
  esconderAviso();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  esquecerOrganizacao();
});

describe('o folheto das Normas', () => {
  it('um folheto que não existe volta ao Varal', async () => {
    await abrir({ rota: '/varal/outra-coisa' });
    await waitFor(() => {
      expect(rota()).toBe('/varal');
    });
  });

  it('abre com o título, o subtítulo e as normas guardadas, as que mais caem primeiro', async () => {
    await abrir();
    expect(screen.getByRole('heading', { level: 1, name: 'Varal: Normas' })).toHaveClass(
      'm-so-leitor',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Normas' })).toBeInTheDocument();
    expect(await screen.findByText('2 artigos que caem')).toBeInTheDocument();
    expect(nomes()).toEqual(['LEP', 'ECA']);
    expect(subtitulo()).toBe('2 · o que mais cai');
    // Sem o Mapa da ECA, a linha não inventa número: mostra a data.
    expect(within(linha('ECA')).getByText('guardada hoje')).toBeInTheDocument();
  });

  it('tocar na linha abre a norma no Leitor, e o voltar leva ao Varal', async () => {
    const { ids, usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: /^LEP/ }));
    expect(rota()).toBe(`/biblioteca/normas/${ids['lei-a'] ?? ''}`);
  });

  it('o voltar leva ao Varal', async () => {
    const { usuario } = await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Voltar ao Varal' }));
    expect(rota()).toBe('/varal');
  });

  it('o pé leva ao acervo e à importação', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(screen.getByRole('button', { name: '+ Adicionar do acervo' }));
    expect(rota()).toBe('/biblioteca/acervo?tipo=norma');
  });

  it('o pé das Normas tem "Importar", que leva à importação', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(screen.getByRole('button', { name: 'Importar' }));
    expect(rota()).toBe('/biblioteca/importar');
  });
});

describe('Organizar', () => {
  it('muda a ordem, e a bolinha avisa que há ajuste', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    expect(document.querySelector('.m-marca-org')).toBeNull();
    await usuario.click(screen.getByRole('button', { name: 'Organizar' }));
    const folha = await screen.findByRole('dialog', { name: 'Do seu jeito' });
    await usuario.click(
      within(within(folha).getByRole('group', { name: 'Ordem' })).getByRole('button', {
        name: 'Nome',
      }),
    );
    expect(nomes()).toEqual(['ECA', 'LEP']);
    expect(subtitulo()).toBe('2 · nome');
    expect(document.querySelector('.m-marca-org')).not.toBeNull();
    expect(organizacaoAgora().ordem).toBe('nome');
  });

  it('muda o que fica à vista na linha', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(screen.getByRole('button', { name: 'Organizar' }));
    const folha = await screen.findByRole('dialog', { name: 'Do seu jeito' });
    const vista = within(folha).getByRole('group', { name: 'À vista em cada linha' });
    await usuario.click(within(vista).getByRole('button', { name: 'Disciplina' }));
    expect(within(linha('LEP')).getByText('Execução Penal, Penal')).toBeInTheDocument();
    expect(within(linha('ECA')).getByText('Infância e Juventude')).toBeInTheDocument();
  });

  it('agrupa por disciplina em blocos com título', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(screen.getByRole('button', { name: 'Organizar' }));
    const folha = await screen.findByRole('dialog', { name: 'Do seu jeito' });
    await usuario.click(within(folha).getByRole('switch', { name: /Agrupar por disciplina/ }));
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // Os títulos do bloco e os das seções da folha convivem; os blocos vêm da lista.
    expect(titulos).toEqual(expect.arrayContaining(['Execução Penal', 'Infância e Juventude']));
    expect(organizacaoAgora().grupo).toBe(true);
  });
});

describe('o que fazer com uma linha', () => {
  it('fixar no alto sobe a linha e a marca; soltar a devolve', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(maisAcoes('ECA'));
    const folha = await screen.findByRole('dialog', { name: 'ECA' });
    await usuario.click(within(folha).getByRole('button', { name: 'Fixar no alto' }));
    await waitFor(() => {
      expect(nomes()).toEqual(['ECA', 'LEP']);
    });
    expect(within(linha('ECA')).getByRole('img', { name: 'fixada no alto' })).toBeInTheDocument();

    await usuario.click(maisAcoes('ECA'));
    await usuario.click(
      within(await screen.findByRole('dialog', { name: 'ECA' })).getByRole('button', {
        name: 'Soltar do alto',
      }),
    );
    await waitFor(() => {
      expect(nomes()).toEqual(['LEP', 'ECA']);
    });
  });

  it('tirar do varal esconde a linha, avisa com "Desfazer" e nada é apagado', async () => {
    const { usuario, ids } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(maisAcoes('ECA'));
    const folha = await screen.findByRole('dialog', { name: 'ECA' });
    // A última ação é a que tira (a que o mockup pinta de vermelho).
    const botoes = within(folha).getAllByRole('button');
    expect(botoes[botoes.length - 1]).toHaveTextContent('Tirar do varal');
    await usuario.click(within(folha).getByRole('button', { name: 'Tirar do varal' }));

    expect(await screen.findByText('ECA saiu do varal.')).toBeInTheDocument();
    expect(nomes()).toEqual(['LEP']);
    expect(organizacaoAgora().tirados['normas']).toEqual([ids['lei-b']]);

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => {
      expect(nomes()).toEqual(['LEP', 'ECA']);
    });
  });

  it('"Mostrar as que tirei" traz de volta as tiradas, marcadas, e "Devolver ao varal" as devolve', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(maisAcoes('ECA'));
    await usuario.click(
      within(await screen.findByRole('dialog', { name: 'ECA' })).getByRole('button', {
        name: 'Tirar do varal',
      }),
    );
    await waitFor(() => {
      expect(nomes()).toEqual(['LEP']);
    });

    await usuario.click(screen.getByRole('button', { name: 'Organizar' }));
    const organizar = await screen.findByRole('dialog', { name: 'Do seu jeito' });
    await usuario.click(within(organizar).getByRole('switch', { name: /Mostrar as que tirei/ }));
    await waitFor(() => {
      expect(nomes()).toEqual(['LEP', 'ECA']);
    });
    expect(within(linha('ECA')).getByText(/^tirada do varal · /)).toBeInTheDocument();
    // Fecha a folha (Escape) e devolve a linha pela folha dela.
    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await usuario.click(maisAcoes('ECA'));
    await usuario.click(
      within(await screen.findByRole('dialog', { name: 'ECA' })).getByRole('button', {
        name: 'Devolver ao varal',
      }),
    );
    expect(await screen.findByText('ECA voltou ao varal.')).toBeInTheDocument();
    expect(within(linha('ECA')).queryByText(/tirada do varal/)).not.toBeInTheDocument();
  });

  it('só a norma com endereço oficial oferece a conferência com o Planalto', async () => {
    const { usuario } = await abrir();
    await screen.findByText('LEP');
    await usuario.click(maisAcoes('ECA'));
    const semEndereco = await screen.findByRole('dialog', { name: 'ECA' });
    expect(
      within(semEndereco).queryByRole('button', { name: 'Atualizar com o Planalto' }),
    ).not.toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await usuario.click(maisAcoes('LEP'));
    expect(
      within(await screen.findByRole('dialog', { name: 'LEP' })).getByRole('button', {
        name: 'Atualizar com o Planalto',
      }),
    ).toBeInTheDocument();
  });

  it('segurar a linha abre as ações, e o toque que vem depois não abre a norma', async () => {
    await abrir();
    const botao = await screen.findByRole('button', { name: /^LEP/ });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.pointerDown(botao);
    act(() => {
      vi.advanceTimersByTime(519);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    vi.useRealTimers();
    expect(await screen.findByRole('dialog', { name: 'LEP' })).toBeInTheDocument();
    fireEvent.pointerUp(botao);
    fireEvent.click(botao);
    expect(rota()).toBe('/varal/normas');
  });

  it('soltar antes dos 520 ms não abre nada, e o toque abre a norma', async () => {
    const { ids } = await abrir();
    const botao = await screen.findByRole('button', { name: /^LEP/ });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.pointerDown(botao);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(botao);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(botao);
    expect(rota()).toBe(`/biblioteca/normas/${ids['lei-a'] ?? ''}`);
  });

  it('o botão direito do mouse faz o mesmo que segurar', async () => {
    await abrir();
    fireEvent.contextMenu(await screen.findByRole('button', { name: /^LEP/ }));
    expect(await screen.findByRole('dialog', { name: 'LEP' })).toBeInTheDocument();
  });
});

describe('escolher vários', () => {
  async function comecarAEscolher() {
    const c = await abrir();
    await screen.findByText('LEP');
    await c.usuario.click(screen.getByRole('button', { name: 'Organizar' }));
    await c.usuario.click(
      within(await screen.findByRole('dialog', { name: 'Do seu jeito' })).getByRole('button', {
        name: 'Escolher vários',
      }),
    );
    await waitFor(() => {
      expect(subtitulo()).toBe('0 escolhidos');
    });
    return c;
  }

  it('a linha vira caixa de marcar, o subtítulo conta e o pé muda', async () => {
    const { usuario } = await comecarAEscolher();
    expect(screen.queryByRole('button', { name: /^Mais ações/ })).not.toBeInTheDocument();
    expect(linha('LEP')).toHaveAttribute('aria-pressed', 'false');
    await usuario.click(linha('LEP'));
    expect(linha('LEP')).toHaveAttribute('aria-pressed', 'true');
    expect(subtitulo()).toBe('1 escolhido');
    await usuario.click(linha('ECA'));
    expect(subtitulo()).toBe('2 escolhidos');
    for (const rotulo of ['Mudar disciplina', 'Tirar do varal', 'Pronto']) {
      expect(screen.getByRole('button', { name: rotulo })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: '+ Adicionar do acervo' })).not.toBeInTheDocument();
    // Tocar de novo desmarca.
    await usuario.click(linha('ECA'));
    expect(subtitulo()).toBe('1 escolhido');
  });

  it('sem nenhuma escolhida, avisa; "Pronto" volta ao folheto de sempre', async () => {
    const { usuario } = await comecarAEscolher();
    await usuario.click(screen.getByRole('button', { name: 'Tirar do varal' }));
    expect(await screen.findByText('Escolha pelo menos um.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Mudar disciplina' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Pronto' }));
    expect(subtitulo()).toBe('2 · o que mais cai');
    expect(maisAcoes('LEP')).toBeInTheDocument();
  });

  it('tira as escolhidas em lote, com "Desfazer"', async () => {
    const { usuario } = await comecarAEscolher();
    await usuario.click(linha('LEP'));
    await usuario.click(linha('ECA'));
    await usuario.click(screen.getByRole('button', { name: 'Tirar do varal' }));
    expect(await screen.findByText('2 saíram do varal.')).toBeInTheDocument();
    // Tirou tudo: o folheto diz que nada foi apagado e oferece trazer de volta.
    expect(screen.getByText('Você tirou tudo do varal. Nada foi apagado.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => {
      expect(nomes()).toEqual(['LEP', 'ECA']);
    });
  });

  it('muda a disciplina de todas as escolhidas e sai do escolher', async () => {
    const { usuario, repo, ids } = await comecarAEscolher();
    await usuario.click(linha('LEP'));
    await usuario.click(linha('ECA'));
    await usuario.click(screen.getByRole('button', { name: 'Mudar disciplina' }));
    const folha = await screen.findByRole('dialog', { name: '2 escolhidos' });
    // Com várias, ninguém começa marcada: o que se escolhe vale para todas.
    expect(await within(folha).findByRole('button', { name: 'Tributário' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(folha).getByRole('button', { name: 'Outros' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await usuario.click(within(folha).getByRole('button', { name: 'Tributário' }));
    await usuario.click(within(folha).getByRole('button', { name: 'Pronto' }));
    expect(await screen.findByText('2 escolhidos agora estão em Tributário.')).toBeInTheDocument();
    await waitFor(async () => {
      expect(await disciplinasDaNorma(repo, ids['lei-a'] ?? '')).toEqual(['Tributário']);
      expect(await disciplinasDaNorma(repo, ids['lei-b'] ?? '')).toEqual(['Tributário']);
    });
    await waitFor(() => {
      expect(subtitulo()).toBe('2 · o que mais cai');
    });
  });
});

describe('mudar a disciplina de uma linha', () => {
  it('começa com as dela marcadas, junta as do app e as do acervo, e "Pronto" só vale depois de mexer', async () => {
    const { usuario, repo, ids } = await abrir();
    await screen.findByText('LEP');
    const folha = await abrirDisciplinas(usuario, 'LEP');
    const chip = (nome: string) => within(folha).getByRole('button', { name: nome });
    expect(chip('Execução Penal')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Penal')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Outros')).toHaveAttribute('aria-pressed', 'false');
    // O acervo conhece mais disciplinas que as da pessoa.
    await waitFor(() => {
      expect(within(folha).getByRole('button', { name: 'Tributário' })).toBeInTheDocument();
    });
    expect(chip('Infância e Juventude')).toBeInTheDocument();
    expect(chip('Pronto')).toBeDisabled();

    await usuario.click(chip('Penal'));
    await usuario.click(chip('Tributário'));
    expect(chip('Pronto')).toBeEnabled();
    await usuario.click(chip('Pronto'));
    expect(
      await screen.findByText('LEP agora está em Execução Penal, Tributário.'),
    ).toBeInTheDocument();
    await waitFor(async () => {
      expect(await disciplinasDaNorma(repo, ids['lei-a'] ?? '')).toEqual([
        'Execução Penal',
        'Tributário',
      ]);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('"Outros" desmarca todas', async () => {
    const { usuario, repo, ids } = await abrir();
    await screen.findByText('LEP');
    const folha = await abrirDisciplinas(usuario, 'LEP');
    await usuario.click(within(folha).getByRole('button', { name: 'Outros' }));
    expect(within(folha).getByRole('button', { name: 'Execução Penal' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await usuario.click(within(folha).getByRole('button', { name: 'Pronto' }));
    expect(await screen.findByText('LEP agora está em Outros.')).toBeInTheDocument();
    await waitFor(async () => {
      expect(await disciplinasDaNorma(repo, ids['lei-a'] ?? '')).toEqual([]);
    });
  });
});

describe('atualizar com o Planalto', () => {
  async function pedirAConferencia() {
    const c = await abrir();
    await screen.findByText('LEP');
    await c.usuario.click(maisAcoes('LEP'));
    await c.usuario.click(
      within(await screen.findByRole('dialog', { name: 'LEP' })).getByRole('button', {
        name: 'Atualizar com o Planalto',
      }),
    );
    return c;
  }

  it('texto igual ao da página oficial: só um aviso', async () => {
    vi.mocked(conferirComOPlanalto).mockResolvedValue({
      tipo: 'resultado',
      resultado: { tipo: 'igual' },
      urlOficial: OFICIAL_DA_LEP,
    });
    await pedirAConferencia();
    expect(
      await screen.findByText('LEP: o texto guardado é igual ao da página oficial.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a falha vira uma frase, sem apagar nada', async () => {
    vi.mocked(conferirComOPlanalto).mockResolvedValue({
      tipo: 'falha',
      mensagem: 'Não deu para conferir agora. A norma continua como está.',
    });
    await pedirAConferencia();
    expect(
      await screen.findByText('Não deu para conferir agora. A norma continua como está.'),
    ).toBeInTheDocument();
  });

  it('indício de alteração: a folha diz o que a página cita e leva a importar de novo', async () => {
    vi.mocked(conferirComOPlanalto).mockResolvedValue({
      tipo: 'resultado',
      resultado: {
        tipo: 'indicio',
        nota: { lei: 'Lei nº 13.964', ano: 2019 },
        registrada: { lei: 'Lei nº 12.433', ano: 2011 },
      },
      urlOficial: OFICIAL_DA_LEP,
    });
    const { usuario } = await pedirAConferencia();
    const folha = await screen.findByRole('dialog', { name: 'LEP' });
    expect(folha).toHaveTextContent(
      'A página oficial cita Lei nº 13.964, de 2019 (a versão guardada vai até Lei nº 12.433, de 2011).',
    );
    expect(folha).toHaveTextContent('O texto da norma não foi mudado');
    await usuario.click(within(folha).getByRole('button', { name: /Importar de novo/ }));
    await waitFor(() => {
      expect(rota()).toBe('/biblioteca/importar');
    });
  });
});

describe('o folheto de Súmulas e teses', () => {
  it('lista as coleções que a pessoa puxou, sem conferência nem importação', async () => {
    const { usuario } = await abrir({ rota: '/varal/sumulas' });
    expect(screen.getByRole('heading', { level: 2, name: 'Súmulas e teses' })).toBeInTheDocument();
    expect(await screen.findByText('2 súmulas')).toBeInTheDocument();
    expect(screen.getByText('2 teses')).toBeInTheDocument();
    expect(nomes().sort()).toEqual(['Súmulas STJ', 'Teses STJ']);
    expect(screen.queryByRole('button', { name: 'Importar' })).not.toBeInTheDocument();
    await usuario.click(maisAcoes('Súmulas STJ'));
    expect(
      within(await screen.findByRole('dialog', { name: 'Súmulas STJ' })).queryByRole('button', {
        name: 'Atualizar com o Planalto',
      }),
    ).not.toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await usuario.click(screen.getByRole('button', { name: '+ Adicionar do acervo' }));
    expect(rota()).toBe('/biblioteca/acervo?tipo=sumulas');
  });

  it('cada folheto guarda as suas tiradas', async () => {
    const { usuario } = await abrir({ rota: '/varal/sumulas' });
    await screen.findByText('2 súmulas');
    await usuario.click(maisAcoes('Teses STJ'));
    await usuario.click(
      within(await screen.findByRole('dialog', { name: 'Teses STJ' })).getByRole('button', {
        name: 'Tirar do varal',
      }),
    );
    await waitFor(() => {
      expect(nomes()).toEqual(['Súmulas STJ']);
    });
    expect(Object.keys(organizacaoAgora().tirados)).toEqual(['sumulas']);
  });
});

describe('o folheto vazio', () => {
  it('diz uma frase e oferece um botão, que leva ao acervo', async () => {
    const { usuario } = await abrir({ vazio: true });
    expect(
      await screen.findByText(
        'Nenhuma norma no Varal por enquanto. Puxe uma do acervo para pendurar aqui.',
      ),
    ).toBeInTheDocument();
    // Um botão só: o pé de sempre não aparece junto.
    expect(screen.queryByRole('button', { name: '+ Adicionar do acervo' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Adicionar do acervo' }));
    expect(rota()).toBe('/biblioteca/acervo?tipo=norma');
  });

  it('o das Súmulas e teses fala de súmulas', async () => {
    await abrir({ vazio: true, rota: '/varal/sumulas' });
    expect(
      await screen.findByText(
        'Nenhuma súmula ou tese no Varal por enquanto. Puxe do acervo para pendurar aqui.',
      ),
    ).toBeInTheDocument();
  });
});
