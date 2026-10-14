// Sair da conta (F4-A, A5; plano §6): "manter" deixa o banco da conta no aparelho; "apagar daqui"
// remove o banco (e os espaços) dele. Trocar de conta só muda a conta ativa; o app recarrega.
import { RegistroDeContas, type ContaDoAparelho, type Repositorio } from '../persistencia';
import { apagarTudo } from './apagar';

export interface OpcoesSair {
  /** Padrão: o registro de contas do navegador. */
  registro?: RegistroDeContas;
  /** `true` = "Apagar daqui" (aparelho emprestado). Padrão: manter os dados. */
  apagarDados?: boolean;
}

/**
 * Tira a conta de ativa. Ordem de segurança: o registro é atualizado ANTES de apagar o banco, para
 * que uma falha no meio nunca deixe "conta ativa" apontando para um banco inexistente (o app
 * recriaria um banco sem `usuarioId = uid`). Banco órfão que sobrar é inofensivo e apagável de novo.
 */
export async function sairDaConta(repo: Repositorio, opcoes: OpcoesSair = {}): Promise<void> {
  const registro = opcoes.registro ?? new RegistroDeContas();
  const ativa = await registro.contaAtiva();
  if (!ativa || ativa.nomeBanco !== repo.db.name) {
    throw new Error('O banco aberto não é o de uma conta ativa; nada foi alterado.');
  }
  if (opcoes.apagarDados) {
    await registro.esquecer(ativa.uid);
    await apagarTudo(repo);
  } else {
    await registro.desativar();
    repo.fechar();
  }
}

/** Trocar de conta já conhecida no aparelho (sem rede). Quem chama recarrega o app. */
export async function trocarDeConta(
  uid: string,
  opcoes: { registro?: RegistroDeContas } = {},
): Promise<ContaDoAparelho> {
  const registro = opcoes.registro ?? new RegistroDeContas();
  const conhecida = (await registro.listar()).find((c) => c.uid === uid.toLowerCase());
  if (!conhecida) throw new Error('Conta desconhecida neste aparelho.');
  return registro.ativar(conhecida.uid, { email: conhecida.email });
}
