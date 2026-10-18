// Os pontos do Dia (D-D7, P3): o andamento de hoje em três famílias, cada ponto com um estado real.
// Lógica pura, sem dados nem tela: o carregador do Hoje entrega os fatos e a tela desenha os pontos.
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { ROTULO_REVISAR_FRASES } from '../../dominios/hoje/proxima-acao';
import type { EstadoDoPonto } from '../componentes/PontoDeLuz';

/** Leitura (Legislação), Cartões e Frases (Recall): o que o Hoje oferece fazer, na ordem em que aparece. */
export type FamiliaDoDia = 'leitura' | 'cartoes' | 'frases';

export const FAMILIAS_DO_DIA: readonly FamiliaDoDia[] = ['leitura', 'cartoes', 'frases'];

export const ROTULO_DA_FAMILIA: Record<FamiliaDoDia, string> = {
  leitura: 'Leitura',
  cartoes: 'Cartões',
  frases: 'Frases',
};

/** O estado também em palavras (leitor de tela): a cor e a forma do ponto nunca dizem sozinhas. */
export const TEXTO_DO_ESTADO: Record<EstadoDoPonto, string> = {
  feito: 'feito hoje',
  atual: 'para agora',
  falta: 'ainda não',
};

/** A família que o Agora está oferecendo; uma Tarefa de estudo não é de uma família só. */
export function familiaDaAcao(acao: ProximaAcao | undefined): FamiliaDoDia | undefined {
  if (acao === undefined) return undefined;
  if (acao.tipo === 'leitura_salva') return 'leitura';
  if (acao.tipo === 'revisao_vencida') {
    return acao.alvo.rotulo === ROTULO_REVISAR_FRASES ? 'frases' : 'cartoes';
  }
  return undefined;
}

/** O estado dos três pontos de uma vez. */
export type EstadosDosPontos = Record<FamiliaDoDia, EstadoDoPonto>;

/**
 * Os pontos que ficaram acesos (feito) desde a última vez que o Hoje foi visto no mesmo dia: só esses
 * se animam, uma vez. O que passa a ser a vez (pela metade) aparece sem animação, e dispensar a
 * sugestão não acende nada. Sem visita anterior (a primeira do dia), nenhum: o Hoje abre quieto.
 */
export function pontosQueAcenderam(
  agora: EstadosDosPontos,
  visto: EstadosDosPontos | undefined,
): FamiliaDoDia[] {
  if (visto === undefined) return [];
  return FAMILIAS_DO_DIA.filter(
    (familia) => agora[familia] === 'feito' && visto[familia] !== 'feito',
  );
}

export interface FatosDoDia {
  /** A norma lida por último foi lida hoje. */
  leituraHoje: boolean;
  cartoesRevisadosHoje: number;
  frasesRevisadasHoje: number;
  cartoesVencidos: number;
  frasesVencidas: number;
  /** A ação que o Agora mostra (com o "Escolher outra coisa" já aplicado). */
  agora?: ProximaAcao;
}

/**
 * Feito (aceso): houve atividade hoje e nada mais está na vez. Atual (aceso pela metade): é o que o
 * Agora oferece, ou foi começado hoje e ainda há o que fazer. Falta (apagado, um anel): ainda não hoje,
 * inclusive quando nada vence: o anel não cobra, só diz que hoje ainda não houve.
 */
export function estadoDosPontos(f: FatosDoDia): EstadosDosPontos {
  const doAgora = familiaDaAcao(f.agora);
  const estado = (familia: FamiliaDoDia, houveHoje: boolean, haMais: boolean): EstadoDoPonto => {
    if (houveHoje && !haMais) return 'feito';
    if (doAgora === familia || (houveHoje && haMais)) return 'atual';
    return 'falta';
  };
  return {
    leitura: estado('leitura', f.leituraHoje, false),
    cartoes: estado('cartoes', f.cartoesRevisadosHoje > 0, f.cartoesVencidos > 0),
    frases: estado('frases', f.frasesRevisadasHoje > 0, f.frasesVencidas > 0),
  };
}
