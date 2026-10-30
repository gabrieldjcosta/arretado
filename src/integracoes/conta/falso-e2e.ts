// Serviço de conta do build de E2E (`vite build --mode e2e-conta`, T30): sem rede e sem Supabase.
// Ao contrário do `ServicoDeContaFalso` (memória, testes de unidade), guarda tudo em `localStorage`,
// porque entrar recarrega a página e `criarServicoDeConta()` é chamado mais de uma vez no app.
import { FalhaDeSincronizacao, type ServidorDeSincronizacao } from '../../core/sincronizacao';
import {
  FalhaDeConta,
  type CopiaNaNuvem,
  type ServicoDeConta,
  type SessaoDeConta,
} from './interface';

const CHAVE = 'arretado:e2e-conta';
const CODIGO = '123456';
const EMAIL_GOOGLE = 'google@exemplo.com';

interface Estado {
  sessao: SessaoDeConta | null;
  googlePendente: SessaoDeConta | null;
  aceites: string[];
  /** Chave `<uid>/<nome>` → bytes em base64. */
  copias: Record<string, string>;
}

const VAZIO: Estado = { sessao: null, googlePendente: null, aceites: [], copias: {} };

const lerEstado = (): Estado => {
  try {
    return { ...VAZIO, ...(JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Estado>) };
  } catch {
    return { ...VAZIO };
  }
};
const gravarEstado = (estado: Estado) => {
  localStorage.setItem(CHAVE, JSON.stringify(estado));
};

/** UUID estável por e-mail: a mesma pessoa volta ao mesmo banco; e-mails diferentes, bancos diferentes. */
export function uidDoEmail(email: string): string {
  let h = 0;
  for (const c of email.trim().toLowerCase()) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return `00000000-0000-4000-8000-${h.toString(16).padStart(8, '0')}0000`;
}

const MARCA_DO_SERVIDOR = 'arretado:e2e-servidor-sync';

function servidorFalsoInstalado(): boolean {
  try {
    return localStorage.getItem(MARCA_DO_SERVIDOR) === '1';
  } catch {
    return false;
  }
}

