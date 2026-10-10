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

  it('lista só as publicadas; o rascunho fica na faixa, com Retomar', async () => {
    const { repo } = await repositorioDeTeste();
    await publicarVersao(repo, (await rascunho(repo, 'LEP')).id);
    const pendente = await rascunho(repo, 'ECA');
    await abrirBiblioteca(repo);

    const lista = await screen.findByRole('region', { name: 'Normas' });
    expect(within(lista).getByText('LEP')).toBeInTheDocument();
    expect(
      within(lista).getByText('Lei nº 7.210/1984 · Institui a Lei de Execução Penal.'),
    ).toBeInTheDocument();
    expect(within(lista).queryByText('ECA')).not.toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: 'Importar norma' })).toBeInTheDocument();
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
    expect(
      within(await screen.findByRole('region', { name: 'Normas' })).getByText('LEP'),
    ).toBeInTheDocument();
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );
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
});
