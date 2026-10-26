// Implementação Supabase do ServicoDeConta (F4-A, A3; T27). ÚNICO arquivo que importa
// `@supabase/supabase-js`; só é carregado por `import()` quando a pessoa abre "Entrar" ou volta do
// login (fora do pacote inicial). Telas conhecem apenas `ServicoDeConta`.
import {
  AuthApiError,
  FunctionsFetchError,
  createClient,
  isAuthRetryableFetchError,
  StorageApiError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  FalhaDeSincronizacao,
  type ChaveDeRegistro,
  type EntradaRecebida,
  type RegistroRemoto,
  type RespostaDeEnvio,
  type RespostaDePosse,
  type ServidorDeSincronizacao,
} from '../../core/sincronizacao';
import {
  FalhaDeConta,
  type CopiaNaNuvem,
  type ServicoDeConta,
  type SessaoDeConta,
} from './interface';
import {
  CHAVE_PUBLICAVEL,
  RETORNO_DESENVOLVIMENTO,
  RETORNO_PRODUCAO,
  URL_SUPABASE,
} from './projeto';

const CHAVE_DE_ARMAZENAMENTO = 'arretado-auth';
/** Bucket privado do esquema A2 (`supabase/migrations/20261014020000_f4a_contas.sql`): uma pasta por `uid`. */
const BUCKET_DE_COPIAS = 'backups';

/** Erro do Storage em motivo de tela; a cópia local nunca depende disto. */
function falhaDeCopia(erro: unknown, acao: string): FalhaDeConta {
  const texto = erro instanceof Error ? erro.message.toLowerCase() : '';
  const semRede =
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    texto.includes('failed to fetch') ||
    texto.includes('network');
  if (semRede) return new FalhaDeConta('sem-rede', `Sem conexão agora. ${acao}`);
  if (erro instanceof StorageApiError && (erro.status === 401 || erro.status === 403)) {
    return new FalhaDeConta('recusado', `A sessão venceu; entre de novo. ${acao}`);
  }
  return new FalhaDeConta('indisponivel', `Não foi possível falar com o servidor agora. ${acao}`);
}

function paraSessao(sessao: Session | null): SessaoDeConta | null {
  if (!sessao?.user.email) return null;
  return { uid: sessao.user.id, email: sessao.user.email };
}

/** Endereço de retorno do OAuth: precisa estar na lista permitida do painel (plano §4.2). */
function enderecoDeRetorno(): string {
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return local ? RETORNO_DESENVOLVIMENTO : RETORNO_PRODUCAO;
}

/**
 * Falha de `enviar_lote`: só 4xx de conteúdo (400, 409, 422) é definitiva e leva à quarentena.
 * Rede (0), sessão ou liberação (401, 403), limite (429) e 5xx tentam de novo mais tarde.
 */
export function traduzirFalhaDeEnvio(status: number): FalhaDeSincronizacao {
  const definitiva = [400, 409, 422].includes(status);
  return new FalhaDeSincronizacao(
    definitiva ? 'O servidor recusou esta alteração.' : 'Sem conexão ou servidor indisponível.',
    definitiva,
  );
}

/** Colunas de `alteracoes` que a puxada lê (plano §5); `seq` e o resto saem como `EntradaRecebida`. */
const COLUNAS_DO_LOG =
  'seq, aparelho_id, ts, colecao, registro_id, operacao, dados, removidos, base_ts, divergente, versao_esquema';
