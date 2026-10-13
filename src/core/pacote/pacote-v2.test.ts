// Pacote v2 (gerado pelo app da 9.1 à 8.9, sem `vetado` no status) aberto no app v3 (F2, 8.10).
import { strToU8, unzipSync, zipSync } from 'fflate';
import { NOMES_COLECOES, versaoDeOrigem } from '../modelo';
import { camposMinimos } from '../modelo/fabrica';
import { Repositorio, VERSAO_ESQUEMA } from '../persistencia';
import { deBytes } from './bytes';
import { exportarPacote, hashDoConjunto } from './exportar';
import { PacoteRecusado, type Manifesto } from './formato';
import { aplicar, planejar, type ModoEscrita } from './importar';
import { lerPacote } from './ler';

const nomeBanco = () => `v2-${Math.random().toString(36).slice(2)}`;

/** Troca a `versaoEsquema` do manifesto (o resto do formato é o mesmo entre a v2 e a v3). */
async function comVersao(bytes: Uint8Array, versaoEsquema: number): Promise<Uint8Array> {
  const a = unzipSync(bytes);
  const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
  m.versaoEsquema = versaoEsquema;
  // Coleções nascidas depois da versão pedida (v4, v5, v6) não existiam no pacote.
  for (const nome of NOMES_COLECOES.filter((n) => versaoDeOrigem(n) > versaoEsquema)) {
    Reflect.deleteProperty(a, `dados/${nome}.json`);
    Reflect.deleteProperty(m.arquivos, `dados/${nome}.json`);
    Reflect.deleteProperty(m.contagens, nome);
  }
  m.hashConjunto = await hashDoConjunto(m.arquivos);
  a['manifesto.json'] = strToU8(JSON.stringify(m));
  return zipSync(a);
}

/**
 * Uma norma com um parágrafo como a gravação anterior à 8.10 o deixava (`vigente`, com o texto
 * "(VETADO)") e, se `comVetado`, outro com o status da v3.
 */
async function comVetados({ comVetado = true } = {}) {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const norma = await repo.colecao('normas').criar(camposMinimos('normas', ''));
  const versao = await repo
    .colecao('versoesNorma')
    .criar({ ...camposMinimos('versoesNorma', norma.id), status: 'vigente' });
  const paragrafo = (endereco: string, ordem: number, status: 'vigente' | 'vetado') =>
    repo.colecao('dispositivos').criar({
      normaId: norma.id,
      endereco,
      categoria: 'normativo',
      tipo: 'paragrafo',
      ordem,
      status,
      confianca: 'alta',
    });
  const antigo = await paragrafo('art1.par1', 1, 'vigente');
  const novo = comVetado ? await paragrafo('art1.par2', 2, 'vetado') : undefined;
  for (const d of novo ? [antigo, novo] : [antigo]) {
    await repo.colecao('textosDispositivo').criar({
      versaoId: versao.id,
      dispositivoId: d.id,
      normaId: norma.id,
      trechos: [{ texto: '(VETADO)' }],
    });
  }
  return { repo, antigo, novo };
}

async function importar(repo: Repositorio, bytes: Uint8Array, modo: ModoEscrita) {
  const pacote = await lerPacote(bytes);
  return aplicar(repo, pacote, await planejar(repo, pacote, { modo }));
}

