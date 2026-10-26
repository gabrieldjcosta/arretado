import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { RelogioLogico } from '../../core/ids';
import { CHAVE_SEQ_ENVIADO, listarConflitos } from '../../core/sincronizacao';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { Conflitos } from './Conflitos';

const OUTRO = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

async function montar() {
  const { repo } = await repositorioDeTeste();
  const fonte = await repo.colecao('fontes').criar({ tipo: 'livro', titulo: 'Manual antigo' });
  // Carimbo real de outro aparelho (T7): a resolução o observa no relógio lógico.
  const tsDeles = new RelogioLogico(OUTRO, () => Date.now() + 1_000).tick();
  await repo.db.conflitos.add({
    id: 'c1',
    colecao: 'fontes',
    registroId: fonte.id,
    minha: { ...fonte },
    deles: { ...fonte, titulo: 'Manual novo', tsLogico: tsDeles },
    aparelhoDeles: OUTRO,
    tsDeles,
    criadoEm: '2026-10-25T12:00:00.000Z',
  });
  render(
    <ContextoRepositorio.Provider value={repo}>
      <MemoryRouter>
        <Conflitos />
      </MemoryRouter>
    </ContextoRepositorio.Provider>,
  );
  await screen.findByRole('heading', { level: 2, name: /Fontes/ });
  return { repo, fonte, usuario: userEvent.setup() };
}

/** Finge que tudo deste aparelho já subiu (a resolução exige). */
async function marcarTudoEnviado(repo: Awaited<ReturnType<typeof montar>>['repo']) {
  const ultima = await repo.db.alteracoes.orderBy('seq').last();
  await repo.db.meta.put({ chave: CHAVE_SEQ_ENVIADO, valor: ultima?.seq ?? 0 });
}

describe('Conta › Conflitos (F4-B, B4)', () => {
  it('mostra as duas versões só com o campo que difere, em palavras, e os iguais recolhidos', async () => {
    await montar();
    expect(screen.getByRole('heading', { level: 3, name: 'A deste Aparelho' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'A do outro Aparelho' }),
    ).toBeInTheDocument();
    const marcados = screen.getAllByText(/Manual (antigo|novo)/, { selector: 'mark' });
    expect(marcados).toHaveLength(2);
    expect(screen.getAllByText('Título')).toHaveLength(2);
    expect(screen.queryByText('titulo')).not.toBeInTheDocument();
    // O que não difere (tipo = livro) fica dentro de "campos iguais".
    expect(screen.getAllByText(/campo(s)? igua(l|is)/)).toHaveLength(2);
    for (const valor of screen.getAllByText('livro')) expect(valor).not.toBeVisible();
  });

  it('com mudança ainda não enviada, pede para sincronizar antes e não grava nada', async () => {
    const { repo, usuario } = await montar();
    await usuario.click(screen.getByRole('button', { name: 'Ficar com a deste Aparelho' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ainda não enviadas/);
    expect(await listarConflitos(repo.db)).toHaveLength(1);
  });

  it('"Ficar com a do <nome>" adota a versão do outro Aparelho e fecha o Conflito', async () => {
    const { repo, fonte, usuario } = await montar();
    await marcarTudoEnviado(repo);
    await usuario.click(screen.getByRole('button', { name: 'Ficar com a do outro Aparelho' }));
    await waitFor(() => {
      expect(screen.getByText('Nenhum Conflito. Seus Aparelhos concordam.')).toBeInTheDocument();
    });
    expect((await repo.colecao('fontes').obter(fonte.id))?.titulo).toBe('Manual novo');
  });

  it('"Ficar com a deste Aparelho" mantém a versão deste Aparelho e fecha o Conflito', async () => {
    const { repo, fonte, usuario } = await montar();
    await marcarTudoEnviado(repo);
    await usuario.click(screen.getByRole('button', { name: 'Ficar com a deste Aparelho' }));
    await waitFor(() => {
      expect(screen.getByText('Nenhum Conflito. Seus Aparelhos concordam.')).toBeInTheDocument();
    });
    expect((await repo.colecao('fontes').obter(fonte.id))?.titulo).toBe('Manual antigo');
  });
});
