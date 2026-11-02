import { render, waitFor } from '@testing-library/react';
import type { ItemDoAcervo } from '../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { ContextoFonteAcervo } from '../dados/fonteAcervoContexto';
import { PuxarEssenciais } from './PuxarEssenciais';

const item = (id: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
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
});
const IDS = ['a', 'b'];

describe('PuxarEssenciais', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adiciona em segundo plano e marca o Aparelho como feito', async () => {
    const { repo } = await repositorioDeTeste();
    const fonte = await FonteEmMemoria.criar(IDS.map((id) => ({ item: item(id) })));
    render(
      <ContextoRepositorio.Provider value={repo}>
        <ContextoFonteAcervo.Provider value={fonte}>
          <PuxarEssenciais ativo ids={IDS} espera={0} />
        </ContextoFonteAcervo.Provider>
      </ContextoRepositorio.Provider>,
    );
    await waitFor(async () => {
      expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(2);
    });
    await waitFor(() => {
      expect(localStorage.getItem('arretado.essenciais.v1')).toBe('1');
    });
  });

  it('desligado, não toca na Biblioteca', async () => {
    const { repo } = await repositorioDeTeste();
    const fonte = await FonteEmMemoria.criar(IDS.map((id) => ({ item: item(id) })));
    render(
      <ContextoRepositorio.Provider value={repo}>
        <ContextoFonteAcervo.Provider value={fonte}>
          <PuxarEssenciais ativo={false} ids={IDS} espera={0} />
        </ContextoFonteAcervo.Provider>
      </ContextoRepositorio.Provider>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(0);
  });
});
