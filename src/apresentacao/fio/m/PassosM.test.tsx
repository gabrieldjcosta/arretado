import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import type { Bloco } from '../../../core/seguranca/sanitizador';
import type { Passo, ResultadoDoPasso } from '../../../dominios/fio';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { criarTarefa } from '../../../dominios/tarefas';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { lerCausas } from '../dados/causas';
import { AcheADiferencaM } from './AcheADiferencaM';
import { ToastM } from './ToastM';
import { LembrarM } from './LembrarM';
import { GuardarM, PraticarM, RevisarM, SeuPassoM } from './OutrosPassosM';
import type { PropsDoPassoM } from './passo-tipos';

afterEach(cleanup);

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
  linha('Dispõe sobre o teste.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha(
    'Art. 1º A medida será reavaliada no prazo de 30 (trinta) dias, salvo decisão em contrário.',
  ),
  linha(
    'Art. 2º A internação não excederá o prazo de 3 (três) anos, nunca por tempo indeterminado.',
  ),
  linha('Art. 3º O recurso será interposto em 5 (cinco) dias, exceto nos casos de lei.'),
  linha('Art. 4º O pedido será decidido em até 10 (dez) dias úteis, sempre que houver urgência.'),
];
const ARTIGOS = ['art1', 'art2', 'art3', 'art4'].map((endereco, i) => ({
  endereco,
  rotulo: `Art. ${String(i + 1)}`,
}));
const TEXTO_DA_LEI = LEI.map((b) => b.trechos[0]?.texto ?? '').join('\n');

async function montar(): Promise<{ repo: Repositorio; normaId: string }> {
  const { repo } = await repositorioDeTeste();
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
  const { norma } = await publicarVersao(repo, versao.id);
  return { repo, normaId: norma.id };
}

function com(repo: Repositorio, filho: ReactNode) {
  return render(
    <MemoryRouter>
      <ContextoRepositorio.Provider value={repo}>
        {filho}
        <ToastM />
      </ContextoRepositorio.Provider>
    </MemoryRouter>,
  );
}

/** As props que o `PassoM` dá a cada tela de passo; o teste só troca o que importa a ele. */
function props<P extends Passo>(
  passo: P,
  extra: Partial<PropsDoPassoM<P>> = {},
): PropsDoPassoM<P> & {
  aoConcluir: ReturnType<typeof vi.fn<(r: ResultadoDoPasso) => void>>;
  aoPular: ReturnType<typeof vi.fn<() => void>>;
} {
  return {
    passo,
    d: { titulo: 'Titulo do passo', apoio: 'Apoio do passo' },
    materia: 'Execução Penal',
    semente: 3,
    trilho: { feitos: 0, nos: 3, animarNovo: false },
    aoConcluir: vi.fn<(r: ResultadoDoPasso) => void>(),
    aoPular: vi.fn<() => void>(),
    aoPausar: vi.fn<() => void>(),
    ...extra,
  } as never;
}

const grupoDaPergunta = () =>
  screen.findByRole('group', { name: /Escolha o que a lei diz|Esta frase está como na lei\?/ });

