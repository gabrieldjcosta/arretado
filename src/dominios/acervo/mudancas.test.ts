import { Repositorio } from '../../core/persistencia';
import { aderirAoItem } from './adesao';
import { atualizarItem } from './atualizacao';
import type { ItemDoAcervo, NoDoItem } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';
import { mudancasQueAfetam } from './mudancas';

const no = (endereco: string, texto: string): NoDoItem => ({
  endereco,
  categoria: 'normativo',
  tipo: 'artigo',
  rotulo: endereco,
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
});
const item = (versao: number, nos: NoDoItem[]): ItemDoAcervo => ({
  id: 'cp',
  versao,
  norma: { tituloCurto: 'CP', tipo: 'Decreto-Lei', esfera: 'federal' },
  nos,
});

async function montar() {
  const repo = await Repositorio.abrir({ nomeBanco: `mud-${Math.random().toString(36).slice(2)}` });
  const f1 = await FonteEmMemoria.criar([
    {
      item: item(1, [
        no('art155', 'Subtrair coisa alheia: reclusão de um a quatro anos.'),
        no('art180', 'Adquirir coisa produto de crime: reclusão de um a quatro anos.'),
      ]),
    },
  ]);
  const f2 = await FonteEmMemoria.criar([
    {
      item: item(2, [
        no('art155', 'Subtrair coisa alheia: reclusão de um a quatro anos.'),
        no('art180', 'Adquirir coisa produto de crime: reclusão de 2 (dois) a 6 (seis) anos.'),
      ]),
    },
  ]);
  const [e1] = (await f1.listar()).itens;
  const [e2] = (await f2.listar()).itens;
  if (!e1 || !e2) throw new Error('índice vazio');
  const adesao = await aderirAoItem(repo, f1, e1);
  if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
  const ds = await repo.colecao('dispositivos').todosDoUsuario();
  const id = (e: string) => ds.find((d) => d.endereco === e)?.id ?? '';
  return { repo, f2, e2, normaId: adesao.normaId, versaoId: adesao.versaoId, id };
}

describe('mudancasQueAfetam', () => {
  it('lista o que a pessoa guardou sobre o artigo que mudou, com o texto de antes e o de agora', async () => {
    const { repo, f2, e2, normaId, versaoId, id } = await montar();
    const ponto = await repo.colecao('pontos').criar({ titulo: 'Receptação', faixa: 'altissima' });
    const frase = await repo.colecao('frases').criar({
      texto: 'Receptação: 1 a 4 anos',
      origemTipo: 'trecho',
      trecho: { dispositivoId: id('art180'), versaoId, texto: 'um a quatro', inicio: 55, fim: 66 },
      estado: 'ativa',
      proximaRevisao: '2026-10-30',
    });
    await repo.colecao('cartoes').criar({
      frente: 'Pena da receptação?',
      verso: '1 a 4 anos',
      origemTipo: 'frase',
      fraseId: frase.id,
      pontoId: ponto.id,
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: '2026-10-30',
    });
    await repo.colecao('estrelas').criar({ normaId, alvoId: id('art180'), origemTipo: 'direta' });
    await repo.colecao('estrelas').criar({ normaId, alvoId: id('art155'), origemTipo: 'direta' });

    expect(await mudancasQueAfetam(repo, normaId)).toEqual([]);
    await atualizarItem(repo, f2, e2);

    const mudancas = await mudancasQueAfetam(repo, normaId);
    expect(mudancas).toHaveLength(1);
    const [m] = mudancas;
    expect(m?.endereco).toBe('art180');
    expect(m?.antes).toContain('um a quatro anos');
    expect(m?.agora).toContain('2 (dois) a 6 (seis) anos');
    expect(m?.afetados.map((a) => a.tipo)).toEqual(['cartao', 'frase', 'estrela']);
    expect(m?.afetados[0]?.faixa).toBe('altissima');
    // O texto da pessoa não muda.
    expect((await repo.colecao('frases').obter(frase.id))?.texto).toBe('Receptação: 1 a 4 anos');
    repo.fechar();
  });
});
