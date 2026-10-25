// Aviso 'texto_alterado' ao atualizar uma norma (AP-05), casos da revisão independente do #290.
import { Repositorio } from '../../core/persistencia';
import { aderirAoItem } from './adesao';
import { atualizarItem } from './atualizacao';
import type { ItemDoAcervo, NoDoItem } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';

const nomeBanco = () => `aviso-${Math.random().toString(36).slice(2)}`;

const no = (endereco: string, texto: string, extra: Partial<NoDoItem> = {}): NoDoItem => ({
  endereco,
  categoria: 'normativo',
  tipo: 'artigo',
  rotulo: endereco,
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
  ...extra,
});

const item = (versao: number, nos: NoDoItem[]): ItemDoAcervo => ({
  id: 'lei-x',
  versao,
  norma: { tituloCurto: 'LEI X', tipo: 'Lei', esfera: 'federal' },
  nos,
});

const V1 = [
  no('art1', 'Primeiro artigo.'),
  no('art2', 'Segundo artigo.'),
  no('art3', 'Terceiro artigo.'),
];

async function montar(nosV2: NoDoItem[]) {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const fonte1 = await FonteEmMemoria.criar([{ item: item(1, V1) }]);
  const fonte2 = await FonteEmMemoria.criar([{ item: item(2, nosV2) }]);
  const [e1] = (await fonte1.listar()).itens;
  const [e2] = (await fonte2.listar()).itens;
  if (!e1 || !e2) throw new Error('índice vazio');
  const adesao = await aderirAoItem(repo, fonte1, e1);
  if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
  const dispositivos = await repo.colecao('dispositivos').todosDoUsuario();
  const id = (e: string) => dispositivos.find((d) => d.endereco === e)?.id ?? '';
  return { repo, fonte2, e2, normaId: adesao.normaId, id };
}

const avisosDe = async (repo: Repositorio) =>
  (await repo.colecao('pendenciasReleitura').todosDoUsuario()).filter(
    (p) => p.tipo === 'texto_alterado',
  );

describe("aviso 'texto_alterado' ao atualizar (AP-05)", () => {
  it('só avisa do artigo que mudou E em que a pessoa guardou algo; reaplicar não duplica', async () => {
    const { repo, fonte2, e2, normaId, id } = await montar([
      no('art1', 'Primeiro artigo mudou.'),
      no('art2', 'Segundo artigo mudou.'),
      no('art3', 'Terceiro artigo.'),
    ]);
    await repo.colecao('estrelas').criar({ normaId, alvoId: id('art1'), origemTipo: 'direta' });
    await repo.colecao('estrelas').criar({ normaId, alvoId: id('art3'), origemTipo: 'direta' });
    const r = await atualizarItem(repo, fonte2, e2);
    expect(r.estado).toBe('atualizada');
    expect((await avisosDe(repo)).map((p) => p.enderecoAntigo)).toEqual(['art1']);

    expect((await atualizarItem(repo, fonte2, e2)).estado).toBe('em_dia');
    expect(await avisosDe(repo)).toHaveLength(1);
  });

  // Achado da revisão (resolvido): a prévia conta a mudança de situação como 'revogado'; o aviso também.
  it('artigo que a norma nova revoga, com Estrela da pessoa, também avisa', async () => {
    const { repo, fonte2, e2, normaId, id } = await montar([
      no('art1', 'Primeiro artigo.'),
      no('art2', 'Segundo artigo.'),
      no('art3', 'Terceiro artigo.', { status: 'revogado' }),
    ]);
    await repo.colecao('estrelas').criar({ normaId, alvoId: id('art3'), origemTipo: 'direta' });
    await atualizarItem(repo, fonte2, e2);
    expect((await avisosDe(repo)).map((p) => p.enderecoAntigo)).toEqual(['art3']);
  });
});
