import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { gravarPosicao } from '../../dominios/legislacao/leituras';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { criarCiclo } from '../../dominios/ciclos';
import { criarCartaoManual } from '../../dominios/recall/servico';
import { encerrarSessao, iniciarSessao } from '../../dominios/sessao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const DIA = 24 * 60 * 60_000;

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha('O PRESIDENTE DA REPÚBLICA decreta:'),
  linha('Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença.'),
  linha('Art. 2º A jurisdição penal dos Juízes será exercida no processo de execução.'),
];

async function lerLep(repo: Repositorio, normaId?: string): Promise<string> {
  let id = normaId;
  if (id === undefined) {
    const { versao } = await criarRascunho(repo, {
      blocos: LEI,
      origemEntrada: 'html',
      tituloCurto: 'LEP',
    });
    id = (await publicarVersao(repo, versao.id)).norma.id;
  }
  const { nos } = await abrirNorma(repo, id);
  await gravarPosicao(repo, id, nos.find((n) => n.dispositivo.tipo === 'artigo')!.dispositivo.id);
  return id;
}

function abrirHoje(repo: Repositorio) {
  window.location.hash = '#/';
  const usuario = userEvent.setup();
  const tela = render(<App abrir={() => Promise.resolve(repo)} />);
  return { usuario, ...tela };
}

// A caneta da folha do Agora é um <svg>; no quadro do cacto é o grupo que anda sobre o desenho.
const canetas = () => [...document.querySelectorAll<SVGElement>('svg.caneta, .quadro-caneta')];

