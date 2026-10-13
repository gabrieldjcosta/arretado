// Backup com normas (13.3): o CP inteiro vai e volta pelo pacote sem perda. Integral: exportar →
// apagar tudo → restaurar idêntico (normas, versões, dispositivos, textos, grifos, estrelas e a
// fonte). Só `legislacao`: o pacote leva a fonte das versões e o rascunho restaurado é retomado.
import { colecoesDoModulo } from '../../core/modelo';
import { camposMinimos } from '../../core/modelo/fabrica';
import { aplicar, exportarPacote, lerPacote, planejar } from '../../core/pacote';
import { apagarTudo } from '../../core/pacote/apagar';
import { Repositorio } from '../../core/persistencia';
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import { criarRascunho, retomarRascunho } from './servico';

const HTML = import.meta.glob<string>('../../../corpus/normas/cp.colado.html', {
  query: '?raw',
  import: 'default',
  eager: false,
});

async function repoComCp() {
  const carregar = HTML['../../../corpus/normas/cp.colado.html'];
  if (!carregar) throw new Error('sem o colado do CP');
  const { repo } = await repositorioDeTeste();
  const { norma, versao, rascunho } = await criarRascunho(repo, {
    blocos: sanitizarHtml(await carregar()).blocos,
    origemEntrada: 'html',
  });
  const dispositivo = (await repo.colecao('dispositivos').todosDoUsuario())[0]!;
  const ref = { normaId: norma.id, dispositivoId: dispositivo.id, versaoId: versao.id };
  await repo.colecao('marcacoes').criar({
    ...camposMinimos('marcacoes', norma.id),
    ...ref,
    tipo: 'grifo',
    ancora: { texto: 'Texto', inicio: 0, fim: 5 },
    status: 'valida',
  });
  await repo
    .colecao('estrelas')
    .criar({ normaId: norma.id, alvoId: dispositivo.id, origemTipo: 'direta' });
  return { repo, norma, versao, rascunho };
}

/** Tudo de `legislacao` mais os anexos, sem o dono (muda na restauração) e sem o carimbo local. */
async function retrato(repo: Repositorio) {
  const saida: Record<string, unknown[]> = {};
  for (const nome of [...colecoesDoModulo('legislacao'), 'anexos' as const]) {
    const lista = await repo.colecao(nome).todosDoUsuario();
    saida[nome] = lista
      .map((r) => ({ ...r, usuarioId: '' }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }
  const bytes = await repo.db.anexosConteudo.toArray();
  saida.conteudos = bytes.map((b) => [b.id, [...b.bytes]]).sort();
  return saida;
}

describe('backup com normas (13.3)', () => {
  it('integral: exportar → apagar tudo → restaurar idêntico, com o CP inteiro', async () => {
    const { repo, versao } = await repoComCp();
    const antes = await retrato(repo);
    expect(antes.dispositivos!.length).toBeGreaterThan(1_300);
    expect(antes.anexos).toHaveLength(1);

    const pacote = await exportarPacote(repo, { incluirAnexos: true });
    const nomeBanco = repo.db.name;
    await apagarTudo(repo);

    const novo = await Repositorio.abrir({ nomeBanco });
    expect(await novo.colecao('normas').contar()).toBe(0);
    const lido = await lerPacote(pacote.bytes);
    const previa = await planejar(novo, lido, { modo: 6 });
    const { repo: restaurado } = await aplicar(novo, lido, previa);

    expect(await retrato(restaurado)).toEqual(antes);
    expect((await retomarRascunho(restaurado, versao.id)).rascunho).toBeDefined();
  }, 180_000);

  it('só legislacao: leva a fonte das versões; rascunho restaurado é retomado', async () => {
    const { repo, versao, rascunho } = await repoComCp();
    // Um anexo que não é fonte de versão não entra no pacote.
    await repo.colecao('anexos').criar({
      nomeArquivo: 'print.png',
      tipoMime: 'image/png',
      tamanho: 1,
      hash: 'a'.repeat(64),
    });
    const antes = await retrato(repo);
    const pacote = await exportarPacote(repo, {
      escopo: { tipo: 'modulos', modulos: ['legislacao'] },
      incluirAnexos: true,
    });
    expect(pacote.manifesto.incluiAnexos).toBe(true);
    expect(pacote.manifesto.contagens.anexos).toBe(1);

    const nomeBanco = repo.db.name;
    await apagarTudo(repo);
    const novo = await Repositorio.abrir({ nomeBanco });
    const lido = await lerPacote(pacote.bytes);
    const previa = await planejar(novo, lido, { modo: 6, exigirIntegral: false });
    const { repo: restaurado } = await aplicar(novo, lido, previa);

    const depois = await retrato(restaurado);
    expect(depois.anexos).toHaveLength(1);
    expect(depois.conteudos).toHaveLength(1);
    expect({ ...depois, anexos: [], conteudos: [] }).toEqual({
      ...antes,
      anexos: [],
      conteudos: [],
    });
    expect((await retomarRascunho(restaurado, versao.id)).rascunho).toEqual(rascunho);
  }, 180_000);
});
