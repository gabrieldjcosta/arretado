// Serviço de conta em memória para testes (unidade e E2E): sem rede, com lista de convites.
import { FalhaDeConta, type ServicoDeConta, type SessaoDeConta } from './interface';

export class ServicoDeContaFalso implements ServicoDeConta {
  private atual: SessaoDeConta | null;
  private readonly ouvintes = new Set<(s: SessaoDeConta | null) => void>();
  readonly aceites: string[] = [];
  codigosPedidos: string[] = [];

  constructor(
    private readonly opcoes: {
      convidados?: readonly string[];
      codigoCorreto?: string;
      semRede?: boolean;
      sessao?: SessaoDeConta | null;
      uid?: string;
    } = {},
  ) {
    this.atual = opcoes.sessao ?? null;
  }

  private checarRede() {
    if (this.opcoes.semRede) throw new FalhaDeConta('sem-rede', 'Sem conexão.');
  }

  private checarConvite(email: string) {
    const convidados = this.opcoes.convidados;
    if (convidados && !convidados.includes(email.trim().toLowerCase())) {
      throw new FalhaDeConta('sem-convite', 'Este e-mail ainda não foi liberado para o Arretado.');
    }
  }

  private definir(sessao: SessaoDeConta | null) {
    this.atual = sessao;
    this.ouvintes.forEach((o) => {
      o(sessao);
    });
  }

  sessao() {
    return Promise.resolve(this.atual);
  }
  entrarComGoogle(): Promise<void> {
    return Promise.resolve().then(() => {
      this.checarRede();
    });
  }
  pedirCodigoPorEmail(email: string): Promise<void> {
    return Promise.resolve().then(() => {
      this.checarRede();
      this.checarConvite(email);
      this.codigosPedidos.push(email.trim().toLowerCase());
    });
  }
  confirmarCodigo(email: string, codigo: string): Promise<SessaoDeConta> {
    if (codigo !== (this.opcoes.codigoCorreto ?? '123456')) {
      return Promise.reject(new FalhaDeConta('invalido', 'Código inválido ou vencido.'));
    }
    const sessao = {
      uid: this.opcoes.uid ?? '55555555-5555-4555-8555-555555555555',
      email: email.trim().toLowerCase(),
    };
    this.definir(sessao);
    return Promise.resolve(sessao);
  }
  concluirRetorno(): Promise<SessaoDeConta | null> {
    return Promise.resolve(this.atual);
  }
  aceitarTermos(versao: string): Promise<void> {
    this.aceites.push(versao);
    return Promise.resolve();
  }
  sair(): Promise<void> {
    this.definir(null);
    return Promise.resolve();
  }
  excluirConta(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', 'Ainda não.'));
  }
  aoMudar(ouvinte: (sessao: SessaoDeConta | null) => void) {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }
}
