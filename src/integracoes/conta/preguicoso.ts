// Serviço de conta que só carrega o Supabase quando alguém o usa (fora do pacote inicial, plano §4.4).
import type { ServidorDeSincronizacao } from '../../core/sincronizacao';
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
  async aceitarSincronizacao(versao: string) {
    await (await this.servico()).aceitarSincronizacao(versao);
  }
  servidorDeSincronizacao(): ServidorDeSincronizacao {
    return {
      enviarLote: async (aparelhoId, versaoEsquema, entradas) =>
        (await this.servico())
          .servidorDeSincronizacao()
          .enviarLote(aparelhoId, versaoEsquema, entradas),
    };
  }
  async sair() {
    await (await this.servico()).sair();
  }
  async excluirConta() {
    await (await this.servico()).excluirConta();
  }
  async listarCopias() {
    return (await this.servico()).listarCopias();
  }
  async enviarCopia(nome: string, bytes: Uint8Array) {
    await (await this.servico()).enviarCopia(nome, bytes);
  }
  async baixarCopia(nome: string) {
    return (await this.servico()).baixarCopia(nome);
  }
  async apagarCopia(nome: string) {
    await (await this.servico()).apagarCopia(nome);
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
