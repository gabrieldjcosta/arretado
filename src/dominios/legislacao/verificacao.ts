// 6b (D16): "verificar atualização" pelo aparelho. Pré-checagem barata: compara a página oficial
// de agora com a versão vigente (hash da fonte sanitizada e nota de vigência mais recente). Só lê:
// nunca troca texto nem cria versão (quem decide é a pessoa; trocar texto passa pela correção 11.7).
import type { Norma, VersaoDeNorma } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { sha256 } from '../../core/util/sha256';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { estruturar } from './estruturador';
import { serializarFonte } from './registros';

type Nota = NonNullable<VersaoDeNorma['notaVigenciaMaisRecente']>;

export type ResultadoDaVerificacao =
  /** Fonte idêntica à guardada. */
  | { tipo: 'igual' }
  /** Nota de vigência mais nova que a registrada: há indício de alteração. */
  | { tipo: 'indicio'; nota: Nota; registrada?: Nota }
  /** Página diferente, mas sem nota nova: em geral formatação; a pessoa pode comparar por conta. */
  | { tipo: 'sem_indicio' };

export type MotivoSemVerificacao = 'sem_endereco' | 'sem_versao' | 'norma_inexistente';

export class VerificacaoIndisponivel extends Error {
  constructor(readonly motivo: MotivoSemVerificacao) {
    super(`Verificação indisponível: ${motivo}`);
    this.name = 'VerificacaoIndisponivel';
  }
}

/** Número do ato em "Lei nº 13.964" (13964); 0 se não houver. */
const numeroDoAto = (lei: string): number =>
  Number(/\d[\d.]*/.exec(lei)?.[0]?.replaceAll('.', '') ?? 0);

/** > 0 quando `a` é mais recente que `b` (ano, depois número do ato). */
export const compararNotas = (a: Nota, b: Nota): number =>
  a.ano - b.ano || numeroDoAto(a.lei) - numeroDoAto(b.lei);

/** Compara os blocos sanitizados da página de agora com a versão registrada. Pura (sem rede). */
export async function compararComVersao(
  versao: Pick<VersaoDeNorma, 'hash' | 'notaVigenciaMaisRecente' | 'origemEntrada'>,
  blocos: readonly Bloco[],
): Promise<ResultadoDaVerificacao> {
  if ((await sha256(serializarFonte(blocos))) === versao.hash) return { tipo: 'igual' };
  const rascunho = estruturar(blocos, {
    formato: versao.origemEntrada === 'texto' ? 'texto' : 'html',
  });
  const nova = rascunho.notaVigenciaMaisRecente;
  const registrada = versao.notaVigenciaMaisRecente;
  if (nova && (!registrada || compararNotas(nova, registrada) > 0)) {
    return { tipo: 'indicio', nota: nova, ...(registrada ? { registrada } : {}) };
  }
  return { tipo: 'sem_indicio' };
}

/** Versão vigente e endereço oficial da norma, ou o motivo de não haver o que verificar. */
export async function alvoDaVerificacao(
  repo: Repositorio,
  normaId: string,
): Promise<{ norma: Norma; versao: VersaoDeNorma; urlOficial: string }> {
  const norma = await repo.colecao('normas').obter(normaId);
  if (!norma) throw new VerificacaoIndisponivel('norma_inexistente');
  if (!norma.urlOficial) throw new VerificacaoIndisponivel('sem_endereco');
  const versao = norma.versaoVigenteId
    ? await repo.colecao('versoesNorma').obter(norma.versaoVigenteId)
    : undefined;
  if (!versao) throw new VerificacaoIndisponivel('sem_versao');
  return { norma, versao, urlOficial: norma.urlOficial };
}