describe('LembrarM', () => {
  const passo = (
    artigos: typeof ARTIGOS,
    normaId: string,
  ): Extract<Passo, { tipo: 'lembrar' }> => ({
    tipo: 'lembrar',
    materiaId: 'm',
    normaId,
    tituloCurto: 'Lei',
    artigos,
  });

  it('pergunta um artigo por vez no mesmo cartão, soma acertos e erros e guarda a Frase de quem errou', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(ARTIGOS.slice(0, 2), normaId));
    com(repo, <LembrarM {...p} />);

    expect(await screen.findByText('Lembrar · 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agora sem olhar.' })).toBeInTheDocument();
    for (const vez of [1, 2]) {
      if (vez === 2) await screen.findByText('Lembrar · 2 de 2');
      // Responde com a primeira conta (ou a primeira pílula): a que cair, o cartão confere.
      const grupo = await grupoDaPergunta();
      await usuario.click(within(grupo).getAllByRole('button')[0] as HTMLElement);
      await usuario.click(
        await screen.findByRole('button', { name: /^(Seguir|Guardar e seguir)$/ }),
      );
    }

    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledTimes(1);
    });
    const r = p.aoConcluir.mock.calls[0]?.[0];
    expect(r?.tipo).toBe('lembrar');
    if (r?.tipo !== 'lembrar') return;
    expect(r.acertos + r.erros.length).toBe(2);
    for (const e of r.erros) expect(['art1', 'art2']).toContain(e);
    // Quem errou teve a Frase certa guardada pelo próprio cartão, e o resultado diz quais.
    expect(r.guardados ?? []).toEqual(r.erros);
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(r.erros.length);
    expect(p.aoPular).not.toHaveBeenCalled();
  });

  it('o título "Agora sem olhar." é o mesmo nó enquanto a pergunta chega: não é refeito', async () => {
    const { repo, normaId } = await montar();
    const p = props(passo(ARTIGOS.slice(0, 1), normaId));
    com(repo, <LembrarM {...p} />);

    // O título é do cartão, e não de cada pergunta: já está na tela quando a lei ainda carrega e fica o mesmo quando a
    // pergunta chega. Se fosse refeito, quem o achasse antes do fim da carga (um leitor de tela, um teste) ficaria com um
    // nó solto: `toBeInTheDocument` reprovava no CI, que carrega mais devagar, e passava aqui.
    const titulo = screen.getByRole('heading', { name: 'Agora sem olhar.' });
    await grupoDaPergunta();
    expect(titulo).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agora sem olhar.' })).toBe(titulo);
  });

  it('na lacuna, a conta certa fecha a lei e a errada mostra a Frase certa, tirada da lei', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(ARTIGOS.slice(0, 1), normaId));
    com(repo, <LembrarM {...p} />);

    const grupo = within(await screen.findByRole('group', { name: 'Escolha o que a lei diz' }));
    const contas = grupo.getAllByRole('button');
    expect(contas.length).toBeGreaterThanOrEqual(2);
    const errada = contas.find((b) => !TEXTO_DA_LEI.includes(b.textContent)) as HTMLElement;
    await usuario.click(errada);
    // Escolhida a conta, as outras param de responder e a Frase certa aparece com a fonte.
    for (const conta of contas) expect(conta).toBeDisabled();
    expect(await screen.findByText(/a Frase certa, tirada da lei/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar e seguir' })).toBeInTheDocument();
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);

    await usuario.click(screen.getByRole('button', { name: 'Guardar e seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledTimes(1);
    });
    expect(p.aoConcluir).toHaveBeenCalledWith({
      tipo: 'lembrar',
      acertos: 0,
      erros: ['art1'],
      guardados: ['art1'],
    });
    const [frase] = await repo.colecao('frases').todosDoUsuario();
    expect(TEXTO_DA_LEI).toContain(frase?.texto ?? '#');

    // Depois de guardar, o aviso oferece "errei porque…"; um toque anota a causa neste aparelho, sem obrigar nada.
    const porque = await screen.findByRole('group', { name: 'Errei porque' });
    await usuario.click(within(porque).getByRole('button', { name: 'confundi com outro artigo' }));
    expect(await screen.findByText('Anotado')).toBeInTheDocument();
    expect(lerCausas(repo.ctx.usuarioId)).toEqual({ [frase?.id ?? '#']: 'confusao' });
  });

  it('na lacuna, acertar não guarda nada e o resultado não leva `guardados`', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(ARTIGOS.slice(0, 1), normaId));
    com(repo, <LembrarM {...p} />);

    const grupo = within(await screen.findByRole('group', { name: 'Escolha o que a lei diz' }));
    const certa = grupo
      .getAllByRole('button')
      .find((b) => TEXTO_DA_LEI.includes(b.textContent)) as HTMLElement;
    await usuario.click(certa);
    expect(await screen.findByText(/^Isso\. É /)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledTimes(1);
    });
    expect(p.aoConcluir).toHaveBeenCalledWith({ tipo: 'lembrar', acertos: 1, erros: [] });
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);
  });

  it('antes de responder, quem não arrasta o cartão pula pelo botão que o teclado alcança', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(ARTIGOS.slice(0, 1), normaId));
    com(repo, <LembrarM {...p} />);

    await usuario.click(await screen.findByRole('button', { name: 'Pular este passo' }));
    await waitFor(() => {
      expect(p.aoPular).toHaveBeenCalledTimes(1);
    });
    expect(p.aoConcluir).not.toHaveBeenCalled();
  });

  it('o cartão diz em que passo está (o trilho é só desenho)', async () => {
    const { repo, normaId } = await montar();
    const p = props(passo(ARTIGOS.slice(0, 1), normaId), {
      trilho: { feitos: 1, nos: 4, animarNovo: false },
    });
    com(repo, <LembrarM {...p} />);
    expect(await screen.findByText('Passo 2 de 3')).toBeInTheDocument();
    expect(document.querySelector('.m-trilho')).toHaveAttribute('aria-hidden', 'true');
  });

  it('artigo sem pergunta possível: Seguir conta como pular', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo([], normaId));
    com(repo, <LembrarM {...p} />);
    expect(await screen.findByText('Nada para lembrar neste passo.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoPular).toHaveBeenCalledTimes(1);
    });
    expect(p.aoConcluir).not.toHaveBeenCalled();
  });
});

