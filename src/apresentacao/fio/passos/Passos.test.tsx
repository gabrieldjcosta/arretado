import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Repositorio } from '../../../core/persistencia';
import type { Bloco } from '../../../core/seguranca/sanitizador';
import type { Passo, ResultadoDoPasso } from '../../../dominios/fio';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { GuardarDoPasso, LembrarDoPasso, PraticarDoPasso } from './index';

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

async function montar(): Promise<{ repo: Repositorio; normaId: string }> {
  const { repo } = await repositorioDeTeste();
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
  const { norma } = await publicarVersao(repo, versao.id);
  return { repo, normaId: norma.id };
}

function com(repo: Repositorio, filho: React.ReactNode) {
  return render(<ContextoRepositorio.Provider value={repo}>{filho}</ContextoRepositorio.Provider>);
}

describe('LembrarDoPasso', () => {
  it('pergunta um artigo por vez, conta os erros e devolve o resultado do passo', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const aoConcluir = vi.fn<(r: ResultadoDoPasso) => void>();
    const passo: Extract<Passo, { tipo: 'lembrar' }> = {
      tipo: 'lembrar',
      materiaId: 'm',
      normaId,
      tituloCurto: 'Lei',
      artigos: ARTIGOS.slice(0, 2),
    };
    com(
      repo,
      <LembrarDoPasso passo={passo} semente={3} aoConcluir={aoConcluir} aoPular={vi.fn()} />,
    );
    expect(await screen.findByText('1 de 2')).toBeInTheDocument();
    // Responde a primeira com a opção certa (o botão cujo texto a lei traz) e a segunda errando.
    const botoes = () =>
      screen.getAllByRole('button').filter((b) => b.className.includes('grande'));
    const primeira = botoes();
    expect(primeira.length).toBeGreaterThanOrEqual(2);
    await usuario.click(primeira[0] as HTMLElement);
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(await screen.findByText('2 de 2')).toBeInTheDocument();
    await usuario.click(botoes()[0] as HTMLElement);
    await usuario.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(aoConcluir).toHaveBeenCalledTimes(1);
    const r = aoConcluir.mock.calls[0]?.[0];
    expect(r?.tipo).toBe('lembrar');
    if (r?.tipo === 'lembrar') {
      expect(r.acertos + r.erros.length).toBe(2);
      for (const e of r.erros) expect(['art1', 'art2']).toContain(e);
    }
  });

  it('artigo sem pergunta possível: oferece Seguir, que chama aoPular', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const aoPular = vi.fn();
    com(
      repo,
      <LembrarDoPasso
        passo={{ tipo: 'lembrar', materiaId: 'm', normaId, tituloCurto: 'Lei', artigos: [] }}
        semente={1}
        aoConcluir={vi.fn()}
        aoPular={aoPular}
      />,
    );
    await usuario.click(await screen.findByRole('button', { name: 'Seguir' }));
    expect(aoPular).toHaveBeenCalledTimes(1);
  });
});

describe('GuardarDoPasso', () => {
  it('guarda a Frase com um toque, com o link de volta ao dispositivo', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const aoConcluir = vi.fn<(r: ResultadoDoPasso) => void>();
    com(
      repo,
      <GuardarDoPasso
        passo={{ tipo: 'guardar', materiaId: 'm', normaId, enderecos: ['art1'] }}
        semente={5}
        aoConcluir={aoConcluir}
        aoPular={vi.fn()}
      />,
    );
    await usuario.click(await screen.findByRole('button', { name: 'Guardar esta Frase' }));
    expect(await screen.findByText(/Frase guardada/)).toBeInTheDocument();
    const frases = await repo.colecao('frases').todosDoUsuario();
    expect(frases).toHaveLength(1);
    expect(frases[0]?.origemTipo).toBe('trecho');
    expect(frases[0]?.trecho?.dispositivoId).toBeDefined();
    await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(aoConcluir).toHaveBeenCalledWith({ tipo: 'guardar', guardadas: 1 });
  });

  it('dá para seguir sem guardar nada', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const aoConcluir = vi.fn();
    com(
      repo,
      <GuardarDoPasso
        passo={{ tipo: 'guardar', materiaId: 'm', normaId, enderecos: ['art1'] }}
        semente={5}
        aoConcluir={aoConcluir}
        aoPular={vi.fn()}
      />,
    );
    await usuario.click(await screen.findByRole('button', { name: 'Seguir' }));
    expect(aoConcluir).toHaveBeenCalledWith({ tipo: 'guardar', guardadas: 0 });
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);
  });
});

