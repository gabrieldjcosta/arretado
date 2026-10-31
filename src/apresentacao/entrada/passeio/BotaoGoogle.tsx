import { useState } from 'react';
import { aceiteDoLoginPendente, marcarAceiteDoLogin } from '../../conta/entrar/aceite';
import { useServicoDeConta } from '../../conta/entrar/ContextoConta';
import { CONTA, ENTRADA_DIRETA } from './passos';

/**
 * O "G" de quatro cores das diretrizes de marca do Google: decorativo, o botão tem o nome em texto, e
 * as cores não se recolorem (por isso o SVG leva `fill` literal, e as cores forçadas o deixam em uma só).
 */
function LogoDoGoogle() {
  return (
    <svg className="botao-google-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

interface Props {
  /** O aviso sob os botões, lido junto com este (o toque é o aceite: quem usa leitor de tela não pode perdê-lo). */
  idDoAceite: string;
  /** Uma falha ao abrir o login (ou ao guardar o aceite): quem monta decide onde o aviso aparece. `null` o limpa. */
  aoAvisar: (aviso: string | null) => void;
}

/**
 * "Entrar com o Google e ter sincronização automática" na Chegada: abre o login do Google direto, sem passar pela
 * tela Entrar. O aviso do aceite fica logo abaixo dos botões de conta (`ENTRADA_DIRETA.aceite`) e o toque é o aceite,
 * gravado antes do desvio como na tela Entrar. Claro de dia e escuro à noite, como pedem as diretrizes do Google;
 * a primeira linha é o texto da marca, e a segunda é nossa.
 */
export function BotaoGoogle({ idDoAceite, aoAvisar }: Props) {
  const servico = useServicoDeConta();
  const [ocupado, setOcupado] = useState(false);

  const entrar = () => {
    marcarAceiteDoLogin();
    if (aceiteDoLoginPendente() === null) {
      aoAvisar(ENTRADA_DIRETA.avisoSemArmazenamento);
      return;
    }
    setOcupado(true);
    aoAvisar(null);
    servico
      .entrarComGoogle()
      .catch(() => {
        aoAvisar(ENTRADA_DIRETA.avisoDeFalha);
      })
      .finally(() => {
        setOcupado(false);
      });
  };

  return (
    <button
      type="button"
      className="botao botao-google chegada-opcao"
      onClick={entrar}
      disabled={ocupado}
      aria-describedby={idDoAceite}
    >
      <span className="chegada-opcao-acao">
        <LogoDoGoogle />
        {CONTA.google}
      </span>{' '}
      <span className="chegada-opcao-apoio">{CONTA.googleApoio}</span>
    </button>
  );
}