/** Chama o servidor falso do teste; a sessão vai no corpo (o servidor é por conta). */
async function chamarServidor<T>(
  funcao: string,
  corpo: Record<string, unknown>,
  opcoes: { keepalive?: boolean } = {},
): Promise<T> {
  const sessao = lerEstado().sessao;
  if (!sessao) throw new FalhaDeSincronizacao('Sem sessão.', false);
  let r: Response;
  try {
    r = await fetch(`/__sync/${funcao}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: sessao.uid, ...corpo }),
      keepalive: opcoes.keepalive ?? false,
    });
  } catch {
    throw new FalhaDeSincronizacao('Sem conexão.', false);
  }
  if (!r.ok)
    throw new FalhaDeSincronizacao(`Servidor respondeu ${String(r.status)}.`, r.status === 422);
  return (await r.json()) as T;
}

const paraBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const deBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export class ServicoDeContaFalsoE2E implements ServicoDeConta {
  private readonly ouvintes = new Set<(s: SessaoDeConta | null) => void>();

  private definir(sessao: SessaoDeConta | null) {
    gravarEstado({ ...lerEstado(), sessao });
    this.ouvintes.forEach((o) => {
      o(sessao);
    });
  }

  sessao() {
    return Promise.resolve(lerEstado().sessao);
  }
  /** Simula o desvio pelo Google: guarda quem vai voltar e recarrega com `?code=`, como o retorno real. */
  entrarComGoogle(): Promise<void> {
    gravarEstado({
      ...lerEstado(),
      googlePendente: { uid: uidDoEmail(EMAIL_GOOGLE), email: EMAIL_GOOGLE },
    });
    window.location.assign(`${window.location.origin}${window.location.pathname}?code=falso`);
    return Promise.resolve();
  }
  pedirCodigoPorEmail(): Promise<void> {
    return Promise.resolve();
  }
  confirmarCodigo(email: string, codigo: string): Promise<SessaoDeConta> {
    if (codigo !== CODIGO) {
      return Promise.reject(new FalhaDeConta('invalido', 'Código inválido ou vencido.'));
    }
    const sessao = { uid: uidDoEmail(email), email: email.trim().toLowerCase() };
    this.definir(sessao);
    return Promise.resolve(sessao);
  }
  concluirRetorno(): Promise<SessaoDeConta | null> {
    const estado = lerEstado();
    if (!estado.googlePendente) return Promise.resolve(null);
    gravarEstado({ ...estado, sessao: estado.googlePendente, googlePendente: null });
    return Promise.resolve(estado.googlePendente);
  }
  aceitarTermos(versao: string): Promise<void> {
    const estado = lerEstado();
    gravarEstado({ ...estado, aceites: [...estado.aceites, versao] });
    return Promise.resolve();
  }
  aceitarSincronizacao(versao: string): Promise<void> {
    // A sincronização liga sozinha após o login: sem servidor falso no teste (`instalar` deixa a
    // marca), recusa de pronto, sem tocar a rede (um 404 sujaria o console de todo teste de conta).
    if (!servidorFalsoInstalado()) {
      return Promise.reject(new FalhaDeSincronizacao('Sem servidor de teste.', false));
    }
    return chamarServidor('aceitar_sincronizacao', { versao }).then(() => undefined);
  }
  /**
   * O servidor da sincronização mora no teste (Playwright responde `/__sync/<função>` com
   * `page.route`, em `e2e/sincronizacao-servidor.ts`): é o único jeito de três aparelhos (três
   * contextos, sem `localStorage` em comum) verem a mesma conta. Sem a rota, cai como sem rede.
   */
  servidorDeSincronizacao(): ServidorDeSincronizacao {
    return {
      enviarLote: (aparelhoId, versao, entradas) =>
        chamarServidor('enviar_lote', { aparelhoId, versao, entradas }),
      puxarLog: (depoisDe, limite, operacao) =>
        chamarServidor('puxar_log', { depoisDe, limite, operacao: operacao ?? null }),
      lerRegistro: (colecao, id) => chamarServidor('ler_registro', { colecao, id }),
      instantaneoInicio: () => chamarServidor('instantaneo_inicio', {}),
      puxarRegistros: (depois, limite) => chamarServidor('puxar_registros', { depois, limite }),
      registrarSincronia: (aparelhoId, seqRecebido, versaoEsquema) =>
        chamarServidor('registrar_sincronia', { aparelhoId, seqRecebido, versaoEsquema }),
      pontoDaPoda: () => chamarServidor('ponto_da_poda', {}),
      pedirPosse: (aparelhoId, forcar) => chamarServidor('pedir_posse', { aparelhoId, forcar }),
      soltarPosse: (aparelhoId) =>
        chamarServidor('soltar_posse', { aparelhoId }, { keepalive: true }),
    };
  }
  sair(): Promise<void> {
    this.definir(null);
    return Promise.resolve();
  }
  excluirConta(): Promise<void> {
    return Promise.reject(new FalhaDeConta('indisponivel', 'Ainda não.'));
  }
  private pasta(): string {
    const sessao = lerEstado().sessao;
    if (!sessao) throw new FalhaDeConta('indisponivel', 'Entre na conta para usar a nuvem.');
    return `${sessao.uid}/`;
  }
  listarCopias(): Promise<CopiaNaNuvem[]> {
    return Promise.resolve().then(() => {
      const pasta = this.pasta();
      return Object.entries(lerEstado().copias)
        .filter(([chave]) => chave.startsWith(pasta))
        .map(([chave, b64]) => ({
          nome: chave.slice(pasta.length),
          tamanho: deBase64(b64).length,
        }));
    });
  }
  enviarCopia(nome: string, bytes: Uint8Array): Promise<void> {
    return Promise.resolve().then(() => {
      const estado = lerEstado();
      estado.copias[this.pasta() + nome] = paraBase64(bytes);
      gravarEstado(estado);
    });
  }
  baixarCopia(nome: string): Promise<Uint8Array> {
    return Promise.resolve().then(() => {
      const b64 = lerEstado().copias[this.pasta() + nome];
      if (b64 === undefined) throw new FalhaDeConta('invalido', 'Esta cópia não existe mais.');
      return deBase64(b64);
    });
  }
  apagarCopia(nome: string): Promise<void> {
    return Promise.resolve().then(() => {
      const estado = lerEstado();
      Reflect.deleteProperty(estado.copias, this.pasta() + nome);
      gravarEstado(estado);
    });
  }
  aoMudar(ouvinte: (sessao: SessaoDeConta | null) => void) {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }
}
