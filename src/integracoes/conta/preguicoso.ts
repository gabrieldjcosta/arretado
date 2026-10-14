// Serviço de conta que só carrega o Supabase quando alguém o usa (fora do pacote inicial, plano §4.4).
import type { ServicoDeConta, SessaoDeConta } from './interface';

type Carregador = () => Promise<ServicoDeConta>;

export class ServicoDeContaPreguicoso implements ServicoDeConta {
  private real: Promise<ServicoDeConta> | undefined;

  constructor(private readonly carregar: Carregador) {}

  private servico(): Promise<ServicoDeConta> {
    this.real ??= this.carregar();
    return this.real;
  }

  async sessao() {
    return (await this.servico()).sessao();
  }
  async entrarComGoogle() {
    await (await this.servico()).entrarComGoogle();
  }
  async pedirCodigoPorEmail(email: string) {
    await (await this.servico()).pedirCodigoPorEmail(email);
  }
  async confirmarCodigo(email: string, codigo: string) {
    return (await this.servico()).confirmarCodigo(email, codigo);
  }
  async concluirRetorno(url: string) {
    return (await this.servico()).concluirRetorno(url);
  }
  async aceitarTermos(versao: string) {
    await (await this.servico()).aceitarTermos(versao);
  }
  async sair() {
    await (await this.servico()).sair();
  }
  async excluirConta() {
    await (await this.servico()).excluirConta();
  }
  aoMudar(ouvinte: (sessao: SessaoDeConta | null) => void): () => void {
    let cancelado = false;
    let cancelar = () => {};
    void this.servico().then((s) => {
      if (cancelado) return;
      cancelar = s.aoMudar(ouvinte);
    });
    return () => {
      cancelado = true;
      cancelar();
    };
  }
}