const COLUNAS_DO_REGISTRO = 'colecao, id, ts_logico, dados, excluido_em';
const SO_LETRAS = /^[A-Za-z]{2,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Leitura que falhou (rede, sessão, limite): nunca definitiva, o agendador repete com espera. */
async function lerOuFalhar<T>(
  consulta: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T | null> {
  let r;
  try {
    r = await consulta();
  } catch {
    throw new FalhaDeSincronizacao('Sem conexão.', false);
  }
  if (r.error) throw new FalhaDeSincronizacao('Sem conexão ou servidor indisponível.', false);
  return r.data as T | null;
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
  /** Token da sessão, guardado para o `fetch keepalive` de `soltarPosse` (a aba pode estar fechando). */
  private token: string | null = null;

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
    this.cliente.auth.onAuthStateChange((_evento, sessao) => {
      this.token = sessao?.access_token ?? null;
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

  async aceitarSincronizacao(versao: string): Promise<void> {
    const { error } = await this.cliente
      .schema('arretado')
      .rpc('aceitar_sincronizacao', { versao });
    if (!error) return;
    // 'não foi liberado' vem do servidor quando a conta não está em `sincronizacao_liberada`.
    throw traduzirErro(error);
  }

  servidorDeSincronizacao(): ServidorDeSincronizacao {
    return {
      enviarLote: async (aparelhoId, versaoEsquema, entradas) => {
        let resposta;
        try {
          resposta = await this.cliente.schema('arretado').rpc('enviar_lote', {
            p_aparelho: aparelhoId,
            p_versao: versaoEsquema,
            p_entradas: entradas,
          });
        } catch {
          throw new FalhaDeSincronizacao('Sem conexão.', false);
        }
        if (resposta.error) throw traduzirFalhaDeEnvio(resposta.status);
        return resposta.data as RespostaDeEnvio;
      },
      puxarLog: async (depoisDe, limite, operacao) => {
        const dados = await lerOuFalhar<EntradaRecebida[]>(() => {
          const q = this.cliente
            .schema('arretado')
            .from('alteracoes')
            .select(COLUNAS_DO_LOG)
            .gt('seq', depoisDe)
            .order('seq', { ascending: true })
            .limit(limite);
          return operacao ? q.eq('operacao', operacao) : q;
        });
        return dados ?? [];
      },
      lerRegistro: async (colecao, id) => {
        const dados = await lerOuFalhar<RegistroRemoto>(() =>
          this.cliente
            .schema('arretado')
            .from('registros')
            .select(COLUNAS_DO_REGISTRO)
            .eq('colecao', colecao)
            .eq('id', id)
            .maybeSingle(),
        );
        return dados;
      },
      instantaneoInicio: async () => {
        const dados = await lerOuFalhar<number>(() =>
          this.cliente.schema('arretado').rpc('instantaneo_inicio'),
        );
        return dados ?? 0;
      },
      puxarRegistros: async (depois: ChaveDeRegistro | null, limite: number) => {
        if (depois && (!SO_LETRAS.test(depois.colecao) || !UUID.test(depois.id))) {
          throw new FalhaDeSincronizacao('Cursor de recarga inválido.', true);
        }
        const dados = await lerOuFalhar<RegistroRemoto[]>(() => {
          const q = this.cliente
            .schema('arretado')
            .from('registros')
            .select(COLUNAS_DO_REGISTRO)
            .order('colecao', { ascending: true })
            .order('id', { ascending: true })
            .limit(limite);
          return depois
            ? q.or(
                `colecao.gt.${depois.colecao},and(colecao.eq.${depois.colecao},id.gt.${depois.id})`,
              )
            : q;
        });
        return dados ?? [];
      },
      registrarSincronia: async (aparelhoId, seqRecebido, versaoEsquema) => {
        await lerOuFalhar(() =>
          this.cliente.schema('arretado').rpc('registrar_sincronia', {
            p_aparelho: aparelhoId,
            p_seq: seqRecebido,
            p_versao: versaoEsquema,
          }),
        );
      },
      pontoDaPoda: async () => {
        const dados = await lerOuFalhar<number>(() =>
          this.cliente.schema('arretado').rpc('ponto_da_poda'),
        );
        return dados ?? 0;
      },
      pedirPosse: async (aparelhoId, forcar) => {
        const r = await lerOuFalhar<RespostaDePosse>(() =>
          this.cliente.schema('arretado').rpc('pedir_posse', {
            p_aparelho: aparelhoId,
            p_forcar: forcar,
          }),
        );
        if (!r) throw new FalhaDeSincronizacao('Sem resposta do servidor.', false);
        return r;
      },
      soltarPosse: async (aparelhoId) => {
        // Chamado ao esconder ou fechar a aba: `keepalive` deixa o pedido sair mesmo com a página indo embora.
        if (this.token === null) return;
        await fetch(`${URL_SUPABASE}/rest/v1/rpc/soltar_posse`, {
          method: 'POST',
          keepalive: true,
          headers: {
            apikey: CHAVE_PUBLICAVEL,
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Content-Profile': 'arretado',
          },
          body: JSON.stringify({ p_aparelho: aparelhoId }),
        });
      },
    };
  }

  async sair(): Promise<void> {
    // Só este aparelho; "sair de todos" é do pacote A5.
    await this.cliente.auth.signOut({ scope: 'local' });
  }

  async excluirConta(): Promise<void> {
    // Edge Function `excluir-conta`: apaga objetos do Storage e o usuário (cascata leva o resto).
    const resposta = await this.cliente.functions.invoke<unknown>('excluir-conta', {
      method: 'POST',
    });
    const error: unknown = resposta.error;
    if (error) {
      const semRede = error instanceof FunctionsFetchError;
      throw new FalhaDeConta(
        semRede ? 'sem-rede' : 'indisponivel',
        semRede
          ? 'Sem conexão. Nada foi apagado; tente de novo com internet.'
          : 'Não foi possível excluir a conta agora. Nada foi apagado; tente de novo.',
      );
    }
    await this.cliente.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }

  /** Pasta da conta no bucket; o servidor recusa outra (RLS por `storage.foldername`). */
  private async pastaDaConta(): Promise<string> {
    const sessao = await this.sessao();
    if (!sessao) throw new FalhaDeConta('indisponivel', 'Entre na conta para usar a nuvem.');
    return sessao.uid;
  }

  async listarCopias(): Promise<CopiaNaNuvem[]> {
    const pasta = await this.pastaDaConta();
    try {
      const { data, error } = await this.cliente.storage
        .from(BUCKET_DE_COPIAS)
        .list(pasta, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
      if (error) throw error;
      return data
        .filter((o) => o.id !== null && o.name.endsWith('.arretado'))
        .map((o) => ({ nome: o.name, tamanho: o.metadata?.size ?? 0 }));
    } catch (erro) {
      throw falhaDeCopia(erro, 'A lista aparece quando a internet voltar.');
    }
  }

  async enviarCopia(nome: string, bytes: Uint8Array): Promise<void> {
    const pasta = await this.pastaDaConta();
    try {
      const { error } = await this.cliente.storage
        .from(BUCKET_DE_COPIAS)
        .upload(`${pasta}/${nome}`, bytes, {
          contentType: 'application/octet-stream',
          upsert: false,
        });
      if (error) throw error;
    } catch (erro) {
      throw falhaDeCopia(erro, 'Nada foi apagado da nuvem.');
    }
  }

  async baixarCopia(nome: string): Promise<Uint8Array> {
    const pasta = await this.pastaDaConta();
    try {
      const { data, error } = await this.cliente.storage
        .from(BUCKET_DE_COPIAS)
        .download(`${pasta}/${nome}`);
      if (error) throw error;
      return new Uint8Array(await data.arrayBuffer());
    } catch (erro) {
      throw falhaDeCopia(erro, 'Nada foi alterado neste aparelho.');
    }
  }

  async apagarCopia(nome: string): Promise<void> {
    const pasta = await this.pastaDaConta();
    try {
      const { error } = await this.cliente.storage
        .from(BUCKET_DE_COPIAS)
        .remove([`${pasta}/${nome}`]);
      if (error) throw error;
    } catch (erro) {
      throw falhaDeCopia(erro, 'A cópia continua na nuvem.');
    }
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
