// A primeira visita ao Destino. O mockup abre o mapa com a estrela, o "Seu destino" escrito e o mapa se revelando de
// cima só na primeira vez (`est.destinoVisto`); no app a primeira vez é a do aparelho, lembrada em `localStorage`.
// Sem armazenamento (janela privada, jsdom), vale só enquanto a aba estiver aberta.

const CHAVE = 'arretado:fio:destino-visto:v1';

let visto: boolean | undefined;

/** O Destino já foi aberto neste aparelho (ou nesta aba, sem armazenamento)? */
export function destinoJaVisto(): boolean {
  if (visto !== undefined) return visto;
  try {
    visto = window.localStorage.getItem(CHAVE) === '1';
  } catch {
    visto = false;
  }
  return visto;
}

/** O Destino abriu: a próxima visita não repete a entrada. */
export function marcarDestinoVisto(): void {
  visto = true;
  try {
    window.localStorage.setItem(CHAVE, '1');
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
}

/** Para os testes (e o E2E que quer ver a entrada de novo): esquece que já foi visto. */
export function esquecerDestinoVisto(): void {
  visto = undefined;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
}
