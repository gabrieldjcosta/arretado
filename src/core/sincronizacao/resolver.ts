// Resolução de Conflito (F4-B, B3; plano §5): a pessoa escolhe e a escolha vira uma entrada normal
// do log, com carimbo novo e `base_ts` = a versão do servidor, que avança lá e fecha o Conflito nos
// outros aparelhos. Lógica só; as telas (Conta › Conflitos) são do B4.
import type { NomeColecao } from '../modelo';
import type { Alteracao, Repositorio } from '../persistencia';
import {
  adotarRegistro,
  registrarNoLog,
  validarRegistro,
  type DadosDaAplicacao,
} from './aplicacao';
import { pendentesDoRegistro } from './log-local';
import { dadosDaAplicacao, emitirTocadas } from './receber';
import type { ContextoDeEnvio } from './envio';

type Registro = Record<string, unknown>;

export type Escolha =
  | { tipo: 'daqui' }
  | { tipo: 'de-la' }
  /** `daqui` = campos que ficam com a versão deste aparelho; os demais vêm da versão de lá. */
  | { tipo: 'campos'; daqui: readonly string[] };

/** Há entradas deste registro ainda não enviadas: envie (Sincronizar agora) antes de escolher. */
export class ResolucaoPendenteDeEnvio extends Error {
  constructor() {
    super('Há alterações deste registro ainda não enviadas.');
    this.name = 'ResolucaoPendenteDeEnvio';
  }
}

export class ConflitoInexistente extends Error {
  constructor() {
    super('Conflito não encontrado ou já resolvido.');
    this.name = 'ConflitoInexistente';
  }
}

/** Campos que nenhuma escolha por campo troca: identidade e criação do registro. */
const FIXOS = new Set(['id', 'usuarioId', 'criadoEm']);

/** Registro de `base` com cada campo de `campos` tomado de `de` (ausente em `de` = removido). */
function comCampos(base: Registro, de: Registro, campos: readonly string[]): Registro {
  const saida = { ...base };
  for (const k of campos) {
    if (FIXOS.has(k)) continue;
    if (k in de) saida[k] = de[k];
    else Reflect.deleteProperty(saida, k);
  }
  return saida;
}

export async function resolverConflito(
  repo: Repositorio,
  ctx: Pick<ContextoDeEnvio, 'usuarioId' | 'aparelhoId' | 'agora'>,
  conflitoId: string,
  escolha: Escolha,
): Promise<void> {
  const { db } = repo;
  const tocadas = new Set<NomeColecao>();
  const x: DadosDaAplicacao = dadosDaAplicacao(repo, { ...ctx, versaoEsquema: 0 }, tocadas);
  const agora = (ctx.agora ?? repo.ctx.agora)().toISOString();

  await db.transaction('rw', db.tables, async () => {
    const c = await db.conflitos.get(conflitoId);
    if (!c || c.resolvidoEm !== undefined) throw new ConflitoInexistente();
    const nome = c.colecao;
    const id = c.registroId;
    if ((await pendentesDoRegistro(db, nome, id, ctx.aparelhoId)) > 0) {
      throw new ResolucaoPendenteDeEnvio();
    }
    const local = (await db.tabela(nome).get(id)) as Registro | undefined;
    const deles = c.deles;

    if (escolha.tipo === 'de-la') {
      // Fica a versão de lá, como se tivesse chegado normalmente (não há o que reenviar).
      if (deles) {
        await adotarRegistro(x, nome, deles, local);
        await registrarNoLog(x, {
          ts: c.tsDeles,
          aparelhoId: c.aparelhoDeles,
          colecao: nome,
          registroId: id,
          operacao: 'gravar',
          dados: deles,
        });
      } else {
        if (local) await db.tabela(nome).delete(id);
        await registrarNoLog(x, {
          ts: c.tsDeles,
          aparelhoId: c.aparelhoDeles,
          colecao: nome,
          registroId: id,
          operacao: 'remover',
        });
      }
    } else {
      // Fica (parte de) esta versão: entrada nova, partindo da versão do servidor.
      const ts = repo.ctx.relogio.tick();
      const doLado = (): Registro | undefined => {
        if (escolha.tipo === 'daqui') return local;
        if (!local) return deles ?? undefined;
        if (!deles) return local;
        return comCampos(deles, local, escolha.daqui);
      };
      const escolhido = doLado();
      const base: Pick<
        Alteracao,
        'ts' | 'aparelhoId' | 'usuarioId' | 'colecao' | 'registroId' | 'baseTs'
      > = {
        ts,
        aparelhoId: ctx.aparelhoId,
        usuarioId: ctx.usuarioId,
        colecao: nome,
        registroId: id,
        baseTs: c.tsDeles,
      };
      if (!escolhido) {
        // Mantém apagado aqui: a remoção parte da versão do servidor.
        await db.alteracoes.add({ ...base, operacao: 'remover' });
      } else {
        const v = validarRegistro(
          nome,
          { ...escolhido, tsLogico: ts, atualizadoEm: agora },
          ctx.usuarioId,
          id,
        );
        if (!v.ok) throw new Error(v.motivo);
        await db.tabela(nome).put(v.registro as never);
        const removidos = Object.keys(deles ?? {}).filter((k) => !(k in v.registro));
        await db.alteracoes.add({
          ...base,
          operacao: 'atualizar',
          dados: v.registro,
          ...(removidos.length ? { removidos } : {}),
        });
        x.tocadas.add(nome);
      }
      x.observar(ts);
    }
    x.tocadas.add(nome);
    await db.conflitos.put({ ...c, resolvidoEm: agora });
  });
  emitirTocadas(repo, tocadas);
}
