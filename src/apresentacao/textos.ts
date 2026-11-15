// Textos fixos de tela que valem em mais de um lugar (revisão de design N-5, guia de voz item 7).

/** Aviso integral (D6): fica em Conta › Dados. */
export const AVISO_DE_RESPONSABILIDADE =
  'Você é responsável por exportar e importar os próprios dados. Arquivos alterados fora do aplicativo não passam na validação e não podem ser restaurados.';

/**
 * Mapa único dos nomes das telas de antes que seguem no Fio (D-D5, mantido na D-D7): a pessoa lê Trilha e
 * Fixar; as rotas e os identificadores seguem `plano` e `recall` (glossário, "Rótulos do menu"). O Hoje saiu
 * com a casca das quatro áreas: a raiz é o Agora.
 */
export const ROTULO_DA_AREA = {
  plano: 'Trilha',
  recall: 'Fixar',
  biblioteca: 'Biblioteca',
} as const;
