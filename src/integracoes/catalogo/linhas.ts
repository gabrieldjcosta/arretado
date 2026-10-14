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

/** Limite do título de um Ponto no modelo (`TextoCurto`); assuntos do edital podem ser maiores. */
const LIMITE_DO_TITULO = 500;

/** Assunto longo vira título curto, cortado numa palavra e marcado com reticências. */
export function tituloDoPonto(assunto: string): string {
  const texto = assunto.replace(/\s+/g, ' ').trim();
  if (texto.length <= LIMITE_DO_TITULO) return texto;
  const corte = texto.slice(0, LIMITE_DO_TITULO - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > LIMITE_DO_TITULO / 2 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

/** Identifica um assunto dentro do edital: disciplina (chave de nome) e posição na lista dela. */
export function chaveDoItem(nomeDaDisciplina: string, indice: number): string {
  return `${chaveDeNome(nomeDaDisciplina)}#${String(indice)}`;
}

/**
 * Linhas no formato da importação de pontos (`prepararPontos`), para as disciplinas escolhidas de um
 * edital. A faixa só vai quando o edital a traz com base; sem base, fica sem faixa.
 */
export function linhasDoEdital(
  edital: EditalDoCatalogo,
  escolhidas?: ReadonlySet<string>,
  /** Assuntos que a pessoa desmarcou, no formato de `chaveDoItem`. */
  dispensados?: ReadonlySet<string>,
): LinhaPonto[] {
  const linhas: LinhaPonto[] = [];
  for (const { disciplina, nome } of disciplinasDoEdital(edital)) {
    if (escolhidas && !escolhidas.has(chaveDeNome(nome))) continue;
    for (const [indice, item] of disciplina.itens.entries()) {
      if (dispensados?.has(chaveDoItem(nome, indice))) continue;
      const linha: LinhaPonto = { disciplina: nome, titulo: tituloDoPonto(item.assunto) };
      if (item.numero) linha.codigo = item.numero;
      if (item.faixa && item.obsFaixa) linha.faixa = FAIXA_DO_MODELO[item.faixa];
      linhas.push(linha);
    }
  }
  return linhas;
}
