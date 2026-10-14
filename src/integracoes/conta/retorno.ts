// Retorno do login pelo Google (PKCE, plano §4.2): roda em main.tsx ANTES do roteador por hash.
// Troca o `?code=` por sessão, abre/cria o banco da conta (usuarioId = uid), limpa a URL e leva a #/conta.
import { entrarNaConta } from '../../core/persistencia';
import { FalhaDeConta, type ServicoDeConta, type SessaoDeConta } from './interface';

export type ResultadoDoRetorno = 'sem-codigo' | 'entrou' | 'falhou';

export interface DependenciasDoRetorno {
  servico: ServicoDeConta;
  /** Padrão: `window.location.href`. */
  url?: string;
  /** Troca a URL sem recarregar nem criar entrada no histórico. */
  substituirUrl?: (novo: string) => void;
  entrar?: (sessao: SessaoDeConta) => Promise<void>;
}

const substituirPadrao = (novo: string) => {
  window.history.replaceState(null, '', novo);
};

export async function tratarRetornoDoLogin(
  deps: DependenciasDoRetorno,
): Promise<ResultadoDoRetorno> {
  const url = new URL(deps.url ?? window.location.href);
  const veioErro = url.searchParams.has('error') || url.searchParams.has('error_description');
  if (!url.searchParams.has('code') && !veioErro) return 'sem-codigo';
  const substituir = deps.substituirUrl ?? substituirPadrao;
  const entrar = deps.entrar ?? ((s: SessaoDeConta) => entrarNaConta(s));
  const limpa = `${url.origin}${url.pathname}`;
  // O código é de uso único e não pode ficar na barra de endereço nem no histórico.
  substituir(`${limpa}#/conta/entrar?erro=indisponivel`);
  if (veioErro) return 'falhou';
  try {
    const sessao = await deps.servico.concluirRetorno(url.href);
    if (!sessao) return 'falhou';
    await entrar(sessao);
    substituir(`${limpa}#/conta`);
    return 'entrou';
  } catch (erro) {
    const motivo = erro instanceof FalhaDeConta ? erro.motivo : 'indisponivel';
    substituir(`${limpa}#/conta/entrar?erro=${motivo}`);
    return 'falhou';
  }
}
