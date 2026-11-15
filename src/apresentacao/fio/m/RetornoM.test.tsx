import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { registrarBackup } from '../../../core/persistencia';
import type { Repositorio } from '../../../core/persistencia';
import { alterarPreferencias } from '../../../core/preferencias';
import { aderirAoItem } from '../../../dominios/acervo/adesao';
import { atualizarItem } from '../../../dominios/acervo/atualizacao';
import type { ItemDoAcervo, NoDoItem } from '../../../dominios/acervo/esquemas';
import type { FonteDoAcervo } from '../../../dominios/acervo/fonte';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import { registrarErro } from '../../../dominios/recall/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { ContextoFonteAcervo } from '../../dados/fonteAcervoContexto';
import { RetornoM } from './RetornoM';

const estado = vi.hoisted(() => ({ pronta: false, aplicar: vi.fn() }));
vi.mock('../../../offline/registro', () => ({
  useAtualizacaoPronta: () => estado.pronta,
  aplicarAtualizacao: estado.aplicar,
}));

const DIA = 24 * 60 * 60_000;

const no = (texto: string): NoDoItem => ({
  endereco: 'art180',
  categoria: 'normativo',
  tipo: 'artigo',
  rotulo: 'Art. 180',
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
});
const item = (versao: number, texto: string): ItemDoAcervo => ({
  id: 'cp',
  versao,
  norma: { tituloCurto: 'CP', tipo: 'Decreto-Lei', esfera: 'federal' },
  nos: [no(texto)],
});

async function montar(repo: Repositorio, fonte?: FonteDoAcervo) {
  const vazia = fonte ?? (await FonteEmMemoria.criar([]));
  render(
    <ContextoRepositorio.Provider value={repo}>
      <ContextoFonteAcervo.Provider value={vazia}>
        <MemoryRouter>
          <RetornoM />
        </MemoryRouter>
      </ContextoFonteAcervo.Provider>
    </ContextoRepositorio.Provider>,
  );
  return userEvent.setup();
}

/** Espera a leitura do Aparelho terminar: sem isto, "não aparece" passaria antes de os dados chegarem. */
const lido = (repo: Repositorio) =>
  waitFor(async () => {
    await repo.colecao('erros').contar();
  });

