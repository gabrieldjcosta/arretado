import { FalhaDeSincronizacao, type ServidorDeSincronizacao } from '../../core/sincronizacao';
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
  aceitarSincronizacao(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', INDISPONIVEL));
  }
  servidorDeSincronizacao(): ServidorDeSincronizacao {
    const recusa = () => Promise.reject(new FalhaDeSincronizacao(INDISPONIVEL, false));
    return {
      enviarLote: recusa,
      puxarLog: recusa,
      lerRegistro: recusa,
      instantaneoInicio: recusa,
      puxarRegistros: recusa,
      registrarSincronia: recusa,
    };
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
