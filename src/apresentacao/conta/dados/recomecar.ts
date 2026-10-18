import { apagarTudo } from '../../../core/pacote';
import { entrarNaConta, lerUltimoBackup, RegistroDeContas } from '../../../core/persistencia';
import type { Repositorio } from '../../../core/persistencia';

/** Regra de "apagar com cópia" (A5 e A7): vale a última cópia registrada ou a exportação confirmada. */
export const podeApagarComCopia = (ultimaCopia: string | null, exportei: boolean): boolean =>
  ultimaCopia !== null || exportei;

export interface OpcoesDeRecomecar {
  /** Padrão: o registro de contas do navegador. */
  registro?: RegistroDeContas;
  /** A pessoa confirmou que exportou e guardou o arquivo (vale como a cópia recente). */
  exportei?: boolean;
}

/**
 * "Apagar tudo e recomeçar" (Conta › Dados): apaga o banco local e volta ao estado inicial. Mesma
 * regra do "Apagar daqui" da A5: só com cópia recente ou exportação confirmada, verificada ANTES de
 * apagar qualquer coisa. Com conta, ela continua ativa e o banco renasce vazio, com `usuarioId = uid`;
 * as cópias da nuvem e a conta no servidor não são tocadas. Quem chama recarrega o app.
 */
export async function apagarTudoERecomecar(
  repo: Repositorio,
  opcoes: OpcoesDeRecomecar = {},
): Promise<void> {
  if (!podeApagarComCopia(await lerUltimoBackup(repo), opcoes.exportei === true)) {
    throw new Error('Antes de apagar, exporte uma cópia dos seus dados.');
  }
  const registro = opcoes.registro ?? new RegistroDeContas();
  const ativa = await registro.contaAtiva();
  const daConta = ativa !== null && ativa.nomeBanco === repo.db.name;
  await apagarTudo(repo);
  if (!daConta) return;
  try {
    await entrarNaConta({ uid: ativa.uid, email: ativa.email ?? '' }, { registro });
  } catch (erro) {
    // Conta ativa apontando para banco sem identidade recriaria um banco de outro dono: melhor sair.
    await registro.desativar();
    throw erro;
  }
}
