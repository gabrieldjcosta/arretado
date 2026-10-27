import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { criarRascunho, publicarVersao } from '../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { VerificarAtualizacao } from './VerificarAtualizacao';

const pagina = (nota: string) =>
  `<p>LEI Nº 1.234, DE 5 DE MAIO DE 2020.</p><p>Dispõe sobre o teste.</p>` +
  `<p>O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:</p>` +
  `<p>Art. 1º Esta Lei trata do teste. ${nota}</p><p>Art. 2º Vale desde já.</p>`;
const ANTIGA = '(Redação dada pela Lei nº 14.000, de 2021)';

async function montar(servir: () => Promise<Response>) {
  const { repo } = await repositorioDeTeste();
  const { sanitizarHtml } = await import('../../core/seguranca/sanitizador');
  const c = await criarRascunho(repo, {
    blocos: sanitizarHtml(pagina(ANTIGA)).blocos,
    origemEntrada: 'url',
    urlOficial: 'https://www.planalto.gov.br/l1234.htm',
  });
  await publicarVersao(repo, c.versao.id);
  const buscar = vi.fn<(url: string) => Promise<Response>>(() => servir());
  vi.stubGlobal('fetch', buscar);
  render(
    <MemoryRouter>
      <ContextoRepositorio.Provider value={repo}>
        <VerificarAtualizacao normaId={c.norma.id} />
      </ContextoRepositorio.Provider>
    </MemoryRouter>,
  );
  await userEvent.setup().click(screen.getByRole('button', { name: 'Verificar atualização' }));
  return { repo, c, buscar };
}

const ok = (html: string) =>
  Promise.resolve(
    new Response(new TextEncoder().encode(html), {
      headers: { 'X-Tipo-Origem': 'text/html; charset=utf-8' },
    }),
  );

describe('VerificarAtualizacao (6b)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('página igual: nenhuma alteração', async () => {
    const { buscar } = await montar(() => ok(pagina(ANTIGA)));
    expect(
      await screen.findByText(/Nenhuma alteração detectada: a página oficial é igual/),
    ).toBeInTheDocument();
    expect(String(buscar.mock.calls[0]?.[0])).toContain('/api/buscar-norma?url=');
  });

  it('nota mais nova: indício, sem trocar o texto', async () => {
    const { repo, c } = await montar(() =>
      ok(pagina('(Redação dada pela Lei nº 15.100, de 2023)')),
    );
    expect(
      await screen.findByText(/Há indício de alteração: a página cita Lei nº 15.100, de 2023/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'importe de novo' })).toHaveAttribute(
      'href',
      '/biblioteca/importar',
    );
    expect(
      (await repo.colecao('versoesNorma').todosDoUsuario()).filter((v) => v.normaId === c.norma.id),
    ).toHaveLength(1);
  });

  it('o botão fica sob o título "Da norma" (a ação é da norma, não do trecho)', async () => {
    await montar(() => ok(pagina(ANTIGA)));
    const bloco = screen.getByRole('region', { name: 'Da norma' });
    expect(within(bloco).getByRole('button', { name: /^Verific/ })).toBeInTheDocument();
  });

  it('traz o resultado à vista: o painel das Ações rola por dentro em telas pequenas', async () => {
    const rolar = vi.spyOn(Element.prototype, 'scrollIntoView');
    await montar(() => ok(pagina(ANTIGA)));
    await screen.findByText(/Nenhuma alteração detectada/);
    expect(rolar).toHaveBeenCalledWith({ block: 'nearest' });
    expect(rolar.mock.contexts[0]).toBe(screen.getByRole('status'));
  });

  it('sem rede: avisa e a norma segue como está', async () => {
    await montar(() => Promise.reject(new Error('offline')));
    expect(await screen.findByText(/Sem conexão com o servidor do app/)).toBeInTheDocument();
  });

  it('host recusado pelo Worker: mensagem em português', async () => {
    await montar(() =>
      Promise.resolve(new Response(JSON.stringify({ erro: 'tempo_esgotado' }), { status: 504 })),
    );
    expect(await screen.findByText(/demorou demais/)).toBeInTheDocument();
  });
});
