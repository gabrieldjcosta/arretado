import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Falha } from './estados';

interface Props {
  children: ReactNode;
}

/**
 * Última rede de proteção da interface: um erro de renderização (ou o pacote de uma tela que não
 * baixou) não deixa a página em branco. Os dados ficam no IndexedDB, então basta recarregar.
 */
export class LimiteDeErro extends Component<Props, { falhou: boolean }> {
  override state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  override componentDidCatch(erro: unknown, info: ErrorInfo) {
    console.error('Falha de renderização', erro, info.componentStack);
  }

  override render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <main className="conteudo">
        <Falha
          oQue="Esta tela não abriu."
          oQueFazer="Recarregue a página. Se repetir, exporte seus dados em Conta › Dados e relate o problema."
        />
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Recarregar
        </button>
      </main>
    );
  }
}
