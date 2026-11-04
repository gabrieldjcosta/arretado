// O que a etapa trouxe, em conteúdo (pouso em branco, ideia 8): para cada artigo lido, o rótulo e o começo do
// caput, que é o assunto dele. Quem confere o que lembrou marca isto, e não os contadores da etapa ("Leu 2 artigos",
// "Lembrou 1 de 1"), que seguem na frase de sempre.
import type { Repositorio } from '../../../core/persistencia';
import type { Etapa, Passo } from '../../../dominios/fio';
import { leiDoPasso } from './lei-do-passo';

export interface PontoDaEtapa {
  chave: string;
  /** "Art. 1º". */
  rotulo: string;
  /** O começo do caput, cortado numa palavra inteira. */
  assunto: string;
}

const LIMITE_DE_PONTOS = 6;
const TAMANHO_DO_ASSUNTO = 64;
const CAPUT = /^Art\.\s*\S+$/i;

/** O começo do texto, até `max` letras e sem partir palavra; reticências só quando cortou. */
export function assuntoDe(texto: string, max = TAMANHO_DO_ASSUNTO): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo.replace(/[.:;,\s]+$/, '');
  const corte = limpo.lastIndexOf(' ', max);
  return `${limpo.slice(0, corte > 20 ? corte : max).replace(/[.:;,\s]+$/, '')}…`;
}

type PassoLer = Extract<Passo, { tipo: 'ler'; normaId: string }>;

const eLerComLei = (p: Passo): p is PassoLer => p.tipo === 'ler' && 'normaId' in p;

/** Os artigos que a pessoa leu na etapa (passo lido, não pulado), na ordem dos passos. */
export async function pontosDaEtapa(repo: Repositorio, etapa: Etapa): Promise<PontoDaEtapa[]> {
  const saida: PontoDaEtapa[] = [];
  for (const [i, passo] of etapa.passos.entries()) {
    const fechamento = etapa.fechados[i];
    if (!eLerComLei(passo) || fechamento === undefined || fechamento.como === 'pulado') continue;
    for (const par of await leiDoPasso(repo, passo)) {
      if (!CAPUT.test(par.rotulo)) continue;
      saida.push({ chave: par.chave, rotulo: par.rotulo, assunto: assuntoDe(par.texto) });
    }
  }
  return saida.slice(0, LIMITE_DE_PONTOS);
}
