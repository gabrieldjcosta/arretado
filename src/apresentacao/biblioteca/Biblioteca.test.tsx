import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { gravarPosicao } from '../../dominios/legislacao/leituras';
import {
  criarRascunho,
  publicarVersao,
  rascunhosPendentes,
} from '../../dominios/legislacao/servico';
import type { ItemDoAcervo } from '../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal dos Juízes será exercida no processo de execução.'),
];

async function abrirBiblioteca(repo: Repositorio) {
  window.location.hash = '#/biblioteca';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} />);
  await screen.findByRole('heading', { level: 1, name: 'Biblioteca' });
  return usuario;
}

async function rascunho(repo: Repositorio, tituloCurto: string) {
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', tituloCurto });
  return versao;
}

/** Edital do plano com uma disciplina; o acervo de teste conhece "Execução Penal". */
async function plano(repo: Repositorio, titulo: string, disciplina: string) {
  const edital = await repo.colecao('editais').criar({ titulo, versao: 1 });
  await repo.colecao('disciplinas').criar({ nome: disciplina, editalId: edital.id });
}

const itemDoAcervo = (id: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
  nos: [
    {
      endereco: 'art1',
      categoria: 'normativo',
      tipo: 'artigo',
      rotulo: 'Art. 1º',
      status: 'vigente',
      confianca: 'alta',
      trechos: [{ texto: 'Texto.' }],
    },
  ],
});

async function abrirComAcervo(repo: Repositorio) {
  const fonte = await FonteEmMemoria.criar([
    { item: itemDoAcervo('lep'), vinculos: [{ disciplina: 'Execução Penal' }] },
  ]);
  window.location.hash = '#/biblioteca';
  render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={fonte} />);
  await screen.findByRole('heading', { level: 1, name: 'Biblioteca' });
}

/** Vincula a norma já publicada a uma disciplina do usuário. */
async function vincular(repo: Repositorio, normaId: string, nome: string) {
  const d = await repo.colecao('disciplinas').criar({ nome });
  await repo.colecao('vinculosDisciplina').criar({ normaId, disciplinaId: d.id });
}