describe('PraticarDoPasso (porteira)', () => {
  const passo: Extract<Passo, { tipo: 'praticar' }> = {
    tipo: 'praticar',
    materiaId: 'm',
    modo: 'porteira',
    quantidade: 3,
    porque: 'fim_do_mapa',
  };

  it('três cartões; responder todos devolve acertos e total; errar oferece guardar a Frase', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const aoConcluir = vi.fn<(r: ResultadoDoPasso) => void>();
    com(
      repo,
      <PraticarDoPasso
        passo={passo}
        alvo={{ normaId, artigos: ARTIGOS }}
        semente={2}
        aoConcluir={aoConcluir}
        aoPular={vi.fn()}
      />,
    );
    expect(await screen.findByText('1 de 3')).toBeInTheDocument();
    // Diz "Está certa" a todos: acerta o cartão certo e erra os trocados.
    let comGuardar = 0;
    for (let i = 0; i < 3; i++) {
      await usuario.click(await screen.findByRole('button', { name: 'Está certa' }));
      if (screen.queryByRole('button', { name: 'Guardar esta Frase' })) comGuardar++;
      if (i < 2) await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    }
    // Só os dois cartões trocados oferecem guardar; o certo, não.
    expect(comGuardar).toBe(2);
    await usuario.click(screen.getByRole('button', { name: 'Passar a porteira' }));
    expect(aoConcluir).toHaveBeenCalledTimes(1);
    const r = aoConcluir.mock.calls[0]?.[0];
    expect(r).toEqual({ tipo: 'praticar', acertos: 1, total: 3 });
    // Errar não grava nada sozinho.
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(0);
  });

  it('errar e guardar cria a Frase certa do dispositivo, nunca a frase trocada', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    com(
      repo,
      <PraticarDoPasso
        passo={passo}
        alvo={{ normaId, artigos: ARTIGOS }}
        semente={2}
        aoConcluir={vi.fn()}
        aoPular={vi.fn()}
      />,
    );
    // Em qualquer cartão trocado, "Está certa" erra; em semente 2 o certo não é o primeiro.
    for (let i = 0; i < 3; i++) {
      await usuario.click(await screen.findByRole('button', { name: 'Está certa' }));
      if (screen.queryByRole('button', { name: 'Guardar esta Frase' })) break;
      await usuario.click(screen.getByRole('button', { name: 'Seguir' }));
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar esta Frase' }));
    await waitFor(async () => {
      expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(1);
    });
    const [frase] = await repo.colecao('frases').todosDoUsuario();
    expect(LEI.map((b) => b.trechos[0]?.texto).some((t) => t?.includes(frase?.texto ?? '#'))).toBe(
      true,
    );
  });

  it('modo Ache o erro e porteira sem texto bom: nada para praticar, Seguir pula', async () => {
    const { repo, normaId } = await montar();
    const usuario = userEvent.setup();
    const aoPular = vi.fn();
    com(
      repo,
      <PraticarDoPasso
        passo={{ ...passo, modo: 'ache_o_erro' }}
        alvo={{ normaId, artigos: ARTIGOS }}
        semente={2}
        aoConcluir={vi.fn()}
        aoPular={aoPular}
      />,
    );
    await usuario.click(await screen.findByRole('button', { name: 'Seguir' }));
    expect(aoPular).toHaveBeenCalledTimes(1);
  });
});
