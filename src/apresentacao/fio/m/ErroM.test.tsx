import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { aderirAoItem } from '../../../dominios/acervo/adesao';
import type { ItemDoAcervo } from '../../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../../dominios/acervo/fonte-em-memoria';
import type { Passo } from '../../../dominios/fio';
import { fraseDoErro } from '../../../dominios/recall/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { artigosSugeridos } from '../dados/guardar-erro';
import { ErroM } from './ErroM';
import { MaisM } from './MaisM';
import { ToastM } from './ToastM';
import { esconderAviso } from './toast';

const passos = vi.hoisted(() => ({ atual: [] as Passo[] }));
vi.mock('../dados/useFio', () => ({
  useFio: () => ({ avanco: { estado: { etapa: { passos: passos.atual } } } }),
}));

afterEach(() => {
  cleanup();
  esconderAviso();
  passos.atual = [];
});

const TEXTO = 'O primário em crime sem violência progride com 16% da pena.';
const lep: ItemDoAcervo = {
  id: 'lep',
  versao: 1,
  norma: { tituloCurto: 'LEP', tipo: 'Lei', esfera: 'federal' },
  nos: [
    {
      endereco: 'art112',
      categoria: 'normativo',
      tipo: 'artigo',
      rotulo: 'Art. 112',
      status: 'vigente',
      confianca: 'alta',
      trechos: [{ texto: TEXTO }],
    },
  ],
};

async function cenario(comLeitura: boolean) {
  const { repo } = await repositorioDeTeste();
  const fonte = await FonteEmMemoria.criar([{ item: lep }]);
  const [entrada] = (await fonte.listar()).itens;
  if (!entrada) throw new Error('acervo vazio');
  const adesao = await aderirAoItem(repo, fonte, entrada);
  if (adesao.estado !== 'adicionada') throw new Error('LEP não guardada');
  if (comLeitura) {
    passos.atual = [
      {
        tipo: 'ler',
        materiaId: 'm',
        normaId: adesao.normaId,
        tituloCurto: 'LEP',
        porque: 'mapa',
        artigos: [{ endereco: 'art112', rotulo: 'Art. 112' }],
      },
    ];
  }
  return repo;
}

function Cena({ repo }: { repo: Awaited<ReturnType<typeof cenario>> }) {
  return (
    <ContextoRepositorio.Provider value={repo}>
      <MemoryRouter>
        <main id="conteudo">
          <nav className="m-nav">
            <button type="button" data-nav="varal">
              Varal
            </button>
          </nav>
          <MaisM />
          <ToastM />
        </main>
      </MemoryRouter>
    </ContextoRepositorio.Provider>
  );
}

describe('Guardar um erro (folha-erro)', () => {
  it('só deixa pendurar com a frase certa e guarda o erro e a Frase', async () => {
    const repo = await cenario(false);
    const u = userEvent.setup();
    render(<Cena repo={repo} />);
    await u.click(screen.getByRole('button', { name: /Guardar um erro/ }));
    const pendurar = await screen.findByRole('button', { name: /Pendurar no varal/ });
    expect(pendurar).toBeDisabled();
    await u.type(screen.getByRole('textbox'), 'Primário com violência progride com 25%.');
    await u.click(screen.getByRole('button', { name: 'Aula' }));
    expect(pendurar).toBeEnabled();
    await u.click(pendurar);
    await waitFor(async () => {
      expect((await repo.colecao('erros').listarPagina({ limite: 5 })).itens).toHaveLength(1);
    });
    const [erro] = (await repo.colecao('erros').listarPagina({ limite: 5 })).itens;
    expect(erro?.fraseCorreta).toBe('Primário com violência progride com 25%.');
    expect(erro?.fonte?.prova).toBe('Aula');
    expect(await screen.findByText(/Pendurada no varal/)).toBeInTheDocument();
  });

  it('sugere o artigo que a pessoa estuda, liga a Frase a ele e abre o "Ler na lei"', async () => {
    const repo = await cenario(true);
    const u = userEvent.setup();
    render(<Cena repo={repo} />);
    await u.click(screen.getByRole('button', { name: /Guardar um erro/ }));
    const chip = await screen.findByRole('button', { name: /LEP, art\. 112/ });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await u.click(screen.getByRole('button', { name: 'Ler na lei' }));
    await waitFor(() => {
      expect(document.querySelector('.m-lei')).toHaveTextContent('16% da pena');
    });
    await u.type(screen.getByRole('textbox'), 'Primário: 16%.');
    await u.click(screen.getByRole('button', { name: /Pendurar no varal/ }));
    await waitFor(async () => {
      expect((await repo.colecao('erros').listarPagina({ limite: 5 })).itens).toHaveLength(1);
    });
    const [erro] = (await repo.colecao('erros').listarPagina({ limite: 5 })).itens;
    expect(erro?.dispositivoId).toBeTruthy();
    const frase = erro ? await fraseDoErro(repo, erro.id) : undefined;
    await waitFor(async () => {
      const f = erro ? await fraseDoErro(repo, erro.id) : undefined;
      expect(f?.trecho?.dispositivoId).toBe(erro?.dispositivoId);
    });
    expect(frase).toBeDefined();
  });

  it('"Nenhum" desliga o artigo; sem leitura na etapa não há sugestão', async () => {
    const repo = await cenario(true);
    const u = userEvent.setup();
    render(<ErroM aberta aoFechar={() => undefined} />, {
      wrapper: ({ children }) => (
        <ContextoRepositorio.Provider value={repo}>
          <main id="conteudo">{children}</main>
        </ContextoRepositorio.Provider>
      ),
    });
    await u.click(await screen.findByRole('button', { name: 'Nenhum' }));
    expect(screen.queryByRole('button', { name: 'Ler na lei' })).toBeNull();
    expect(await artigosSugeridos(repo, [])).toEqual([]);
  });
});
