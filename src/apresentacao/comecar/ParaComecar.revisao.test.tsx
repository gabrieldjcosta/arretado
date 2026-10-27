import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const falhas = vi.hoisted(() => ({ restantes: 1, chamadas: 0 }));
vi.mock('./trilha-do-edital', async (original) => {
  const real = await original<typeof import('./trilha-do-edital')>();
  return {
    ...real,
    montarTrilha: (...a: Parameters<typeof real.montarTrilha>) => {
      falhas.chamadas += 1;
      if (falhas.restantes-- > 0) return Promise.reject(new Error('cai'));
      return real.montarTrilha(...a);
    },
  };
});

const norma = { id: 'lei-c', titulo: 'Lei C', editaisQueCitam: 2, porcentagem: 50 };
const pacote = {
  versao: 1,
  aprovadoEm: '2026-10-25',
  aprovadoPor: 'T',
  regra: 'T',
  carreiras: { 'ministerio-publico': { nome: 'MP', editaisComTexto: 2, normas: [norma] } },
};
const item = {
  id: 'lei-c',
  versao: 1,
  norma: { tituloCurto: 'LEI-C', tipo: 'Lei', esfera: 'federal' },
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
};

it('normas ok + Trilha falha: leitura preservada; tentar de novo cria a Trilha uma vez', async () => {
  const { repo } = await repositorioDeTeste();
  const f = await FonteEmMemoria.criar([{ item: item as never }], { pacote: pacote as never });
  window.location.hash = '#/comecar/ministerio-publico';
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
  await usuario.click(await screen.findByRole('button', { name: 'Adicionar e ler' }));
  expect(await screen.findByText('As normas entraram; a Trilha, não.')).toBeVisible();
  expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(1);
  expect(await repo.colecao('pontos').todosDoUsuario()).toHaveLength(0);
  await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'LEI-C' })).toBeInTheDocument();
  const pontos = await repo.colecao('pontos').todosDoUsuario();
  expect(pontos.length).toBeGreaterThan(0);
  expect(new Set(pontos.map((p) => p.id)).size).toBe(pontos.length);
  expect(await repo.colecao('logsImportacao').todosDoUsuario()).toHaveLength(1);
  expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(1);
  expect(falhas.chamadas).toBe(2);
});
