import { camposMinimos } from '../modelo/fabrica';
import type { Repositorio } from '../persistencia';
import { RECEPCAO_VAZIA } from '../../testes/servidor-vazio';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  CHAVE_QUARENTENA,
  CHAVE_SEQ_ENVIADO,
  MAX_ENTRADAS_POR_LOTE,
  contarPendentes,
  enviarPendentes,
  montarLotes,
  type EntradaEmQuarentena,
} from './envio';
import {
  FalhaDeSincronizacao,
  type EntradaDeEnvio,
  type RespostaDeEnvio,
  type ServidorDeSincronizacao,
} from './tipos';

/** Servidor em memória com a mesma regra de idempotência do índice único do servidor real. */
class ServidorFalso implements ServidorDeSincronizacao {
  readonly puxarLog = RECEPCAO_VAZIA.puxarLog;
  readonly lerRegistro = RECEPCAO_VAZIA.lerRegistro;
  readonly instantaneoInicio = RECEPCAO_VAZIA.instantaneoInicio;
  readonly puxarRegistros = RECEPCAO_VAZIA.puxarRegistros;
  readonly registrarSincronia = RECEPCAO_VAZIA.registrarSincronia;
  readonly pontoDaPoda = RECEPCAO_VAZIA.pontoDaPoda;
  readonly pedirPosse = RECEPCAO_VAZIA.pedirPosse;
  readonly soltarPosse = RECEPCAO_VAZIA.soltarPosse;
  readonly chamadas: EntradaDeEnvio[][] = [];
  readonly recebidas = new Map<string, EntradaDeEnvio>();
  falharNaChamada: number | null = null;
  recusar: (e: EntradaDeEnvio) => boolean = () => false;
  divergentes: RespostaDeEnvio['divergentes'] = [];

  enviarLote(
    aparelhoId: string,
    _versao: number,
    entradas: EntradaDeEnvio[],
  ): Promise<RespostaDeEnvio> {
    this.chamadas.push(entradas);
    if (this.falharNaChamada === this.chamadas.length) {
      return Promise.reject(new FalhaDeSincronizacao('sem rede', false));
    }
    if (entradas.some(this.recusar)) {
      return Promise.reject(new FalhaDeSincronizacao('conteúdo recusado', true));
    }
    for (const e of entradas) this.recebidas.set(`${aparelhoId}|${e.ts}|${e.registro_id}`, e);
    return Promise.resolve({ seq_max: this.recebidas.size, divergentes: this.divergentes });
  }
}

async function preparar() {
  const { repo } = await repositorioDeTeste();
  const identidade = (await repo.db.meta.get('identidade'))?.valor as {
    usuarioId: string;
    aparelhoId: string;
  };
  const ctx = { ...identidade, versaoEsquema: 10 };
  const novoErro = (nota?: string) =>
    repo.colecao('erros').criar({
      ...camposMinimos('erros', identidade.usuarioId),
      ...(nota ? { oQueFoi: nota } : {}),
    });
  return { repo, ctx, novoErro };
}

async function cursor(repo: Repositorio): Promise<unknown> {
  return (await repo.db.meta.get(CHAVE_SEQ_ENVIADO))?.valor;
}

