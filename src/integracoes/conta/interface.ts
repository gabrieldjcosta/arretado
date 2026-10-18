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

/** Uma cópia cifrada guardada em `backups/<uid>/` (A6). O servidor só vê bytes opacos. */
export interface CopiaNaNuvem {
  /** Nome dentro da pasta da conta: `AAAA-MM-DDTHH-MM-SS-<hash8>.arretado`. */
  nome: string;
  tamanho: number;
}

export interface ServicoDeConta {
  /** Sessão conhecida agora, ou `null` (sem conta ou sessão expirada). Não exige rede. */
  sessao(): Promise<SessaoDeConta | null>;
  entrarComGoogle(): Promise<void>;
  pedirCodigoPorEmail(email: string): Promise<void>;
  confirmarCodigo(email: string, codigo: string): Promise<SessaoDeConta>;
  /** Termina o retorno do login pelo Google (PKCE): troca o `?code=` da URL por sessão. `null` se a URL não traz código. */
  concluirRetorno(url: string): Promise<SessaoDeConta | null>;
  /** Registra no servidor a versão dos termos aceita (função `arretado.aceitar_termos`). */
  aceitarTermos(versao: string): Promise<void>;
  sair(): Promise<void>;
  excluirConta(): Promise<void>;
  /** Cópias cifradas na nuvem da conta com sessão (A6); sem sessão ou sem rede, recusam. */
  listarCopias(): Promise<CopiaNaNuvem[]>;
  enviarCopia(nome: string, bytes: Uint8Array): Promise<void>;
  baixarCopia(nome: string): Promise<Uint8Array>;
  apagarCopia(nome: string): Promise<void>;
  /** Avisa mudanças de sessão (entrar, sair, expirar). Devolve a função que cancela. */
  aoMudar(ouvinte: (sessao: SessaoDeConta | null) => void): () => void;
}
