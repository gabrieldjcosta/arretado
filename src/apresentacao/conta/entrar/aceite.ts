import {
  registrarConsentimento,
  registrarConsentimentoNoServidor,
} from '../../../core/preferencias';
import { RegistroDeContas, type Repositorio } from '../../../core/persistencia';

// O aceite do login acontece ANTES de a conta existir no Aparelho (e o login pelo Google sai da
// página). Por isso o clique em "Entrar" deixa uma marca com o instante; ao abrir o banco da
// conta, a marca vira `Usuario.consentimentos` e some.
const CHAVE = 'arretado:aceite-login-pendente';

export function marcarAceiteDoLogin(agora: Date = new Date()): void {
  try {
    localStorage.setItem(CHAVE, agora.toISOString());
  } catch {
    // Sem armazenamento: o Google não consegue concluir sem aceite registrado, e o código por e-mail usa o estado da tela.
  }
}

export function aceiteDoLoginPendente(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function descartarAceiteDoLogin(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar.
  }
}

/**
 * Passa o aceite pendente para o banco da conta ativa. Só grava se o banco aberto é mesmo o da
 * conta ativa (nunca no banco "sem conta"); caso contrário, a marca fica para a próxima vez.
 */
export async function registrarAceitePendente(
  repo: Repositorio,
  registro: RegistroDeContas = new RegistroDeContas(),
): Promise<boolean> {
  const instante = aceiteDoLoginPendente();
  if (!instante) return false;
  const ativa = await registro.contaAtiva();
  if (ativa?.nomeBanco !== repo.db.name) return false;
  const data = new Date(instante);
  await registrarConsentimento(repo, 'login', Number.isNaN(data.getTime()) ? new Date() : data);
  await registrarConsentimentoNoServidor('login');
  descartarAceiteDoLogin();
  return true;
}
