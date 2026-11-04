// O que o Destino e o Agora dizem da jornada em palavras: a matéria em que a pessoa está e quanto do que mais cai
// nela já é dela. Fica fora do componente do Destino para o Agora não puxar o mapa junto.
import type { EntradaDaJornada } from './jornada';

/** A matéria em que a pessoa está, a do último pouso (ou a da vez). */
export const materiaAtual = (entrada: EntradaDaJornada | undefined) =>
  entrada?.materias.find((m) => m.id === entrada.atualId);

/** Quanto do que mais cai na matéria atual a pessoa já leu (artigos que o Fio conhece dela). */
export function resumoDoMapa(entrada: EntradaDaJornada | undefined) {
  const artigos = entrada?.artigos ?? [];
  const materia = materiaAtual(entrada);
  if (!entrada || !materia || artigos.length === 0) return undefined;
  const lidos = artigos.filter((a) => a.lido).length;
  return { nome: materia.nome, percentual: Math.round((100 * lidos) / artigos.length) };
}