describe('GuardarM', () => {
  const passo = (normaId: string): Extract<Passo, { tipo: 'guardar' }> => ({
    tipo: 'guardar',
    materiaId: 'm',
    normaId,
    enderecos: ['art1'],
  });

  it('guarda a Frase com um toque, ligada ao dispositivo da lei', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(normaId), { semente: 5 });
    com(repo, <GuardarM {...p} />);

    await usuario.click(await screen.findByRole('button', { name: 'Guardar esta Frase' }));
    expect(await screen.findByText(/Frase guardada/)).toBeInTheDocument();
    const frases = await repo.colecao('frases').todosDoUsuario();
    expect(frases).toHaveLength(1);
    expect(frases[0]?.origemTipo).toBe('trecho');
    expect(frases[0]?.trecho?.dispositivoId).toBeDefined();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith({ tipo: 'guardar', guardadas: 1 });
    });
  });

  it('dá para seguir sem guardar nada', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(normaId), { semente: 5 });
    com(repo, <GuardarM {...p} />);

    await usuario.click(await screen.findByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith({ tipo: 'guardar', guardadas: 0 });
    });
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);
  });
});

describe('PraticarM (porteira)', () => {
  const passo: Extract<Passo, { tipo: 'praticar' }> = {
    tipo: 'praticar',
    materiaId: 'm',
    modo: 'porteira',
    quantidade: 3,
    porque: 'fim_do_mapa',
  };

  it('três cartões no deque; ao fim, a porteira abre e os que escaparam viram Frase com um toque', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo, { semente: 2 });
    com(repo, <PraticarM {...p} alvo={{ normaId, artigos: ARTIGOS }} />);

    expect(await screen.findByRole('heading', { name: 'Certo ou errado?' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelectorAll('.m-deque .m-cd')).toHaveLength(3);
    });
    // Enquanto o deque anda, o cartão só se pula; "Seguir" chega com a porteira aberta.
    expect(screen.getByRole('button', { name: 'Pular este passo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();

    // Diz "Certo" a todos: acerta o cartão certo e erra os trocados.
    for (let i = 0; i < 3; i++) {
      await usuario.click(await screen.findByRole('button', { name: 'Certo' }));
    }
    expect(await screen.findByText('A porteira abriu.')).toBeInTheDocument();
    expect(screen.getByText(/1 de 3 de primeira; o que escapou vira Frase/)).toBeInTheDocument();
    // Errar não grava nada sozinho.
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);

    await usuario.click(screen.getByRole('button', { name: 'Guardar as Frases' }));
    expect(await screen.findByRole('button', { name: 'Guardada no varal' })).toBeInTheDocument();
    const frases = await repo.colecao('frases').todosDoUsuario();
    expect(frases).toHaveLength(2);
    // É sempre a Frase certa da lei, nunca a frase trocada que o deque mostrou.
    for (const f of frases) expect(TEXTO_DA_LEI).toContain(f.texto);

    expect(screen.queryByRole('button', { name: 'Pular este passo' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith({ tipo: 'praticar', acertos: 1, total: 3 });
    });
  });

  it('modo Ache o erro, que ainda não tem tela no quadro: diz que não há o que praticar e Seguir pula', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props({ ...passo, modo: 'ache_o_erro' }, { semente: 2 });
    com(repo, <PraticarM {...p} alvo={{ normaId, artigos: ARTIGOS }} />);

    expect(await screen.findByText('Nada para praticar aqui.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoPular).toHaveBeenCalledTimes(1);
    });
    expect(p.aoConcluir).not.toHaveBeenCalled();
  });

  it('matéria sem leitura: a porteira não tem de onde perguntar e deixa seguir', async () => {
    const { repo } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo, { semente: 2 });
    com(repo, <PraticarM {...p} alvo={{ normaId: '', artigos: [] }} />);

    expect(await screen.findByText('Nada para praticar aqui.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoPular).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RevisarM e SeuPassoM', () => {
  it('Revisar leva à revisão com a quantidade, e "Já revisei" fecha o passo com a contagem', async () => {
    const { repo } = await montar();
    const usuario = userEvent.setup();
    const p = props<Extract<Passo, { tipo: 'revisar' }>>({
      tipo: 'revisar',
      materiaId: 'm',
      quantidade: 4,
    });
    com(repo, <RevisarM {...p} />);

    expect(screen.getByRole('link', { name: /Revisar agora/ })).toHaveAttribute(
      'href',
      '/recall/revisar?itens=4',
    );
    await usuario.click(screen.getByRole('button', { name: 'Já revisei' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith({
        tipo: 'revisar',
        revisados: 4,
        voltamAmanha: 0,
      });
    });
  });

  it('"Fiz" conclui a tarefa da pessoa e fecha o passo', async () => {
    const { repo } = await montar();
    const usuario = userEvent.setup();
    const tarefa = await criarTarefa(repo, { titulo: 'Fazer 10 questões de LEP' });
    const p = props<Extract<Passo, { tipo: 'seu_passo' }>>(
      {
        tipo: 'seu_passo',
        tarefaId: tarefa.id,
        titulo: tarefa.titulo,
      } as Extract<Passo, { tipo: 'seu_passo' }>,
      { d: { titulo: 'Fazer 10 questões de LEP', apoio: 'Um passo seu' } },
    );
    com(repo, <SeuPassoM {...p} />);

    expect(screen.getByRole('heading', { name: 'Fazer 10 questões de LEP' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Fiz' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith({ tipo: 'seu_passo' });
    });
    const feita = await repo.colecao('tarefasDeEstudo').obter(tarefa.id);
    expect(feita?.estado).toBe('feita');
  });
});

describe('AcheADiferencaM', () => {
  const passo = (normaId: string): Extract<Passo, { tipo: 'ache_a_diferenca' }> => ({
    tipo: 'ache_a_diferenca',
    materiaId: 'm',
    normaId,
    tituloCurto: 'Lei',
    a: { endereco: 'art1', rotulo: 'Art. 1' },
    b: { endereco: 'art3', rotulo: 'Art. 3' },
  });

  it('põe os dois artigos lado a lado; tocar em palavra igual não custa nada e só as diferentes se grifam', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(normaId));
    const { container } = com(repo, <AcheADiferencaM {...p} />);

    expect(
      await screen.findByRole('heading', { name: 'Os dois se parecem. O que muda?' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-lado]')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();

    // "será" está nos dois artigos: tocar nele só o apaga um pouco, sem punição.
    await usuario.click(screen.getAllByText('será')[0] as HTMLElement);
    expect(screen.getAllByText('será')[0]).toHaveClass('m-tentou');
    expect(
      await screen.findByText('Essa está igual nos dois. Procure de novo.'),
    ).toBeInTheDocument();

    const diferentes = Array.from(container.querySelectorAll<HTMLElement>('.m-diverge'));
    expect(diferentes.length).toBeGreaterThan(1);
    for (const d of diferentes) await usuario.click(d);
    expect(container.querySelectorAll('.m-achada')).toHaveLength(diferentes.length);
    await usuario.click(await screen.findByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith({
        tipo: 'ache_a_diferenca',
        achadas: diferentes.length,
        total: diferentes.length,
      });
    });
  });

  it('"Mostrar a diferença" grifa o que faltou e deixa seguir, sem contar como achado', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const p = props(passo(normaId));
    const { container } = com(repo, <AcheADiferencaM {...p} />);

    await usuario.click(await screen.findByRole('button', { name: 'Mostrar a diferença' }));
    expect(container.querySelectorAll('.m-mostrada').length).toBeGreaterThan(0);
    expect(screen.getByText('A diferença está grifada.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => {
      expect(p.aoConcluir).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'ache_a_diferenca', achadas: 0 }),
      );
    });
  });

  it('artigo que sumiu da norma: diz isso e deixa seguir', async () => {
    const { repo, normaId } = await montar();
    const p = props({ ...passo(normaId), b: { endereco: 'art99', rotulo: 'Art. 99' } });
    com(repo, <AcheADiferencaM {...p} />);
    expect(
      await screen.findByText('Não deu para pôr estes dois artigos lado a lado.'),
    ).toBeInTheDocument();
  });
});
