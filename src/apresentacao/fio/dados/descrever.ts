// O que a tela diz de um passo: título, apoio e minutos. Texto curto, sem cobrança (nada de "falta",
// "atrasado"): o Fio mostra o que vem, não o que ficou para trás.
import type { ArtigoNoPasso, Passo, PorQueLer, PorQuePraticar } from '../../../dominios/fio';

export interface DescricaoDoPasso {
  titulo: string;
  apoio: string;
  /** Ausente quando o tempo depende da pessoa (o passo dela, a escolha da lei). */
  minutos?: number;
}

const ROTULO_DE_ARTIGO = /^art\.\s*/i;

/** "Art. 112", "Arts. 112 e 113", "Arts. 112, 113 e mais 3". */
export function rotuloDosArtigos(artigos: readonly ArtigoNoPasso[]): string {
  const primeiro = artigos[0];
  if (!primeiro) return '';
  if (!artigos.every((a) => ROTULO_DE_ARTIGO.test(a.rotulo))) {
    return artigos.length === 1 ? primeiro.rotulo : `${String(artigos.length)} dispositivos`;
  }
  const numeros = artigos.map((a) => a.rotulo.replace(ROTULO_DE_ARTIGO, ''));
  if (numeros.length === 1) return `Art. ${numeros[0] ?? ''}`;
  if (numeros.length <= 3) {
    return `Arts. ${numeros.slice(0, -1).join(', ')} e ${numeros.at(-1) ?? ''}`;
  }
  return `Arts. ${numeros.slice(0, 2).join(', ')} e mais ${String(numeros.length - 2)}`;
}

const PORQUE_DE_LER: Record<PorQueLer, string> = {
  mapa: 'um dos que mais caem',
  codigo: 'na ordem do código',
  pesou: 'o que mais pesou nos seus erros',
};

const PORQUE_DE_PRATICAR: Record<PorQuePraticar, string> = {
  fim_do_mapa: 'você chegou ao fim do que mais cai',
  quarta_etapa: 'para fixar o que leu',
  reta_final: 'reta final da prova',
  complemento: 'para fechar a etapa',
};

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/** Cartões e Frases a revisar, três por minuto: uma conta honesta, não uma promessa. */
const minutosParaRevisar = (quantidade: number) => Math.max(1, Math.ceil(quantidade / 3));

export function descreverPasso(passo: Passo, materia: string): DescricaoDoPasso {
  switch (passo.tipo) {
    case 'ler': {
      if ('adicionarNorma' in passo) {
        return {
          titulo: `Adicionar a lei de ${materia}`,
          apoio: 'Sem ela, o Fio não tem o que ler nesta matéria',
        };
      }
      return {
        titulo: `${passo.tituloCurto}, ${rotuloDosArtigos(passo.artigos)}`,
        apoio: `${materia} · ${PORQUE_DE_LER[passo.porque]}`,
        minutos: Math.max(1, passo.artigos.length),
      };
    }
    case 'lembrar':
      return {
        titulo: `Lembrar ${passo.tituloCurto}`,
        apoio: `${materia} · ${String(passo.artigos.length)} ${plural(passo.artigos.length, 'artigo', 'artigos')} que você acabou de ler`,
        minutos: 1,
      };
    case 'guardar':
      return {
        titulo: 'Guardar as Frases',
        apoio: `${materia} · só o que valeu a pena guardar`,
        minutos: 1,
      };
    case 'revisar':
      return {
        titulo: `Revisar ${String(passo.quantidade)} ${plural(passo.quantidade, 'item', 'itens')}`,
        apoio: `${materia} · chegou a hora de ver de novo`,
        minutos: minutosParaRevisar(passo.quantidade),
      };
    case 'fixar_sumula':
      return { titulo: `Fixar ${passo.rotulo}`, apoio: `${materia} · para ter à mão`, minutos: 1 };
    case 'praticar':
      return {
        titulo: passo.modo === 'porteira' ? 'Porteira' : 'Ache o erro',
        apoio: `${materia} · ${PORQUE_DE_PRATICAR[passo.porque]}`,
        minutos: Math.max(1, Math.ceil(passo.quantidade / 2)),
      };
    case 'seu_passo':
      return { titulo: passo.titulo, apoio: 'Do seu fio' };
  }
}
