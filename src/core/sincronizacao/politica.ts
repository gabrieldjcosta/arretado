// O que sobe e o que fica no aparelho (F4-B, plano §5 e decisão Q3 de 25/10). Vale para o envio e
// para a recepção: o que não sincroniza também não entra na cadeia de `base_ts` do registro.
import type { NomeColecao } from '../modelo';
import type { Alteracao } from '../persistencia';

/**
 * Coleções que nunca saem do aparelho. `usuarios` leva `consentimentos`, que valem para o aparelho
 * onde a pessoa aceitou; e nasce com o mesmo id (o da conta) em todo aparelho, o que daria Conflito
 * garantido na primeira sincronização. `snapshots` e `espacos` descrevem coisas que só existem
 * neste aparelho (`snapshotsConteudo`; o banco isolado `nomeBanco`): o registro sozinho seria um
 * ponto de restauração que o outro aparelho não abre, e a poda de um apagaria o ponto do outro.
 */
export const COLECOES_SO_LOCAIS: readonly NomeColecao[] = ['usuarios', 'snapshots', 'espacos'];

/** Campos de aparência que cada aparelho guarda só para si (Q3). Metas e perfil de estudo sincronizam. */
export const CAMPOS_DO_APARELHO: Partial<Record<NomeColecao, readonly string[]>> = {
  preferencias: ['tema', 'fonteLeitura', 'tamanhoFonte', 'reguaDeLeitura'],
};

/** Carimbos que toda edição troca; sozinhos não são mudança de conteúdo. */
export const CAMPOS_DE_CARIMBO: readonly string[] = ['tsLogico', 'atualizadoEm'];

export function ehSoLocal(colecao: string): boolean {
  return (COLECOES_SO_LOCAIS as readonly string[]).includes(colecao);
}

function camposLocais(colecao: string): readonly string[] {
  return CAMPOS_DO_APARELHO[colecao as NomeColecao] ?? [];
}

type EntradaDoLog = Pick<Alteracao, 'colecao' | 'operacao' | 'dados' | 'removidos'>;

/**
 * Esta entrada do log entra na sincronização? Não, se a coleção é só local ou se a edição mexeu
 * apenas em campos do aparelho (ex.: trocar o tema).
 */
export function sincroniza(a: EntradaDoLog): boolean {
  if (ehSoLocal(a.colecao)) return false;
  if (a.operacao !== 'atualizar') return true;
  const locais = camposLocais(a.colecao);
  if (locais.length === 0) return true;
  const tocados = [...Object.keys(a.dados ?? {}), ...(a.removidos ?? [])];
  return tocados.some((k) => !locais.includes(k) && !CAMPOS_DE_CARIMBO.includes(k));
}

/** `dados` e `removidos` sem os campos do aparelho (o que sai de `atualizar`; `gravar` leva tudo). */
export function semCamposDoAparelho(a: EntradaDoLog): Pick<EntradaDoLog, 'dados' | 'removidos'> {
  const locais = camposLocais(a.colecao);
  if (locais.length === 0 || a.operacao !== 'atualizar') {
    return { dados: a.dados, removidos: a.removidos };
  }
  const dados = a.dados
    ? Object.fromEntries(Object.entries(a.dados).filter(([k]) => !locais.includes(k)))
    : undefined;
  const removidos = a.removidos?.filter((k) => !locais.includes(k));
  return { dados, removidos: removidos?.length ? removidos : undefined };
}

/** Do registro de cá, só os campos do aparelho (a recepção os preserva sobre o que vem de lá). */
export function soCamposDoAparelho(
  colecao: string,
  registro: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(registro).filter(([k]) => camposLocais(colecao).includes(k)),
  );
}
