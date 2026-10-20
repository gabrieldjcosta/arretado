// Quando abrem a Chegada e a Entrada do Dia (D-D9). Aqui só se decide, lendo; quem abre é que grava
// (`Chegada` e `Entrada`), na hora em que a folha de fato aparece. Tudo o que é do aparelho vai no
// localStorage, como a escrita do nome: só o Dia, sem esquema, sem rede, sem dado de estudo.
import { dataCivil, horaCivil } from '../../core/datas';
import type { Repositorio } from '../../core/persistencia';
import { obterPreferencias } from '../../core/preferencias';
import { resumoDoDia } from '../../dominios/dia/fechar';
import { situacaoDeRetorno } from '../../dominios/dia/retorno';
import { hoje } from '../../dominios/recall/servico';
import { gravarJson, lerJson } from '../plano/armazenamento';
import { conteudoDoDia, type ConteudoDoDia } from './conteudo';

export const CHAVE_CHEGADA = 'arretado:chegada:v1';
export const CHAVE_ENTRADA = 'arretado:entrada-do-dia:v1';

export type Abertura =
  | { tipo: 'chegada'; dia: string }
  | { tipo: 'entrada'; dia: string; saudacao: string; conteudo: ConteudoDoDia };

export function chegadaJaVista(): boolean {
  return lerJson(CHAVE_CHEGADA) !== null;
}

/** A Entrada já abriu neste Dia (ou num posterior, se o relógio andou para trás). */
export function entradaJaAbriu(dia: string): boolean {
  const bruto = lerJson(CHAVE_ENTRADA);
  const visto =
    typeof bruto === 'object' && bruto !== null ? (bruto as { dia?: unknown }).dia : null;
  return typeof visto === 'string' && visto >= dia;
}

export function lembrarDaEntrada(dia: string): void {
  gravarJson(CHAVE_ENTRADA, { dia });
}

/** A Chegada é uma vez por aparelho, e a Entrada não abre no mesmo Dia dela. */
export function lembrarDaChegada(dia: string): void {
  gravarJson(CHAVE_CHEGADA, { vista: true });
  lembrarDaEntrada(dia);
}

/** "Bom dia", "Boa tarde" ou "Boa noite" pela hora civil (`HH:mm`, a de Brasília, T14). */
export function saudacaoDaHora(hora: string): string {
  const h = Number(hora.slice(0, 2));
  if (h >= 5 && h < 12) return 'Bom dia';
  return h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Este Aparelho nasceu hoje: a primeira abertura dele, e não uma volta a um aparelho de sempre. */
async function aparelhoNasceuHoje(repo: Repositorio, dia: string): Promise<boolean> {
  const aparelho = await repo.colecao('aparelhos').obter(repo.ctx.aparelhoId);
  return aparelho !== undefined && dataCivil(new Date(aparelho.criadoEm)) === dia;
}

/**
 * O que abre agora, se algo abre. A ordem é a das regras: nunca duas vezes no mesmo Dia; nunca com o
 * Dia fechado; a Chegada, só no aparelho que nasceu hoje e ainda não a viu; a Entrada, nunca com
 * Sessão aberta, com o Retorno à vista ou com o "só estudo" ligado, e só se o conteúdo carregar.
 */
export async function decidir(repo: Repositorio): Promise<Abertura | undefined> {
  const dia = hoje(repo);
  if (entradaJaAbriu(dia)) return undefined;
  const resumo = await resumoDoDia(repo);
  if (resumo.dia?.fechadoEm) return undefined;
  if (!chegadaJaVista() && (await aparelhoNasceuHoje(repo, dia))) return { tipo: 'chegada', dia };
  const [retorno, preferencias] = await Promise.all([
    situacaoDeRetorno(repo),
    obterPreferencias(repo),
  ]);
  if (resumo.sessaoAberta || retorno || preferencias.modoSoEstudo === true) return undefined;
  const conteudo = await conteudoDoDia(dia);
  if (conteudo === undefined) return undefined;
  return {
    tipo: 'entrada',
    dia,
    saudacao: saudacaoDaHora(horaCivil(repo.ctx.agora())),
    conteudo,
  };
}

// Abertura a frio = a primeira vez que o Hoje monta com este repositório (um por carga da página). Voltar
// ao Hoje depois, ou o Dia virar com o app aberto, não decide de novo.
const jaDecidiram = new WeakSet<Repositorio>();

export function decidirNaAberturaAFrio(repo: Repositorio): Promise<Abertura | undefined> {
  if (jaDecidiram.has(repo)) return Promise.resolve(undefined);
  jaDecidiram.add(repo);
  return decidir(repo);
}
