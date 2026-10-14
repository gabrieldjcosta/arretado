// Porta de conta e login (F4-A, A1; plano em docs/planos/f4a-contas.md §4).
// As telas conhecem só esta interface; o Supabase entra no pacote A3 como implementação isolada.

export interface SessaoDeConta {
  /** `auth.users.id`: vira o `usuarioId` do banco da conta. */
  uid: string;
  email: string;
}

/** Por que uma operação de conta não aconteceu (nunca bloqueia o estudo local). */
export type MotivoDeFalha = 'indisponivel' | 'sem-rede' | 'sem-convite' | 'recusado' | 'invalido';

export class FalhaDeConta extends Error {
  constructor(
    readonly motivo: MotivoDeFalha,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'FalhaDeConta';
  }
}

export interface ServicoDeConta {
  /** Sessão conhecida agora, ou `null` (sem conta ou sessão expirada). Não exige rede. */
  sessao(): Promise<SessaoDeConta | null>;
  entrarComGoogle(): Promise<void>;
  pedirCodigoPorEmail(email: string): Promise<void>;
  confirmarCodigo(email: string, codigo: string): Promise<SessaoDeConta>;
  sair(): Promise<void>;
  excluirConta(): Promise<void>;
  /** Avisa mudanças de sessão (entrar, sair, expirar). Devolve a função que cancela. */
  aoMudar(ouvinte: (sessao: SessaoDeConta | null) => void): () => void;
}
