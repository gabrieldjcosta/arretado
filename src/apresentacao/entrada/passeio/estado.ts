// A máquina do Passeio (D-D10, contrato §6 e §9): em que tela a Chegada está e para onde cada controle
// leva. Pura, para os testes conferirem cada saída sem montar a tela. As telas são três: as Boas-vindas,
// os quatro passos (um por menu) e o Começar. Fechar a folha é o destino `'fechar'`.
import { BOAS_VINDAS, COMECAR, PASSOS, progressoDoPasso } from './passos';

export type Tela = { tipo: 'boas' } | { tipo: 'passo'; indice: number } | { tipo: 'comecar' };
export type Destino = Tela | 'fechar';

export const TELA_BOAS: Tela = { tipo: 'boas' };
export const TELA_COMECAR: Tela = { tipo: 'comecar' };
export const PRIMEIRO_PASSO: Tela = { tipo: 'passo', indice: 0 };

export interface Roteiro {
  /**
   * Refeito (Ajuda › "Rever as boas-vindas", Conta › "Passeio pelos menus"): o último passo diz
   * "Concluir", o Começar não aparece e nada se grava. Na primeira vez, o passeio termina no Começar.
   */
  revisao: boolean;
  /** De onde o passeio abriu: das Boas-vindas ou direto no primeiro passo (Conta). */
  origem: 'boas' | 'passo';
}

const ULTIMO = PASSOS.length - 1;

/** "Vamos": das Boas-vindas ao primeiro passo. */
export const aoVamos = (): Destino => PRIMEIRO_PASSO;

/** "Seguir" (e "Concluir", no último passo do passeio refeito). */
export function aoSeguir(tela: Tela, { revisao }: Roteiro): Destino {
  if (tela.tipo !== 'passo') return 'fechar';
  if (tela.indice < ULTIMO) return { tipo: 'passo', indice: tela.indice + 1 };
  return revisao ? 'fechar' : TELA_COMECAR;
}

/** "Voltar": ao passo de antes; do primeiro, às Boas-vindas ou, vindo de Conta, de volta ao app. */
export function aoVoltar(tela: Tela, { origem }: Roteiro): Destino {
  if (tela.tipo !== 'passo') return 'fechar';
  if (tela.indice > 0) return { tipo: 'passo', indice: tela.indice - 1 };
  return origem === 'boas' ? TELA_BOAS : 'fechar';
}

/** "Pular o passeio": na primeira vez vai ao Começar; refeito, fecha. */
export const aoPular = ({ revisao }: Roteiro): Destino => (revisao ? 'fechar' : TELA_COMECAR);

/** Esc: num passo é "Pular o passeio"; nas Boas-vindas e no Começar fecha a folha. */
export function aoEsc(tela: Tela, roteiro: Roteiro): Destino {
  return tela.tipo === 'passo' ? aoPular(roteiro) : 'fechar';
}

/** O que o leitor de tela ouve a cada tela nova (a região `role="status"` da Chegada). */
export function anuncioDaTela(tela: Tela): string {
  if (tela.tipo === 'boas') return BOAS_VINDAS.nome;
  if (tela.tipo === 'comecar') return COMECAR.titulo;
  const passo = PASSOS[tela.indice];
  return passo === undefined ? '' : `${progressoDoPasso(tela.indice)}: ${passo.nome}`;
}
