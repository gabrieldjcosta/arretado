import { FalhaDeConta, type ServicoDeConta } from './interface';

const INDISPONIVEL = 'Contas ainda não estão disponíveis nesta versão.';

/** Serviço sem conta: o app de hoje. Toda operação de entrada recusa com `indisponivel`. */
export class ServicoDeContaNulo implements ServicoDeConta {
  sessao() {
    return Promise.resolve(null);
  }
  entrarComGoogle(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  pedirCodigoPorEmail(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  confirmarCodigo(): Promise<never> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  concluirRetorno() {
    return Promise.resolve(null);
  }
  aceitarTermos(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  sair() {
    return Promise.resolve();
  }
  excluirConta(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  listarCopias(): Promise<never> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  enviarCopia(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  baixarCopia(): Promise<never> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  apagarCopia(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  aoMudar() {
    return () => {};
  }
}