describe('RetornoM: a linha de retorno do Agora (desvio 476)', () => {
  beforeEach(() => {
    localStorage.clear();
    estado.pronta = false;
    estado.aplicar.mockClear();
  });
  afterEach(cleanup);

  it('sem nada a dizer, não há linha', async () => {
    const { repo } = await repositorioDeTeste();
    await montar(repo);
    await lido(repo);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('com dados e sem backup, lembra, leva aos dados e o "Depois" dispensa por dias', async () => {
    const { repo } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    const usuario = await montar(repo);
    const linha = await screen.findByRole('status');
    expect(linha).toHaveTextContent('Você ainda não fez backup.');
    expect(within(linha).getByRole('link', { name: 'Fazer agora' })).toHaveAttribute(
      'href',
      '/conta/dados',
    );
    await usuario.click(within(linha).getByRole('button', { name: 'Depois' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem('arretado.lembreteBackup.ate')).not.toBeNull();
  });

  it('backup antigo diz há quantos dias; a linha não cobra nem assusta', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    await registrarBackup(repo);
    relogio.avancar(9 * DIA);
    await montar(repo);
    const linha = await screen.findByRole('status');
    expect(linha).toHaveTextContent('Faz 9 dias do último backup.');
    expect(linha.textContent).not.toMatch(/atrasad|pendente|dívida|urgente|perd/i);
  });

  it('a versão nova vem antes do backup; "Atualizar" aplica e "Depois" passa a vez', async () => {
    estado.pronta = true;
    const { repo } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    const usuario = await montar(repo);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Uma versão nova do Arretado está pronta.',
      );
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(estado.aplicar).toHaveBeenCalledOnce();
    await usuario.click(screen.getByRole('button', { name: 'Depois' }));
    expect(screen.getByRole('status')).toHaveTextContent('Você ainda não fez backup.');
  });

  it('a lei mudou onde a pessoa guardou algo: diz a norma e leva a ela', async () => {
    const { repo } = await repositorioDeTeste();
    const f1 = await FonteEmMemoria.criar([{ item: item(1, 'Reclusão de um a quatro anos.') }]);
    const f2 = await FonteEmMemoria.criar([{ item: item(2, 'Reclusão de 2 a 6 anos.') }]);
    const [e1] = (await f1.listar()).itens;
    const [e2] = (await f2.listar()).itens;
    if (!e1 || !e2) throw new Error('índice vazio');
    const adesao = await aderirAoItem(repo, f1, e1);
    if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
    const [d] = await repo.colecao('dispositivos').todosDoUsuario();
    await repo.colecao('estrelas').criar({
      normaId: adesao.normaId,
      alvoId: d?.id ?? '',
      origemTipo: 'direta',
    });
    await atualizarItem(repo, f2, e2);

    await montar(repo, f2);
    const linha = await screen.findByRole('status');
    expect(linha).toHaveTextContent('CP: o texto mudou em 1 dispositivo em que você guardou algo.');
    expect(linha.textContent).not.toMatch(/atrasad|pendente|dívida/i);
    expect(within(linha).getByRole('link', { name: 'Ver o que mudou em CP' })).toHaveAttribute(
      'href',
      `/biblioteca/normas/${adesao.normaId}`,
    );
  });

  it('a lei que mudou também tem "Depois": passa a vez ao Lembrete nesta visita', async () => {
    const { repo } = await repositorioDeTeste();
    const f1 = await FonteEmMemoria.criar([{ item: item(1, 'Reclusão de um a quatro anos.') }]);
    const f2 = await FonteEmMemoria.criar([{ item: item(2, 'Reclusão de 2 a 6 anos.') }]);
    const [e1] = (await f1.listar()).itens;
    if (!e1) throw new Error('índice vazio');
    const adesao = await aderirAoItem(repo, f1, e1);
    if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
    await alterarPreferencias(repo, { lembrete: 'Ligar para a secretaria.' });

    // O acervo tem texto novo de uma norma da pessoa, e ela não quer atualizar agora.
    const usuario = await montar(repo, f2);
    const linha = await screen.findByRole('status');
    await waitFor(() => {
      expect(linha).toHaveTextContent('CP: o acervo tem texto novo.');
    });
    expect(screen.queryByText(/Ligar para a secretaria/)).toBeNull();
    await usuario.click(within(linha).getByRole('button', { name: 'Depois' }));
    expect(screen.getByRole('status')).toHaveTextContent('Lembrete: Ligar para a secretaria.');
  });

  it('o Lembrete escrito fora do Agora aparece já na volta: a leitura guardada da visita anterior não trava a linha', async () => {
    const { repo } = await repositorioDeTeste();
    await montar(repo);
    await lido(repo);
    // A leitura desta visita chegou sem nada a dizer e ficou guardada.
    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });
    await new Promise((resolver) => setTimeout(resolver, 50));
    cleanup();

    // No Varal a pessoa escreve o Lembrete e volta ao Agora, que monta de novo.
    await alterarPreferencias(repo, { lembrete: 'Ligar para a secretaria.' });
    await montar(repo);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Lembrete: Ligar para a secretaria.',
    );
  });

  it('o Lembrete aparece por último, só com o começo, e "Abrir" mostra a nota inteira', async () => {
    const { repo } = await repositorioDeTeste();
    const nota = `Comprar o vade-mécum novo antes da prova de sábado ${'e conferir a lista. '.repeat(3)}`;
    await alterarPreferencias(repo, { lembrete: nota });
    const usuario = await montar(repo);
    const linha = await screen.findByRole('status');
    expect(linha.textContent).toMatch(/^Lembrete: Comprar o vade-mécum novo/);
    expect(linha.textContent).toContain('…');
    await usuario.click(within(linha).getByRole('button', { name: 'Abrir o Lembrete' }));
    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByDisplayValue(nota.trim())).toBeInTheDocument();
  });

  it('uma linha por vez: com backup a lembrar e Lembrete escrito, só o backup aparece', async () => {
    const { repo } = await repositorioDeTeste();
    await registrarErro(repo, { fraseCorreta: 'O prazo é de 10 dias.' });
    await alterarPreferencias(repo, { lembrete: 'Ligar para a secretaria.' });
    await montar(repo);
    const linha = await screen.findByRole('status');
    expect(linha).toHaveTextContent('Você ainda não fez backup.');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText(/Ligar para a secretaria/)).toBeNull();
  });
});
