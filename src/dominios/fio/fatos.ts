// Os fatos do pouso: o que ficou de cada passo, em frases curtas e sem placar ("Leu os arts. 112 e
// 113 (LEP)", "Lembrou 2 de 3"). Passo pulado não deixa fato: pular não custa nada. As frases não
// levam artigo antes do nome da norma ou da matéria (do CP, da LEP), que não tem gênero fixo.
import type { ArtigoNoPasso, Etapa, Fechamento, Passo } from './tipos';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** "e" antes do último: "112", "112 e 113", "5, 6 e 7". */
function lista(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1) ?? ''}`;
}

const ROTULO_DE_ARTIGO = /^art\.\s*/i;

function oQueLeu(artigos: readonly ArtigoNoPasso[], tituloCurto: string): string {
  const todosArtigos = artigos.every((a) => ROTULO_DE_ARTIGO.test(a.rotulo));
  if (artigos.length === 1 && todosArtigos) {
    return `Leu o art. ${(artigos[0] as ArtigoNoPasso).rotulo.replace(ROTULO_DE_ARTIGO, '')} (${tituloCurto})`;
  }
  if (todosArtigos) {
    return `Leu os arts. ${lista(artigos.map((a) => a.rotulo.replace(ROTULO_DE_ARTIGO, '')))} (${tituloCurto})`;
  }
  return `Leu ${plural(artigos.length, 'dispositivo', 'dispositivos')} (${tituloCurto})`;
}

/** O fato de um passo fechado; `undefined` quando não fica nada (pulado, ou nada guardado). */
export function fatoDoPasso(passo: Passo, f: Fechamento): string | undefined {
  if (f.como === 'pulado') return undefined;
  if (passo.tipo === 'ler') {
    if ('adicionarNorma' in passo)
      return f.como === 'feito' ? 'Adicionou a lei da matéria' : undefined;
    return oQueLeu(passo.artigos, passo.tituloCurto);
  }
  if (f.como !== 'feito') return undefined;
  const r = f.resultado;
  switch (r.tipo) {
    case 'lembrar': {
      const total = r.acertos + new Set(r.erros).size;
      if (total <= 0) return undefined;
      const guardou = new Set(r.guardados ?? []).size;
      const lembrou = `Lembrou ${String(r.acertos)} de ${String(total)}`;
      return guardou > 0 ? `${lembrou}, guardou ${plural(guardou, 'Frase', 'Frases')}` : lembrou;
    }
    case 'guardar':
      return r.guardadas > 0 ? `Guardou ${plural(r.guardadas, 'Frase', 'Frases')}` : undefined;
    case 'revisar':
      if (r.revisados <= 0) return undefined;
      return r.voltamAmanha > 0
        ? `Revisou ${String(r.revisados)}, ${plural(r.voltamAmanha, 'volta', 'voltam')} amanhã`
        : `Revisou ${String(r.revisados)}`;
    case 'fixar_sumula':
      return passo.tipo === 'fixar_sumula' ? `${passo.rotulo} no caderno` : undefined;
    case 'praticar': {
      if (passo.tipo !== 'praticar' || r.total <= 0) return undefined;
      const conta = `${String(r.acertos)} de ${String(r.total)}`;
      if (passo.modo === 'ache_o_erro') return `Achou o erro em ${conta}`;
      return r.acertos >= r.total ? `Passou a porteira (${conta})` : `Fez a porteira (${conta})`;
    }
    case 'ache_a_diferenca': {
      if (passo.tipo !== 'ache_a_diferenca') return undefined;
      const [a, b] = [passo.a.rotulo, passo.b.rotulo];
      const entre =
        ROTULO_DE_ARTIGO.test(a) && ROTULO_DE_ARTIGO.test(b)
          ? `os arts. ${a.replace(ROTULO_DE_ARTIGO, '')} e ${b.replace(ROTULO_DE_ARTIGO, '')}`
          : `${a} e ${b}`;
      return r.achadas > 0
        ? `Achou a diferença entre ${entre} (${passo.tituloCurto})`
        : `Comparou ${entre} (${passo.tituloCurto})`;
    }
    case 'seu_passo': {
      if (passo.tipo !== 'seu_passo') return undefined;
      const questoes =
        r.questoes !== undefined && r.questoes > 0
          ? `, com ${plural(r.questoes, 'questão', 'questões')}`
          : '';
      return `Fez: ${passo.titulo}${questoes}`;
    }
    default:
      return undefined;
  }
}

/** Os fatos da etapa, na ordem dos passos. */
export function fatosDoPouso(e: Etapa): string[] {
  return e.passos.flatMap((p, i) => {
    const f = e.fechados[i];
    const fato = f ? fatoDoPasso(p, f) : undefined;
    return fato === undefined ? [] : [fato];
  });
}
