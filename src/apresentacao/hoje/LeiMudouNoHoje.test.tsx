import { render, screen, waitFor, within } from '@testing-library/react';
import { aderirAoItem } from '../../dominios/acervo/adesao';
import { atualizarItem } from '../../dominios/acervo/atualizacao';
import type { ItemDoAcervo, NoDoItem } from '../../dominios/acervo/esquemas';
import { FonteEmMemoria } from '../../dominios/acervo/fonte-em-memoria';
import { resolverPendencia } from '../../dominios/acervo/pendencias';
import { repositorioDeTeste } from '../../testes/repositorio';
import { App } from '../App';

const no = (texto: string): NoDoItem => ({
  endereco: 'art180',
  categoria: 'normativo',
  tipo: 'artigo',
  rotulo: 'Art. 180',
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
});
const item = (versao: number, texto: string): ItemDoAcervo => ({
  id: 'cp',
  versao,
  norma: { tituloCurto: 'CP', tipo: 'Decreto-Lei', esfera: 'federal' },
  nos: [no(texto)],
});

describe('A lei mudou no Hoje (AP-05)', () => {
  it('aparece com a norma e a contagem, leva à norma e some quando relido', async () => {
    const { repo } = await repositorioDeTeste();
    const f1 = await FonteEmMemoria.criar([{ item: item(1, 'Reclusão de um a quatro anos.') }]);
    const f2 = await FonteEmMemoria.criar([{ item: item(2, 'Reclusão de 2 a 6 anos.') }]);
    const [e1] = (await f1.listar()).itens;
    const [e2] = (await f2.listar()).itens;
    if (!e1 || !e2) throw new Error('índice vazio');
    const adesao = await aderirAoItem(repo, f1, e1);
    if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
    const [d] = await repo.colecao('dispositivos').todosDoUsuario();
    await repo.colecao('estrelas').criar({
      normaId: adesao.normaId,
      alvoId: d?.id ?? '',
      origemTipo: 'direta',
    });
    await atualizarItem(repo, f2, e2);

    window.location.hash = '#/';
    render(<App abrir={() => Promise.resolve(repo)} />);
    const aviso = await screen.findByRole('region', { name: 'A lei mudou' });
    expect(aviso).toHaveTextContent('CP: o texto mudou em 1 dispositivo em que você guardou algo.');
    expect(aviso.textContent).not.toMatch(/atrasad|pendente|dívida/i);
    expect(within(aviso).getByRole('link', { name: 'Ver o que mudou em CP' })).toHaveAttribute(
      'href',
      `#/biblioteca/normas/${adesao.normaId}`,
    );

    const abertas = (await repo.colecao('pendenciasReleitura').todosDoUsuario()).filter(
      (p) => p.tipo === 'texto_alterado',
    );
    for (const p of abertas) await resolverPendencia(repo, p.id);
    window.location.hash = '#/plano';
    window.location.hash = '#/';
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'A lei mudou' })).not.toBeInTheDocument();
    });
  });
});
