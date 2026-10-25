// Aplicação do que vem do servidor ao banco local (F4-B, B3; plano §5). Tudo aqui roda DENTRO de uma
// transação do chamador: nada de rede e nada de await fora do IndexedDB. O que foi aplicado entra no
// log local com o aparelho e o carimbo de quem editou (não é reenviado: `envio.ts` só sobe o que é
// deste aparelho), de modo que a cadeia de versões do registro, e com ela o `base_ts` da próxima
// edição, fica igual à do servidor.
import { ENTIDADES, NOMES_COLECOES, type NomeColecao } from '../modelo';
import type { BancoArretado, Conflito } from '../persistencia';
import { conflitoAberto, equivalentes } from './conflitos';
import { pendentesDoRegistro, ultimoTsDoRegistro } from './log-local';
import { soCamposDoAparelho } from './politica';
import type { RegistroRemoto } from './tipos';

/** Autor desconhecido: o estado veio do servidor (recarga), sem a entrada de quem o gravou. */
export const APARELHO_DO_SERVIDOR = '00000000-0000-0000-0000-000000000000';

type Registro = Record<string, unknown>;

export interface DadosDaAplicacao {
  db: BancoArretado;
  usuarioId: string;
  aparelhoId: string;
  agora: () => Date;
  novoId: () => string;
  observar: (ts: string) => void;
  /** Coleções tocadas, para um evento só por coleção depois de confirmar. */
  tocadas: Set<NomeColecao>;
}

export function ehColecao(nome: string): nome is NomeColecao {
  return (NOMES_COLECOES as readonly string[]).includes(nome);
}

/** `esquema`: o esquema deste app recusou o registro (talvez um app mais novo o escreveu); vale tentar de novo após atualizar. */
export type Validado =
  { ok: true; registro: Registro } | { ok: false; motivo: string; esquema?: true };

/** Registro como a coleção o exige e do dono e do id esperados; o que vem de fora nunca entra sem isto. */
export function validarRegistro(
  nome: NomeColecao,
  dados: unknown,
  usuarioId: string,
  id: string,
): Validado {
  const r = ENTIDADES[nome].esquema.safeParse(dados);
  if (!r.success) {
    const p = r.error.issues[0];
    return {
      ok: false,
      motivo: `registro inválido em ${nome}: ${p?.path.join('.') ?? ''} ${p?.message ?? ''}`.trim(),
      esquema: true,
    };
  }
  if (r.data.id !== id)
    return { ok: false, motivo: `id do registro difere do da entrada (${nome})` };
  if (r.data.usuarioId !== usuarioId)
    return { ok: false, motivo: `registro de outra conta (${nome})` };
  return { ok: true, registro: r.data };
}

/** Anota no log local o que foi aplicado, com a autoria original. */
export async function registrarNoLog(
  x: DadosDaAplicacao,
  a: {
    ts: string;
    aparelhoId: string;
    colecao: NomeColecao;
    registroId: string;
    operacao: 'gravar' | 'atualizar' | 'remover';
    dados?: Registro | null;
    removidos?: string[] | null;
  },
): Promise<void> {
  await x.db.alteracoes.add({
    ts: a.ts,
    aparelhoId: a.aparelhoId,
    usuarioId: x.usuarioId,
    colecao: a.colecao,
    registroId: a.registroId,
    operacao: a.operacao,
    ...(a.dados ? { dados: a.dados } : {}),
    ...(a.removidos?.length ? { removidos: a.removidos } : {}),
  });
  x.observar(a.ts);
  x.tocadas.add(a.colecao);
}

/** Guarda o registro como veio do outro lado, mantendo os campos de aparência deste aparelho. */
export async function adotarRegistro(
  x: DadosDaAplicacao,
  nome: NomeColecao,
  recebido: Registro,
  local: Registro | undefined,
): Promise<void> {
  const final = local ? { ...recebido, ...soCamposDoAparelho(nome, local) } : recebido;
  await x.db.tabela(nome).put(final as never);
}

export type DesfechoDaReconciliacao = 'aplicada' | 'ignorada' | 'conflito' | 'quarentena';

export interface ResultadoDaReconciliacao {
  desfecho: DesfechoDaReconciliacao;
  motivo?: string;
}

/**
 * O servidor tem o registro numa versão que este aparelho não alcança pela cadeia: decide entre
 * alcançar, ignorar ou abrir um Conflito.
 *  - já estamos na versão do servidor → nada a fazer;
 *  - há Conflito aberto → só atualiza o lado de lá;
 *  - sem edição pendente e atrás do servidor (ou só carimbos diferentes) → adota a versão do servidor;
 *  - senão → Conflito: o registro local fica como está até a pessoa escolher.
 * `forcarConflito` (divergência devolvida pelo envio): o aparelho NÃO está atrás, tem edição que o
 * servidor recusou; só adota se as versões forem equivalentes, nunca por ser mais antiga.
 */
export async function reconciliar(
  x: DadosDaAplicacao,
  nome: NomeColecao,
  estado: RegistroRemoto,
  aparelhoDeles: string,
  opcoes: { forcarConflito?: boolean } = {},
): Promise<ResultadoDaReconciliacao> {
  const { db } = x;
  const id = estado.id;
  const ultima = await ultimoTsDoRegistro(db, nome, id);
  if (ultima === estado.ts_logico) return { desfecho: 'ignorada' };

  const apagadaLa = estado.excluido_em !== null;
  let deles: Registro | null = null;
  if (!apagadaLa) {
    const v = validarRegistro(nome, estado.dados, x.usuarioId, id);
    if (!v.ok) return { desfecho: 'quarentena', motivo: v.motivo };
    deles = v.registro;
  }
  const local = (await db.tabela(nome).get(id)) as Registro | undefined;

  const aberto = await conflitoAberto(db, nome, id);
  if (aberto) {
    await db.conflitos.put({ ...aberto, deles, tsDeles: estado.ts_logico, aparelhoDeles });
    return { desfecho: 'conflito' };
  }

  const pendentes = await pendentesDoRegistro(db, nome, id, x.aparelhoId);
  const atras = !opcoes.forcarConflito && (ultima === null || ultima < estado.ts_logico);
  const igual = local && deles ? equivalentes(local, deles) : local === undefined && deles === null;
  if (pendentes === 0 && (atras || igual)) {
    if (deles) {
      await adotarRegistro(x, nome, deles, local);
      await registrarNoLog(x, {
        ts: estado.ts_logico,
        aparelhoId: aparelhoDeles,
        colecao: nome,
        registroId: id,
        operacao: 'gravar',
        dados: deles,
      });
    } else {
      if (local) await db.tabela(nome).delete(id);
      // Nada a registrar se o registro nunca existiu aqui e já nasceu apagado lá.
      if (local || ultima !== null) {
        await registrarNoLog(x, {
          ts: estado.ts_logico,
          aparelhoId: aparelhoDeles,
          colecao: nome,
          registroId: id,
          operacao: 'remover',
        });
      }
    }
    x.tocadas.add(nome);
    return { desfecho: 'aplicada' };
  }

  const conflito: Conflito = {
    id: x.novoId(),
    colecao: nome,
    registroId: id,
    minha: local ?? null,
    deles,
    aparelhoDeles,
    tsDeles: estado.ts_logico,
    criadoEm: x.agora().toISOString(),
  };
  await db.conflitos.add(conflito);
  return { desfecho: 'conflito' };
}
