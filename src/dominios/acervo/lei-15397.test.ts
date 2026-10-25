// AP-05: a Lei 15.397/2026 sobre o Código Penal do acervo. O acervo traz a redação de agora; a de
// antes é montada daqui (texto antigo nos arts. 155, 157, 171, 180, 180-A e 266, e o § 5º do 171
// ainda vigente). Aplicar a versão do acervo deve avisar o que a pessoa guardou sobre cada um.
import { Repositorio } from '../../core/persistencia';
import { aderirAoItem } from './adesao';
import { atualizarItem } from './atualizacao';
import { ItemDoAcervo } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';
import { mudancasQueAfetam } from './mudancas';

const ARTIGOS = ['art155', 'art157', 'art171', 'art180', 'art180A', 'art266'];
const REVOGADOS_NA_LEI = /^art171\.par5(\.|$)/;

const CP = import.meta.glob<string>('../../../public/acervo/decreto-lei-2848-1940.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const real = ItemDoAcervo.parse(JSON.parse(Object.values(CP)[0] ?? '{}'));
const antiga: ItemDoAcervo = {
  ...real,
  nos: real.nos.map((n) => {
    if (REVOGADOS_NA_LEI.test(n.endereco)) return { ...n, status: 'vigente' as const };
    if (!ARTIGOS.includes(n.endereco)) return n;
    return {
      ...n,
      trechos: [{ texto: 'Redação anterior à Lei 15.397/2026.' }, ...n.trechos.slice(1)],
    };
  }),
};
const nova: ItemDoAcervo = { ...real, versao: 2 };

describe('Lei 15.397/2026 sobre o Código Penal (AP-05)', () => {
  it('avisa Frase, Cartão, Estrela e Erro ligados aos artigos que a lei mexeu', async () => {
    const repo = await Repositorio.abrir({
      nomeBanco: `cp-${Math.random().toString(36).slice(2)}`,
    });
    const f1 = await FonteEmMemoria.criar([{ item: antiga }]);
    const f2 = await FonteEmMemoria.criar([{ item: nova }]);
    const [e1] = (await f1.listar()).itens;
    const [e2] = (await f2.listar()).itens;
    if (!e1 || !e2) throw new Error('índice vazio');
    const adesao = await aderirAoItem(repo, f1, e1);
    if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
    const ds = await repo.colecao('dispositivos').todosDoUsuario();
    const id = (e: string) => ds.find((d) => d.endereco === e)?.id ?? '';

    const frases = new Map<string, string>();
    for (const e of [...ARTIGOS, 'art155.nome']) {
      const f = await repo.colecao('frases').criar({
        texto: `Frase sobre ${e}`,
        origemTipo: 'trecho',
        trecho: { dispositivoId: id(e), versaoId: adesao.versaoId, texto: 'x', inicio: 0, fim: 1 },
        estado: 'ativa',
        proximaRevisao: '2026-10-30',
      });
      frases.set(e, f.id);
    }
    // O Cartão do art. 180 vem da Frase; o do 180-A, direto do dispositivo.
    await repo.colecao('cartoes').criar({
      frente: 'Pena da receptação?',
      verso: 'x',
      origemTipo: 'frase',
      fraseId: frases.get('art180'),
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: '2026-10-30',
    });
    await repo.colecao('cartoes').criar({
      frente: 'Receptação qualificada?',
      verso: 'x',
      origemTipo: 'dispositivo',
      origemId: id('art180A'),
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: '2026-10-30',
    });
    await repo.colecao('estrelas').criar({
      normaId: adesao.normaId,
      alvoId: id('art266'),
      origemTipo: 'direta',
    });
    await repo.colecao('erros').criar({
      resultado: 'errou',
      oQueFoi: 'Confundi a pena do furto',
      status: 'aberto',
      dispositivoId: id('art155'),
    });
    const frase171p5 = await repo.colecao('frases').criar({
      texto: 'Estelionato: representação',
      origemTipo: 'trecho',
      trecho: {
        dispositivoId: id('art171.par5'),
        versaoId: adesao.versaoId,
        texto: 'x',
        inicio: 0,
        fim: 1,
      },
      estado: 'ativa',
      proximaRevisao: '2026-10-30',
    });

    const r = await atualizarItem(repo, f2, e2);
    if (r.estado !== 'atualizada') throw new Error('não atualizou');

    const mudancas = await mudancasQueAfetam(repo, adesao.normaId);
    const porEndereco = new Map(mudancas.map((m) => [m.endereco, m]));
    for (const e of ARTIGOS) expect(porEndereco.has(e), e).toBe(true);
    expect(porEndereco.has('art171.par5')).toBe(true);
    expect(
      porEndereco
        .get('art180')
        ?.afetados.map((a) => a.tipo)
        .sort(),
    ).toEqual(['cartao', 'frase']);
    expect(
      porEndereco
        .get('art180A')
        ?.afetados.map((a) => a.tipo)
        .sort(),
    ).toEqual(['cartao', 'frase']);
    expect(
      porEndereco
        .get('art266')
        ?.afetados.map((a) => a.tipo)
        .sort(),
    ).toEqual(['estrela', 'frase']);
    expect(
      porEndereco
        .get('art155')
        ?.afetados.map((a) => a.tipo)
        .sort(),
    ).toEqual(['erro', 'frase']);
    expect(porEndereco.get('art180')?.antes).toContain('Redação anterior');
    // Uma pendência de aviso por dispositivo, e nenhum texto da pessoa mudou.
    const avisos = (await repo.colecao('pendenciasReleitura').todosDoUsuario()).filter(
      (p) => p.tipo === 'texto_alterado',
    );
    expect(avisos).toHaveLength(mudancas.length);
    expect((await repo.colecao('frases').obter(frase171p5.id))?.texto).toBe(
      'Estelionato: representação',
    );
    // Reaplicar não duplica: a versão já é a vigente.
    expect((await atualizarItem(repo, f2, e2)).estado).toBe('em_dia');
    repo.fechar();
  });
});
