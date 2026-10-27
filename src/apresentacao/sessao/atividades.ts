// Tipos de atividade da Sessão (questões, lei, material próprio, jurisprudência): rótulo, para onde
// levar a pessoa e qual sugerir. Só estrutura; o texto de tela fica nos componentes.
import type { AtividadeDeSessao } from '../../core/modelo';

export const ATIVIDADES: readonly { id: AtividadeDeSessao; rotulo: string }[] = [
  { id: 'questoes', rotulo: 'Questões' },
  { id: 'lei', rotulo: 'Ler a lei' },
  { id: 'material', rotulo: 'Material próprio' },
  { id: 'jurisprudencia', rotulo: 'Jurisprudência' },
];

export const rotuloDaAtividade = (a: AtividadeDeSessao) =>
  ATIVIDADES.find((x) => x.id === a)?.rotulo ?? a;

/**
 * O que sugerir: a leitura que está em curso pede "Ler a lei"; sem leitura, a última atividade que a
 * pessoa escolheu; sem nada disso, questões.
 */
export function atividadeSugerida(
  temLeituraSalva: boolean,
  ultima: AtividadeDeSessao | null,
): AtividadeDeSessao {
  if (temLeituraSalva) return 'lei';
  return ultima ?? 'questoes';
}

/** A tela onde a atividade acontece; `/sessao/atual` quando a própria Sessão é a tela (questões, material). */
export function rotaDaAtividade(a: AtividadeDeSessao, normaId?: string): string {
  switch (a) {
    case 'lei':
      return normaId === undefined ? '/biblioteca' : `/biblioteca/normas/${normaId}`;
    case 'jurisprudencia':
      return '/biblioteca/precedentes';
    case 'questoes':
    case 'material':
      return '/sessao/atual';
  }
}
