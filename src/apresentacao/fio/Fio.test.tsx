import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { estadoInicial } from '../../dominios/fio';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';
import { gravarFio } from './dados/guardado';
import { CHAVE_DA_INTERFACE } from './interface';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições da sentença.'),
  linha('Art. 2º O prazo de recurso é de 30 (trinta) dias.'),
];

/** `comLei`: a disciplina com a lei ligada; `semLei`: só a disciplina, sem norma nenhuma. */
async function abrir(
  opcoes: { comLei?: boolean; semLei?: boolean; previa?: boolean; rota?: string } = {},
) {
  const { repo } = await repositorioDeTeste();
  if (opcoes.comLei || opcoes.semLei) {
    const disciplina = await repo.colecao('disciplinas').criar({ nome: 'Execução Penal' });
    if (opcoes.comLei) {
      const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
      const { norma } = await publicarVersao(repo, versao.id);
      await repo
        .colecao('vinculosDisciplina')
        .criar({ normaId: norma.id, disciplinaId: disciplina.id });
    }
  }
  if (opcoes.previa !== false) window.localStorage.setItem(CHAVE_DA_INTERFACE, 'fio');
  window.location.hash = opcoes.rota ?? '#/';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  return { repo, usuario };
}

/** O texto do Art. 2º na lei do teste: a conta certa do Lembrar é a que ele traz. */
const ART_2 = 'O prazo de recurso é de 30 (trinta) dias.';

afterEach(() => {
  window.localStorage.removeItem(CHAVE_DA_INTERFACE);
});