describe('enviarPendentes', () => {
  it('envia o log em ordem, avança o cursor e não reenvia na rodada seguinte', async () => {
    const { repo, ctx, novoErro } = await preparar();
    const servidor = new ServidorFalso();
    const e1 = await novoErro();
    await novoErro();
    // `usuarios` nunca sai do aparelho (política); o resto do log sobe.
    const total = await repo.db.alteracoes.filter((a) => a.colecao !== 'usuarios').count();
    expect(await contarPendentes(repo.db, ctx.usuarioId, ctx.aparelhoId)).toBe(total);

    const r = await enviarPendentes(repo.db, servidor, ctx);
    expect(r.enviadas).toBe(total);
    expect(servidor.chamadas).toHaveLength(1);
    const seqs = (await repo.db.alteracoes.toArray()).map((a) => a.seq);
    expect(await cursor(repo)).toBe(Math.max(...(seqs as number[])));
    expect(await contarPendentes(repo.db, ctx.usuarioId, ctx.aparelhoId)).toBe(0);

    const r2 = await enviarPendentes(repo.db, servidor, ctx);
    expect(r2.enviadas).toBe(0);
    expect(servidor.chamadas).toHaveLength(1);
    expect(e1.id).toBeTruthy();
    repo.fechar();
  });

  it('gravar leva base_ts nulo; atualizar leva o ts da entrada anterior do registro', async () => {
    const { repo, ctx, novoErro } = await preparar();
    const servidor = new ServidorFalso();
    const e = await novoErro('a');
    await repo.colecao('erros').atualizar(e.id, { oQueFoi: 'b' });
    await enviarPendentes(repo.db, servidor, ctx);
    const doRegistro = servidor.chamadas.flat().filter((x) => x.registro_id === e.id);
    expect(doRegistro.map((x) => x.operacao)).toEqual(['gravar', 'atualizar']);
    expect(doRegistro[0]?.base_ts).toBeNull();
    expect(doRegistro[1]?.base_ts).toBe(doRegistro[0]?.ts);
    repo.fechar();
  });

  it('queda no meio: o cursor fica no último lote confirmado e retomar não duplica', async () => {
    const { repo, ctx, novoErro } = await preparar();
    for (let i = 0; i < MAX_ENTRADAS_POR_LOTE + 30; i++) await novoErro();
    const servidor = new ServidorFalso();
    servidor.falharNaChamada = 2;
    await expect(enviarPendentes(repo.db, servidor, ctx)).rejects.toThrow('sem rede');
    const pendentes = await contarPendentes(repo.db, ctx.usuarioId, ctx.aparelhoId);
    expect(pendentes).toBeGreaterThan(0);
    expect(pendentes).toBeLessThan(await repo.db.alteracoes.count());

    servidor.falharNaChamada = null;
    await enviarPendentes(repo.db, servidor, ctx);
    expect(await contarPendentes(repo.db, ctx.usuarioId, ctx.aparelhoId)).toBe(0);
    expect(servidor.recebidas.size).toBe(
      await repo.db.alteracoes.filter((a) => a.colecao !== 'usuarios').count(),
    );
    repo.fechar();
  });

  it('lotes respeitam o máximo de entradas', async () => {
    const { repo, ctx, novoErro } = await preparar();
    for (let i = 0; i < MAX_ENTRADAS_POR_LOTE * 2 + 5; i++) await novoErro();
    const servidor = new ServidorFalso();
    await enviarPendentes(repo.db, servidor, ctx);
    for (const lote of servidor.chamadas)
      expect(lote.length).toBeLessThanOrEqual(MAX_ENTRADAS_POR_LOTE);
    expect(servidor.chamadas.length).toBeGreaterThanOrEqual(3);
    repo.fechar();
  });

  it('recusa definitiva isola a entrada ruim na quarentena e envia as demais', async () => {
    const { repo, ctx, novoErro } = await preparar();
    await novoErro('boa 1');
    const ruim = await novoErro('ruim');
    await novoErro('boa 2');
    const servidor = new ServidorFalso();
    servidor.recusar = (e) => e.registro_id === ruim.id;
    const r = await enviarPendentes(repo.db, servidor, ctx);
    expect(r.quarentena).toBe(1);
    const quarentena = (await repo.db.meta.get(CHAVE_QUARENTENA))?.valor as EntradaEmQuarentena[];
    expect(quarentena).toHaveLength(1);
    const entradaRuim = (await repo.db.alteracoes.toArray()).find((a) => a.registroId === ruim.id);
    expect(quarentena[0]?.seq).toBe(entradaRuim?.seq);
    expect([...servidor.recebidas.values()].some((e) => e.registro_id === ruim.id)).toBe(false);
    expect(await contarPendentes(repo.db, ctx.usuarioId, ctx.aparelhoId)).toBe(0);
    // Nada foi apagado do log local.
    expect(entradaRuim).toBeTruthy();
    repo.fechar();
  });

  it('não envia entradas de outro usuário e repassa as divergências do servidor', async () => {
    const { repo, ctx, novoErro } = await preparar();
    await novoErro();
    await repo.db.alteracoes.add({
      ts: '1790000000000-000000-0000000a',
      aparelhoId: ctx.aparelhoId,
      usuarioId: '0199a6c4-0000-7000-8000-0000000000ff',
      colecao: 'erros',
      registroId: '0199a6c4-0000-7000-8000-0000000000fe',
      operacao: 'gravar',
      dados: { id: '0199a6c4-0000-7000-8000-0000000000fe' },
    });
    const servidor = new ServidorFalso();
    servidor.divergentes = [{ colecao: 'erros', registro_id: 'x', ts_servidor: null }];
    const r = await enviarPendentes(repo.db, servidor, ctx);
    expect([...servidor.recebidas.values()].some((e) => e.registro_id.endsWith('fe'))).toBe(false);
    expect(r.divergentes).toEqual(servidor.divergentes);
    expect(await contarPendentes(repo.db, ctx.usuarioId, ctx.aparelhoId)).toBe(0);
    repo.fechar();
  });
});

describe('montarLotes', () => {
  it('uma entrada maior que o limite de bytes fica sozinha no lote', () => {
    const grande = {
      entrada: { dados: { x: 'a'.repeat(1_100_000) } } as unknown as EntradaDeEnvio,
    };
    const pequena = { entrada: {} as EntradaDeEnvio };
    expect(montarLotes([pequena, grande, pequena])).toEqual([[pequena], [grande], [pequena]]);
  });
});