describe('Hoje › Ponto de luz (P3)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('os pontos do Dia dizem o estado também em palavras', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    await lerLep(repo);
    relogio.avancar(3 * DIA);
    abrirHoje(repo);

    const pontos = await screen.findByRole('list', { name: 'Andamento do Dia' });
    expect(
      within(pontos)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Leitura, ainda não', 'Cartões, para agora', 'Frases, ainda não']);
  });

  it('a linha de parada diz onde retomar e quando foi salvo; a folha não repete o motivo', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await lerLep(repo);
    relogio.avancar(DIA);
    abrirHoje(repo);

    const parada = (await screen.findByText(/Retomar em/)).closest('.parada');
    expect(parada).toHaveTextContent('Retomar em LEP, art. 1ºsalvo ontem, 09h00');
    expect(screen.queryByText(/Você parou/)).toBeNull();
    const folha = screen.getByRole('region', { name: 'Agora' });
    expect(within(folha).getByRole('heading', { name: 'Continuar a leitura' })).toBeVisible();
    expect(folha).not.toHaveTextContent('Retomar em');
    expect(within(folha).getByRole('link', { name: 'Continuar' })).toBeVisible();
  });

  it('"Em seguida" mostra o que vem depois do Agora; "Escolher outra coisa" os mantém juntos', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    await lerLep(repo);
    relogio.avancar(3 * DIA);
    const { usuario } = abrirHoje(repo);

    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(within(agora).getByRole('heading')).toHaveTextContent('Revisar cartões');
    const seguinte = screen.getByRole('region', { name: 'Em seguida' });
    expect(seguinte).toHaveTextContent('Continuar a leitura');
    await usuario.click(within(seguinte).getByText('Em seguida'));
    expect(within(seguinte).getAllByRole('listitem')).toHaveLength(1);

    await usuario.click(within(agora).getByRole('button', { name: 'Escolher outra coisa' }));
    await waitFor(() => {
      expect(
        within(screen.getByRole('region', { name: 'Agora' })).getByRole('heading'),
      ).toHaveTextContent('Continuar a leitura');
    });
    expect(screen.queryByRole('region', { name: 'Em seguida' })).toBeNull();
  });

  it('"Trocar" reordena o "Em seguida" só nesta visita; "Escolher outra coisa" traz o que ficou primeiro', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    await criarCartaoManual(repo, { frente: 'a', verso: 'b' });
    await lerLep(repo);
    const penal = await repo.colecao('disciplinas').criar({ nome: 'Penal' });
    await criarCiclo(repo, {
      nome: 'C',
      modelo: 'manual',
      pesos: [{ disciplinaId: penal.id, peso: 1 }],
    });
    relogio.avancar(3 * DIA);
    const visita = abrirHoje(repo);
    const { usuario } = visita;

    const agora = await screen.findByRole('region', { name: 'Agora' });
    expect(within(agora).getByRole('heading')).toHaveTextContent('Revisar cartões');
    const seguinte = screen.getByRole('region', { name: 'Em seguida' });
    const nomes = () =>
      within(seguinte)
        .getAllByRole('listitem')
        .map((li) => li.querySelector('.em-seguida-nome')?.firstChild?.textContent);
    await usuario.click(within(seguinte).getByText('Em seguida'));
    expect(nomes()).toEqual(['Penal', 'Continuar a leitura']);

    const primeiro = within(seguinte).getAllByRole('listitem')[0]!;
    await usuario.click(within(primeiro).getByText('Trocar'));
    await usuario.click(within(primeiro).getByRole('button', { name: 'Continuar a leitura' }));
    expect(nomes()).toEqual(['Continuar a leitura', 'Penal']);
    expect(within(primeiro).getByRole('button', { name: 'Continuar a leitura' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // O Agora não mudou, e nada foi gravado: a próxima visita volta à ordem da decisão.
    expect(within(agora).getByRole('heading')).toHaveTextContent('Revisar cartões');

    await usuario.click(within(agora).getByRole('button', { name: 'Escolher outra coisa' }));
    await waitFor(() => {
      expect(
        within(screen.getByRole('region', { name: 'Agora' })).getByRole('heading'),
      ).toHaveTextContent('Continuar a leitura');
    });
    expect(screen.getByRole('region', { name: 'Em seguida' })).toHaveTextContent('Penal');

    visita.unmount();
    abrirHoje(repo);
    const nova = await screen.findByRole('region', { name: 'Agora' });
    expect(within(nova).getByRole('heading')).toHaveTextContent('Revisar cartões');
    expect(screen.getByRole('region', { name: 'Em seguida' })).toHaveTextContent(
      'Em seguidaPenal, mais 1',
    );
  });

  it('uma caneta por tela: encostada na folha do Agora e, fechado o Dia, largada no Resumo', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await encerrarSessao(repo, s.id);
    await lerLep(repo);
    const { usuario } = abrirHoje(repo);

    await screen.findByRole('region', { name: 'Fechar o Dia' });
    await waitFor(() => {
      expect(canetas().map((c) => c.dataset.pose)).toEqual(['encostada']);
    });
    expect(canetas()[0]?.closest('.parada')).not.toBeNull();

    await usuario.click(screen.getByRole('button', { name: 'Fechar o Dia' }));
    const resumo = await screen.findByRole('region', { name: 'Fechar o Dia' });
    await waitFor(() => {
      expect(canetas().map((c) => c.dataset.pose)).toEqual(['deitada']);
    });
    expect(resumo.contains(canetas()[0] ?? null)).toBe(true);
    // O quadro do cacto mostra o que a caneta desenhou hoje (o primeiro Dia fechado desenha o chão).
    expect(resumo.querySelector('.quadro')).not.toBeNull();
    expect(await within(resumo).findByText('Hoje a caneta desenhou o chão.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Reabrir o Dia' }));
    await screen.findByRole('button', { name: 'Fechar o Dia' });
    await waitFor(() => {
      expect(canetas().map((c) => c.dataset.pose)).toEqual(['encostada']);
    });
  });

  it('o Dia que já abre fechado mostra o quadro pronto, com a legenda de hoje', async () => {
    const { repo } = await repositorioDeTeste();
    const s = await iniciarSessao(repo, {});
    await encerrarSessao(repo, s.id);
    const primeira = abrirHoje(repo);
    await primeira.usuario.click(await screen.findByRole('button', { name: 'Fechar o Dia' }));
    await screen.findByRole('button', { name: 'Reabrir o Dia' });
    primeira.unmount();

    abrirHoje(repo);
    const resumo = await screen.findByRole('region', { name: 'Fechar o Dia' });
    await within(resumo).findByRole('button', { name: 'Reabrir o Dia' });
    expect(resumo.querySelector('.quadro')).not.toBeNull();
    // Nada da parte de hoje falta no papel: o chão já está desenhado, e a legenda já está dita.
    expect(resumo.querySelectorAll('.quadro-fio')).toHaveLength(1);
    expect(within(resumo).getByRole('status')).toHaveTextContent('Hoje a caneta desenhou o chão.');
  });

  it('o ponto acende uma vez, na visita em que ficou aceso; a primeira abre quieta', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const normaId = await lerLep(repo);
    relogio.avancar(DIA);

    const primeira = abrirHoje(repo);
    const lista1 = await screen.findByRole('list', { name: 'Andamento do Dia' });
    expect(lista1.querySelectorAll('.acende')).toHaveLength(0);
    expect(within(lista1).getAllByRole('listitem')[0]).toHaveAttribute('data-estado', 'atual');
    primeira.unmount();

    await lerLep(repo, normaId);
    abrirHoje(repo);
    const lista2 = await screen.findByRole('list', { name: 'Andamento do Dia' });
    const [leitura, cartoes, frases] = within(lista2).getAllByRole('listitem');
    await waitFor(() => {
      expect(leitura).toHaveAttribute('data-estado', 'feito');
    });
    expect(leitura?.querySelector('.ponto-de-luz')).toHaveClass('acende');
    expect(cartoes?.querySelector('.ponto-de-luz')).not.toHaveClass('acende');
    expect(frases?.querySelector('.ponto-de-luz')).not.toHaveClass('acende');
  });

  it('um registro quebrado em localStorage não derruba o Hoje', async () => {
    localStorage.setItem('arretado.pontos-vistos', '{"data": 3, "estados": "x"}');
    const { repo } = await repositorioDeTeste();
    abrirHoje(repo);
    const pontos = await screen.findByRole('list', { name: 'Andamento do Dia' });
    expect(within(pontos).getAllByRole('listitem')).toHaveLength(3);
  });
});
