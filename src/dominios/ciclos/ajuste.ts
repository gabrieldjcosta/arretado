// Sugestão de ajuste de peso pelo desempenho (plano §4). Só sugere; quem aplica é a pessoa.
import { limitarPeso, taxaDeErro, type DesempenhoDaMateria } from './pesos';

export const AMOSTRA_MINIMA = 15;
export const DIFERENCA_PARA_SUBIR = 0.15;
export const TAXA_PARA_DESCER = 0.1;

export interface MateriaComDesempenho {
  disciplinaId: string;
  nome: string;
  peso: number;
  desempenho: DesempenhoDaMateria;
  /** Taxa da janela anterior; descer exige duas janelas seguidas abaixo do limite. */
  taxaAnterior?: number;
}

export interface SugestaoDeAjuste {
  disciplinaId: string;
  de: number;
  para: number;
  razao: string;
}

const pct = (x: number) => `${String(Math.round(x * 100))}%`;

export function sugerirAjustes(materias: readonly MateriaComDesempenho[]): SugestaoDeAjuste[] {
  const amostradas = materias.filter((m) => m.desempenho.questoes >= AMOSTRA_MINIMA);
  if (amostradas.length === 0) return [];
  const media = amostradas.reduce((s, m) => s + taxaDeErro(m.desempenho), 0) / amostradas.length;

  const sugestoes: SugestaoDeAjuste[] = [];
  for (const m of amostradas) {
    const taxa = taxaDeErro(m.desempenho);
    const n = String(m.desempenho.questoes);
    let para = m.peso;
    let razao = '';
    if (taxa - media >= DIFERENCA_PARA_SUBIR) {
      para = limitarPeso(m.peso + 1);
      razao = `${m.nome}: ${pct(taxa)} de erro em ${n} questões neste mês, acima da sua média de ${pct(media)}.`;
    } else if (taxa < TAXA_PARA_DESCER && (m.taxaAnterior ?? 1) < TAXA_PARA_DESCER) {
      para = limitarPeso(m.peso - 1);
      razao = `${m.nome}: só ${pct(taxa)} de erro em ${n} questões, por duas janelas seguidas.`;
    }
    if (para !== m.peso) sugestoes.push({ disciplinaId: m.disciplinaId, de: m.peso, para, razao });
  }
  return sugestoes;
}
