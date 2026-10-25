import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aderirAoItem } from '../../dominios/acervo/adesao';
import { atualizarItem } from '../../dominios/acervo/atualizacao';
import type { ItemDoAcervo, NoDoItem } from '../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { repositorioDeTeste } from '../../testes/repositorio';
import { ContextoRepositorio } from '../dados/contexto';
import { PendenciasDaNorma } from './PendenciasDaNorma';

const no = (endereco: string, texto: string): NoDoItem => ({
  endereco,
  categoria: 'normativo',
  tipo: 'artigo',
  rotulo: `Art. ${endereco.slice(3)}`,
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
});
const item = (versao: number, texto180: string): ItemDoAcervo => ({
  id: 'cp',
  versao,
  norma: { tituloCurto: 'CP', tipo: 'Decreto-Lei', esfera: 'federal' },
  nos: [no('art155', 'Subtrair coisa alheia.'), no('art180', texto180)],
});

describe('A lei mudou (AP-05)', () => {
  it('mostra o antes e o agora, deixa atualizar a Frase só a pedido e resolve com "Já reli"', async () => {
    const { repo } = await repositorioDeTeste();
    const f1 = await FonteEmMemoria.criar([{ item: item(1, 'Reclusão de um a quatro anos.') }]);
    const f2 = await FonteEmMemoria.criar([
      { item: item(2, 'Reclusão de 2 (dois) a 6 (seis) anos.') },
    ]);
    const [e1] = (await f1.listar()).itens;
    const [e2] = (await f2.listar()).itens;
    if (!e1 || !e2) throw new Error('índice vazio');
    const adesao = await aderirAoItem(repo, f1, e1);
    if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
    const art180 = (await repo.colecao('dispositivos').todosDoUsuario()).find(
      (d) => d.endereco === 'art180',
    );
    const frase = await repo.colecao('frases').criar({
      texto: 'Receptação: 1 a 4 anos',
      origemTipo: 'trecho',
      trecho: {
        dispositivoId: art180?.id ?? '',
        versaoId: adesao.versaoId,
        texto: 'um a quatro',
        inicio: 10,
        fim: 21,
      },
      estado: 'ativa',
      proximaRevisao: '2026-10-30',
    });
    await atualizarItem(repo, f2, e2);

    const usuario = userEvent.setup();
    render(
      <ContextoRepositorio.Provider value={repo}>
        <PendenciasDaNorma normaId={adesao.normaId} />
      </ContextoRepositorio.Provider>,
    );
    const aviso = await screen.findByRole('region', { name: 'A lei mudou' });
    expect(aviso).toHaveTextContent('Antes: Reclusão de um a quatro anos.');
    expect(aviso).toHaveTextContent('Agora: Reclusão de 2 (dois) a 6 (seis) anos.');
    expect(aviso).toHaveTextContent('Frase: Receptação: 1 a 4 anos');
    expect(aviso.textContent).not.toMatch(/atrasad|pendente|dívida/i);
    // Nada muda sozinho.
    expect((await repo.colecao('frases').obter(frase.id))?.texto).toBe('Receptação: 1 a 4 anos');

    await usuario.click(
      within(aviso).getByRole('button', { name: 'Atualizar minha Frase: Receptação: 1 a 4 anos' }),
    );
    const campo = within(aviso).getByLabelText('Sua Frase');
    await usuario.clear(campo);
    await usuario.type(campo, 'Receptação: 2 a 6 anos');
    await usuario.click(within(aviso).getByRole('button', { name: 'Guardar a Frase' }));
    await waitFor(async () => {
      expect((await repo.colecao('frases').obter(frase.id))?.texto).toBe('Receptação: 2 a 6 anos');
    });

    await usuario.click(await within(aviso).findByRole('button', { name: 'Já reli Art. 180' }));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'A lei mudou' })).not.toBeInTheDocument();
    });
  });
});