describe('pacote v2 no app v3 (8.10)', () => {
  it('o app v3 gera pacote v3, e o vetado vai nele como está', async () => {
    const { repo, novo } = await comVetados();
    const { bytes } = await exportarPacote(repo);
    const lido = await lerPacote(bytes);
    expect(lido.manifesto.versaoEsquema).toBe(VERSAO_ESQUEMA);
    const status = lido.registros.get('dispositivos')?.find((d) => d.id === novo?.id)?.status;
    expect(status).toBe('vetado');
    repo.fechar();
  });

  it('pacote sem `vetado` (v2) restaura integral (modo 6): o vigente com "(VETADO)" fica como estava', async () => {
    // O app v2 não tinha o valor: o pacote dele só traz o vetado gravado como vigente.
    const origem = await comVetados({ comVetado: false });
    const { bytes } = await exportarPacote(origem.repo);
    const v2 = await comVersao(bytes, 2);
    expect((await lerPacote(v2)).manifesto.versaoEsquema).toBe(2);
    const destino = await comVetados();
    await importar(destino.repo, v2, 6);
    const d = destino.repo.comUsuario(origem.repo.ctx.usuarioId);
    const dispositivos = await d.colecao('dispositivos').todosDoUsuario();
    expect(dispositivos.map((x) => [x.id, x.status])).toEqual([[origem.antigo.id, 'vigente']]);
    const textos = await d.colecao('textosDispositivo').todosDoUsuario();
    expect(textos.find((t) => t.dispositivoId === origem.antigo.id)?.trechos).toEqual([
      { texto: '(VETADO)' },
    ]);
    origem.repo.fechar();
    destino.repo.fechar();
  });

  it('pacote v2 por mesclagem (modo 2) entra sem tocar no vetado local', async () => {
    // O backup v2 foi feito antes da 8.10; depois dela, o mesmo aparelho gravou um vetado.
    const { repo, antigo } = await comVetados({ comVetado: false });
    const { bytes } = await exportarPacote(repo);
    const novo = await repo.colecao('dispositivos').criar({
      normaId: antigo.normaId,
      endereco: 'art1.par2',
      categoria: 'normativo',
      tipo: 'paragrafo',
      ordem: 2,
      status: 'vetado',
      confianca: 'alta',
    });
    await importar(repo, await comVersao(bytes, 2), 2);
    expect((await repo.colecao('dispositivos').obter(novo.id))?.status).toBe('vetado');
    expect((await repo.colecao('dispositivos').obter(antigo.id))?.status).toBe('vigente');
    repo.fechar();
  });

  it('pacote de esquema posterior ao app é recusado antes de ler os registros ("atualize o app")', async () => {
    // Assim o app v2 recusa o pacote v3: pela versão, não pelo primeiro `vetado` (arquivo alterado).
    const { repo } = await comVetados();
    const { bytes } = await exportarPacote(repo);
    const erro = await lerPacote(await comVersao(bytes, VERSAO_ESQUEMA + 1)).catch(
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(PacoteRecusado);
    expect((erro as PacoteRecusado).motivo).toBe('versao_posterior');
    repo.fechar();
  });
});

describe('pacote v5 no app v6 (Frases 1, revisão independente)', () => {
  /** Erro e a Frase dele, como o `registrarErro` do domínio grava (core não importa domínio). */
  async function registrarErro(repo: Repositorio, { fraseCorreta }: { fraseCorreta: string }) {
    const erro = await repo
      .colecao('erros')
      .criar({ resultado: 'errou', fraseCorreta, status: 'aberto' });
    await repo.colecao('frases').criar({
      texto: fraseCorreta,
      origemTipo: 'erro',
      erroId: erro.id,
      estado: 'ativa',
      proximaRevisao: '2026-10-14',
    });
    return erro;
  }
  async function excluirErro(repo: Repositorio, id: string) {
    await repo.colecao('erros').excluir(id);
    const f = await repo.db.tabela('frases').where('erroId').equals(id).first();
    if (f) await repo.colecao('frases').excluir(f.id);
  }
  async function comErros() {
    const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const fica = await registrarErro(repo, { fraseCorreta: 'Quinze dias.' });
    const sai = await registrarErro(repo, { fraseCorreta: 'Cinco dias.' });
    return { repo, fica, sai };
  }
  const ativas = async (repo: Repositorio) =>
    (await repo.colecao('frases').todosDoUsuario()).filter((f) => f.excluidoEm === null);

  it('substituir módulos (modo 5) com pacote v5 mantém a Frase de cada erro que fica', async () => {
    const { repo, fica, sai } = await comErros();
    const ids = async () => (await ativas(repo)).map((f) => [f.erroId, f.id]).sort();
    const antes = await ids();
    const v5 = await comVersao((await exportarPacote(repo)).bytes, 5);
    // Depois do backup: um erro novo, fora do pacote; a restauração o exclui, e a Frase dele também.
    const novo = await registrarErro(repo, { fraseCorreta: 'Depois do backup.' });
    await importar(repo, v5, 5);
    // As Frases de quem fica são as mesmas (id e histórico), não cópias; nenhuma sobra órfã.
    expect(await ids()).toEqual(antes);
    expect(antes.map(([e]) => e).sort()).toEqual([fica.id, sai.id].sort());
    expect((await repo.db.tabela('erros').get(novo.id))?.excluidoEm).toBeTruthy();
    const daNova = await repo.db.tabela('frases').where('erroId').equals(novo.id).first();
    expect(daNova?.excluidoEm).toBeTruthy();
    repo.fechar();
  });

  it('erro excluído depois do backup v5 volta com Frase ao substituir módulos', async () => {
    const { repo, sai } = await comErros();
    const v5 = await comVersao((await exportarPacote(repo)).bytes, 5);
    await excluirErro(repo, sai.id);
    await importar(repo, v5, 5);
    expect((await ativas(repo)).filter((f) => f.erroId === sai.id).map((f) => f.texto)).toEqual([
      'Cinco dias.',
    ]);
    repo.fechar();
  });

  it('pacote v6 vai e volta (modo 6) sem perder Frase nem revisão de frase', async () => {
    const { repo } = await comErros();
    const [frase] = await ativas(repo);
    await repo.colecao('revisoesFrase').criar(camposMinimos('revisoesFrase', frase?.id ?? ''));
    const { bytes } = await exportarPacote(repo);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    await importar(destino, bytes, 6);
    const d = destino.comUsuario(repo.ctx.usuarioId);
    for (const nome of ['erros', 'frases', 'revisoesFrase'] as const) {
      expect(await d.colecao(nome).todosDoUsuario()).toEqual(
        await repo.colecao(nome).todosDoUsuario(),
      );
    }
    repo.fechar();
    destino.fechar();
  });
});

describe('pacote v6 no app v7 e v7 de ida e volta (F3, P0)', () => {
  it('pacote v6 (sem tarefasDeEstudo) restaura no app v7 sem recusa e deixa as tarefas locais vazias', async () => {
    const origem = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    await origem.colecao('sessoes').criar(camposMinimos('sessoes', origem.ctx.usuarioId));
    const { bytes } = await exportarPacote(origem);
    const v6 = await comVersao(bytes, 6);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    await importar(destino, v6, 6);
    const d = destino.comUsuario(origem.ctx.usuarioId);
    expect(await d.colecao('sessoes').todosDoUsuario()).toEqual(
      await origem.colecao('sessoes').todosDoUsuario(),
    );
    expect(await d.colecao('tarefasDeEstudo').contar()).toBe(0);
    origem.fechar();
    destino.fechar();
  });

  it('pacote v7 vai e volta (modo 6) com tarefas, Sessão e preferências novas', async () => {
    const origem = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const mae = await origem
      .colecao('tarefasDeEstudo')
      .criar({ ...camposMinimos('tarefasDeEstudo', origem.ctx.usuarioId), estado: 'dividida' });
    await origem.colecao('tarefasDeEstudo').criar({
      ...camposMinimos('tarefasDeEstudo', origem.ctx.usuarioId),
      paiId: mae.id,
      autoria: 'sugerida',
      razao: 'Revisão vencida',
      estimativaMin: 15,
    });
    await origem.colecao('sessoes').criar({
      ...camposMinimos('sessoes', origem.ctx.usuarioId),
      fronteira: 'até o art. 15',
      proximoPasso: 'Ler os arts. 16 a 20',
      estacionamento: [{ texto: 'ver depois', em: '2026-10-13T12:00:00.000Z' }],
      tarefaId: mae.id,
    });
    const { bytes } = await exportarPacote(origem);
    expect((await lerPacote(bytes)).manifesto.versaoEsquema).toBe(VERSAO_ESQUEMA);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    await importar(destino, bytes, 6);
    const d = destino.comUsuario(origem.ctx.usuarioId);
    for (const nome of ['tarefasDeEstudo', 'sessoes'] as const) {
      expect(await d.colecao(nome).todosDoUsuario()).toEqual(
        await origem.colecao(nome).todosDoUsuario(),
      );
    }
    origem.fechar();
    destino.fechar();
  });
});
