import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ItemDoAcervo } from '../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

function colecao(id: string, tituloCurto: string, enderecos: [string, string][]): ItemDoAcervo {
  return {
    id,
    versao: 1,
    norma: { tituloCurto, tipo: 'Súmulas', esfera: 'federal', especie: 'sumulas' },
    nos: enderecos.map(([endereco, rotulo]) => ({
      endereco,
      categoria: 'normativo' as const,
      tipo: 'sumula' as const,
      rotulo,
      status: 'vigente' as const,
      confianca: 'alta' as const,
      trechos: [{ texto: `Texto da ${rotulo}.` }],
    })),
  };
}

async function abrir(rota: string) {
  const f = await FonteEmMemoria.criar([
    { item: colecao('sumulas-stj', 'Súmulas STJ', [['s593', 'Súmula 593']]) },
    {
      item: colecao('sumulas-stf-vinculantes', 'SV STF', [['sv11', 'Súmula Vinculante 11']]),
    },
  ]);
  const { repo } = await repositorioDeTeste();
  window.location.hash = rota;
  const usuario = userEvent.setup();
  render(<App abrir={() => Promise.resolve(repo)} fonteAcervo={f} />);
  return usuario;
}

describe('Biblioteca › Súmulas', () => {
  it('lista as coleções adicionadas e abre a súmula pelo número', async () => {
    const usuario = await abrir('#/biblioteca/acervo?tipo=sumulas');
    await usuario.click(await screen.findByRole('button', { name: 'Marcar todos que faltam' }));
    await usuario.click(screen.getByRole('button', { name: /^Adicionar 2 / }));
    await screen.findByText(/2 adicionadas/);

    await usuario.click(screen.getByRole('link', { name: 'Súmulas' }));
    expect(await screen.findByRole('link', { name: /Súmulas STJ/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SV STF/ })).toBeInTheDocument();

    const campo = screen.getByLabelText('Achar por número');
    await usuario.type(campo, 'súmula 999{Enter}');
    expect(await screen.findByText(/Nenhum resultado/)).toBeInTheDocument();
    await usuario.clear(campo);
    await usuario.type(campo, 'SV 11{Enter}');
    expect(await screen.findByText('Texto da Súmula Vinculante 11.')).toBeInTheDocument();
  });

  it('sem coleções, convida a adicionar', async () => {
    await abrir('#/biblioteca/sumulas');
    expect(
      await screen.findByRole('heading', { name: 'Nenhuma súmula ainda' }),
    ).toBeInTheDocument();
  });
});
