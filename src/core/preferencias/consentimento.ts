import type { Repositorio } from '../persistencia';

/** Versão da política de privacidade em vigor com conta (docs/politica/politica-de-privacidade-v3.md). */
export const VERSAO_POLITICA = 'v3';

/** O que a pessoa aceitou: entrar na conta, guardar cópia cifrada na nuvem, ou sincronizar entre aparelhos. */
export type EscopoDeConsentimento = 'login' | 'backup-nuvem' | 'sincronizar';

/** Política que cobre a sincronização entre aparelhos (F4-B); ainda não publicada, então só vale com a v4. */
export const VERSAO_POLITICA_SINCRONIZACAO = 'v4';

// O modelo (Usuario.consentimentos) não tem campo de escopo e o esquema não sobe aqui: o escopo
// vai junto da versão, "v3:login" (cabe nos 20 caracteres de `versaoPolitica`).
const chave = (escopo: EscopoDeConsentimento) =>
  `${escopo === 'sincronizar' ? VERSAO_POLITICA_SINCRONIZACAO : VERSAO_POLITICA}:${escopo}`;

async function usuarioDoAparelho(repo: Repositorio) {
  const [usuario] = await repo.colecao('usuarios').todosDoUsuario();
  if (!usuario) throw new Error('Usuário não encontrado neste aparelho.');
  return usuario;
}

export async function temConsentimento(
  repo: Repositorio,
  escopo: EscopoDeConsentimento,
): Promise<boolean> {
  const usuario = await usuarioDoAparelho(repo);
  return usuario.consentimentos.some((c) => c.versaoPolitica === chave(escopo));
}

/** Registra o aceite no Aparelho (idempotente por versão e escopo). Não usa rede. */
export async function registrarConsentimento(
  repo: Repositorio,
  escopo: EscopoDeConsentimento,
  agora: Date = new Date(),
): Promise<void> {
  const usuario = await usuarioDoAparelho(repo);
  if (usuario.consentimentos.some((c) => c.versaoPolitica === chave(escopo))) return;
  await repo.colecao('usuarios').atualizar(usuario.id, {
    consentimentos: [
      ...usuario.consentimentos,
      { versaoPolitica: chave(escopo), aceitoEm: agora.toISOString() },
    ],
  });
}

/** Porta para entrar/enviar cópia: sem aceite registrado, falha e nada acontece. */
export async function exigirConsentimento(
  repo: Repositorio,
  escopo: EscopoDeConsentimento,
): Promise<void> {
  if (!(await temConsentimento(repo, escopo))) {
    throw new Error(`Falta o consentimento (${escopo}) para esta ação.`);
  }
}

/**
 * Porta nula para o aceite no servidor (RPC `aceitar_termos`, que fica em supabase/ e aguarda
 * decisão do Gabriel). Hoje não faz nada; quando a RPC for liberada, é aqui que ela liga.
 */
export async function registrarConsentimentoNoServidor(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura da porta futura
  _escopo: EscopoDeConsentimento,
): Promise<void> {
  await Promise.resolve();
}
