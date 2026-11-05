import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Bloco } from '../../../core/seguranca/sanitizador';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { ContextoRepositorio } from '../../dados/contexto';
import { PorteiraM } from './PorteiraM';
import { ToastM } from './ToastM';
import { esconderAviso } from './toast';

afterEach(() => {
  cleanup();
  esconderAviso();
});

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

async function abrir(comAlvo: boolean) {
  const { repo } = await repositorioDeTeste();
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
  const { norma } = await publicarVersao(repo, versao.id);
  const aoPassar = vi.fn();
  const aoFechar = vi.fn();
  render(
    <MemoryRouter>
      <ContextoRepositorio.Provider value={repo}>
        <main id="conteudo">
          <PorteiraM
            aberta
            aoFechar={aoFechar}
            aoPassar={aoPassar}
            materia="Execução Penal"
            alvo={comAlvo ? { normaId: norma.id, artigos: ARTIGOS } : undefined}
            semente={2}
          />
          <ToastM />
        </main>
      </ContextoRepositorio.Provider>
    </MemoryRouter>,
  );
  const folha = await screen.findByRole('dialog');
  return { repo, folha, aoPassar, aoFechar, usuario: userEvent.setup() };
}

describe('PorteiraM, a folha da porteira do Destino', () => {
  it('o deque de três cartões, o veredito e "Ver no meu fio" passa a porteira e fecha a folha', async () => {
    const { folha, usuario, aoPassar, aoFechar } = await abrir(true);
    expect(within(folha).getByText('Porteira · Execução Penal')).toBeInTheDocument();
    expect(
      within(folha).getByRole('heading', { level: 2, name: 'Certo ou errado?' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(folha.querySelectorAll('.m-deque .m-cd')).toHaveLength(3);
    });
    expect(within(folha).queryByRole('button', { name: 'Ver no meu fio' })).toBeNull();
    for (let i = 0; i < 3; i++) {
      await usuario.click(await within(folha).findByRole('button', { name: 'Certo' }));
    }
    expect(await within(folha).findByText('A porteira abriu.')).toBeInTheDocument();
    await usuario.click(within(folha).getByRole('button', { name: 'Ver no meu fio' }));
    await waitFor(() => {
      expect(aoPassar).toHaveBeenCalledTimes(1);
    });
    expect(aoFechar).toHaveBeenCalled();
  });

  it('sem artigo lido não há o que perguntar: diz isso e só fecha, sem passar a porteira', async () => {
    const { folha, usuario, aoPassar, aoFechar } = await abrir(false);
    expect(await within(folha).findByText(/Ainda não há o que perguntar/)).toBeInTheDocument();
    await usuario.click(
      within(folha).getAllByRole('button', { name: 'Fechar' }).at(-1) as HTMLElement,
    );
    await waitFor(() => {
      expect(aoFechar).toHaveBeenCalled();
    });
    expect(aoPassar).not.toHaveBeenCalled();
  });
});
