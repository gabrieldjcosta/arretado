// Posse de edição (D17; plano F4-B §4, B4): um aparelho edita por vez. O servidor decide em
// `pedir_posse`; aqui fica o ritmo (renovar a cada 30 s com a aba à vista, soltar quando ela some)
// e o estado que a tela mostra. Posse não é segurança, é redução de Conflito: sem rede o aparelho
// segue editando (Q1) e o `base_ts` apanha a divergência depois.
import type { ServidorDeSincronizacao } from './tipos';

export type EstadoDePosse =
  /** Ainda não pedida, ou o controle parou. */
  | { tipo: 'parada' }
  | { tipo: 'minha' }
  /** Outro aparelho está em uso: aqui é só leitura até a pessoa pedir para editar. */
  | { tipo: 'de-outro'; aparelhoId: string; ultimoSinal: string | null }
  /** O servidor não respondeu (sem rede, sessão): edita com aviso (Q1). */
  | { tipo: 'sem-confirmacao' };

export interface OpcoesDePosse {
  servidor: Pick<ServidorDeSincronizacao, 'pedirPosse' | 'soltarPosse'>;
  aparelhoId: string;
  aoMudar: (estado: EstadoDePosse) => void;
  /** Antes de perder a posse para outro aparelho: descarrega o que tem pendente. */
  antesDePerder?: () => Promise<void>;
  /** A aba está à vista? Sem `document` conta como sim. */
  visivel?: () => boolean;
  /** Renovação com a aba à vista (plano §4: 30 s). */
  renovacaoMs?: number;
  /** Aba oculta por este tempo solta a posse (plano §4: 60 s). */
  ocultaMs?: number;
}

export interface Posse {
  estado(): EstadoDePosse;
  /** Pede ou renova agora; `forcar` assume de um aparelho em uso. */
  pedir(forcar?: boolean): Promise<EstadoDePosse>;
  /** Devolve a posse (aba oculta ou app fechando); melhor esforço. */
  soltar(): Promise<void>;
  parar(): void;
}

const RENOVACAO_PADRAO_MS = 30_000;
const OCULTA_PADRAO_MS = 60_000;

function abaVisivel(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function criarPosse(opcoes: OpcoesDePosse): Posse {
  const { servidor, aparelhoId } = opcoes;
  const visivel = opcoes.visivel ?? abaVisivel;
  let estado: EstadoDePosse = { tipo: 'parada' };
  let parado = false;
  let pedindo: Promise<EstadoDePosse> | null = null;
  let timerOculta: ReturnType<typeof setTimeout> | null = null;
  // Cada pedido ganha um número; a resposta de um pedido mais antigo que outro já enviado é descartada
  // (a renovação periódica pode responder depois do "passar para cá" e desfazê-lo).
  let ultimoPedido = 0;

  const mudar = (novo: EstadoDePosse) => {
    if (novo.tipo === estado.tipo && JSON.stringify(novo) === JSON.stringify(estado)) return;
    estado = novo;
    opcoes.aoMudar(novo);
  };

  const pedir = (forcar = false): Promise<EstadoDePosse> => {
    if (parado) return Promise.resolve(estado);
    if (pedindo && !forcar) return pedindo;
    const numero = ++ultimoPedido;
    const chamada = (async () => {
      try {
        const r = await servidor.pedirPosse(aparelhoId, forcar);
        if (numero !== ultimoPedido) return estado;
        if (r.concedida) {
          mudar({ tipo: 'minha' });
        } else {
          // Era minha e outro aparelho assumiu: antes de ceder, sobe o que ficou pendente.
          if (estado.tipo === 'minha') await opcoes.antesDePerder?.().catch(() => undefined);
          mudar({
            tipo: 'de-outro',
            aparelhoId: r.aparelho_id,
            ultimoSinal: r.ultimo_sinal ?? null,
          });
        }
      } catch {
        if (numero !== ultimoPedido) return estado;
        // Sem resposta: quem tinha a posse continua editando; quem não tinha, edita com aviso.
        if (estado.tipo !== 'minha') mudar({ tipo: 'sem-confirmacao' });
      }
      return estado;
    })();
    pedindo = chamada;
    void chamada.finally(() => {
      if (pedindo === chamada) pedindo = null;
    });
    return chamada;
  };

  const soltar = async () => {
    if (estado.tipo !== 'minha') return;
    await servidor.soltarPosse(aparelhoId).catch(() => undefined);
    // Ao voltar, `pedir` reconquista sem pergunta (o servidor sabe que soltamos).
    mudar({ tipo: 'parada' });
  };

  const periodico = setInterval(() => {
    if (visivel()) void pedir();
  }, opcoes.renovacaoMs ?? RENOVACAO_PADRAO_MS);

  const aoMudarVisibilidade = () => {
    if (visivel()) {
      if (timerOculta !== null) clearTimeout(timerOculta);
      timerOculta = null;
      void pedir();
    } else if (timerOculta === null) {
      timerOculta = setTimeout(() => {
        timerOculta = null;
        void soltar();
      }, opcoes.ocultaMs ?? OCULTA_PADRAO_MS);
    }
  };
  const aoFechar = () => {
    void soltar();
  };
  const temDocumento = typeof document !== 'undefined' && typeof window !== 'undefined';
  if (temDocumento) {
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', aoFechar);
  }

  return {
    estado: () => estado,
    pedir,
    soltar,
    parar() {
      parado = true;
      ultimoPedido += 1; // resposta em voo não muda mais nada
      clearInterval(periodico);
      if (timerOculta !== null) clearTimeout(timerOculta);
      if (temDocumento) {
        document.removeEventListener('visibilitychange', aoMudarVisibilidade);
        window.removeEventListener('pagehide', aoFechar);
      }
    },
  };
}
