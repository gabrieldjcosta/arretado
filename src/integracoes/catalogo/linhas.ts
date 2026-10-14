// Ponte do catálogo para a importação de pontos: o B2 usa estas linhas em `prepararPontos`.
import type { Faixa } from '../../core/modelo';
import {
  chaveDeNome,
  disciplinasDoEdital,
  type EditalDoCatalogo,
  type FaixaDoCatalogo,
} from '../../dominios/catalogo';
import type { LinhaPonto } from '../pontos/csv';

const FAIXA_DO_MODELO: Record<FaixaDoCatalogo, Faixa> = {
  Altíssima: 'altissima',
  Alta: 'alta',
  Média: 'media',
  Baixa: 'extra',
};

/**
 * Linhas no formato da importação de pontos (`prepararPontos`), para as disciplinas escolhidas de um
 * edital. A faixa só vai quando o edital a traz com base; sem base, fica sem faixa.
 */
export function linhasDoEdital(
  edital: EditalDoCatalogo,
  escolhidas?: ReadonlySet<string>,
): LinhaPonto[] {
  const linhas: LinhaPonto[] = [];
  for (const { disciplina, nome } of disciplinasDoEdital(edital)) {
    if (escolhidas && !escolhidas.has(chaveDeNome(nome))) continue;
    for (const item of disciplina.itens) {
      const linha: LinhaPonto = { disciplina: nome, titulo: item.assunto };
      if (item.numero) linha.codigo = item.numero;
      if (item.faixa && item.obsFaixa) linha.faixa = FAIXA_DO_MODELO[item.faixa];
      linhas.push(linha);
    }
  }
  return linhas;
}
