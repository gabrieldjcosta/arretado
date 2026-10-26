// Se a pessoa já abriu o Mapa da norma alguma vez neste aparelho: a chamada do Leitor deixa de
// explicar o que ele é (a dica some e a linha volta a caber numa só). Conveniência do aparelho, nunca
// sincroniza; sem armazenamento, a dica só continua aparecendo.
const CHAVE = 'arretado:mapa-visitado:v1';

export function jaVisitouOMapa(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function lembrarVisitaAoMapa(): void {
  try {
    localStorage.setItem(CHAVE, '1');
  } catch {
    // sem armazenamento: a dica continua
  }
}
