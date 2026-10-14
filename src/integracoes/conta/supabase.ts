// Implementação Supabase do ServicoDeConta (F4-A, A3; T27). ÚNICO arquivo que importa
// `@supabase/supabase-js`; só é carregado por `import()` quando a pessoa abre "Entrar" ou volta do
// login (fora do pacote inicial). Telas conhecem apenas `ServicoDeConta`.
import {
  AuthApiError,
  createClient,
  isAuthRetryableFetchError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { FalhaDeConta, type ServicoDeConta, type SessaoDeConta } from './interface';
import {
  CHAVE_PUBLICAVEL,
  RETORNO_DESENVOLVIMENTO,
  RETORNO_PRODUCAO,
  URL_SUPABASE,
} from './projeto';

const CHAVE_DE_ARMAZENAMENTO = 'arretado-auth';

function paraSessao(sessao: Session | null): SessaoDeConta | null {
  if (!sessao?.user.email) return null;
  return { uid: sessao.user.id, email: sessao.user.email };
}

/** Endereço de retorno do OAuth: precisa estar na lista permitida do painel (plano §4.2). */
function enderecoDeRetorno(): string {
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return local ? RETORNO_DESENVOLVIMENTO : RETORNO_PRODUCAO;
}

/** Traduz erro do Supabase em motivo que a tela sabe explicar, sem vazar texto técnico. */
export function traduzirErro(erro: unknown): FalhaDeConta {
  if (erro instanceof FalhaDeConta) return erro;
  const texto = erro instanceof Error ? erro.message.toLowerCase() : '';
  if (texto.includes('não foi liberado') || texto.includes('nao foi liberado')) {
    return new FalhaDeConta('sem-convite', 'Este e-mail ainda não foi liberado para o Arretado.');
  }
  if (
    isAuthRetryableFetchError(erro) ||
    texto.includes('failed to fetch') ||
    texto.includes('network')
  ) {
    return new FalhaDeConta('sem-rede', 'Sem conexão. Você continua estudando sem conta.');
  }
  if (erro instanceof AuthApiError) {
    if (erro.status === 429) {
      return new FalhaDeConta(
        'recusado',
        'Muitas tentativas. Espere alguns minutos e tente de novo.',
      );
    }
    if (erro.status === 400 || erro.status === 401 || erro.status === 403 || erro.status === 422) {
      return new FalhaDeConta('invalido', 'Código inválido ou vencido.');
    }
  }
  return new FalhaDeConta('indisponivel', 'Não foi possível falar com o servidor agora.');
}

export class ServicoDeContaSupabase implements ServicoDeConta {
  private readonly cliente: SupabaseClient;

  constructor(cliente?: SupabaseClient) {
    this.cliente =
      cliente ??
      createClient(URL_SUPABASE, CHAVE_PUBLICAVEL, {
        auth: {
          flowType: 'pkce',
          // Roteador por hash (T3): quem trata o `?code=` é `concluirRetorno`, antes do roteador.
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
          storageKey: CHAVE_DE_ARMAZENAMENTO,
        },
      });
  }

  async sessao(): Promise<SessaoDeConta | null> {
    try {
      const { data } = await this.cliente.auth.getSession();
      return paraSessao(data.session);
    } catch {
      // Sem rede ou sessão vencida: estudo local segue; só o que precisa de servidor desliga.
      return null;
    }
  }

  async entrarComGoogle(): Promise<void> {
    const { error } = await this.cliente.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: enderecoDeRetorno() },
    });
    if (error) throw traduzirErro(error);
  }

  async pedirCodigoPorEmail(email: string): Promise<void> {
    const { error } = await this.cliente.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw traduzirErro(error);
  }

  async confirmarCodigo(email: string, codigo: string): Promise<SessaoDeConta> {
    const { data, error } = await this.cliente.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codigo.trim(),
      type: 'email',
    });
    if (error) throw traduzirErro(error);
    const sessao = paraSessao(data.session);
    if (!sessao) throw new FalhaDeConta('invalido', 'Código inválido ou vencido.');
    return sessao;
  }

  async concluirRetorno(url: string): Promise<SessaoDeConta | null> {
    const codigo = new URL(url).searchParams.get('code');
    if (!codigo) return null;
    const { data, error } = await this.cliente.auth.exchangeCodeForSession(codigo);
    if (error) throw traduzirErro(error);
    return paraSessao(data.session);
  }

  async aceitarTermos(versao: string): Promise<void> {
    const { error } = await this.cliente.schema('arretado').rpc('aceitar_termos', { versao });
    if (error) throw new FalhaDeConta('indisponivel', 'Não foi possível registrar o aceite agora.');
  }

  async sair(): Promise<void> {
    // Só este aparelho; "sair de todos" é do pacote A5.
    await this.cliente.auth.signOut({ scope: 'local' });
  }

  excluirConta(): Promise<void> {
    return Promise.reject(
      new FalhaDeConta('indisponivel', 'Excluir a conta chega no próximo pacote.'),
    );
  }

  aoMudar(ouvinte: (sessao: SessaoDeConta | null) => void): () => void {
    const { data } = this.cliente.auth.onAuthStateChange((_evento, sessao) => {
      ouvinte(paraSessao(sessao));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }
}
