// O lembrete de backup para quem o mostra (o Hoje, a linha de retorno do Agora e a folha da Conta): o que se lê do
// Aparelho, a dispensa de 7 dias e a frase. A regra é pura e mora em `dominios/dados/lembrete-de-backup`.
import { lerUltimoBackup } from '../../core/persistencia';
import type { Repositorio } from '../../core/persistencia';

const CHAVE = 'arretado.lembreteBackup.ate';

export const lerDispensa = (): string | null => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

export const gravarDispensa = (ate: string) => {
  try {
    localStorage.setItem(CHAVE, ate);
  } catch {
    /* sem armazenamento: some só até recarregar */
  }
};

export async function carregarBackup(repo: Repositorio) {
  const [ultimoBackup, erros, cartoes] = await Promise.all([
    lerUltimoBackup(repo),
    repo.colecao('erros').contar(),
    repo.colecao('cartoes').contar(),
  ]);
  return { ultimoBackup, haDados: erros + cartoes > 0 };
}

/** `dias` como em `lembreteDeBackup`: `null` é nunca ter feito. */
export const fraseDoBackup = (dias: number | null) =>
  dias === null ? 'Você ainda não fez backup.' : `Faz ${String(dias)} dias do último backup.`;
