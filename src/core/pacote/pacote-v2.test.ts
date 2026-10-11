// Pacote v2 (gerado pelo app da 9.1 à 8.9, sem `vetado` no status) aberto no app v3 (F2, 8.10).
import { strToU8, unzipSync, zipSync } from 'fflate';
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
  // Coleção nascida depois (v4) não existia no pacote v2.
  delete a['dados/vinculosDisciplina.json'];
  Reflect.deleteProperty(m.arquivos, 'dados/vinculosDisciplina.json');
  Reflect.deleteProperty(m.contagens, 'vinculosDisciplina');
  delete a['dados/pendenciasReleitura.json'];
  Reflect.deleteProperty(m.arquivos, 'dados/pendenciasReleitura.json');
  Reflect.deleteProperty(m.contagens, 'pendenciasReleitura');
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
