import { useState } from 'react';
import { Link } from 'react-router';
import { BotaoGoogle } from './BotaoGoogle';
import { CONTA, ENTRADA_DIRETA } from './passos';

interface BotaoProps {
  aoSemConta: () => void;
  /** Sem a conta ligada (a compilação de teste) é a única saída da tela e leva a luz do mundo. */
  principal?: boolean;
}

/** "Continuar sem conta e salvar meus dados manualmente": a pessoa já está no Hoje, então só fecha a folha. */
export function BotaoSemConta({ aoSemConta, principal = false }: BotaoProps) {
  return (
    <button
      type="button"
      className={principal ? 'botao principal chegada-opcao' : 'botao chegada-opcao'}
      onClick={aoSemConta}
    >
      <span className="chegada-opcao-acao">{CONTA.semConta}</span>{' '}
      <span className="chegada-opcao-apoio">{CONTA.semContaApoio}</span>
    </button>
  );
}

interface Props {
  /** O id do aviso do aceite: o botão do Google se descreve por ele. */
  idDoAceite: string;
  /** Ver o que sai do Aparelho: o link leva à tela Entrar, e a folha sai do caminho. */
  aoEntrar: () => void;
  aoSemConta: () => void;
}

/**
 * Os dois botões de conta do Começar (Gabriel, 30/10), do mesmo tamanho e do mesmo peso, e a nota que os acompanha:
 * o aceite (o toque no Google vale como ele), o link para a tela Entrar e a nota do convite. Só existe com a conta
 * ligada.
 */
export function BotoesDaConta({ idDoAceite, aoEntrar, aoSemConta }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);
  return (
    <>
      <div className="chegada-conta">
        <BotaoGoogle idDoAceite={idDoAceite} aoAvisar={setAviso} />
        <BotaoSemConta aoSemConta={aoSemConta} />
      </div>
      {aviso && (
        <p className="chegada-nota" role="alert">
          {aviso}
        </p>
      )}
      <div className="chegada-notas" id={idDoAceite}>
        <p className="chegada-nota">
          {ENTRADA_DIRETA.aceite}{' '}
          <Link to="/conta/entrar" onClick={aoEntrar}>
            {ENTRADA_DIRETA.verAceite}
          </Link>
        </p>
        <p className="chegada-nota">{CONTA.nota}</p>
      </div>
    </>
  );
}