describe('o Arretado novo (prévia do Fio)', () => {
  it('desligada, abre o Hoje de sempre e as rotas novas voltam a ele', async () => {
    await abrir({ previa: false, rota: '#/destino' });
    await waitFor(() => {
      expect(window.location.hash).toBe('#/');
    });
    expect(screen.queryByRole('navigation', { name: 'Lugares' })).not.toBeInTheDocument();
  });

  it('ligada, mostra os três lugares embaixo, com o Agora aceso', async () => {
    await abrir();
    const nav = await screen.findByRole('navigation', { name: 'Lugares' });
    const lugares = within(nav).getAllByRole('button');
    expect(lugares.map((l) => l.textContent)).toEqual(['Agora', 'Destino', 'Varal']);
    expect(within(nav).getByRole('button', { name: 'Agora' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('o Agora é o do mockup: a marca leva à Conta e diz quanto da prova já é da pessoa', async () => {
    const { usuario } = await abrir({ comLei: true });
    expect(await screen.findByRole('heading', { level: 1, name: 'Agora' })).toBeInTheDocument();
    expect(screen.getByText(/da prova é seu/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'arretado: sua conta e ajustes' }));
    await waitFor(() => {
      expect(window.location.hash).toBe('#/conta');
    });
  });

  it('sem nenhuma matéria, pergunta a prova em vez de listar começos', async () => {
    await abrir();
    const convite = await screen.findByRole('group', { name: 'Para começar' });
    // O `.m-proximo` do mockup é uma grade de duas colunas; este cartão leva a classe que o põe em uma (desvio 22).
    expect(convite).toHaveClass('m-proximo', 'm-sem-prova');
    expect(within(convite).getByText('Qual é a sua prova?')).toBeInTheDocument();
    expect(within(convite).getByRole('link', { name: /Escolher minha prova/ })).toHaveAttribute(
      'href',
      '#/comecar',
    );
  });

  it('puxa o fio, lê, lembra, pousa e o Destino guarda o caminho', async () => {
    const { usuario } = await abrir({ comLei: true });

    const ponta = await screen.findByRole('group', { name: 'Na ponta do fio' });
    expect(await within(ponta).findByText(/Art/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Puxar o fio/ }));
    const cartao = await screen.findByRole('button', { name: 'Pronto, li' });
    // O Art. 2 tem destaque, então a etapa é Ler e Lembrar: o cartão diz em que passo está.
    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir no Leitor/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/biblioteca/normas/'),
    );

    await usuario.click(cartao);
    expect(await screen.findByRole('heading', { name: 'Agora sem olhar.' })).toBeInTheDocument();
    expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument();
    // Pular o Lembrar não custa nada: a etapa pousa com o que foi lido.
    await usuario.click(await screen.findByRole('button', { name: 'Pular este passo' }));
    expect(await screen.findByRole('heading', { name: /Pode descansar\.$/ })).toBeInTheDocument();
    // O pouso abre em branco; depois dele o resumo traz o assunto de cada artigo lido, para marcar.
    await usuario.type(
      screen.getByRole('textbox', { name: /O que você lembra/ }),
      'a lei do art. 2',
    );
    await usuario.click(screen.getByRole('button', { name: /Mostrar o resumo/ }));
    expect(await screen.findByText(/^Leu /)).toBeInTheDocument();
    const lista = await screen.findByRole('group', { name: 'Marque o que você lembrou' });
    const ponto = within(lista).getAllByRole('button')[0] as HTMLElement;
    expect(ponto).toHaveAttribute('aria-pressed', 'false');
    await usuario.click(ponto);
    expect(ponto).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Você trouxe 1 de \d+ de memória\./)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Puxar o fio: seguir/ }));
    await screen.findByRole('group', { name: 'Na ponta do fio' });

    await usuario.click(
      within(screen.getByRole('navigation', { name: 'Lugares' })).getByRole('button', {
        name: 'Destino',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Seu caminho até aqui' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 etapa pousada/)).toBeInTheDocument();
    // O mapa vem num pedaço à parte; a lista dos pousos fica à mão, em palavras.
    expect(
      await screen.findByRole('group', { name: 'Mapa do caminho pelo Nordeste' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Seus pousos, em palavras')).toBeInTheDocument();
  });

  it('"Pronto, li" avisa "Feito" e o "Desfazer" devolve o cartão', async () => {
    const { usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxar o fio/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Pronto, li' }));
    expect(await screen.findByRole('heading', { name: 'Agora sem olhar.' })).toBeInTheDocument();
    expect(screen.getByText('Feito')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByRole('button', { name: 'Pronto, li' })).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Desfeito')).toBeInTheDocument();
  });

  it('errar o Lembrar mostra a Frase certa e guarda com um toque, sem passo Guardar depois', async () => {
    const { repo, usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxar o fio/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Pronto, li' }));

    const contas = within(await screen.findByRole('group', { name: 'Escolha o que a lei diz' }));
    // A conta certa é a que a lei traz; qualquer outra erra.
    const errada = contas.getAllByRole('button').find((b) => !ART_2.includes(b.textContent));
    expect(errada).toBeDefined();
    await usuario.click(errada as HTMLElement);
    expect(await screen.findByText(/a Frase certa, tirada da lei/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Guardar e seguir' }));
    expect(await screen.findByRole('heading', { name: /Pode descansar\.$/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Pular' }));
    expect(screen.getByText(/Lembrou 0 de 1, guardou 1 Frase/)).toBeInTheDocument();
    // A Frase já foi guardada pelo cartão: o aviso não oferece desfazer e nenhum passo Guardar vem depois.
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
    await waitFor(async () => {
      expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(1);
    });
  });

  it('o Destino sem etapa pousada mostra o mapa e convida a puxar o fio no Agora', async () => {
    await abrir({ comLei: true, rota: '#/destino' });
    expect(
      await screen.findByRole('heading', { name: 'O caminho começa aqui' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir ao Agora/ })).toHaveAttribute('href', '#/');
    expect(
      await screen.findByRole('group', { name: 'Mapa do caminho pelo Nordeste' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Legenda do mapa' })).toBeInTheDocument();
    // Sem pouso nenhum, não há lista de pousos para abrir.
    expect(screen.queryByText('Seus pousos, em palavras')).not.toBeInTheDocument();
  });

  it('sem a lei da matéria, o Destino mantém o número, agora das etapas, e diz o que falta', async () => {
    const { repo } = await abrir({ semLei: true, rota: '#/destino' });
    gravarFio(repo.ctx.usuarioId, {
      estado: { ...estadoInicial(), etapasFeitas: 20, passosDados: 61 },
      marcas: {},
    });
    expect(
      await screen.findByRole('heading', { name: 'Seu caminho até aqui' }),
    ).toBeInTheDocument();
    await screen.findByRole('group', { name: 'Mapa do caminho pelo Nordeste' });
    expect(document.querySelector('.fio-numero')).toHaveTextContent('20 etapas');
    expect(screen.getByText(/pousadas no caminho, com 61 passos dados\./)).toBeInTheDocument();
    expect(screen.getByText(/Quando Execução Penal tiver a lei no app/)).toBeInTheDocument();
  });

  it('pular um passo não custa nada e não deixa fato', async () => {
    const { usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxar o fio/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Pular este passo' }));
    expect(await screen.findByRole('heading', { name: /Pode descansar\.$/ })).toBeInTheDocument();
    expect(screen.getByText('Você deu esse passo. Amanhã tem mais.')).toBeInTheDocument();
    // Sem fato, o pouso não fala em falha nem em pendência.
    expect(screen.queryByText(/sem deixar fato|não fez|faltou/i)).not.toBeInTheDocument();
  });

  it('o pouso é uma cena: o lugar da vereda, a pílula do pouso e as duas saídas', async () => {
    const { usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxar o fio/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Pular este passo' }));

    expect(
      await screen.findByRole('heading', { name: 'Sombra de juazeiro. Pode descansar.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pouso 1 · Juazeiro')).toBeInTheDocument();
    // A cena é desenho (some para o leitor de tela) e leva o nome do lugar.
    expect(document.querySelector('svg.m-cena')).toHaveAttribute('data-lugar', 'Juazeiro');
    expect(document.querySelector('svg.m-cena')).toHaveAttribute('aria-hidden', 'true');
    const pilulas = within(screen.getByRole('group', { name: 'Pousos da vereda' })).getAllByRole(
      'button',
    );
    expect(pilulas.map((p) => p.getAttribute('aria-label'))).toEqual([
      'Juazeiro: pouso 1, cacto com 1 flor',
    ]);
    expect(pilulas[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Descansar por hoje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Puxar o fio: seguir/ })).toBeInTheDocument();
    // A saída é o fio ou descansar: a pílula dos três lugares some enquanto o pouso dura.
    expect(screen.queryByRole('navigation', { name: 'Lugares' })).not.toBeInTheDocument();
  });

  it('o pouso abre em branco: escreve e mostra o resumo, sem lista quando a etapa não leu artigo', async () => {
    const { repo, usuario } = await abrir({ comLei: true });
    gravarFio(repo.ctx.usuarioId, {
      estado: {
        ...estadoInicial(),
        etapasFeitas: 1,
        passosDados: 2,
        etapa: {
          numero: 1,
          materiaId: 'm',
          materia: 'Execução Penal',
          passos: [
            { tipo: 'lembrar', materiaId: 'm', normaId: 'n', tituloCurto: 'LEP', artigos: [] },
          ],
          fechados: [{ como: 'feito', resultado: { tipo: 'lembrar', acertos: 2, erros: ['x'] } }],
        },
        pousos: [{ etapa: 0, materia: 'Execução Penal', fatos: ['Lembrou 2 de 3'] }],
      },
      marcas: {},
    });
    window.location.hash = '#/fio/pouso';

    // Antes do resumo: a página em branco. Os fatos e as pílulas ainda não aparecem.
    const campo = await screen.findByRole('textbox', { name: /O que você lembra desta etapa/ });
    expect(screen.queryByText('Lembrou 2 de 3.')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pousos da vereda' })).not.toBeInTheDocument();
    await usuario.type(campo, 'a pena e o regime');
    await usuario.click(screen.getByRole('button', { name: /Mostrar o resumo/ }));

    // O resumo chega com a frase de sempre; esta etapa não leu artigo, então não há o que marcar.
    expect(await screen.findByText('Lembrou 2 de 3.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Marque o que você lembrou' }),
    ).not.toBeInTheDocument();
  });

  it('as pílulas mostram só os pousos da volta e trocam a cena, o título e os fatos', async () => {
    const { repo, usuario } = await abrir({ comLei: true });
    // Três pousos: o de agora (o açude, 3 flores) e os dois que vieram antes na mesma volta.
    gravarFio(repo.ctx.usuarioId, {
      estado: {
        ...estadoInicial(),
        etapasFeitas: 2,
        passosDados: 5,
        etapa: {
          numero: 2,
          materiaId: 'm',
          materia: 'Execução Penal',
          passos: [
            { tipo: 'lembrar', materiaId: 'm', normaId: 'n', tituloCurto: 'LEP', artigos: [] },
          ],
          fechados: [{ como: 'feito', resultado: { tipo: 'lembrar', acertos: 2, erros: ['x'] } }],
        },
        pousos: [
          { etapa: 1, materia: 'Execução Penal', fatos: ['Guardou 1 Frase'] },
          { etapa: 0, materia: 'Execução Penal', fatos: ['Leu o art. 1 (LEP)'] },
        ],
      },
      marcas: {},
    });
    window.location.hash = '#/fio/pouso';

    expect(
      await screen.findByRole('heading', { name: 'Água no açude. Pode descansar.' }),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Pular' }));
    expect(screen.getByText('Lembrou 2 de 3.')).toBeInTheDocument();
    const grupo = screen.getByRole('group', { name: 'Pousos da vereda' });
    expect(
      within(grupo)
        .getAllByRole('button')
        .map((p) => p.getAttribute('aria-label')),
    ).toEqual([
      'Juazeiro: pouso 1, cacto com 1 flor',
      'Carcará: pouso 2, cacto com 2 flores',
      'Açude: pouso 3, cacto com 3 flores',
    ]);
    expect(within(grupo).getByRole('button', { name: /^Açude/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await usuario.click(within(grupo).getByRole('button', { name: /^Carcará/ }));
    expect(
      screen.getByRole('heading', { name: 'O carcará passou. Pode descansar.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pouso 2 · Carcará')).toBeInTheDocument();
    expect(screen.getByText('Guardou 1 Frase.')).toBeInTheDocument();
    expect(screen.queryByText('Lembrou 2 de 3.')).not.toBeInTheDocument();
    expect(document.querySelector('svg.m-cena')).toHaveAttribute('data-lugar', 'Carcará');
    expect(within(grupo).getByRole('button', { name: /^Carcará/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(grupo).getByRole('button', { name: /^Açude/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('"descansar" conta a etapa e o Agora diz que está tudo salvo', async () => {
    const { usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxar o fio/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Pular este passo' }));
    await usuario.click(await screen.findByRole('button', { name: 'Descansar por hoje' }));

    expect(await screen.findByText('Tudo salvo. O fio te espera aqui.')).toBeInTheDocument();
    await screen.findByRole('group', { name: 'Na ponta do fio' });
    await usuario.click(
      within(screen.getByRole('navigation', { name: 'Lugares' })).getByRole('button', {
        name: 'Destino',
      }),
    );
    expect(await screen.findByText(/1 etapa pousada/)).toBeInTheDocument();
  });

  it('pausar volta ao Agora, diz que está tudo salvo e o passo espera', async () => {
    const { usuario } = await abrir({ comLei: true });
    await usuario.click(await screen.findByRole('button', { name: /Puxar o fio/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Pausar: tudo fica salvo' }));

    const aviso = await screen.findByText('Tudo salvo. O fio te espera aqui.');
    expect(aviso.closest('[role="status"]')).not.toBeNull();
    // O passo continua aberto: o fio convida a continuar, sem cobrar nada.
    expect(screen.getByText('Puxe para continuar')).toBeInTheDocument();
    expect(screen.queryByText(/parou/i)).not.toBeInTheDocument();
  });

  it('o Varal tem dois varais de folhetos e leva às coisas da pessoa', async () => {
    const { usuario } = await abrir();
    await usuario.click(await screen.findByRole('button', { name: 'Varal' }));
    expect(await screen.findByRole('heading', { name: /pendurado no fio/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^Normas/ })).toHaveAttribute('href', '#/biblioteca');
    });
    expect(screen.getByRole('link', { name: /^Frases/ })).toHaveAttribute(
      'href',
      '#/recall/frases',
    );
  });

  it('a Conta liga e desliga a prévia', async () => {
    const { usuario } = await abrir({ previa: false, rota: '#/conta' });
    await usuario.click(await screen.findByRole('button', { name: 'Experimentar' }));
    expect(await screen.findByRole('navigation', { name: 'Lugares' })).toBeInTheDocument();
    await usuario.click(await screen.findByRole('button', { name: 'Voltar ao de sempre' }));
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'Lugares' })).not.toBeInTheDocument();
    });
  });
});