describe('Biblioteca › Normas (9.5)', () => {
  it('vazia: "Importar norma" leva à tela de importação', async () => {
    const { repo } = await repositorioDeTeste();
    const usuario = await abrirBiblioteca(repo);

    expect(await screen.findByRole('heading', { name: 'Nenhuma norma ainda' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Importações pendentes' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Importar norma' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Importar norma' }),
    ).toBeInTheDocument();
    // A Biblioteca continua marcada na navegação.
    expect(screen.getByRole('link', { name: 'Biblioteca' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('vazio sem plano: só acervo e importar, sem botão de edital', async () => {
    const { repo } = await repositorioDeTeste();
    await abrirComAcervo(repo);

    await screen.findByRole('heading', { name: 'Nenhuma norma ainda' });
    expect(screen.getByRole('link', { name: 'Escolher no acervo' })).toHaveClass('principal');
    expect(screen.getByRole('link', { name: 'Importar norma' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tudo do edital/ })).not.toBeInTheDocument();
  });

  it('vazio com plano do edital que o acervo conhece: "Tudo do edital de <nome>"', async () => {
    const { repo } = await repositorioDeTeste();
    await plano(repo, 'DPE-SP', 'Execução Penal');
    await abrirComAcervo(repo);

    expect(await screen.findByRole('link', { name: 'Tudo do edital de DPE-SP' })).toHaveAttribute(
      'href',
      '#/biblioteca/acervo?tudo=1',
    );
    expect(screen.getByRole('link', { name: 'Escolher no acervo' })).not.toHaveClass('principal');
  });

  it('vazio com edital sem vínculo no acervo: sem botão de edital', async () => {
    const { repo } = await repositorioDeTeste();
    await plano(repo, 'Concurso próprio', 'Tributário');
    await abrirComAcervo(repo);

    await screen.findByRole('heading', { name: 'Nenhuma norma ainda' });
    expect(screen.queryByRole('link', { name: /Tudo do edital/ })).not.toBeInTheDocument();
  });

  it('lista só as publicadas; o rascunho fica na faixa, com Retomar', async () => {
    const { repo } = await repositorioDeTeste();
    await publicarVersao(repo, (await rascunho(repo, 'LEP')).id);
    const pendente = await rascunho(repo, 'ECA');
    await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    expect(within(lista).getByText('LEP')).toBeInTheDocument();
    expect(
      within(lista).getByText(
        /^Lei nº 7\.210\/1984 · Institui a Lei de Execução Penal\. · Coletada em \d{2}\/\d{2}\/\d{4}$/,
      ),
    ).toBeInTheDocument();
    expect(within(lista).queryByText('ECA')).not.toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: 'Importar norma' })).toBeInTheDocument();
    // Com normas, o caminho até o acervo continua à vista.
    expect(within(lista).getByRole('link', { name: 'Adicionar do acervo' })).toHaveAttribute(
      'href',
      '#/biblioteca/acervo?tipo=norma',
    );
    expect(within(lista).queryByRole('link', { name: /^Tudo do edital/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nenhuma norma ainda' })).not.toBeInTheDocument();

    const faixa = screen.getByRole('region', { name: 'Importações pendentes' });
    expect(faixa).toHaveTextContent('ECA: importação pendente de revisão, desde 23/09/2026');
    expect(
      within(faixa).getByRole('link', { name: 'Retomar a importação de ECA' }),
    ).toHaveAttribute('href', `#/biblioteca/importar/${pendente.id}`);
  });

  it('só rascunho: a faixa aparece acima do estado vazio', async () => {
    const { repo } = await repositorioDeTeste();
    await rascunho(repo, 'LEP');
    await abrirBiblioteca(repo);

    expect(await screen.findByRole('region', { name: 'Importações pendentes' })).toHaveTextContent(
      'LEP',
    );
    expect(screen.getByRole('heading', { name: 'Nenhuma norma ainda' })).toBeInTheDocument();
  });

  it('descartar pede confirmação, apaga o rascunho e avisa', async () => {
    const { repo } = await repositorioDeTeste();
    await rascunho(repo, 'LEP');
    await rascunho(repo, 'ECA');
    const usuario = await abrirBiblioteca(repo);

    await usuario.click(
      await screen.findByRole('button', { name: 'Descartar a importação de ECA' }),
    );
    const dialogo = screen.getByRole('dialog', { name: 'Descartar a importação de ECA?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await rascunhosPendentes(repo)).toHaveLength(2);

    await usuario.click(screen.getByRole('button', { name: 'Descartar a importação de ECA' }));
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Importação de ECA descartada.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const faixa = screen.getByRole('region', { name: 'Importações pendentes' });
    await waitFor(() => {
      expect(within(faixa).queryByText('ECA')).not.toBeInTheDocument();
    });
    expect(within(faixa).getByText('LEP')).toBeInTheDocument();
    expect((await rascunhosPendentes(repo)).map((p) => p.norma.tituloCurto)).toEqual(['LEP']);
  });

  it('descartar o que outra aba já publicou mostra o motivo e atualiza a lista', async () => {
    const { repo } = await repositorioDeTeste();
    const versao = await rascunho(repo, 'LEP');
    const usuario = await abrirBiblioteca(repo);

    await usuario.click(
      await screen.findByRole('button', { name: 'Descartar a importação de LEP' }),
    );
    await publicarVersao(repo, versao.id);
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta versão já foi publicada; não é mais rascunho.',
    );
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(
      within(await screen.findByRole('region', { name: 'Normas' })).getByText('LEP'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Importações pendentes' })).not.toBeInTheDocument();
  });

  it('"Continuar leitura" abre a norma lida por último; cada norma mostra a última leitura (9.7)', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const { norma: lep } = await publicarVersao(repo, (await rascunho(repo, 'LEP')).id);
    const { norma: eca } = await publicarVersao(repo, (await rascunho(repo, 'ECA')).id);
    await publicarVersao(repo, (await rascunho(repo, 'CP')).id);
    const primeiro = async (normaId: string) => {
      const { nos } = await abrirNorma(repo, normaId);
      return (nos.find((n) => n.dispositivo.tipo === 'artigo') ?? nos[0]!).dispositivo.id;
    };
    await gravarPosicao(repo, eca.id, await primeiro(eca.id));
    relogio.avancar(60 * 60_000);
    await gravarPosicao(repo, lep.id, await primeiro(lep.id));
    await abrirBiblioteca(repo);

    const continuar = await screen.findByRole('link', { name: 'Continuar leitura: LEP' });
    expect(continuar).toHaveAttribute('href', `#/biblioteca/normas/${lep.id}`);
    expect(continuar).toHaveClass('principal');
    // O "agora" diz onde parou e quanto falta da seção (fatia 4).
    const agora = screen.getByRole('region', { name: 'Agora' });
    expect(within(agora).getByRole('heading')).toHaveTextContent(/^Você parou no .+ da LEP$/);
    expect(agora).toHaveTextContent(/cerca de \d+ min/);
    const lista = screen.getByRole('region', { name: 'Normas' });
    // "Importar norma" deixa de ser a ação principal.
    expect(within(lista).getByRole('link', { name: 'Importar norma' })).not.toHaveClass(
      'principal',
    );
    expect(within(lista).getByRole('link', { name: /^LEP/ })).toHaveTextContent(
      'Última leitura: 23/09/2026, 10:00',
    );
    expect(within(lista).getByRole('link', { name: /^ECA/ })).toHaveTextContent(
      'Última leitura: 23/09/2026, 09:00',
    );
    expect(within(lista).getByRole('link', { name: /^CP/ })).not.toHaveTextContent(
      'Última leitura',
    );
  });

  it('sem leitura, não há "Continuar leitura" e "Importar norma" é a ação principal (9.7)', async () => {
    const { repo } = await repositorioDeTeste();
    await publicarVersao(repo, (await rascunho(repo, 'LEP')).id);
    await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    expect(within(lista).getByRole('link', { name: 'Importar norma' })).toHaveClass('principal');
    expect(screen.queryByRole('link', { name: /Continuar leitura/ })).not.toBeInTheDocument();
  });

  it('agrupa por disciplina em seções retráteis; a norma sem disciplina vai para "Outras"', async () => {
    const { repo } = await repositorioDeTeste();
    const lep = (await publicarVersao(repo, (await rascunho(repo, 'LEP')).id)).norma;
    await publicarVersao(repo, (await rascunho(repo, 'ECA')).id);
    await publicarVersao(repo, (await rascunho(repo, 'CP')).id);
    await vincular(repo, lep.id, 'Execução Penal');
    await vincular(repo, lep.id, 'Penal');
    const usuario = await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    const exec = await within(lista).findByRole('group', { name: 'Execução Penal' });
    expect(exec).toHaveAttribute('open');
    expect(within(exec).getByRole('link', { name: /^LEP/ })).toBeInTheDocument();
    // A norma em duas disciplinas aparece nas duas.
    expect(
      within(within(lista).getByRole('group', { name: 'Penal' })).getByRole('link', {
        name: /^LEP/,
      }),
    ).toBeInTheDocument();
    expect(
      within(within(lista).getByRole('group', { name: 'Outras' })).getByRole('link', {
        name: /^CP/,
      }),
    ).toBeInTheDocument();
    // Retrátil por teclado: o resumo recolhe e a escolha fica lembrada.
    const resumo = within(exec).getByText('Execução Penal').closest('summary');
    if (!resumo) throw new Error('sem resumo');
    await usuario.click(resumo);
    await waitFor(() => {
      expect(within(lista).getByRole('group', { name: 'Execução Penal' })).not.toHaveAttribute(
        'open',
      );
    });
  });

  it('com mais de 3 disciplinas os grupos começam fechados', async () => {
    const { repo } = await repositorioDeTeste();
    const nomes = ['A', 'B', 'C', 'D'];
    for (const nome of nomes) {
      const n = (await publicarVersao(repo, (await rascunho(repo, 'N' + nome)).id)).norma;
      await vincular(repo, n.id, nome);
    }
    await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    for (const nome of nomes) {
      expect(await within(lista).findByRole('group', { name: nome })).not.toHaveAttribute('open');
    }
  });

  it('busca e filtro combinam, contam e limpam', async () => {
    const { repo } = await repositorioDeTeste();
    const lep = (await publicarVersao(repo, (await rascunho(repo, 'LEP')).id)).norma;
    const eca = (await publicarVersao(repo, (await rascunho(repo, 'ECA')).id)).norma;
    await vincular(repo, lep.id, 'Execução Penal');
    await vincular(repo, eca.id, 'Infância');
    const usuario = await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    await within(lista).findByRole('link', { name: /^LEP/ });
    expect(within(lista).queryByText(/^\d+ normas?$/)).not.toBeInTheDocument();

    await usuario.type(within(lista).getByLabelText('Buscar norma'), 'zzz');
    expect(await within(lista).findByText('Nenhuma norma com esse nome.')).toBeInTheDocument();

    await usuario.click(within(lista).getByRole('button', { name: 'Limpar busca' }));
    expect(await within(lista).findByRole('link', { name: /^ECA/ })).toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: /^LEP/ })).toBeInTheDocument();

    await usuario.type(within(lista).getByLabelText('Buscar norma'), 'lep');
    expect(await within(lista).findByText('1 norma')).toBeInTheDocument();
    expect(within(lista).queryByRole('link', { name: /^ECA/ })).not.toBeInTheDocument();

    // O filtro por disciplina combina com a busca.
    await usuario.selectOptions(within(lista).getByLabelText('Disciplina'), 'Infância');
    expect(await within(lista).findByText('Nenhuma norma com esse nome.')).toBeInTheDocument();
    await usuario.click(within(lista).getByRole('button', { name: 'Limpar busca' }));
    await usuario.selectOptions(within(lista).getByLabelText('Disciplina'), 'Infância');
    expect(await within(lista).findByRole('link', { name: /^ECA/ })).toBeInTheDocument();
    expect(within(lista).queryByRole('link', { name: /^LEP/ })).not.toBeInTheDocument();
  });
});

describe('Biblioteca › Normas: itens excluídos não vazam', () => {
  it('vínculo excluído não mantém a norma no grupo da disciplina', async () => {
    const { repo } = await repositorioDeTeste();
    const lep = (await publicarVersao(repo, (await rascunho(repo, 'LEP')).id)).norma;
    await vincular(repo, lep.id, 'Execução Penal');
    for (const v of await repo.colecao('vinculosDisciplina').todosDoUsuario()) {
      await repo.colecao('vinculosDisciplina').excluir(v.id);
    }
    await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    expect(await within(lista).findByRole('group', { name: 'Outras' })).toBeInTheDocument();
    expect(within(lista).queryByRole('group', { name: 'Execução Penal' })).not.toBeInTheDocument();
  });

  it('disciplina excluída não dá nome ao grupo da norma', async () => {
    const { repo } = await repositorioDeTeste();
    const lep = (await publicarVersao(repo, (await rascunho(repo, 'LEP')).id)).norma;
    await vincular(repo, lep.id, 'Execução Penal');
    for (const d of await repo.colecao('disciplinas').todosDoUsuario()) {
      await repo.colecao('disciplinas').excluir(d.id);
    }
    await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    expect(await within(lista).findByRole('group', { name: 'Outras' })).toBeInTheDocument();
    expect(within(lista).queryByRole('group', { name: 'Execução Penal' })).not.toBeInTheDocument();
  });

  it('edital excluído não oferece "Tudo do edital"', async () => {
    const { repo } = await repositorioDeTeste();
    await plano(repo, 'DPE-SP', 'Execução Penal');
    for (const e of await repo.colecao('editais').todosDoUsuario()) {
      await repo.colecao('editais').excluir(e.id);
    }
    await abrirComAcervo(repo);

    await screen.findByRole('heading', { name: 'Nenhuma norma ainda' });
    expect(screen.queryByRole('link', { name: /Tudo do edital/ })).not.toBeInTheDocument();
  });
});
