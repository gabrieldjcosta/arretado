// Poda do log local (F4-B, B5; plano §3). O estado mora nas tabelas; o log serve à cadeia de versões
// (`base_ts` do próximo envio), à auditoria e ao pacote exportado. Por isso a poda não apaga às cegas:
// compacta. A história velha de um registro, já confirmada pelo servidor, vira UMA entrada `gravar`
// com o estado daquele ponto, no lugar e com o carimbo da última versão que sincroniza. Assim
// `reconstruirDoLog` dá o mesmo estado, e o `base_ts` de cada registro continua o mesmo.
import { lerCarimbo } from '../ids';
import type { NomeColecao } from '../modelo';
import { OPERACAO_ADESAO, type Alteracao, type BancoArretado } from '../persistencia';
import { lerSeqEnviado } from './log-local';
import { ehSoLocal, sincroniza } from './politica';

/** Prazo de guarda do log (Gabriel, cartão do B5): o que tem mais que isso e já subiu é compactado. */
export const DIAS_DE_GUARDA_DO_LOG = 30;
/** `meta`: quando a poda local rodou pela última vez (roda no máximo uma vez por dia). */
export const CHAVE_PODA_LOCAL = 'sync.podaLocalEm';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Árvores do acervo: o registro pode nascer de uma `acervo-adesao` (sem entrada própria), e o estado
 * de antes depende da fonte do acervo. Ficam como estão.
 */
const SEM_COMPACTAR: readonly NomeColecao[] = ['dispositivos', 'textosDispositivo'];

export interface CorteDaPoda {
  /** Só entra o que o servidor já confirmou (`seq` ≤ cursor de envio). */
  ateSeq: number;
  /** Só entra o que é mais antigo que isto (ms do carimbo lógico). */
  antesDeMs: number;
}

export interface Compactacao {
  apagar: number[];
  trocar: Alteracao[];
}

/**
 * O que a poda faz num log em ordem de `seq` (pura, para o teste de propriedade). Por registro: o
 * trecho inicial que cabe no corte; dentro dele, tudo até a última entrada que sincroniza vira uma
 * só (as edições de aparência depois dela ficam). Registro cuja história não fecha sozinha (uma
 * `atualizar` sem registro antes) fica intacto, e também o que levaria embora o maior carimbo do log
 * (o relógio lógico reabre a partir dele).
 */
export function compactarLog(log: readonly Alteracao[], corte: CorteDaPoda): Compactacao {
  const porRegistro = new Map<string, Alteracao[]>();
  let maiorTs = '';
  for (const a of log) {
    if (a.ts > maiorTs) maiorTs = a.ts;
    if (a.operacao === OPERACAO_ADESAO || a.seq === undefined) continue;
    if (SEM_COMPACTAR.includes(a.colecao)) continue;
    const chave = `${a.colecao}/${a.registroId}`;
    const lista = porRegistro.get(chave);
    if (lista) lista.push(a);
    else porRegistro.set(chave, [a]);
  }

  const saida: Compactacao = { apagar: [], trocar: [] };
  for (const cadeia of porRegistro.values()) {
    const fim = cadeia.findIndex(
      (a) => (a.seq ?? Infinity) > corte.ateSeq || lerCarimbo(a.ts).ms >= corte.antesDeMs,
    );
    const trecho = fim === -1 ? cadeia : cadeia.slice(0, fim);
    let k = -1;
    for (let i = trecho.length - 1; i >= 0; i--) {
      const a = trecho[i];
      if (a && (ehSoLocal(a.colecao) || sincroniza(a))) {
        k = i;
        break;
      }
    }
    if (k < 1) continue;

    const estado = dobrar(trecho.slice(0, k + 1));
    const alvo = trecho[k];
    if (estado === undefined || !alvo) continue;
    if (trecho.slice(0, k).some((a) => a.ts === maiorTs)) continue;

    for (const a of trecho.slice(0, k)) if (a.seq !== undefined) saida.apagar.push(a.seq);
    const { seq, ts, aparelhoId, usuarioId, colecao, registroId } = alvo;
    saida.trocar.push(
      estado === null
        ? { seq, ts, aparelhoId, usuarioId, colecao, registroId, operacao: 'remover' }
        : {
            seq,
            ts,
            aparelhoId,
            usuarioId,
            colecao,
            registroId,
            operacao: 'gravar',
            dados: estado,
          },
    );
  }
  return saida;
}

/** Estado do registro depois das entradas (`null` = apagado); `undefined` se a história não fecha. */
function dobrar(entradas: readonly Alteracao[]): Record<string, unknown> | null | undefined {
  let estado: Record<string, unknown> | null = null;
  for (const a of entradas) {
    if (a.operacao === 'gravar') estado = { ...a.dados };
    else if (a.operacao === 'remover') estado = null;
    else if (estado === null) return undefined;
    else {
      const atual: Record<string, unknown> = estado;
      const novo: Record<string, unknown> = { ...atual, ...a.dados };
      for (const campo of a.removidos ?? []) Reflect.deleteProperty(novo, campo);
      estado = novo;
    }
  }
  return estado;
}

/**
 * Compacta o log local se a última poda tem mais de um dia. Só mexe no que o servidor confirmou e
 * tem mais de `DIAS_DE_GUARDA_DO_LOG` dias; pendências de envio nunca entram. Devolve quantas
 * entradas saíram.
 */
export async function podarLogLocal(
  db: BancoArretado,
  agora: () => Date,
  diasDeGuarda = DIAS_DE_GUARDA_DO_LOG,
): Promise<number> {
  const instante = agora().getTime();
  const ultima = (await db.meta.get(CHAVE_PODA_LOCAL))?.valor;
  if (typeof ultima === 'string' && instante - Date.parse(ultima) < DIA_MS) return 0;

  return db.transaction('rw', db.alteracoes, db.meta, async () => {
    const ateSeq = await lerSeqEnviado(db);
    const log = await db.alteracoes.where(':id').belowOrEqual(ateSeq).toArray();
    const { apagar, trocar } = compactarLog(log, {
      ateSeq,
      antesDeMs: instante - diasDeGuarda * DIA_MS,
    });
    if (apagar.length > 0) {
      await db.alteracoes.bulkDelete(apagar);
      await db.alteracoes.bulkPut(trocar);
    }
    await db.meta.put({ chave: CHAVE_PODA_LOCAL, valor: new Date(instante).toISOString() });
    return apagar.length;
  });
}
