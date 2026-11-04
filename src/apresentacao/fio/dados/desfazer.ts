// "Desfazer" do passo dado (a toast do mockup): guarda o Fio de antes do último passo, feito ou pulado,
// por poucos segundos. Desfaz só o lugar no fio (o passo volta a ser o da vez); o que o passo gravou fora do
// Fio (um artigo marcado como lido, uma tarefa concluída) fica como está. Por isso os passos que gravam algo
// que não volta não oferecem o Desfazer (ver `desfazivel`).
import type { ResultadoDoPasso } from '../../../dominios/fio';
import type { FioGuardado } from './guardado';

/** Quanto tempo o "Desfazer" vale (o aviso dura 3,2 s; o atalho do teclado ganha uma folga). */
const VALIDADE_EM_MS = 8000;

let ultimo: { usuarioId: string; antes: FioGuardado; ate: number } | undefined;
let voltou = false;

/**
 * O passo feito pode voltar atrás sem deixar rastro que a pessoa não veja? Só o que não grava nada que não
 * volta: um Lembrar que guardou Frase, por exemplo, não oferece o Desfazer. (Pular sempre oferece.)
 */
export const desfazivel = (resultado: ResultadoDoPasso): boolean => {
  switch (resultado.tipo) {
    case 'ler':
    case 'praticar':
    case 'ache_a_diferenca':
    case 'revisar':
      return true;
    case 'lembrar':
      return (resultado.guardados?.length ?? 0) === 0;
    default:
      return false;
  }
};

export function lembrarParaDesfazer(usuarioId: string, antes: FioGuardado): void {
  ultimo = { usuarioId, antes, ate: Date.now() + VALIDADE_EM_MS };
}

export function podeDesfazer(usuarioId: string): boolean {
  return ultimo?.usuarioId === usuarioId && Date.now() <= ultimo.ate;
}

/** Entrega o Fio de antes (uma vez só) e marca que o cartão volta de onde saiu. */
export function tomarParaDesfazer(usuarioId: string): FioGuardado | undefined {
  const guardado = ultimo;
  ultimo = undefined;
  if (guardado?.usuarioId !== usuarioId || Date.now() > guardado.ate) return undefined;
  voltou = true;
  return guardado.antes;
}

export function esquecerDesfazer(): void {
  ultimo = undefined;
}

/** O cartão que monta agora acaba de voltar de um "Desfazer"? Lê e apaga a marca. */
export function voltouDeUmDesfazer(): boolean {
  const era = voltou;
  voltou = false;
  return era;
}
